import { NextRequest, NextResponse } from "next/server";
import { getMttrData } from "@/lib/clickhouseClient";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const hoursParam = searchParams.get("hours");
    const hours = hoursParam ? parseInt(hoursParam, 10) || 24 : 24;

    const data = await getMttrData(hours);
    return NextResponse.json(data || []);
  } catch (error: any) {
    console.error("[API Analytics MTTR Error]", error);
    return NextResponse.json(
      { error: "Failed to fetch MTTR data", details: error.message },
      { status: 500 }
    );
  }
}
