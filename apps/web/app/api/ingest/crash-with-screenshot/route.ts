import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import fs from "fs/promises";
import path from "path";

/**
 * MULTIMODAL VISION ANALYSIS POWER FEATURE INGESTION ROUTE
 *
 * Purpose:
 *   Alternate ingestion endpoint handling multipart/form-data crash uploads containing
 *   both text telemetry and a crash screenshot file (PNG or JPEG).
 *
 * How Gemini Vision is Triggered:
 *   When `crash_screenshot_uri` is populated in devpulse.incidents, the Triage & Diagnosis Agents
 *   automatically detect this URI and load the crash image alongside standard log tails, passing
 *   both to Gemini 1.5 Pro's multimodal vision input for visual error diagnosis.
 */

const CrashWithScreenshotSchema = z.object({
  project: z.string().min(1, "project is required"),
  service: z.string().min(1, "service is required"),
  job_id: z.string().min(1, "job_id is required"),
  worker_id: z.string().min(1, "worker_id is required"),
  exit_code: z.coerce.number().int("exit_code must be an integer"),
  stderr_tail: z.string().min(1, "stderr_tail is required"),
  command: z.string().min(1, "command is required"),
  artifact_uri: z.string().optional().default(""),
  affected_users_estimate: z.coerce.number().int().optional().default(0),
});

/**
 * Uploads screenshot file to storage location.
 * Note: In production deployment on Google Cloud, this uploads to Google Cloud Storage (GCS).
 * For hackathon demonstration, it saves locally to public/uploads/ and returns a relative URI.
 */
async function uploadScreenshotToStorage(file: File): Promise<string> {
  try {
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    await fs.mkdir(uploadsDir, { recursive: true });

    const fileExt = file.type.includes("png") ? ".png" : ".jpg";
    const filename = `crash_${crypto.randomUUID()}${fileExt}`;
    const filePath = path.join(uploadsDir, filename);

    await fs.writeFile(filePath, buffer);
    console.log(`[MULTIMODAL INGESTION] Screenshot saved locally to ${filePath}`);

    return `/uploads/${filename}`;
  } catch (error) {
    console.error("[MULTIMODAL INGESTION ERROR] Failed to store screenshot file:", error);
    return "";
  }
}

async function callMcpInsert(incidentData: Record<string, any>): Promise<void> {
  const mcpServerUrl = process.env.MCP_CLICKHOUSE_URL || "http://localhost:8000";
  console.log(`[INGEST API] [MCP PLACEHOLDER] Inserting multimodal incident ${incidentData.incident_id} via ${mcpServerUrl}...`);
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    // 1. Extract raw form fields
    const rawData = {
      project: formData.get("project")?.toString() || "",
      service: formData.get("service")?.toString() || "",
      job_id: formData.get("job_id")?.toString() || "",
      worker_id: formData.get("worker_id")?.toString() || "",
      exit_code: formData.get("exit_code") ? Number(formData.get("exit_code")) : NaN,
      stderr_tail: formData.get("stderr_tail")?.toString() || "",
      command: formData.get("command")?.toString() || "",
      artifact_uri: formData.get("artifact_uri")?.toString() || "",
      affected_users_estimate: formData.get("affected_users_estimate") ? Number(formData.get("affected_users_estimate")) : 0,
    };

    // 2. Validate form fields using Zod
    const parseResult = CrashWithScreenshotSchema.safeParse(rawData);
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

    // 3. Process optional screenshot image file
    let screenshotUri = "";
    const file = formData.get("screenshot") as File | null;
    if (file && file.size > 0) {
      if (!file.type.startsWith("image/")) {
        return NextResponse.json(
          { error: "Validation Error", message: "Screenshot file must be an image (PNG or JPEG)." },
          { status: 400 }
        );
      }
      screenshotUri = await uploadScreenshotToStorage(file);
    }

    // 4. Generate incident UUID
    const incident_id = crypto.randomUUID();

    const incidentRecord = {
      incident_id,
      project: data.project,
      service: data.service,
      job_id: data.job_id,
      worker_id: data.worker_id,
      exit_code: data.exit_code,
      stderr_tail: data.stderr_tail,
      command: data.command,
      artifact_uri: data.artifact_uri,
      status: "PENDING",
      error_type: "UNKNOWN",
      severity: data.exit_code === 137 ? "CRITICAL" : "HIGH",
      affected_users_estimate: data.affected_users_estimate,
      retry_count: 0,
      crash_screenshot_uri: screenshotUri,
      estimated_dev_hours_saved: 0,
      created_at: new Date().toISOString(),
    };

    // 5. Insert row into ClickHouse devpulse.incidents
    await callMcpInsert(incidentRecord);

    // 6. Fire-and-forget POST request to Python Agent Orchestrator
    const agentUrl = (process.env.AGENT_ORCHESTRATOR_URL || "http://localhost:8001").replace(/\/$/, "");
    fetch(`${agentUrl}/trigger-pipeline`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ incident_id }),
    }).catch((err) => {
      console.error(`[INGEST API] Fire-and-forget call to Agent Orchestrator failed:`, err);
    });

    return NextResponse.json(
      {
        success: true,
        incident_id,
        crash_screenshot_uri: screenshotUri,
        message: "Multimodal crash incident ingested successfully.",
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("[MULTIMODAL INGEST API ERROR]:", error);
    return NextResponse.json(
      {
        error: "Internal Server Error",
        message: error.message || "Failed to ingest multimodal crash event",
      },
      { status: 500 }
    );
  }
}
