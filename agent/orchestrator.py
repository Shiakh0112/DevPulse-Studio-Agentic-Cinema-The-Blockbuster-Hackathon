"""
DevPulse Studio - Master AI Agent Orchestrator

Purpose:
    Ties together the entire multi-agent pipeline in sequence:
    1. Incident Telemetry Ingestion / Retrieval
    2. Triage Agent (Gemini 1.5 Pro multimodal vision, classification, and crash alert)
    3. Diagnose Agent (Gemini empirical root cause analysis and fix strategy)
    4. Self-Healing Fix+Verify Iterative Loop (Fix Proposal + Sandbox Verification up to 3 retries)
    5. Governance Agent (Deterministic policy, emergency rollback guardrail, PR creation, and ROI update)

    Includes top-level exception handling to log PIPELINE_ERROR events into ClickHouse,
    ensuring errors are visible on the dashboard timeline rather than disappearing silently.
"""

import sys
import os
import json
import uuid
import logging
import traceback
from typing import Dict, Any

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

try:
    from agent.tools.clickhouse_mcp_tool import McpClickHouseTool
    from agent.agents.triage_agent import run_triage_agent
    from agent.agents.diagnose_agent import run_diagnose_agent
    from agent.orchestrator_retry_loop import run_fix_and_verify_loop
    from agent.agents.governance_agent import run_governance_agent
except ImportError:
    from tools.clickhouse_mcp_tool import McpClickHouseTool
    from agents.triage_agent import run_triage_agent
    from agents.diagnose_agent import run_diagnose_agent
    from orchestrator_retry_loop import run_fix_and_verify_loop
    from agents.governance_agent import run_governance_agent

try:
    from agent.logger import log_agent
except ImportError:
    try:
        from logger import log_agent
    except ImportError:
        def log_agent(agent, action, summary, level="info"):
            print(f"[Agent: {agent}] {action} → {summary}")


