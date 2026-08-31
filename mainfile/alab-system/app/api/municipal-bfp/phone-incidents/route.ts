import { NextRequest, NextResponse } from "next/server";

import { isAuthorizationResponse, requireMunicipalAdmin } from "../../../../lib/municipal-bfp/auth";
import { createPhoneCallIncidentAndDispatch } from "../../../../lib/municipal-bfp/phone-incidents";

export const runtime = "nodejs";

const statusByCode: Record<string, number> = {
  INVALID_PHONE_CALL_INPUT: 400,
  INVALID_STATION_RESPONDER_SELECTION: 409,
  STATION_RESPONDER_SELECTION_REQUIRED: 400,
  BARANGAY_NOT_IN_MUNICIPALITY: 409,
};

const messageByCode: Record<string, string> = {
  INVALID_PHONE_CALL_INPUT: "Enter valid phone-call incident details.",
  INVALID_STATION_RESPONDER_SELECTION: "The selected station or responders are no longer available.",
  STATION_RESPONDER_SELECTION_REQUIRED: "Select at least one responder.",
  BARANGAY_NOT_IN_MUNICIPALITY: "The selected barangay is not in your municipality.",
};

export async function POST(request: NextRequest) {
  const identity = await requireMunicipalAdmin(request);
  if (isAuthorizationResponse(identity)) return identity;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Enter valid phone-call incident details." }, { status: 400 });
  }

  try {
    const incident = await createPhoneCallIncidentAndDispatch(body, {
      actorUserId: identity.userId,
      municipalityId: identity.municipalityId,
      municipalityName: identity.municipalityName ?? "Municipal BFP",
    });
    return NextResponse.json({ incident }, { status: 201 });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    const status = statusByCode[code];
    if (status) return NextResponse.json({ error: messageByCode[code] }, { status });
    console.error("Phone-call incident dispatch failed", error);
    return NextResponse.json({ error: "Unable to create and dispatch this phone-call incident." }, { status: 500 });
  }
}
