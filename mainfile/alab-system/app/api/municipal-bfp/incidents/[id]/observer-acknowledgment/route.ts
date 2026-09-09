import { NextRequest, NextResponse } from "next/server";

import { acknowledgeNearbyIncident } from "../../../../../../lib/intermunicipality/observers";
import { isAuthorizationResponse, requireMunicipalAdmin } from "../../../../../../lib/municipal-bfp/auth";

export const runtime = "nodejs";

function validIncidentId(value: string) {
  return /^[0-9a-f-]{36}$/i.test(value);
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const identity = await requireMunicipalAdmin(request);
  if (isAuthorizationResponse(identity)) return identity;

  const { id } = await context.params;
  if (!validIncidentId(id)) {
    return NextResponse.json({ error: "Invalid incident ID." }, { status: 400 });
  }

  try {
    const observer = await acknowledgeNearbyIncident({
      fireReportId: id,
      observerMunicipalityId: identity.municipalityId,
      actorUserId: identity.userId,
      acknowledgedAt: new Date(),
    });
    return NextResponse.json({ observer });
  } catch (error: any) {
    if (error?.message === "INCIDENT_NOT_FOUND") {
      return NextResponse.json({ error: "Incident not found or observer access not granted." }, { status: 404 });
    }
    if (error?.message === "OBSERVER_ACCESS_ENDED") {
      return NextResponse.json({ error: "Observer access has ended for this incident." }, { status: 409 });
    }
    console.error("Observer acknowledgment failed", id, error);
    return NextResponse.json({ error: "Unable to acknowledge alert." }, { status: 500 });
  }
}
