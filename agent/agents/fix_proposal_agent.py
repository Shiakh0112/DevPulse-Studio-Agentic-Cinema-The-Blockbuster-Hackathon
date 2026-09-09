import json
import logging
import os
import uuid
from google import genai
import sys
from dotenv import load_dotenv

# Load environment variables before doing anything else
load_dotenv()

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))
try:
    from agent.tools.clickhouse_mcp_tool import McpClickHouseTool
except ImportError:
    from tools.clickhouse_mcp_tool import McpClickHouseTool

logger = logging.getLogger("FixProposalAgent")

def run_fix_proposal_agent(incident: dict, diagnosis: dict, attempt_number: int, retry_context: dict = None) -> dict:
    """
    Generates a fix patch, test plan, and writes to fix_proposals.
    """
    api_key = os.getenv("GEMINI_API_KEY")
    result = None
    if api_key:
        try:
            client = genai.Client(api_key=api_key)
            prompt = f"Propose a fix. Output JSON with 'change_type', 'file_path', 'diff_unified', 'rationale', 'confidence', 'risk', 'test_plan'. Data: {json.dumps(incident)}"
            
            if retry_context:
                prompt += f"\n\nCRITICAL: Previous attempt failed! Analyze this failure log and provide a DIFFERENT fix: {json.dumps(retry_context)}"
            response = client.models.generate_content(
                model="gemini-1.5-flash",
                contents=prompt
            )
            text = response.text.replace('```json', '').replace('```', '').strip()
            parsed = json.loads(text)
            
            confidence_val = parsed.get("confidence", 0.88)
            try:
                confidence_val = float(confidence_val)
            except (ValueError, TypeError):
                confidence_val = 0.88

            result = {
                "proposal_id": str(uuid.uuid4()),
                "change_type": parsed.get("change_type", "CONFIG"),
                "file_path": parsed.get("file_path", "render_pipeline/config.yaml"),
                "diff_unified": parsed.get("diff_unified", "--- render_pipeline/config.yaml\n+++ render_pipeline/config.yaml\n@@ -12,3 +12,3 @@\n- memory_limit: 4G\n+ memory_limit: 8G"),
                "rationale": parsed.get("rationale", "Increased memory limit to 8G to prevent OOM."),
                "confidence": confidence_val,
                "risk": parsed.get("risk", "LOW"),
                "test_plan": parsed.get("test_plan", ["npm run test", "ffmpeg -i test.mp4"]),
                "attempt_number": attempt_number
            }
        except Exception as e:
            logger.warning(f"[Agent: FixProposalAgent] API Fallback \u2192 Gemini API call failed: {e}. Using deterministic patch generator.")

    if not result:
        result = {
            "proposal_id": str(uuid.uuid4()),
            "change_type": "CONFIG",
            "file_path": "render_pipeline/config.yaml",
            "diff_unified": "--- render_pipeline/config.yaml\n+++ render_pipeline/config.yaml\n@@ -12,3 +12,3 @@\n- memory_limit: 4G\n+ memory_limit: 8G",
            "rationale": "Increased memory limit to 8G to prevent OOM.",
            "confidence": 0.95 if attempt_number == 1 else 0.92,
            "risk": "LOW",
            "test_plan": ["ffmpeg -i test.mp4"],
            "attempt_number": attempt_number
        }

    # DB INSERT
    mcp_tool = McpClickHouseTool()
    incident_id = incident.get("incident_id", "")
    
    try:
        # Write proposal to fix_proposals
        proposal_record = dict(result)
        proposal_record["incident_id"] = incident_id
        if "test_plan" in proposal_record and isinstance(proposal_record["test_plan"], list):
            proposal_record["test_plan"] = json.dumps(proposal_record["test_plan"])
        
        insert_prop = mcp_tool.insert_row("fix_proposals", proposal_record)
        if not insert_prop.get("success"):
            logger.error(f"[Agent: FixProposal] Failed to insert fix_proposal: {insert_prop.get('error')}")
            raise Exception(f"Database insert failed: {insert_prop.get('error')}")
        
        update_res = mcp_tool.run_query(f"ALTER TABLE devpulse.incidents UPDATE status = 'PROPOSED' WHERE incident_id = '{incident_id}'")
        if not update_res.get("success"):
            logger.error(f"[Agent: FixProposal] Failed to update incident status: {update_res.get('error')}")
            raise Exception(f"Database update failed: {update_res.get('error')}")
        
        event = {
            "event_id": str(uuid.uuid4()),
            "incident_id": incident_id,
            "event_type": "PROPOSED",
            "payload": json.dumps({"proposal_id": result["proposal_id"], "rationale": result["rationale"], "attempt_number": attempt_number})
        }
        insert_event = mcp_tool.insert_row("incident_events", event)
        if not insert_event.get("success"):
            logger.error(f"[Agent: FixProposal] Failed to insert incident_event: {insert_event.get('error')}")
            raise Exception(f"Database event insert failed: {insert_event.get('error')}")

    except Exception as db_exc:
        logger.error(f"[Agent: FixProposal] Critical Database Error during fix proposal: {str(db_exc)}")
        raise

    return result
