-- DevPulse Studio - ClickHouse Database Schema
-- Database: devpulse

CREATE DATABASE IF NOT EXISTS devpulse;

CREATE TABLE IF NOT EXISTS devpulse.incidents (
    incident_id String,
    project LowCardinality(String),
    service LowCardinality(String),
    job_id String,
    worker_id String,
    exit_code Int32,
    stderr_tail String,
    command String,
    artifact_uri String,
    status LowCardinality(String),
    error_type LowCardinality(String),
    severity LowCardinality(String),
    created_at DateTime DEFAULT now(),
    resolved_at Nullable(DateTime)
) ENGINE = MergeTree()
PARTITION BY toDate(created_at)
ORDER BY (project, created_at, incident_id);

CREATE TABLE IF NOT EXISTS devpulse.incident_events (
    event_id String,
    incident_id String,
    event_type LowCardinality(String),
    payload String,
    created_at DateTime DEFAULT now()
) ENGINE = MergeTree()
ORDER BY (incident_id, created_at);

CREATE TABLE IF NOT EXISTS devpulse.fix_proposals (
    proposal_id String,
    incident_id String,
    change_type LowCardinality(String),
    file_path String,
    diff_unified String,
    rationale String,
    confidence Float32,
    risk LowCardinality(String),
    test_plan String,
    attempt_number Int32 DEFAULT 1,
    created_at DateTime DEFAULT now()
) ENGINE = MergeTree()
ORDER BY (incident_id, created_at);

CREATE TABLE IF NOT EXISTS devpulse.verification_runs (
    run_id String,
    proposal_id String,
    incident_id String,
    test_name String,
    passed Bool,
    duration_seconds Float32,
    log_uri String,
    attempt_number Int32 DEFAULT 1,
    created_at DateTime DEFAULT now()
) ENGINE = MergeTree()
ORDER BY (incident_id, created_at);

CREATE TABLE IF NOT EXISTS devpulse.governance_decisions (
    decision_id String,
    incident_id String,
    proposal_id String,
    decision LowCardinality(String),
    actor LowCardinality(String),
    reason String,
    policy_version String,
    created_at DateTime DEFAULT now()
) ENGINE = MergeTree()
ORDER BY (incident_id, created_at);

CREATE TABLE IF NOT EXISTS devpulse.job_health_samples (
    sample_id String,
    project LowCardinality(String),
    service LowCardinality(String),
    queue_depth Int32,
    avg_render_seconds Float32,
    sampled_at DateTime DEFAULT now()
) ENGINE = MergeTree()
ORDER BY (project, service, sampled_at);

ALTER TABLE devpulse.incidents ADD COLUMN IF NOT EXISTS affected_users_estimate Int32 DEFAULT 0;
ALTER TABLE devpulse.incidents ADD COLUMN IF NOT EXISTS retry_count Int32 DEFAULT 0;
ALTER TABLE devpulse.incidents ADD COLUMN IF NOT EXISTS crash_screenshot_uri String DEFAULT '';
ALTER TABLE devpulse.incidents ADD COLUMN IF NOT EXISTS estimated_dev_hours_saved Float32 DEFAULT 0;

CREATE TABLE IF NOT EXISTS devpulse.rollback_events (
    rollback_id String,
    incident_id String,
    triggered_by LowCardinality(String),
    affected_users_at_trigger Int32,
    previous_stable_version String,
    status LowCardinality(String),
    created_at DateTime DEFAULT now()
) ENGINE = MergeTree()
ORDER BY (incident_id, created_at);
