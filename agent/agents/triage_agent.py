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

logger = logging.getLogger("TriageAgent")

def run_triage_agent(incident_data: dict) -> dict:
    """
    Classifies the incident error type and severity using Gemini.
    """
    api_key = os.getenv("GEMINI_API_KEY")
    result = None
    if api_key:
        try:
            client = genai.Client(api_key=api_key)
            prompt = f"Analyze this incident and classify error_type and severity. Output JSON only. Incident: {json.dumps(incident_data)}"
            response = client.models.generate_content(
                model="gemini-3.6-flash",
                contents=prompt
            )
            text = response.text.replace('```json', '').replace('```', '').strip()
            parsed = json.loads(text)
            result = {
                "error_type": parsed.get("error_type", "FRAME_BUFFER_OOM"),
                "severity": parsed.get("severity", "HIGH")
            }
        except Exception as e:
            logger.warning(f"[Agent: TriageAgent] API Fallback \u2192 Gemini API call failed: {e}. Using deterministic rule engine.")
    
    if not result:
        # Fallback deterministic
        exit_code = incident_data.get("exit_code", 0)
        stderr = incident_data.get("stderr_snippet", "").lower()
        
        error_type = "UNKNOWN"
        severity = "MEDIUM"
        
        if "memory" in stderr or exit_code == 137:
            error_type = "FRAME_BUFFER_OOM"
            severity = "HIGH"
        elif "timeout" in stderr or exit_code == 124:
            error_type = "TIMEOUT"
            severity = "MEDIUM"
            
        result = {
            "error_type": error_type,
            "severity": severity
        }

    # DB INSERT
    mcp_tool = McpClickHouseTool()
    incident_id = incident_data.get("incident_id", "")
    
    try:
        # Update incident status
        update_res = mcp_tool.run_query(f"ALTER TABLE devpulse.incidents UPDATE status = 'TRIAGED', error_type = '{result['error_type']}', severity = '{result['severity']}' WHERE incident_id = '{incident_id}'")
        if not update_res.get("success"):
            logger.error(f"[Agent: TriageAgent] Failed to update ClickHouse status: {update_res.get('error')}")
            raise Exception(f"Database update failed: {update_res.get('error')}")
        
        # Insert event
        event = {
            "event_id": str(uuid.uuid4()),
            "incident_id": incident_id,
            "event_type": "TRIAGED",
            "payload": json.dumps(result)
        }
        insert_res = mcp_tool.insert_row("incident_events", event)
        if not insert_res.get("success"):
            logger.error(f"[Agent: TriageAgent] Failed to insert into incident_events: {insert_res.get('error')}")
            raise Exception(f"Database insert failed: {insert_res.get('error')}")
            
    except Exception as db_exc:
        logger.error(f"[Agent: TriageAgent] Critical Database Error during triage: {str(db_exc)}")
        # We re-raise to prevent the orchestrator from continuing blindly
        raise

    return result
