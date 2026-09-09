import { NextRequest, NextResponse } from "next/server";

import { transitionAssistanceRequest } from "../../../../../lib/intermunicipality/assistance";
import type { AssistanceAction } from "../../../../../lib/intermunicipality/assistance-state";
import { isAuthorizationResponse, requireMunicipalAdmin } from "../../../../../lib/municipal-bfp/auth";

export const runtime = "nodejs";

function validRequestId(value: string) {
  return /^[0-9a-f-]{36}$/i.test(value);
}

type ResponseBody = {
  action?: unknown;
  offeredFiretrucks?: unknown;
  offeredPersonnel?: unknown;
  responseNote?: unknown;
};

const VALID_ACTIONS = new Set<AssistanceAction>(["ACCEPT", "PARTIAL_ACCEPT", "REJECT", "CANCEL"]);

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ requestId: string }> },
) {
  const identity = await requireMunicipalAdmin(request);
  if (isAuthorizationResponse(identity)) return identity;

  const { requestId } = await context.params;
  if (!validRequestId(requestId)) {
    return NextResponse.json({ error: "Invalid assistance request ID." }, { status: 400 });
  }

  let body: ResponseBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Valid request body required." }, { status: 400 });
  }

  if (typeof body.action !== "string" || !VALID_ACTIONS.has(body.action as AssistanceAction)) {
    return NextResponse.json({ error: "Invalid assistance action." }, { status: 400 });
  }

  const action = body.action as AssistanceAction;
  const offeredFiretrucks = Number(body.offeredFiretrucks) || 0;
  const offeredPersonnel = Number(body.offeredPersonnel) || 0;
  const responseNote = typeof body.responseNote === "string" ? body.responseNote : null;

  try {
    const updated = await transitionAssistanceRequest({
      requestId,
      actorMunicipalityId: identity.municipalityId,
      actorUserId: identity.userId,
      action,
      offeredFiretrucks,
      offeredPersonnel,
      responseNote,
    });
    return NextResponse.json({ assistanceRequest: updated });
  } catch (error: any) {
    if (
      error?.message === "INVALID_ASSISTANCE_INPUT" ||
      error?.message === "INVALID_ASSISTANCE_QUANTITY" ||
      error?.message === "INVALID_PARTIAL_ASSISTANCE" ||
      error?.message === "ACCEPTED_ASSISTANCE_MUST_MATCH_REQUEST" ||
      error?.message === "REJECTED_ASSISTANCE_MUST_OFFER_ZERO" ||
      error?.message === "CANCELLED_ASSISTANCE_MUST_OFFER_ZERO"
    ) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error?.message === "ASSISTANCE_NOT_FOUND") {
      return NextResponse.json({ error: "Assistance request not found." }, { status: 404 });
    }
    if (
      error?.message === "FORBIDDEN_NOT_RECIPIENT" ||
      error?.message === "FORBIDDEN_NOT_REQUESTER"
    ) {
      return NextResponse.json({ error: "You are not authorized to perform this assistance action." }, { status: 403 });
    }
    if (error?.message === "ASSISTANCE_STATE_CONFLICT") {
      return NextResponse.json({ error: "Assistance request is no longer in an actionable state." }, { status: 409 });
    }

    console.error("Assistance transition failed for request", requestId, error);
    return NextResponse.json({ error: "Unable to update assistance request." }, { status: 500 });
  }
}
