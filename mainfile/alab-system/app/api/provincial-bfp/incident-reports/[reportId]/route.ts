import { NextRequest, NextResponse } from "next/server";
import { getManagementActor, isProvincialAuthorizationResponse } from "../../../../../lib/provincial-bfp/auth";
import { getProvincialReport } from "../../../../../lib/provincial-bfp/management/reports";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ reportId: string }> },
) {
  const actor = await getManagementActor(request);
  if (isProvincialAuthorizationResponse(actor)) {
    return actor;
  }

  try {
    const { reportId } = await context.params;
    const report = await getProvincialReport(actor, reportId);
    if (!report) {
      return NextResponse.json({ error: "Incident report not found" }, { status: 404 });
    }
    return NextResponse.json({ report }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch report detail";
    const invalid = message.startsWith("INVALID_");
    return NextResponse.json({ error: invalid ? message : "Unable to load provincial reports" }, { status: invalid ? 400 : 500 });
  }
}
