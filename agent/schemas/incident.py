from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field


class IncidentStatus(str, Enum):
    PENDING = "PENDING"
    TRIAGED = "TRIAGED"
    DIAGNOSED = "DIAGNOSED"
    PROPOSED = "PROPOSED"
    VERIFIED = "VERIFIED"
    RESOLVED = "RESOLVED"
    REJECTED = "REJECTED"
    ROLLED_BACK = "ROLLED_BACK"


class IncidentSeverity(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class IncidentSchema(BaseModel):
    incident_id: str
    project: str
    service: str
    job_id: str
    worker_id: str
    exit_code: int
    stderr_tail: str
    command: str
    status: IncidentStatus = IncidentStatus.PENDING
    error_type: str = "UNKNOWN"
    severity: IncidentSeverity = IncidentSeverity.LOW
    created_at: str
    resolved_at: Optional[str] = None
    retry_count: int = 0
    affected_users_estimate: int = 0
    crash_screenshot_uri: str = ""
    estimated_dev_hours_saved: float = 0.0
