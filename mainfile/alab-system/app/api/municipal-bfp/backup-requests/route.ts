import { NextRequest, NextResponse } from "next/server";

import { NextResponse as AuthResponse } from "next/server";

import { getBfpIdentity } from "../../../../lib/auth/bfp-accounts";
import { resolveMunicipalSession } from "../../../../lib/auth/session";
import {
  acknowledgeBackupRequest,
  forwardBackupRequest,
  forwardExpiredBackupRequests,
  getBackupRequest,
  listMunicipalBackupRequests,
} from "../../../../lib/incidents/backup-escalation";

export const runtime = "nodejs";

/**
 * Any municipal BFP account may see and act on a backup alarm. Forwarding a
 * responder's call for help is duty-officer work, not an administrative task,
 * so this deliberately does not require the administrator role.
 */
async function requireMunicipalMember(request: NextRequest) {
  const session = resolveMunicipalSession(request.cookies, request.headers);
  if (!session || session.role !== "MUNICIPAL_BFP") {
    return AuthResponse.json({ error: "Municipal BFP sign-in is required." }, { status: 401 });
  }
  const identity = await getBfpIdentity(session.userId);
  if (!identity?.municipalityId) {
    return AuthResponse.json({ error: "Your Municipal BFP assignment is not active." }, { status: 403 });
  }
  return identity;
}

function isAuthResponse(value: unknown): value is NextResponse {
  return value instanceof AuthResponse;
}


/**
 * Open backup requests for the signed-in municipality.
 *
 * The sweep for expired requests runs here as well as on the schedule, so a
 * municipality that is actively watching still sees an escalation land on time
 * rather than waiting for the next scheduled run.
 */
export async function GET(request: NextRequest) {
  const identity = await requireMunicipalMember(request);
  if (isAuthResponse(identity)) return identity;
  if (!identity.municipalityId) {
    return NextResponse.json({ error: "Your Municipal BFP assignment is not active." }, { status: 403 });
  }

  try {
    await forwardExpiredBackupRequests();
    const backupRequests = await listMunicipalBackupRequests(identity.municipalityId);
    return NextResponse.json({ backupRequests });
  } catch (error) {
    console.error("Municipal backup request list failed", error);
    return NextResponse.json({ error: "Unable to load backup requests." }, { status: 500 });
  }
}

/** Acknowledge a request, or forward it to the province. */
export async function PATCH(request: NextRequest) {
  const identity = await requireMunicipalMember(request);
  if (isAuthResponse(identity)) return identity;
  if (!identity.municipalityId) {
    return NextResponse.json({ error: "Your Municipal BFP assignment is not active." }, { status: 403 });
  }

  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const backupRequestId = typeof body.backupRequestId === "string" ? body.backupRequestId : "";
  const action = typeof body.action === "string" ? body.action : "";

  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(backupRequestId)) {
    return NextResponse.json({ error: "A valid backup request is required." }, { status: 400 });
  }
  if (action !== "ACKNOWLEDGE" && action !== "FORWARD") {
    return NextResponse.json({ error: "Choose acknowledge or forward." }, { status: 400 });
  }

  try {
    // A municipality may only act on a request raised against its own incident.
    const existing = await getBackupRequest(backupRequestId);
    if (!existing || existing.municipalityId !== identity.municipalityId) {
      return NextResponse.json({ error: "That backup request was not found." }, { status: 404 });
    }

    const updated = action === "FORWARD"
      ? await forwardBackupRequest(backupRequestId, { userId: identity.userId })
      : await acknowledgeBackupRequest(backupRequestId, identity.userId);

    return NextResponse.json({ backupRequest: updated });
  } catch (error) {
    console.error("Municipal backup request update failed", error);
    return NextResponse.json({ error: "Unable to update that backup request." }, { status: 500 });
  }
}
