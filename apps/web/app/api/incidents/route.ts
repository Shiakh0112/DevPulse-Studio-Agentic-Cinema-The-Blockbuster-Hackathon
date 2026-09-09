import { NextRequest, NextResponse } from "next/server";
import { getIncidents, getIncidentEvents } from "@/lib/clickhouseClient";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || undefined;
    const project = searchParams.get("project") || undefined;
    const limitParam = searchParams.get("limit");
    const limit = limitParam ? parseInt(limitParam, 10) : undefined;

    const incidents = await getIncidents({ status, project, limit });
    const incidentsWithEvents = await Promise.all(
      incidents.map(async (inc) => {
        try {
          const events = await getIncidentEvents(inc.incident_id);
          if (events && events.length > 0) {
            const latestEvent = events[events.length - 1];
            inc.status = latestEvent.event_type;
            const retryEvents = events.filter((e: any) => e.event_type === 'VERIFICATION_FAILED_RETRYING');
            inc.retry_count = retryEvents.length;
            if (['RESOLVED', 'AUTO_APPROVE'].includes(latestEvent.event_type)) {
               inc.estimated_dev_hours_saved = 2.5;
            }
          }
        } catch (e) {
          // Ignore event fetch error for feed
        }
        return inc;
      })
    );

    return NextResponse.json(incidentsWithEvents);
  } catch (error: any) {
    console.error("[API Incidents Error]:", error);
    return NextResponse.json(
      { error: "Failed to fetch incidents", details: error?.message },
      { status: 500 }
    );
  }
}
