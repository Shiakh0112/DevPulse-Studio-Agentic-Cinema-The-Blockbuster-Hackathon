import { NextRequest, NextResponse } from "next/server";
import { getCrashRateData } from "@/lib/clickhouseClient";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const hoursParam = searchParams.get("hours");
    const hours = hoursParam ? parseInt(hoursParam, 10) || 24 : 24;

    const data = await getCrashRateData(hours);
    return NextResponse.json(data || []);
  } catch (error: any) {
    console.error("[API Analytics Crash Rate Error]", error);
    return NextResponse.json(
      { error: "Failed to fetch crash rate data", details: error.message },
      { status: 500 }
    );
  }
}
