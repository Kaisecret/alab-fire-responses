import { NextRequest, NextResponse } from "next/server";

import { createAssistanceRequests } from "../../../../../../lib/intermunicipality/assistance";
import { isAuthorizationResponse, requireMunicipalAdmin } from "../../../../../../lib/municipal-bfp/auth";

export const runtime = "nodejs";

function validIncidentId(value: string) {
  return /^[0-9a-f-]{36}$/i.test(value);
}

type RequestBody = {
  recipientMunicipalityIds?: unknown;
  requestedFiretrucks?: unknown;
  requestedPersonnel?: unknown;
  requestNote?: unknown;
};

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

  let body: RequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Valid request body required." }, { status: 400 });
  }

  const rawRecipients = Array.isArray(body.recipientMunicipalityIds)
    ? body.recipientMunicipalityIds.filter((v): v is string => typeof v === "string")
    : [];
  const requestedFiretrucks = Number(body.requestedFiretrucks) || 0;
  const requestedPersonnel = Number(body.requestedPersonnel) || 0;
  const requestNote = typeof body.requestNote === "string" ? body.requestNote : null;

  try {
    const requests = await createAssistanceRequests({
      fireReportId: id,
      requesterMunicipalityId: identity.municipalityId,
      actorUserId: identity.userId,
      recipientMunicipalityIds: rawRecipients,
      requestedFiretrucks,
      requestedPersonnel,
      requestNote,
    });
    return NextResponse.json({ requests }, { status: 201 });
  } catch (error: any) {
    if (
      error?.message === "INVALID_ASSISTANCE_INPUT" ||
      error?.message === "ASSISTANCE_RESOURCES_REQUIRED" ||
      error?.message === "INVALID_ASSISTANCE_QUANTITY"
    ) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error?.message === "INCIDENT_NOT_FOUND") {
      return NextResponse.json({ error: "Active incident not found in your municipality." }, { status: 404 });
    }
    if (
      error?.message === "UNSELECTED_ASSISTANCE_RECIPIENT" ||
      error?.message === "FORBIDDEN_ORIGIN_MISMATCH"
    ) {
      return NextResponse.json({ error: "Assistance may only be requested from active observer municipalities." }, { status: 403 });
    }
    if (
      error?.message === "INCIDENT_NOT_ACTIVE" ||
      error?.message === "ASSISTANCE_ALREADY_OPEN"
    ) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }

    console.error("Assistance request creation failed for incident", id, error);
    return NextResponse.json({ error: "Unable to create backup request." }, { status: 500 });
  }
}
