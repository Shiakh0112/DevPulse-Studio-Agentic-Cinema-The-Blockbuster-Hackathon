"""
DevPulse Studio - Auto-Rollback Helper Tool

Purpose:
    Constructs and structures rollback_events records for emergency auto-rollback guardrail actions.
"""

import time
import uuid
from datetime import datetime, timezone
from typing import Dict, Any


def build_rollback_event(incident: Dict[str, Any], triggered_by: str) -> Dict[str, Any]:
    """
    Constructs a rollback_events record for an incident.

    Args:
        incident (dict): Incident telemetry dictionary containing incident_id, affected_users_estimate, etc.
        triggered_by (str): User role or system actor triggering the rollback (e.g., 'system-auto', 'human-admin').

    Returns:
        dict: Standardized rollback_events database record.
    """
    incident_id = incident.get("incident_id", "")
    affected_users = int(incident.get("affected_users_estimate", 0) or 0)
    timestamp = int(time.time())

    # Note: In production, previous_stable_version would be queried directly from the deployment platform's
    # (e.g., Cloud Run, Kubernetes, Vercel) release version history / deployment tag registry.
    previous_stable_version = f"prev-stable-{timestamp}"

    rollback_record = {
        "rollback_id": str(uuid.uuid4()),
        "incident_id": incident_id,
        "triggered_by": triggered_by,
        "affected_users_at_trigger": affected_users,
        "previous_stable_version": previous_stable_version,
        "status": "TRIGGERED",
        "created_at": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")
    }

    return rollback_record


if __name__ == "__main__":
    sample_inc = {"incident_id": "inc-test-123", "affected_users_estimate": 1500}
    rb = build_rollback_event(sample_inc, "human-admin")
    print("Constructed Rollback Event:", rb)
