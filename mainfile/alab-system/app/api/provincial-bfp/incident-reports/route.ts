import { NextRequest, NextResponse } from "next/server";
import { getManagementActor, isProvincialAuthorizationResponse } from "../../../../lib/provincial-bfp/auth";
import { parseReportFilters } from "../../../../lib/provincial-bfp/management/filters";
import { listProvincialReports } from "../../../../lib/provincial-bfp/management/reports";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const actor = await getManagementActor(request);
  if (isProvincialAuthorizationResponse(actor)) {
    return actor;
  }

  try {
    const filters = parseReportFilters(request.nextUrl.searchParams);
    const result = await listProvincialReports(actor, filters);
    return NextResponse.json(result, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to list incident reports";
    const invalid = message.startsWith("INVALID_");
    return NextResponse.json({ error: invalid ? message : "Unable to load provincial reports" }, { status: invalid ? 400 : 500 });
  }
}
