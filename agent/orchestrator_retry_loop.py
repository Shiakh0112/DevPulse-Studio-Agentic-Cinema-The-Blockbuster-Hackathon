"""
DevPulse Studio - Self-Healing Iterative Loop Orchestrator

Purpose:
    Embodies the "Self-Healing Loop" power feature.
    Iteratively orchestrates the Fix Proposal Agent and Verification Agent across up to 3 retry attempts.
    If a proposed fix fails deterministic sandbox verification, the failure logs and previous diff
    are fed back as rich retry context into the next attempt so Gemini produces a materially different,
    corrected patch.

    MUST be called from the main AI Agent Orchestrator instead of invoking fix_proposal_agent
    and verification_agent directly in sequence.
"""

import sys
import os
import logging
from typing import Dict, Any, Optional

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

try:
    from agent.tools.clickhouse_mcp_tool import McpClickHouseTool
    from agent.agents.fix_proposal_agent import run_fix_proposal_agent
    from agent.agents.verification_agent import run_verification_agent
except ImportError:
    from tools.clickhouse_mcp_tool import McpClickHouseTool
    from agents.fix_proposal_agent import run_fix_proposal_agent
    from agents.verification_agent import run_verification_agent

try:
    from agent.logger import log_agent
except ImportError:
    try:
        from logger import log_agent
    except ImportError:
        def log_agent(agent, action, summary, level="info"):
            print(f"[Agent: {agent}] {action} → {summary}")


def run_fix_and_verify_loop(incident: Dict[str, Any], diagnosis: Dict[str, Any]) -> Dict[str, Any]:
    """
    Executes the Self-Healing Iterative Loop up to 3 attempts.

    Args:
        incident (dict): Raw incident telemetry dictionary.
        diagnosis (dict): Diagnosis dictionary from Diagnose Agent.

    Returns:
        dict: Final output dictionary containing:
            - final_proposal (dict): Proposal dict from the last attempt executed.
            - final_verification (dict): Verification result dict from the last attempt.
            - attempts_used (int): Number of attempts executed (1, 2, or 3).
    """
    mcp_tool = McpClickHouseTool()
    incident_id = incident.get("incident_id", "")
    attempt = 1
    retry_context: Optional[Dict[str, Any]] = None

    proposal = {}
    verification_result = {}

    while attempt <= 3:
        # a. Call Fix Proposal Agent with current attempt number & retry context
        proposal = run_fix_proposal_agent(
            incident=incident,
            diagnosis=diagnosis,
            attempt_number=attempt,
            retry_context=retry_context
        )

        # b. Call Verification Agent for deterministic sandbox testing
        verification_result = run_verification_agent(
            proposal=proposal,
            incident=incident,
            attempt_number=attempt
        )

        # c. Update incidents.retry_count in ClickHouse
        if incident_id:
            update_sql = f"ALTER TABLE devpulse.incidents UPDATE retry_count = {attempt} WHERE incident_id = '{incident_id}';"
            mcp_tool.run_query(update_sql)

        # d. If verification passed, break and return success result
        if verification_result.get("passed", False):
            log_agent("SelfHealingLoop", f"Retry Cycle PASSED (Attempt #{attempt})", f"Deterministic verification succeeded for incident {incident_id[:8]}", "success")
            return {
                "final_proposal": proposal,
                "final_verification": verification_result,
                "attempts_used": attempt
            }

        # e. If verification failed and attempt < 3, build retry context and loop again
        if not verification_result.get("passed", False) and attempt < 3:
            retry_context = {
                "previous_diff": proposal.get("diff_unified", ""),
                "failure_log": verification_result.get("combined_failure_log", "Verification test failed.")
            }
            log_agent("SelfHealingLoop", f"Retry Cycle FAILED (Attempt #{attempt})", f"Recapturing failure logs into attempt #{attempt + 1} prompt context", "retry")
            attempt += 1
            continue

        # f. If verification failed on attempt 3, escalate to Governance Agent
        if not verification_result.get("passed", False) and attempt == 3:
            log_agent("SelfHealingLoop", "Retry Cycle EXHAUSTED", "All 3 attempts exhausted. Escalating to Governance Agent as REJECTED candidate", "error")
            return {
                "final_proposal": proposal,
                "final_verification": verification_result,
                "attempts_used": 3
            }

    return {
        "final_proposal": proposal,
        "final_verification": verification_result,
        "attempts_used": attempt
    }


if __name__ == "__main__":
    print("--- Testing run_fix_and_verify_loop Function ---")
    sample_inc = {"incident_id": "loop-inc-001", "exit_code": 0}
    sample_diag = {"root_cause_hypothesis": "Test Buffer", "fix_strategy_type": "CONFIG_CHANGE"}
    res = run_fix_and_verify_loop(sample_inc, sample_diag)
    print("Self-Healing Loop Result:", res)
