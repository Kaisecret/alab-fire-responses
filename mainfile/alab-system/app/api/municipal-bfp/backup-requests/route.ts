import { NextRequest, NextResponse } from "next/server";

import { isAuthorizationResponse, requireMunicipalAdmin } from "../../../../lib/municipal-bfp/auth";
import {
  acknowledgeBackupRequest,
  forwardBackupRequest,
  forwardExpiredBackupRequests,
  getBackupRequest,
  listMunicipalBackupRequests,
} from "../../../../lib/incidents/backup-escalation";

export const runtime = "nodejs";

/**
 * Open backup requests for the signed-in municipality.
 *
 * The sweep for expired requests runs here as well as on the schedule, so a
 * municipality that is actively watching still sees an escalation land on time
 * rather than waiting for the next scheduled run.
 */
export async function GET(request: NextRequest) {
  const identity = await requireMunicipalAdmin(request);
  if (isAuthorizationResponse(identity)) return identity;
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
  const identity = await requireMunicipalAdmin(request);
  if (isAuthorizationResponse(identity)) return identity;
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
