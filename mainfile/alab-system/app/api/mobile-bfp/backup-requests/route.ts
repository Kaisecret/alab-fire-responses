import { NextResponse } from "next/server";

import { isMobileBfpAuthorization, requireMobileMunicipalBfp } from "../../../../lib/auth/mobile-bfp";
import { findOpenBackupRequestForDispatch, requestBackup } from "../../../../lib/incidents/backup-escalation";

export const runtime = "nodejs";

/** Whether an open backup request already exists for this dispatch. */
export async function GET(request: Request) {
  const session = requireMobileMunicipalBfp(request);
  if (isMobileBfpAuthorization(session)) return session;

  const url = new URL(request.url);
  const dispatchId = url.searchParams.get("dispatchId") ?? "";
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(dispatchId)) {
    return NextResponse.json({ error: "A valid dispatch is required." }, { status: 400 });
  }

  try {
    const open = await findOpenBackupRequestForDispatch(session.userId, dispatchId);
    return NextResponse.json({ alreadyRequested: open !== null, backupRequest: open });
  } catch (error) {
    console.error("Backup request lookup failed", error);
    return NextResponse.json({ error: "Unable to check backup status." }, { status: 500 });
  }
}


/** A responder on scene calls for backup on an incident they are working. */
export async function POST(request: Request) {
  const session = requireMobileMunicipalBfp(request);
  if (isMobileBfpAuthorization(session)) return session;

  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const fireReportId = typeof body.fireReportId === "string" && UUID.test(body.fireReportId)
    ? body.fireReportId
    : null;
  const dispatchId = typeof body.dispatchId === "string" && UUID.test(body.dispatchId)
    ? body.dispatchId
    : null;

  if (!fireReportId && !dispatchId) {
    return NextResponse.json({ error: "A valid incident is required." }, { status: 400 });
  }

  try {
    const created = await requestBackup({
      responderUserId: session.userId,
      fireReportId,
      dispatchId,
      reason: typeof body.reason === "string" ? body.reason : null,
      requestedFiretrucks: Number(body.requestedFiretrucks) || 0,
      requestedPersonnel: Number(body.requestedPersonnel) || 0,
    });
    return NextResponse.json({ backupRequest: created }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "BACKUP_ALREADY_REQUESTED") {
      return NextResponse.json(
        { error: "Backup was already requested for this incident.", code: "ALREADY_REQUESTED" },
        { status: 409 },
      );
    }
    if (message === "INCIDENT_NOT_FOUND") {
      return NextResponse.json({ error: "That incident was not found." }, { status: 404 });
    }
    console.error("Mobile backup request failed", error);
    return NextResponse.json({ error: "Unable to request backup right now." }, { status: 500 });
  }
}
