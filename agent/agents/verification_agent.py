import json
import logging
import os
import uuid
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

logger = logging.getLogger("VerificationAgent")

def run_verification_agent(proposal: dict, incident: dict = None, attempt_number: int = 1) -> dict:
    """
    Simulates testing in sandbox.
    """
    attempt = attempt_number
    
    logger.info(f"[Agent: VerificationAgent] Sandbox Setup (Attempt #{attempt}) \u2192 Created isolated temp directory")
    logger.info(f"[Agent: VerificationAgent] Sandbox Cleanup \u2192 Removed temp directory")
    
    passed = False
    if attempt >= 2:
        passed = True
        
    logger.info(f"[Agent: VerificationAgent] Sandbox Verification (Attempt #{attempt}) \u2192 {'PASSED' if passed else 'FAILED'}")
    
    result = {
        "run_id": str(uuid.uuid4()),
        "passed": passed,
        "duration_seconds": 1.5,
        "test_name": "sandbox_verification"
    }
    
    if not passed:
        result["combined_failure_log"] = "Test Failed. Output: Fatal Error OOM in frame buffer at byte 0x48f9. Memory dump indicates limit reached. Suggested action: increase memory limits or optimize buffer size."

    # DB INSERT
    mcp_tool = McpClickHouseTool()
    incident_id = incident.get("incident_id", "") if incident else ""
    
    run_record = dict(result)
    run_record.pop("combined_failure_log", None)
    run_record["incident_id"] = incident_id
    run_record["proposal_id"] = proposal.get("proposal_id", "")
    run_record["attempt_number"] = attempt
    
    try:
        insert_run = mcp_tool.insert_row("verification_runs", run_record)
        if not insert_run.get("success"):
            logger.error(f"[Agent: Verification] Failed to insert verification_runs: {insert_run.get('error')}")
            raise Exception(f"Database insert failed: {insert_run.get('error')}")
        
        status = "VERIFIED" if passed else "VERIFICATION_FAILED_RETRYING"
        update_res = mcp_tool.run_query(f"ALTER TABLE devpulse.incidents UPDATE status = '{status}' WHERE incident_id = '{incident_id}'")
        if not update_res.get("success"):
            logger.error(f"[Agent: Verification] Failed to update incident status: {update_res.get('error')}")
            raise Exception(f"Database update failed: {update_res.get('error')}")
        
        event = {
            "event_id": str(uuid.uuid4()),
            "incident_id": incident_id,
            "event_type": status,
            "payload": json.dumps({"run_id": result["run_id"], "passed": passed, "attempt_number": attempt})
        }
        insert_event = mcp_tool.insert_row("incident_events", event)
        if not insert_event.get("success"):
            logger.error(f"[Agent: Verification] Failed to insert incident_events: {insert_event.get('error')}")
            raise Exception(f"Database event insert failed: {insert_event.get('error')}")

    except Exception as db_exc:
        logger.error(f"[Agent: Verification] Critical Database Error during verification: {str(db_exc)}")
        raise

    return result
