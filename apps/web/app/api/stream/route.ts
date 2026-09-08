import { NextRequest } from "next/server";
import { queryClickHouse } from "@/lib/clickhouseClient";
import { Incident } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * DevPulse Studio - Real-Time Server-Sent Events (SSE) Incident Stream
 *
 * ARCHITECTURAL COMMENT:
 * Enables the Live Feed dashboard to receive real-time push updates for new and updated incidents
 * as soon as AI agents process them in ClickHouse, providing instant push notifications instead of
 * relying solely on polling.
 */

export async function GET(request: NextRequest) {
  const encoder = new TextEncoder();
  let intervalId: NodeJS.Timeout | null = null;
  let lastCheckTimestamp = new Date(Date.now() - 30_000).toISOString().replace("T", " ").substring(0, 19);

  const stream = new ReadableStream({
    async start(controller) {
      // Send initial connection event
      controller.enqueue(
        encoder.encode(`event: connected\ndata: ${JSON.stringify({ status: "connected", timestamp: new Date().toISOString() })}\n\n`)
      );

      // Poll ClickHouse every 3 seconds for new or recently updated incidents
      intervalId = setInterval(async () => {
        try {
          // Query incidents modified since lastCheckTimestamp
          const sql = `
            SELECT * FROM devpulse.incidents
            WHERE created_at >= parseDateTime64BestEffort('${lastCheckTimestamp}')
               OR resolved_at >= parseDateTime64BestEffort('${lastCheckTimestamp}')
            ORDER BY created_at DESC
            LIMIT 20;
          `;

          const incidents = await queryClickHouse<Incident>(sql);

          // Update checkpoint timestamp
          lastCheckTimestamp = new Date(Date.now() - 5000).toISOString().replace("T", " ").substring(0, 19);

          if (incidents && incidents.length > 0) {
            const payload = `data: ${JSON.stringify(incidents)}\n\n`;
            controller.enqueue(encoder.encode(payload));
          } else {
            // Keep-alive heartbeat ping
            controller.enqueue(encoder.encode(`: heartbeat ${new Date().toISOString()}\n\n`));
          }
        } catch (err: any) {
          console.error("[SSE Stream Error]:", err);
          // Enqueue error details without terminating stream
          controller.enqueue(
            encoder.encode(`event: error\ndata: ${JSON.stringify({ error: err?.message || "Stream error" })}\n\n`)
          );
        }
      }, 3000);
    },

    cancel() {
      // Handle client disconnect gracefully by clearing interval
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
        console.log("[SSE Stream] Client disconnected, cleared SSE polling interval.");
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "Content-Encoding": "none",
    },
  });
}
