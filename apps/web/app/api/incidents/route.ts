import { NextRequest, NextResponse } from "next/server";
import { getIncidents } from "@/lib/clickhouseClient";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || undefined;
    const project = searchParams.get("project") || undefined;
    const limitParam = searchParams.get("limit");
    const limit = limitParam ? parseInt(limitParam, 10) : undefined;

    const incidents = await getIncidents({ status, project, limit });
    return NextResponse.json(incidents);
  } catch (error: any) {
    console.error("[API Incidents Error]:", error);
    return NextResponse.json(
      { error: "Failed to fetch incidents", details: error?.message },
      { status: 500 }
    );
  }
}
