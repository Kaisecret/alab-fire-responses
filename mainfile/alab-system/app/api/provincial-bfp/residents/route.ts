import { NextRequest, NextResponse } from "next/server";

import { getManagementActor, isProvincialAuthorizationResponse } from "../../../../lib/provincial-bfp/auth";
import { listManagedResidents } from "../../../../lib/provincial-bfp/management/residents";
import { parseManagementFilters } from "../../../../lib/provincial-bfp/management/filters";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const actor = await getManagementActor(request);
  if (isProvincialAuthorizationResponse(actor)) {
    return actor;
  }

  try {
    const filters = parseManagementFilters(request.nextUrl.searchParams);
    const page = await listManagedResidents(actor, filters);
    return NextResponse.json(page, {
      headers: {
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "RESIDENTS_QUERY_FAILED";
    let status = message.startsWith("INVALID_") ? 400 : 500;
    if (error instanceof SyntaxError) status = 400;
    if (message === "OPERATION_IDEMPOTENCY_CONFLICT") status = 409;
    return NextResponse.json({ error: status >= 500 ? "Unable to complete this request. Please try again." : message }, { status });
  }
}
