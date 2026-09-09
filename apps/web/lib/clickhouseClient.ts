/**
 * DevPulse Studio - ClickHouse Direct Client & Data Access Layer
 *
 * ARCHITECTURAL RULE & COMPLIANCE NOTE:
 * Per the official ClickHouse Hackathon rules:
 * - ALL AI AGENTS (Triage, Fix, Verification, Governance, Alerting) MUST interact with ClickHouse
 *   exclusively via Model Context Protocol (mcp-clickhouse server).
 * - The Web Application Dashboard, however, uses this direct ClickHouse client module for high-speed
 *   READ queries to power the Next.js UI dashboards, analytics charts, and incident detail pages.
 */

import { createClient } from "@clickhouse/client";
import {
  Incident,
  FixProposal,
  VerificationRun,
  GovernanceDecision,
  RollbackEvent,
} from "./types";

const clickhouseHost = process.env.CLICKHOUSE_HOST || "https://wq7ry2rimf.asia-northeast1.gcp.clickhouse.cloud:8443";
const clickhouseUser = process.env.CLICKHOUSE_USER || "default";
const clickhousePassword = process.env.CLICKHOUSE_PASSWORD || "Sd0x6pcl5~cFD";
const clickhouseDatabase = process.env.CLICKHOUSE_DB || "devpulse";

// Lazy-initialized ClickHouse client instance
const client = createClient({
  url: clickhouseHost,
  username: clickhouseUser,
  password: clickhousePassword,
  database: clickhouseDatabase,
  request_timeout: 30_000,
});

/**
 * Executes a raw SQL query against ClickHouse and returns JSON objects.
 */
export async function queryClickHouse<T = any>(query: string): Promise<T[]> {
  try {
    const resultSet = await client.query({
      query,
      format: "JSONEachRow",
    });
    const data = await resultSet.json<T>();
    return data;
  } catch (error) {
    console.error("[ClickHouse Client Error] Query execution failed:", { query, error });
    // Fallback gracefully to empty array in dev/demo if database connection is unreachable
    return [];
  }
}

/**
 * Fetches incidents with optional status, project, and limit filters.
 */
