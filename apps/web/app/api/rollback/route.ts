import { NextRequest, NextResponse } from "next/server";
import { queryClickHouse } from "@/lib/clickhouseClient";

/**
 * DevPulse Studio - Emergency Rollback API Route
 *
 * SIMULATION ARCHITECTURE & COMPLIANCE COMMENT:
 * In this hackathon build, the actual production infrastructure rollback 
 * (e.g. Google Cloud Run traffic splitting, Kubernetes deployment rollback, or AWS ALB target group shifting) 
 * is SIMULATED. 
 * 
 * The 1-Click Emergency Rollback button demonstrates the full autonomous self-healing concept 
 * and correctly logs the audit trail into ClickHouse (devpulse.rollback_events & devpulse.incidents), 
 * as standing up real production cloud infrastructure for the demo is not practical.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { incident_id, actor = "admin-user" } = body;

    if (!incident_id) {
      return NextResponse.json(
        { error: "Missing required parameter: incident_id" },
        { status: 400 }
      );
    }

    const agentUrl = process.env.AGENT_SERVICE_URL || "http://localhost:8000";
    let rollbackId = `rb-${crypto.randomUUID().substring(0, 8)}`;
    let agentMessage = "Emergency rollback simulation initiated successfully.";

    // 1. Try internal HTTP call to Python agent service's POST /rollback (Prompt 39)
    try {
      const agentRes = await fetch(`${agentUrl}/rollback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ incident_id, triggered_by: actor }),
      });

      if (agentRes.ok) {
        const agentData = await agentRes.json();
        rollbackId = agentData.rollback_id || rollbackId;
        agentMessage = agentData.message || agentMessage;
      }
    } catch {
      // Python agent service optional/offline; proceed to record database state directly
    }

    const createdAt = new Date().toISOString().replace("T", " ").substring(0, 19);

    // 2. Ensure rollback event audit record in ClickHouse
    const insertRollbackSql = `
      INSERT INTO devpulse.rollback_events (
        rollback_id,
        incident_id,
        triggered_by,
        affected_users_at_trigger,
        previous_stable_version,
        status,
        created_at
      ) VALUES (
        '${rollbackId}',
        '${incident_id}',
        '${actor}',
        500,
        'v1.4.2-stable',
        'COMPLETED',
        '${createdAt}'
      );
    `;
    await queryClickHouse(insertRollbackSql);

    // 3. Update incident status to ROLLED_BACK
    const updateIncidentSql = `
      ALTER TABLE devpulse.incidents UPDATE status = 'ROLLED_BACK' WHERE incident_id = '${incident_id}';
    `;
    await queryClickHouse(updateIncidentSql);

    // 4. Log ROLLED_BACK timeline event
    const eventId = `ev-${crypto.randomUUID().substring(0, 8)}`;
    const eventPayload = JSON.stringify({
      rollback_id: rollbackId,
      triggered_by: actor,
      action: "ROLLED_BACK",
      message: "Infrastructure rollback simulation executed. Traffic shifted to v1.4.2-stable.",
    }).replace(/'/g, "''");

    const insertEventSql = `
      INSERT INTO devpulse.incident_events (
        event_id,
        incident_id,
        event_type,
        payload,
        created_at
      ) VALUES (
        '${eventId}',
        '${incident_id}',
        'ROLLED_BACK',
        '${eventPayload}',
        '${createdAt}'
      );
    `;
    await queryClickHouse(insertEventSql);

    return NextResponse.json({
      success: true,
      rollback_id: rollbackId,
      status: "ROLLED_BACK",
      message: agentMessage,
    });
  } catch (error: any) {
    console.error("[Rollback API Error]", error);
    return NextResponse.json(
      { error: "Failed to execute rollback", details: error.message },
      { status: 500 }
    );
  }
}
