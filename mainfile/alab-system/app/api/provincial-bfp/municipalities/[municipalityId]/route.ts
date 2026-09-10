import { NextRequest, NextResponse } from "next/server";

import { getManagementActor, isProvincialAuthorizationResponse } from "../../../../../lib/provincial-bfp/auth";
import { getManagedMunicipality } from "../../../../../lib/provincial-bfp/management/overview";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ municipalityId: string }> },
) {
  const actor = await getManagementActor(request);
  if (isProvincialAuthorizationResponse(actor)) {
    return actor;
  }

  const { municipalityId } = await context.params;
  if (!municipalityId || !/^[0-9a-f-]{36}$/i.test(municipalityId)) {
    return NextResponse.json({ error: "INVALID_MUNICIPALITY_ID" }, { status: 400 });
  }

  try {
    const municipality = await getManagedMunicipality(actor, municipalityId);
    if (!municipality) {
      return NextResponse.json({ error: "MUNICIPALITY_NOT_FOUND" }, { status: 404 });
    }
    return NextResponse.json(municipality, {
      headers: {
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "MUNICIPALITY_QUERY_FAILED";
    const status = message === "MUNICIPALITY_NOT_FOUND" ? 404 : 500;
    return NextResponse.json({ error: status >= 500 ? "Unable to complete this request. Please try again." : message }, { status });
  }
}
