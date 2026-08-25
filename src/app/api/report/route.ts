import { NextResponse } from "next/server";
import { getReport } from "@/lib/getReport";

export async function GET() {
  try {
    const report = await getReport();
    return NextResponse.json(report);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
