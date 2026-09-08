import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

// Zod Schema for Crash Incident Ingestion with tolerant defaults
const CrashSchema = z.object({
  project: z.string().optional().default("render-pipeline-prod"),
  service: z.string().optional().default("encoder-worker"),
  job_id: z.string().optional().default("job-450"),
  worker_id: z.string().optional().default("worker-12"),
  exit_code: z.number().int().optional().default(137),
  stderr_tail: z.string().optional().default(""),
  stderr_snippet: z.string().optional().default(""),
  command: z.string().optional().default("ffmpeg -i input.mp4 -c:v libx264 output.mp4"),
  artifact_uri: z.string().optional().default(""),
  severity: z.string().optional(),
  affected_users_estimate: z.number().int().optional().default(150),
  is_emergency: z.boolean().optional().default(false),
  screenshot_url: z.string().optional().default(""),
  demo_force_first_attempt_fail: z.boolean().optional().default(false),
});

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.json();

    // Map stderr_snippet to stderr_tail if provided
    if (rawBody.stderr_snippet && !rawBody.stderr_tail) {
      rawBody.stderr_tail = rawBody.stderr_snippet;
    }

    const parseResult = CrashSchema.safeParse(rawBody);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: "Validation Error",
          details: parseResult.error.flatten(),
        },
        { status: 400 }
      );
    }

    const data = parseResult.data;
    const incident_id = `INC-${Date.now().toString().slice(-6)}`;
    const stderrContent = data.stderr_tail || data.stderr_snippet || "FATAL: Out of memory buffer limit reached.";

    const incidentRecord = {
      incident_id,
      project: data.project,
      service: data.service,
      job_id: data.job_id,
      worker_id: data.worker_id,
      exit_code: data.exit_code,
      stderr_tail: stderrContent,
      stderr_snippet: stderrContent,
      command: data.command,
      artifact_uri: data.artifact_uri,
      status: "PENDING",
      error_type: "OOM_MEMORY_LIMIT",
      severity: data.severity ? data.severity.toUpperCase() : (data.exit_code === 137 ? "CRITICAL" : "HIGH"),
      affected_users_estimate: data.affected_users_estimate,
      is_emergency: data.is_emergency,
      retry_count: 0,
      crash_screenshot_uri: data.screenshot_url,
      estimated_dev_hours_saved: 0,
      created_at: new Date().toISOString(),
    };

    // Store in global in-memory store for fallback Next.js UI rendering
    if (globalThis) {
      const g = globalThis as any;
      if (!g.__DEVPULSE_INCIDENTS__) {
        g.__DEVPULSE_INCIDENTS__ = [];
      }
      g.__DEVPULSE_INCIDENTS__.unshift(incidentRecord);
    }

    // Fire-and-forget call to Python Agent Orchestrator
    const agentUrl = (process.env.AGENT_ORCHESTRATOR_URL || "http://localhost:8001").replace(/\/$/, "");
    fetch(`${agentUrl}/trigger-pipeline`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ incident_id, payload: incidentRecord }),
    }).catch((err) => {
      console.error(`[INGEST API] Call to Agent Orchestrator failed:`, err);
    });

    return NextResponse.json(
      {
        success: true,
        incident_id,
        message: "Crash incident ingested successfully.",
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("[INGEST API ERROR]:", error);
    return NextResponse.json(
      {
        error: "Internal Server Error",
        message: error.message || "Failed to ingest crash event",
      },
      { status: 500 }
    );
  }
}
