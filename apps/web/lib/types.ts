export type IncidentStatus = 
  | 'PENDING' 
  | 'TRIAGED' 
  | 'DIAGNOSED' 
  | 'PROPOSED' 
  | 'VERIFIED' 
  | 'REJECTED' 
  | 'ROLLED_BACK'
  | 'NEEDS_REVIEW'
  | 'VERIFICATION_FAILED_RETRYING';

export type IncidentSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface Incident {
  incident_id: string;
  project: string;
  service: string;
  job_id: string;
  worker_id: string;
  exit_code: number;
  stderr_tail: string;
  stderr_snippet?: string;
  command: string;
  status: IncidentStatus;
  error_type: string;
  severity: IncidentSeverity;
  created_at: string;
  resolved_at: string | null;
  retry_count: number;
  affected_users_estimate: number;
  crash_screenshot_uri: string;
  estimated_dev_hours_saved: number;
}

export type ChangeType = 'CONFIG' | 'CODE';
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export interface FixProposal {
  proposal_id: string;
  incident_id: string;
  change_type: ChangeType;
  file_path: string;
  diff_unified: string;
  rationale: string;
  confidence: number;
  risk: RiskLevel;
  test_plan: string[];
  attempt_number: number;
}

export interface VerificationRun {
  run_id: string;
  proposal_id: string;
  incident_id: string;
  test_name: string;
  passed: boolean;
  duration_seconds: number;
  log_uri: string;
  attempt_number: number;
}

export type GovernanceDecisionType = 
  | 'AUTO_APPROVE' 
  | 'NEEDS_REVIEW' 
  | 'REJECTED' 
  | 'HUMAN_APPROVED';

export interface GovernanceDecision {
  decision_id: string;
  incident_id: string;
  proposal_id: string;
  decision: GovernanceDecisionType;
  actor: string;
  reason: string;
  created_at: string;
}

export type RollbackStatus = 'TRIGGERED' | 'COMPLETED' | 'FAILED';

export interface RollbackEvent {
  rollback_id: string;
  incident_id: string;
  triggered_by: string;
  affected_users_at_trigger: number;
  previous_stable_version: string;
  status: RollbackStatus;
  created_at: string;
}
