import { NextRequest, NextResponse } from "next/server";

import { isAuthorizationResponse, requireMunicipalAdmin } from "../../../../../../lib/municipal-bfp/auth";
import { getIncidentDispatchProgress } from "../../../../../../lib/municipal-bfp/dispatch";

export const runtime = "nodejs";

function validIncidentId(value: string) {
  return /^[0-9a-f-]{36}$/i.test(value);
}

/** Who was alerted, who answered, and who is on scene. */
export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const identity = await requireMunicipalAdmin(request);
  if (isAuthorizationResponse(identity)) return identity;

  const { id } = await context.params;
  if (!validIncidentId(id)) return NextResponse.json({ error: "Invalid incident." }, { status: 400 });

  try {
    const dispatches = await getIncidentDispatchProgress(id, identity.municipalityId);
    return NextResponse.json({ dispatches });
  } catch (error) {
    console.error("Municipal dispatch status failed", error);
    return NextResponse.json({ error: "Unable to load the dispatch status." }, { status: 500 });
  }
}
