from pydantic import BaseModel


class VerificationRunSchema(BaseModel):
    run_id: str
    proposal_id: str
    incident_id: str
    test_name: str
    passed: bool
    duration_seconds: float
    log_uri: str
    attempt_number: int = 1
