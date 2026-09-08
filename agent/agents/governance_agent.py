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
    from agent.tools.github_pr_tool import GithubPrTool
except ImportError:
    from tools.clickhouse_mcp_tool import McpClickHouseTool
    from tools.github_pr_tool import GithubPrTool

logger = logging.getLogger("GovernanceAgent")

def run_governance_agent(incident_data: dict, proposal: dict, verification: dict) -> dict:
    """
    Evaluates policies and determines if it can auto-approve.
    """
    confidence = proposal.get("confidence", 0.0)
    risk = proposal.get("risk", "HIGH")
    verification_passed = verification.get("passed", False)
    
    decision = "NEEDS_REVIEW"
    is_emergency = False
    
    if incident_data.get("affected_users_estimate", 0) > 1000:
        is_emergency = True
        
    if confidence >= 0.90 and risk.strip().upper().startswith("LOW") and not is_emergency:
        if verification_passed:
            decision = "AUTO_APPROVE"
        else:
            decision = "REJECTED_BY_SANDBOX"
            
    logger.info(f"[Agent: GovernanceAgent] Evaluate Safety Policies \u2192 Incident {incident_data.get('incident_id', '')}: Decision={decision}, Emergency={is_emergency}")
    
    reason = "Confidence or risk threshold not met for auto-approval"
    if decision == "AUTO_APPROVE":
        reason = "Safely auto-approved based on high confidence, low risk, and successful sandbox verification."
    elif decision == "REJECTED_BY_SANDBOX":
        reason = "AI had high confidence, but the proposed patch FAILED the sandbox verification. Auto-approval blocked for safety."
        
    result = {
        "decision_id": str(uuid.uuid4()),
        "decision": decision,
        "is_emergency": is_emergency,
        "reason": reason
    }

    # DB INSERT
    mcp_tool = McpClickHouseTool()
    incident_id = incident_data.get("incident_id", "")
    proposal_id = proposal.get("proposal_id", "")
    
    decision_record = dict(result)
    decision_record.pop("is_emergency", None)
    decision_record["incident_id"] = incident_id
    decision_record["proposal_id"] = proposal_id
    decision_record["actor"] = "GOVERNANCE_AGENT"
    decision_record["policy_version"] = "v1.2.0"
    
    try:
        insert_gov = mcp_tool.insert_row("governance_decisions", decision_record)
        if not insert_gov.get("success"):
            logger.error(f"[Agent: Governance] Failed to insert governance_decisions: {insert_gov.get('error')}")
            raise Exception(f"Database insert failed: {insert_gov.get('error')}")
        
        db_status = decision
        update_fields = f"status = '{db_status}'"
        
        if decision == "AUTO_APPROVE":
            db_status = "RESOLVED"
            update_fields = f"status = '{db_status}', resolved_at = now(), estimated_dev_hours_saved = 2.5"
            
        update_res = mcp_tool.run_query(f"ALTER TABLE devpulse.incidents UPDATE {update_fields} WHERE incident_id = '{incident_id}'")
        if not update_res.get("success"):
            logger.error(f"[Agent: Governance] Failed to update incident status: {update_res.get('error')}")
            raise Exception(f"Database update failed: {update_res.get('error')}")
        
        event = {
            "event_id": str(uuid.uuid4()),
            "incident_id": incident_id,
            "event_type": db_status,
            "payload": json.dumps({"decision_id": result["decision_id"], "reason": result["reason"]})
        }
        insert_event = mcp_tool.insert_row("incident_events", event)
        if not insert_event.get("success"):
            logger.error(f"[Agent: Governance] Failed to insert incident_events: {insert_event.get('error')}")
            raise Exception(f"Database event insert failed: {insert_event.get('error')}")

    except Exception as db_exc:
        logger.error(f"[Agent: Governance] Critical Database Error during governance: {str(db_exc)}")
        raise

    # GITHUB INTEGRATION
    if decision == "AUTO_APPROVE":
        logger.info(f"[Agent: Governance] Triggering GitHub AutoFix PR for {incident_id}")
        try:
            gh_tool = GithubPrTool()
            pr_url = gh_tool.create_fix_pr(incident_id, proposal)
            logger.info(f"[Agent: Governance] Created PR: {pr_url}")
            result["pr_url"] = pr_url
        except Exception as e:
            logger.error(f"[Agent: Governance] GitHub PR Error: {e}")

    return result