export async function getIncidents(filters?: {
  status?: string;
  project?: string;
  limit?: number;
}): Promise<Incident[]> {
  const inMemory: Incident[] = (globalThis as any).__DEVPULSE_INCIDENTS__ || [];

  const whereClauses: string[] = [];
  if (filters?.status && filters.status !== "ALL") {
    whereClauses.push(`status = '${filters.status}'`);
  }
  if (filters?.project && filters.project !== "ALL") {
    whereClauses.push(`project = '${filters.project}'`);
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";
  const limitSql = `LIMIT ${filters?.limit || 50}`;
  const sql = `SELECT * FROM devpulse.incidents FINAL ${whereSql} ORDER BY created_at DESC ${limitSql};`;

  const dbIncidents = await queryClickHouse<Incident>(sql);
  const combined = [...inMemory, ...dbIncidents];

  // Deduplicate by incident_id (preferring newer/db records)
  const uniqueMap = new Map<string, Incident>();
  combined.forEach(inc => {
    // If it exists, overwrite it so we get the latest state
    uniqueMap.set(inc.incident_id, inc);
  });
  
  return Array.from(uniqueMap.values()).filter((inc: any) => {
    if (filters?.status && filters.status !== "ALL" && inc.status !== filters.status) return false;
    if (filters?.project && filters.project !== "ALL" && inc.project !== filters.project) return false;
    return true;
  });
}

/**
 * Fetches a single incident by its unique UUID.
 */
export async function getIncidentById(id: string): Promise<Incident | null> {
  const sql = `SELECT * FROM devpulse.incidents FINAL WHERE incident_id = '${id}' LIMIT 1;`;
  const results = await queryClickHouse<Incident>(sql);
  
  if (results && results.length > 0) {
    return results[0];
  }

  // Fallback to in-memory if not yet inserted into ClickHouse
  const inMemory: Incident[] = (globalThis as any).__DEVPULSE_INCIDENTS__ || [];
  const foundInMemory = inMemory.find((inc) => inc.incident_id === id);
  return foundInMemory || null;
}

/**
 * Fetches the timeline of events for a specific incident.
 */
export async function getIncidentEvents(incidentId: string): Promise<any[]> {
  const sql = `SELECT * FROM devpulse.incident_events WHERE incident_id = '${incidentId}' ORDER BY created_at ASC;`;
  return queryClickHouse<any>(sql);
}

/**
 * Fetches ALL fix proposals generated for an incident, ordered by attempt_number ASC.
 * Preserves the full retry history for the Self-Healing Loop.
 */
export async function getFixProposals(incidentId: string): Promise<FixProposal[]> {
  const sql = `SELECT * FROM devpulse.fix_proposals WHERE incident_id = '${incidentId}' ORDER BY attempt_number ASC, created_at ASC;`;
  const proposals = await queryClickHouse<any>(sql);
  
  // Transform stringified test_plan to string array if stored as JSON
  return proposals.map((p) => ({
    ...p,
    test_plan: typeof p.test_plan === "string" ? parseJsonArray(p.test_plan) : p.test_plan || [],
  }));
}

/**
 * Helper to safely parse JSON array string or fallback to raw string list.
 */
function parseJsonArray(val: string): string[] {
  try {
    const parsed = JSON.parse(val);
    return Array.isArray(parsed) ? parsed : [val];
  } catch {
    return val ? [val] : [];
  }
}

/**
 * Fetches deterministic test execution runs for a fix proposal.
 */
export async function getVerificationRuns(proposalId: string): Promise<VerificationRun[]> {
  const sql = `SELECT * FROM devpulse.verification_runs WHERE proposal_id = '${proposalId}' ORDER BY attempt_number ASC, created_at ASC;`;
  return queryClickHouse<VerificationRun>(sql);
}

/**
 * Fetches the latest governance decision for an incident.
 */
export async function getGovernanceDecision(incidentId: string): Promise<GovernanceDecision | null> {
  const sql = `SELECT * FROM devpulse.governance_decisions WHERE incident_id = '${incidentId}' ORDER BY created_at DESC LIMIT 1;`;
  const results = await queryClickHouse<GovernanceDecision>(sql);
  return results.length > 0 ? results[0] : null;
}

/**
 * Fetches audit trail records for Auto-Rollback Guardrail events.
 */
export async function getRollbackEvents(incidentId: string): Promise<RollbackEvent[]> {
  const sql = `SELECT * FROM devpulse.rollback_events WHERE incident_id = '${incidentId}' ORDER BY created_at DESC;`;
  return queryClickHouse<RollbackEvent>(sql);
}

/**
 * Fetches hourly crash rate trends from Materialized View (devpulse.mv_hourly_crash_rate).
 */
export async function getCrashRateData(hours = 24): Promise<any[]> {
  const sql = `
    SELECT
      project,
      service,
      hour,
      sum(crash_count) AS total_crashes
    FROM devpulse.mv_hourly_crash_rate
    WHERE hour >= now() - INTERVAL ${hours} HOUR
    GROUP BY project, service, hour
    ORDER BY hour ASC;
  `;
  return queryClickHouse<any>(sql);
}

/**
 * Fetches Mean Time To Resolution (MTTR) trends using avgMerge from Materialized View (devpulse.mv_hourly_mttr).
 */
export async function getMttrData(hours = 24): Promise<any[]> {
  const sql = `
    SELECT
      project,
      hour,
      round(avgMerge(avg_resolution_seconds) / 60, 2) AS avg_resolution_minutes
    FROM devpulse.mv_hourly_mttr
    WHERE hour >= now() - INTERVAL ${hours} HOUR
    GROUP BY project, hour
    ORDER BY hour ASC;
  `;
  return queryClickHouse<any>(sql);
}

/**
 * Fetches top error types distribution from Materialized View (devpulse.mv_top_error_types_24h).
 */
export async function getTopErrorTypes(hours = 24): Promise<any[]> {
  const days = Math.max(Math.ceil(hours / 24), 1);
  const sql = `
    SELECT
      project,
      error_type,
      sum(occurrence_count) AS total_occurrences
    FROM devpulse.mv_top_error_types_24h
    WHERE day >= toDate(now() - INTERVAL ${days} DAY)
    GROUP BY project, error_type
    ORDER BY total_occurrences DESC
    LIMIT 10;
  `;
  return queryClickHouse<any>(sql);
}

/**
 * Fetches live ROI savings summary from Materialized View (devpulse.mv_roi_summary).
 */
export async function getRoiSummary(days = 30): Promise<any[]> {
  const sql = `
    SELECT
      project,
      day,
      sum(hours_saved) AS total_hours_saved,
      sum(incidents_resolved) AS total_incidents_resolved,
      round(sum(hours_saved) * 85, 2) AS estimated_dollars_saved
    FROM devpulse.mv_roi_summary
    WHERE day >= toDate(now() - INTERVAL ${days} DAY)
    GROUP BY project, day
    ORDER BY day ASC;
  `;
  return queryClickHouse<any>(sql);
}
