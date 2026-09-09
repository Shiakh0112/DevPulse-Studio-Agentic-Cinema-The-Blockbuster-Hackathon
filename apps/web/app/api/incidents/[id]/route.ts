import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import {
  getIncidentById,
  getIncidentEvents,
  getFixProposals,
  getVerificationRuns,
  getGovernanceDecision,
  getRollbackEvents,
} from "@/lib/clickhouseClient";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: incidentId } = await params;
    if (!incidentId) {
      return NextResponse.json({ error: "Missing incident ID" }, { status: 400 });
    }

    const incident = await getIncidentById(incidentId);

    // Fallback baseline incident object for demo if ClickHouse returns null for a newly generated ID
    const effectiveIncident = incident || {
      incident_id: incidentId,
      project: "render-pipeline-prod",
      service: "encoder-worker",
      job_id: "job-8849",
      worker_id: "worker-gpu-04",
      exit_code: 137,
      stderr_tail: "Error: Out of memory buffer limit reached. Frame buffer allocation failed at frame 450.",
      command: "ffmpeg -i input.mp4 -c:v libx264 -preset slow output.mp4",
      status: "TRIAGED",
      error_type: "FRAME_BUFFER_OOM",
      severity: "HIGH",
      created_at: new Date().toISOString(),
      resolved_at: null,
      retry_count: 1,
      affected_users_estimate: 150,
      crash_screenshot_uri: "",
      estimated_dev_hours_saved: 3.0,
    };

    const events = await getIncidentEvents(incidentId);
    const proposals = await getFixProposals(incidentId);

    // Fetch verification runs for each proposal
    let verificationRuns: any[] = [];
    if (proposals && proposals.length > 0) {
      for (const prop of proposals) {
        const runs = await getVerificationRuns(prop.proposal_id);
        verificationRuns.push(...runs);
      }
    }

    const governanceDecision = await getGovernanceDecision(incidentId);
    const rollbackEvents = await getRollbackEvents(incidentId);

    return NextResponse.json({
      incident: effectiveIncident,
      events,
      proposals,
      verificationRuns,
      governanceDecision,
      rollbackEvents,
    });
  } catch (error: any) {
    console.error("[API Incident Detail Error]:", error);
    return NextResponse.json(
      { error: "Failed to fetch incident details", details: error?.message },
      { status: 500 }
    );
  }
}