def run_pipeline(incident_id: str, payload: dict = None) -> Dict[str, Any]:
    """
    Executes the end-to-end multi-agent incident management, self-healing, and governance pipeline.

    Args:
        incident_id (str): UUID of the target incident record.
        payload (dict, optional): Original payload from the API to use if DB fetch fails.

    Returns:
        dict: Complete pipeline execution summary dictionary including:
            - status (str): "success" or "error"
            - incident_id (str)
            - triage (dict)
            - diagnosis (dict)
            - final_proposal (dict)
            - final_verification (dict)
            - attempts_used (int)
            - governance (dict)
            - is_emergency (bool)
    """
    mcp_tool = McpClickHouseTool()

    log_agent("Orchestrator", "Start Multi-Agent Pipeline", f"Processing incident telemetry for {incident_id[:8]}", "in_progress")

    try:
        # STEP 1: Fetch incident telemetry from ClickHouse
        log_agent("Orchestrator", "Fetch Telemetry (Step 1/5)", f"Querying ClickHouse for incident {incident_id[:8]}", "in_progress")
        incident_data = {
            "incident_id": incident_id,
            "project": "render-pipeline-prod",
            "service": "encoder-worker",
            "severity": "HIGH",
            "exit_code": 137,
            "command": "ffmpeg -i input.mp4 -c:v libx264 -preset slow output.mp4",
            "stderr_tail": "Error: Out of memory buffer limit reached. Frame buffer allocation failed at frame 450.",
            "affected_users_estimate": 150,
            "retry_count": 0
        }

        try:
            query_sql = f"SELECT * FROM devpulse.incidents WHERE incident_id = '{incident_id}' FORMAT JSONEachRow;"
            res = mcp_tool.run_query(query_sql)
            found_in_db = False
            if res.get("success") and res.get("data"):
                # If there are rows returned
                if isinstance(res["data"], list) and len(res["data"]) > 0:
                    incident_data.update(res["data"][0])
                    found_in_db = True
                    log_agent("Orchestrator", "Fetch Telemetry", f"Successfully loaded ClickHouse incident row for {incident_id[:8]}", "success")
            
            # CRITICAL: If not in DB (UI triggered), insert it so Materialized Views have a baseline row
            if not found_in_db:
                log_agent("Orchestrator", "Fetch Telemetry", f"Incident not found in DB. Inserting baseline row for {incident_id[:8]}", "info")
                if payload:
                    incident_data.update(payload)
                # Add dummy status so MV doesn't error out on null
                incident_data["status"] = "PENDING"
                incident_data["error_type"] = "UNCLASSIFIED"
                incident_data.pop("created_at", None)  # Remove ISO string so ClickHouse uses DEFAULT now()
                incident_data.pop("stderr_snippet", None) # Not in DB schema
                incident_data.pop("is_emergency", None) # Not in DB schema
                incident_data.pop("demo_force_first_attempt_fail", None) # Not in DB schema
                
                mcp_tool.insert_row("incidents", incident_data)
        except Exception as fetch_err:
            log_agent("Orchestrator", "Fetch Telemetry Fallback", f"Could not query ClickHouse: {fetch_err}. Using baseline telemetry dict.", "warning")
            if payload:
                incident_data.update(payload)
            incident_data["status"] = "PENDING"
            incident_data["error_type"] = "UNCLASSIFIED"
            incident_data.pop("created_at", None)  # Remove ISO string so ClickHouse uses DEFAULT now()
            incident_data.pop("stderr_snippet", None)
            incident_data.pop("is_emergency", None)
            incident_data.pop("demo_force_first_attempt_fail", None)
            try:
                mcp_tool.insert_row("incidents", incident_data)
            except:
                pass

        # STEP 2: Triage Agent (Multimodal Vision + Taxonomy Classification)
        log_agent("Orchestrator", "Run Triage Agent (Step 2/5)", "Analyzing incident telemetry & visual artifacts", "in_progress")
        try:
            mcp_tool.insert_row("incident_events", {
                "event_id": str(uuid.uuid4()),
                "incident_id": incident_id,
                "event_type": "TRIAGING...",
                "payload": json.dumps({"description": "Analyzing incident telemetry & visual artifacts"})
            })
        except: pass
        triage_result = run_triage_agent(incident_data)
        log_agent("Orchestrator", "Triage Completed", f"Classification: {triage_result.get('error_type')} / {triage_result.get('severity')}", "success")

        # STEP 3: Diagnose Agent (Empirical Root Cause Analysis & Strategy Selection)
        log_agent("Orchestrator", "Run Diagnose Agent (Step 3/5)", "Formulating evidence-backed root cause hypothesis", "in_progress")
        try:
            mcp_tool.insert_row("incident_events", {
                "event_id": str(uuid.uuid4()),
                "incident_id": incident_id,
                "event_type": "DIAGNOSING...",
                "payload": json.dumps({"description": "Formulating empirical root cause hypothesis"})
            })
        except: pass
        diagnosis_result = run_diagnose_agent(incident_data, triage_result)
        log_agent("Orchestrator", "Diagnosis Completed", f"Strategy: {diagnosis_result.get('fix_strategy_type')}", "success")

        # STEP 4: Self-Healing Fix + Verify Retry Loop (Up to 3 retries with context)
        log_agent("Orchestrator", "Run Self-Healing Loop (Step 4/5)", "Iteratively generating patches & verifying in sandbox", "in_progress")
        loop_result = run_fix_and_verify_loop(incident_data, diagnosis_result)
        final_proposal = loop_result.get("final_proposal", {})
        final_verification = loop_result.get("final_verification", {})
        attempts_used = loop_result.get("attempts_used", 1)
        passed = final_verification.get("passed", False)
        log_agent("Orchestrator", "Self-Healing Loop Completed", f"Used {attempts_used} attempt(s) | Verification Passed={passed}", "success" if passed else "warning")

        # STEP 5: Governance Agent (Deterministic Policy, Emergency Check, PR & Alerts)
        log_agent("Orchestrator", "Run Governance Agent (Step 5/5)", "Evaluating safety policies & emergency rollback guardrails", "in_progress")
        try:
            mcp_tool.insert_row("incident_events", {
                "event_id": str(uuid.uuid4()),
                "incident_id": incident_id,
                "event_type": "EVALUATING_GOVERNANCE...",
                "payload": json.dumps({"description": "Checking safety policies & emergency rollback guardrails"})
            })
        except: pass
        governance_result = run_governance_agent(incident_data, final_proposal, final_verification)
        is_emergency = governance_result.get("is_emergency", False)
        decision = governance_result.get("decision", "NEEDS_REVIEW")
        log_agent("Orchestrator", "Governance Completed", f"Decision={decision} | Emergency={is_emergency}", "success" if decision == "AUTO_APPROVE" else "warning")

        log_agent("Orchestrator", "Pipeline Summary", f"Completed for {incident_id[:8]} | Decision: {decision} | Attempts: {attempts_used} | Emergency: {is_emergency}", "success")

        return {
            "status": "success",
            "incident_id": incident_id,
            "triage": triage_result,
            "diagnosis": diagnosis_result,
            "final_proposal": final_proposal,
            "final_verification": final_verification,
            "attempts_used": attempts_used,
            "governance": governance_result,
            "is_emergency": is_emergency
        }

    except Exception as pipeline_exc:
        error_msg = str(pipeline_exc)
        tb_str = traceback.format_exc()
        log_agent("Orchestrator", "Pipeline Error", f"Execution failed for incident {incident_id[:8]}: {error_msg}", "error")

        # Record PIPELINE_ERROR event in ClickHouse for UI timeline visibility
        try:
            event_record = {
                "event_id": str(uuid.uuid4()),
                "incident_id": incident_id,
                "event_type": "PIPELINE_ERROR",
                "payload": json.dumps({"error": error_msg, "traceback": tb_str[:500]})
            }
            mcp_tool.insert_row("incident_events", event_record)
        except Exception as event_err:
            log_agent("Orchestrator", "Event Insertion Error", f"Failed to record PIPELINE_ERROR event: {event_err}", "warning")

        return {
            "status": "error",
            "incident_id": incident_id,
            "error": error_msg,
            "traceback": tb_str[:500]
        }


if __name__ == "__main__":
    print("--- Testing run_pipeline Orchestrator ---")
    test_id = str(uuid.uuid4())
    pipeline_res = run_pipeline(test_id)
    print("Pipeline Output Result:", json.dumps(pipeline_res, indent=2))
