import { NextRequest, NextResponse } from "next/server";

import { getManagementActor, isProvincialAuthorizationResponse } from "../../../../lib/provincial-bfp/auth";
import { listManagedMunicipalities } from "../../../../lib/provincial-bfp/management/overview";
import { parseManagementFilters } from "../../../../lib/provincial-bfp/management/filters";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const actor = await getManagementActor(request);
  if (isProvincialAuthorizationResponse(actor)) {
    return actor;
  }

  try {
    const filters = parseManagementFilters(request.nextUrl.searchParams);
    const page = await listManagedMunicipalities(actor, filters);
    return NextResponse.json(page, {
      headers: {
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "MUNICIPALITIES_QUERY_FAILED";
    const status = message.startsWith("INVALID_") ? 400 : 500;
    return NextResponse.json({ error: status >= 500 ? "Unable to complete this request. Please try again." : message }, { status });
  }
}
