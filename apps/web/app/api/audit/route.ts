import { NextResponse } from "next/server";
import { queryClickHouse } from "@/lib/clickhouseClient";

export async function GET() {
  try {
    // 1. Fetch governance decisions joined with incident metadata
    const govSql = `
      SELECT 
        g.decision_id AS id,
        g.incident_id,
        g.created_at,
        'GOVERNANCE_DECISION' AS action_type,
        g.decision AS decision_status,
        g.actor,
        g.reason,
        'v2.1-deterministic' AS policy_version,
        i.project,
        i.service,
        i.error_type,
        i.severity
      FROM devpulse.governance_decisions g
      LEFT JOIN devpulse.incidents i ON g.incident_id = i.incident_id
      ORDER BY g.created_at DESC
      LIMIT 100;
    `;
    const govRecords = await queryClickHouse<any>(govSql);

    // 2. Fetch rollback events joined with incident metadata
    const rollbackSql = `
      SELECT 
        r.rollback_id AS id,
        r.incident_id,
        r.created_at,
        'EMERGENCY_ROLLBACK' AS action_type,
        r.status AS decision_status,
        r.triggered_by AS actor,
        concat('Rolled back deployment to ', r.previous_stable_version) AS reason,
        'v1.0-guardrail' AS policy_version,
        i.project,
        i.service,
        i.error_type,
        i.severity
      FROM devpulse.rollback_events r
      LEFT JOIN devpulse.incidents i ON r.incident_id = i.incident_id
      ORDER BY r.created_at DESC
      LIMIT 100;
    `;
    const rollbackRecords = await queryClickHouse<any>(rollbackSql);

    // 3. Fallback mock baseline audit records if database returns empty
    const defaultGov = govRecords.length > 0 ? govRecords : [
      {
        id: "gov-init-01",
        incident_id: "inc-demo-101",
        created_at: new Date().toISOString(),
        action_type: "GOVERNANCE_DECISION",
        decision_status: "AUTO_APPROVED",
        actor: "system-auto",
        reason: "Low risk patch (score: 0.12) with 100% deterministic test coverage passed",
        policy_version: "v2.1-deterministic",
        project: "render-pipeline-prod",
        service: "encoder-worker",
        error_type: "FRAME_BUFFER_OOM",
        severity: "MEDIUM",
      },
      {
        id: "gov-init-02",
        incident_id: "inc-demo-102",
        created_at: new Date(Date.now() - 3600000).toISOString(),
        action_type: "GOVERNANCE_DECISION",
        decision_status: "NEEDS_REVIEW",
        actor: "system-auto",
        reason: "High risk score (0.45) requires human engineer sign-off",
        policy_version: "v2.1-deterministic",
        project: "render-pipeline-prod",
        service: "gpu-compositor",
        error_type: "SHADER_COMPILE_FAIL",
        severity: "HIGH",
      },
    ];

    const defaultRollback = rollbackRecords.length > 0 ? rollbackRecords : [
      {
        id: "rb-init-01",
        incident_id: "inc-demo-103",
        created_at: new Date(Date.now() - 7200000).toISOString(),
        action_type: "EMERGENCY_ROLLBACK",
        decision_status: "ROLLED_BACK",
        actor: "studio-admin",
        reason: "Emergency Auto-Rollback triggered due to critical severity + 500 affected users",
        policy_version: "v1.0-guardrail",
        project: "render-pipeline-prod",
        service: "transcoder-api",
        error_type: "PIPELINE_ERROR",
        severity: "CRITICAL",
      },
    ];

    // 4. Merge and sort chronologically by created_at descending
    const combinedAuditTrail = [...defaultGov, ...defaultRollback].sort((a, b) => {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    return NextResponse.json(combinedAuditTrail);
  } catch (error: any) {
    console.error("[API Audit Trail Error]", error);
    return NextResponse.json(
      { error: "Failed to fetch audit records", details: error.message },
      { status: 500 }
    );
  }
}
