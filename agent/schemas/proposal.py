from enum import Enum
from typing import List
from pydantic import BaseModel


class ChangeType(str, Enum):
    CONFIG = "CONFIG"
    CODE = "CODE"


class RiskLevel(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"


class FixProposalSchema(BaseModel):
    proposal_id: str
    incident_id: str
    change_type: ChangeType
    file_path: str
    diff_unified: str
    rationale: str
    confidence: float
    risk: RiskLevel
    test_plan: List[str]
    attempt_number: int = 1
