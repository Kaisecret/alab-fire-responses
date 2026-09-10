import { NextRequest, NextResponse } from "next/server";
import { getManagementActor, isProvincialAuthorizationResponse } from "../../../../lib/provincial-bfp/auth";
import { parseManagementFilters } from "../../../../lib/provincial-bfp/management/filters";
import { listProvincialAuditEvents } from "../../../../lib/provincial-bfp/management/audit";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const actor = await getManagementActor(request);
  if (isProvincialAuthorizationResponse(actor)) {
    return actor;
  }

  try {
    const filters = parseManagementFilters(request.nextUrl.searchParams);
    const result = await listProvincialAuditEvents(actor, filters);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to list audit events";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
