-- DevPulse Studio - ClickHouse Materialized Views
-- Database: devpulse

-- Materialized View 1: devpulse.mv_hourly_crash_rate
-- Purpose: Real-time aggregation powering the Hourly Crash Rate chart on the Analytics page.
-- Engine: SummingMergeTree automatically sums crash_count for identical (project, service, hour) tuples.

CREATE MATERIALIZED VIEW IF NOT EXISTS devpulse.mv_hourly_crash_rate
ENGINE = SummingMergeTree()
ORDER BY (project, service, hour)
AS SELECT
    project,
    service,
    toStartOfMinute(created_at) AS hour,
    count() AS crash_count
FROM devpulse.incidents
GROUP BY project, service, hour;

-- Materialized View 2: devpulse.mv_hourly_mttr
-- Purpose: Computes Mean Time To Resolution (MTTR) trends per project per hour.
-- Engine: AggregatingMergeTree using avgState() to store aggregate state.
-- Note: Querying this view requires using avgMerge(avg_resolution_seconds) to combine states and get final values.

CREATE MATERIALIZED VIEW IF NOT EXISTS devpulse.mv_hourly_mttr
ENGINE = AggregatingMergeTree()
ORDER BY (project, hour)
AS SELECT
    project,
    toStartOfMinute(created_at) AS hour,
    avgState(dateDiff('second', created_at, resolved_at)) AS avg_resolution_seconds
FROM devpulse.incidents
WHERE resolved_at IS NOT NULL
GROUP BY project, hour;

-- Materialized View 3: devpulse.mv_top_error_types_24h
-- Purpose: Aggregates top error types over a rolling 24-hour daily window for the Analytics chart.
-- Engine: SummingMergeTree sums occurrence_count for identical (project, error_type, day) tuples.

CREATE MATERIALIZED VIEW IF NOT EXISTS devpulse.mv_top_error_types_24h
ENGINE = SummingMergeTree()
ORDER BY (project, error_type, day)
AS SELECT
    project,
    error_type,
    toDate(created_at) AS day,
    count() AS occurrence_count
FROM devpulse.incidents
GROUP BY project, error_type, day;

-- Materialized View 4: devpulse.mv_roi_summary
-- Purpose: Powers the live "Developer Hours Saved" / "Estimated Money Saved" widget on the Analytics page's ROI Calculator section.
-- Engine: SummingMergeTree automatically sums hours_saved and incidents_resolved for identical (project, day) tuples.
-- Note: Depends on estimated_dev_hours_saved being populated correctly by the Governance Agent when an incident resolves.

CREATE MATERIALIZED VIEW IF NOT EXISTS devpulse.mv_roi_summary
ENGINE = SummingMergeTree()
ORDER BY (project, day)
AS SELECT
    project,
    toDate(assumeNotNull(resolved_at)) AS day,
    sum(estimated_dev_hours_saved) AS hours_saved,
    count() AS incidents_resolved
FROM devpulse.incidents
WHERE resolved_at IS NOT NULL
GROUP BY project, day;

-- ============================================================================
-- Security & Governance: Least-Privilege ClickHouse User Setup
-- ============================================================================
-- Purpose: Documentation showing how to create a least-privilege database user.
-- Security Policy: Both the web application and MCP server MUST connect using this least-privilege user
--                  ('devpulse_app') with ONLY SELECT and INSERT permissions on devpulse.*.
--                  NEVER connect using the admin/default user in production or runtime.
--
-- SQL Statements (Commented out - do not run automatically):
--
-- CREATE USER IF NOT EXISTS devpulse_app IDENTIFIED BY '<your_secure_password_here>';
-- GRANT SELECT, INSERT ON devpulse.* TO devpulse_app;
-- ============================================================================
