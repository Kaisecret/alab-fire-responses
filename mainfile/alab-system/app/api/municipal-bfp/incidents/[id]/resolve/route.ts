import { NextRequest, NextResponse } from "next/server";

import { isAuthorizationResponse, requireMunicipalAdmin } from "../../../../../../lib/municipal-bfp/auth";
import { resolveMunicipalIncident } from "../../../../../../lib/municipal-bfp/dispatch";

export const runtime = "nodejs";

function validIncidentId(value: string) {
  return /^[0-9a-f-]{36}$/i.test(value);
}

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const identity = await requireMunicipalAdmin(request);
  if (isAuthorizationResponse(identity)) return identity;
  const { id } = await context.params;
  if (!validIncidentId(id)) return NextResponse.json({ error: "Invalid incident." }, { status: 400 });

  try {
    const resolution = await resolveMunicipalIncident({
      fireReportId: id,
      municipalityId: identity.municipalityId,
      actorUserId: identity.userId,
    });
    return NextResponse.json({ resolution });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (code === "NOT_FOUND") return NextResponse.json({ error: "Incident not found in your municipality." }, { status: 404 });
    if (code === "INVALID_STATUS") return NextResponse.json({ error: "Only an active responding incident can be resolved." }, { status: 409 });
    if (code === "INVALID_INCIDENT_INPUT") return NextResponse.json({ error: "Invalid incident." }, { status: 400 });
    console.error("Municipal incident resolution failed", error);
    return NextResponse.json({ error: "Unable to resolve this incident." }, { status: 500 });
  }
}
