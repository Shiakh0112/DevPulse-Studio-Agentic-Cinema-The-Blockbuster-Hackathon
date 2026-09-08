from enum import Enum
from pydantic import BaseModel


class RollbackStatus(str, Enum):
    TRIGGERED = "TRIGGERED"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"


class RollbackEventSchema(BaseModel):
    rollback_id: str
    incident_id: str
    triggered_by: str
    affected_users_at_trigger: int
    previous_stable_version: str
    status: RollbackStatus = RollbackStatus.TRIGGERED
    created_at: str
