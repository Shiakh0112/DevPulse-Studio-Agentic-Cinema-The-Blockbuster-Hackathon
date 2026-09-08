"""
DevPulse Studio - End-to-End Pipeline Sanity-Check Demo Script

Purpose:
    Executes a complete end-to-end simulation test:
    1. Ingests a sample media render crash payload.
    2. Triggers the AI Agent Orchestrator pipeline.
    3. Polls ClickHouse devpulse.incidents table until terminal status is reached.
    4. Prints a full timeline report querying incident_events, fix_proposals,
       verification_runs, governance_decisions, and rollback_events.
"""

import os
import sys
import time
import json
import uuid
import logging
import httpx
from datetime import datetime

# Set up module paths
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "agent")))

try:
    from agent.tools.clickhouse_mcp_tool import McpClickHouseTool
    from agent.orchestrator import run_pipeline
except ImportError:
    from tools.clickhouse_mcp_tool import McpClickHouseTool
    from orchestrator import run_pipeline

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(message)s")
logger = logging.getLogger("TestFullPipeline")


def run_sanity_check():
    mcp_tool = McpClickHouseTool()
    incident_id = str(uuid.uuid4())
    project_name = "nebula-render-cluster"

    print("==========================================================================")
    print("   DEVPULSE STUDIO - END-TO-END SYSTEM SANITY CHECK DEMO SCRIPT")
    print("==========================================================================")
    print(f"Target Incident ID: {incident_id}")
    print(f"Target Project:     {project_name}")
    print("--------------------------------------------------------------------------\n")

    # Step 1: Ingest sample crash telemetry into ClickHouse
    print("[1/4] Ingesting Sample Media Rendering Pipeline Crash Telemetry...")

    created_at_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    incident_record = {
        "incident_id": incident_id,
        "project": project_name,
        "service": "cuda-transcoder-worker",
        "severity": "HIGH",
        "status": "PENDING",
        "exit_code": 137,
        "command": "ffmpeg -i input.mp4 -c:v libx264 -preset slow output.mp4",
        "stderr_snippet": "Error: Out of memory frame buffer allocation failed at frame 450 (GPU VRAM buffer overflow).",
        "stdout_snippet": "Processing frame 449... Frame allocation requested: 8192MB",
        "error_type": "FRAME_BUFFER_OOM",
        "root_cause_hypothesis": "Pending AI Agent Diagnosis",
        "affected_users_estimate": 250,
        "retry_count": 0,
        "estimated_dev_hours_saved": 0.0,
        "created_at": created_at_str
    }

    # Insert initial incident row
    mcp_tool.insert_row("incidents", incident_record)

    # Insert initial INGESTED timeline event
    initial_event = {
        "event_id": str(uuid.uuid4()),
        "incident_id": incident_id,
        "event_type": "INGESTED",
        "payload": json.dumps({"source": "demo_sanity_check_script", "exit_code": 137})
    }
    mcp_tool.insert_row("incident_events", initial_event)

    print("  -> Incident telemetry successfully ingested into devpulse.incidents!")

    # Step 2: Trigger the multi-agent AI pipeline
    print("\n[2/4] Triggering Master AI Agent Orchestrator Pipeline...")
    pipeline_result = run_pipeline(incident_id)
    print("  -> Pipeline execution completed by Orchestrator.")

    # Step 3: Poll ClickHouse incidents table until status progresses past PENDING
    print("\n[3/4] Polling ClickHouse devpulse.incidents status every 2 seconds (Max 90s)...")

    max_polls = 45  # 45 * 2s = 90 seconds
    final_status = "PENDING"
    final_incident_row = {}

    for poll_idx in range(1, max_polls + 1):
        try:
            query_sql = f"SELECT * FROM devpulse.incidents WHERE incident_id = '{incident_id}' FORMAT JSONEachRow;"
            res = mcp_tool.run_query(query_sql)
            if res.get("status") == "success" and res.get("output"):
                lines = res["output"].strip().split("\n")
                if lines and lines[0]:
                    row = json.loads(lines[0])
                    final_incident_row = row
                    final_status = row.get("status", "PENDING")
                    print(f"  [Poll #{poll_idx:02d}/45] Status: {final_status} | Retry Count: {row.get('retry_count', 0)}")

                    if final_status in ("RESOLVED", "NEEDS_REVIEW", "REJECTED", "ROLLED_BACK"):
                        print(f"\n✅ Terminal status reached: {final_status}")
                        break
        except Exception as poll_err:
            logger.warning(f"Polling warning: {poll_err}")

        time.sleep(2)

    # Step 4: Query full audit timeline & summary reports from ClickHouse
    print("\n[4/4] Generating Full Incident Audit Summary Report across ClickHouse Tables...")
    print("--------------------------------------------------------------------------")

    # A. Timeline Events
    print("\n--- 1. INCIDENT TIMELINE EVENTS (devpulse.incident_events) ---")
    try:
        events_res = mcp_tool.run_query(
            f"SELECT event_type, created_at, payload FROM devpulse.incident_events WHERE incident_id = '{incident_id}' ORDER BY created_at ASC FORMAT JSONEachRow;"
        )
        if events_res.get("status") == "success" and events_res.get("output"):
            for line in events_res["output"].strip().split("\n"):
                if line:
                    ev = json.loads(line)
                    print(f"   [{ev.get('created_at', 'N/A')}] EVENT: {ev.get('event_type')} | Payload: {ev.get('payload')[:100]}")
    except Exception as e:
        print(f"   Could not fetch timeline events: {e}")

    # B. Fix Proposals History (Self-Healing Attempts)
    print("\n--- 2. FIX PROPOSALS HISTORY (devpulse.fix_proposals) ---")
    try:
        proposals_res = mcp_tool.run_query(
            f"SELECT proposal_id, attempt_number, change_type, file_path, confidence, risk FROM devpulse.fix_proposals WHERE incident_id = '{incident_id}' ORDER BY attempt_number ASC FORMAT JSONEachRow;"
        )
        if proposals_res.get("status") == "success" and proposals_res.get("output"):
            for line in proposals_res["output"].strip().split("\n"):
                if line:
                    prop = json.loads(line)
                    print(f"   [Attempt #{prop.get('attempt_number')}] Type: {prop.get('change_type')} | File: {prop.get('file_path')} | Confidence: {prop.get('confidence')} | Risk: {prop.get('risk')}")
    except Exception as e:
        print(f"   Could not fetch fix proposals: {e}")

    # C. Verification Runs
    print("\n--- 3. SANDBOX VERIFICATION RUNS (devpulse.verification_runs) ---")
    try:
        verif_res = mcp_tool.run_query(
            f"SELECT run_id, attempt_number, test_name, passed, duration_seconds FROM devpulse.verification_runs WHERE incident_id = '{incident_id}' ORDER BY created_at ASC FORMAT JSONEachRow;"
        )
        if verif_res.get("status") == "success" and verif_res.get("output"):
            for line in verif_res["output"].strip().split("\n"):
                if line:
                    vr = json.loads(line)
                    pass_str = "PASSED" if vr.get('passed') else "FAILED"
                    print(f"   [Attempt #{vr.get('attempt_number')}] Test: {vr.get('test_name')} | Status: {pass_str} | Duration: {vr.get('duration_seconds')}s")
    except Exception as e:
        print(f"   Could not fetch verification runs: {e}")

    # D. Governance Decision
    print("\n--- 4. GOVERNANCE DECISION (devpulse.governance_decisions) ---")
    try:
        gov_res = mcp_tool.run_query(
            f"SELECT decision_id, decision, reason, actor, policy_version FROM devpulse.governance_decisions WHERE incident_id = '{incident_id}' FORMAT JSONEachRow;"
        )
        if gov_res.get("status") == "success" and gov_res.get("output"):
            for line in gov_res["output"].strip().split("\n"):
                if line:
                    gov = json.loads(line)
                    print(f"   Decision: {gov.get('decision')} | Reason: {gov.get('reason')} | Actor: {gov.get('actor')} ({gov.get('policy_version')})")
    except Exception as e:
        print(f"   Could not fetch governance decision: {e}")

    # E. Rollback Events (if triggered)
    print("\n--- 5. ROLLBACK EVENTS (devpulse.rollback_events) ---")
    try:
        rb_res = mcp_tool.run_query(
            f"SELECT rollback_id, triggered_by, affected_users_at_trigger, status FROM devpulse.rollback_events WHERE incident_id = '{incident_id}' FORMAT JSONEachRow;"
        )
        if rb_res.get("status") == "success" and rb_res.get("output"):
            for line in rb_res["output"].strip().split("\n"):
                if line:
                    rb = json.loads(line)
                    print(f"   Rollback ID: {rb.get('rollback_id')} | Triggered By: {rb.get('triggered_by')} | Affected Users: {rb.get('affected_users_at_trigger')}")
    except Exception as e:
        print(f"   Could not fetch rollback events: {e}")

    # Final Business ROI Summary
    hours_saved = final_incident_row.get("estimated_dev_hours_saved", pipeline_result.get("governance", {}).get("estimated_dev_hours_saved", 3.0))
    attempts_used = pipeline_result.get("attempts_used", 1)

    print("\n==========================================================================")
    print("SANITY CHECK SUMMARY RESULTS:")
    print(f"   Incident ID:                 {incident_id}")
    print(f"   Final Status:                {final_status}")
    print(f"   Self-Healing Retries Used:   {attempts_used} / 3")
    print(f"   Estimated Dev Hours Saved:   {hours_saved} hrs")
    print("==========================================================================\n")


if __name__ == "__main__":
    run_sanity_check()
