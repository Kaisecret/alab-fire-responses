import { NextRequest, NextResponse } from "next/server";

import { getBfpIdentity } from "../../../../lib/auth/bfp-accounts";
import { resolveMunicipalSession } from "../../../../lib/auth/session";
import {
  declineLocalBackup,
  listMunicipalLocalBackupRequests,
  sendLocalBackup,
} from "../../../../lib/municipal-bfp/local-backup";

export const runtime = "nodejs";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Any municipal BFP account of the town may answer, as with the existing
 * backup alarm: sending a station is duty-officer work.
 */
async function requireMunicipalMember(request: NextRequest) {
  const session = resolveMunicipalSession(request.cookies, request.headers);
  if (!session || session.role !== "MUNICIPAL_BFP") {
    return NextResponse.json({ error: "Municipal BFP sign-in is required." }, { status: 401 });
  }
  const identity = await getBfpIdentity(session.userId);
  if (!identity?.municipalityId) {
    return NextResponse.json({ error: "Your Municipal BFP assignment is not active." }, { status: 403 });
  }
  return { userId: identity.userId, municipalityId: identity.municipalityId };
}

const REFUSALS: Record<string, [number, string]> = {
  LOCAL_BACKUP_NOT_FOUND: [404, "This request was already answered."],
  DISPATCH_ENDED: [409, "That response has already ended."],
  INVALID_STATION_SELECTION: [400, "Pick stations that are free and not already on this fire."],
};

/** Open local backup requests for the signed-in town. */
export async function GET(request: NextRequest) {
  const identity = await requireMunicipalMember(request);
  if (identity instanceof NextResponse) return identity;
  try {
    return NextResponse.json({ localBackupRequests: await listMunicipalLocalBackupRequests(identity.municipalityId) });
  } catch (error) {
    console.error("Local backup request list failed", error);
    return NextResponse.json({ error: "Unable to load local backup requests." }, { status: 500 });
  }
}

/** Send the chosen stations, or decline. */
export async function PATCH(request: NextRequest) {
  const identity = await requireMunicipalMember(request);
  if (identity instanceof NextResponse) return identity;
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const requestId = typeof body.requestId === "string" ? body.requestId : "";
  if (!UUID.test(requestId)) return NextResponse.json({ error: "A valid request is required." }, { status: 400 });
  if (body.action !== "SEND" && body.action !== "DECLINE") {
    return NextResponse.json({ error: "Choose send or decline." }, { status: 400 });
  }
  try {
    if (body.action === "DECLINE") {
      await declineLocalBackup({ actorUserId: identity.userId, municipalityId: identity.municipalityId, requestId });
      return NextResponse.json({ declined: true });
    }
    const sent = await sendLocalBackup({
      actorUserId: identity.userId,
      municipalityId: identity.municipalityId,
      requestId,
      stationIds: body.stationIds,
    });
    return NextResponse.json({ sent: { stationNames: sent.stationNames, crewCount: sent.recipientUserIds.length } });
  } catch (error) {
    const known = error instanceof Error ? REFUSALS[error.message] : undefined;
    if (known) return NextResponse.json({ error: known[1] }, { status: known[0] });
    console.error("Local backup update failed", error);
    return NextResponse.json({ error: "Unable to answer that request." }, { status: 500 });
  }
}
