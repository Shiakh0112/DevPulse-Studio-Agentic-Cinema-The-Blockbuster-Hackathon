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

logger = logging.getLogger("DiagnoseAgent")

def run_diagnose_agent(incident_data: dict, triage_result: dict) -> dict:
    """
    Formulates a root cause hypothesis based on triage data.
    """
    api_key = os.getenv("GEMINI_API_KEY")
    result = None
    if api_key:
        try:
            client = genai.Client(api_key=api_key)
            prompt = f"Diagnose root cause. Output JSON with 'fix_strategy_type' and 'hypothesis'. Data: {json.dumps(incident_data)}"
            response = client.models.generate_content(
                model="gemini-3.6-flash",
                contents=prompt
            )
            text = response.text.replace('```json', '').replace('```', '').strip()
            parsed = json.loads(text)
            result = {
                "fix_strategy_type": parsed.get("fix_strategy_type", "CONFIG_CHANGE"),
                "hypothesis": parsed.get("hypothesis", "Frame buffer memory allocation exceeded worker VRAM limits.")
            }
        except Exception as e:
            logger.warning(f"[Agent: DiagnoseAgent] API Fallback \u2192 Gemini API call failed: {e}. Using deterministic diagnosis fallback.")

    if not result:
        error_type = triage_result.get("error_type", "")
        
        if error_type == "FRAME_BUFFER_OOM":
            strategy = "CONFIG_CHANGE"
            hypothesis = "Frame buffer memory allocation exceeded worker VRAM limits due to high resolution."
        elif error_type == "TIMEOUT":
            strategy = "CODE_CHANGE"
            hypothesis = "Process took too long, needs optimization or timeout increase."
        else:
            strategy = "MANUAL_INVESTIGATION"
            hypothesis = f"Unknown error type '{error_type}' occurred. Requires manual review of logs."
            
        result = {
            "fix_strategy_type": strategy,
            "hypothesis": hypothesis
        }

    # DB INSERT
    mcp_tool = McpClickHouseTool()
    incident_id = incident_data.get("incident_id", "")
    
    try:
        update_res = mcp_tool.run_query(f"ALTER TABLE devpulse.incidents UPDATE status = 'DIAGNOSED' WHERE incident_id = '{incident_id}'")
        if not update_res.get("success"):
            logger.error(f"[Agent: DiagnoseAgent] Failed to update ClickHouse status: {update_res.get('error')}")
            raise Exception(f"Database update failed: {update_res.get('error')}")
        
        event = {
            "event_id": str(uuid.uuid4()),
            "incident_id": incident_id,
            "event_type": "DIAGNOSED",
            "payload": json.dumps(result)
        }
        insert_res = mcp_tool.insert_row("incident_events", event)
        if not insert_res.get("success"):
            logger.error(f"[Agent: DiagnoseAgent] Failed to insert into incident_events: {insert_res.get('error')}")
            raise Exception(f"Database insert failed: {insert_res.get('error')}")
            
    except Exception as db_exc:
        logger.error(f"[Agent: DiagnoseAgent] Critical Database Error during diagnosis: {str(db_exc)}")
        raise

    return result
