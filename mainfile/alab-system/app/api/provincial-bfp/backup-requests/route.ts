import { NextRequest, NextResponse } from "next/server";

import {
  isProvincialAuthorizationResponse,
  requireProvincialBfp,
} from "../../../../lib/provincial-bfp/auth";
import {
  acknowledgeProvincialBackupRequest,
  declareAlarmLevel,
  forwardExpiredBackupRequests,
  listProvincialBackupRequests,
} from "../../../../lib/incidents/backup-escalation";
import { isDeclarableAlarmLevel } from "../../../../lib/incidents/alarm-doctrine";

export const runtime = "nodejs";

/** Backup requests that have reached the province. */
export async function GET(request: NextRequest) {
  const identity = await requireProvincialBfp(request);
  if (isProvincialAuthorizationResponse(identity)) return identity;

  try {
    await forwardExpiredBackupRequests();
    const backupRequests = await listProvincialBackupRequests();
    return NextResponse.json({ backupRequests });
  } catch (error) {
    console.error("Provincial backup request list failed", error);
    return NextResponse.json({ error: "Unable to load backup requests." }, { status: 500 });
  }
}

/** Silences the provincial alarm for one request. It declares nothing. */
export async function PATCH(request: NextRequest) {
  const identity = await requireProvincialBfp(request);
  if (isProvincialAuthorizationResponse(identity)) return identity;

  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const backupRequestId = typeof body.backupRequestId === "string" ? body.backupRequestId : "";
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(backupRequestId)) {
    return NextResponse.json({ error: "A valid backup request is required." }, { status: 400 });
  }

  try {
    const backupRequest = await acknowledgeProvincialBackupRequest(backupRequestId, identity.userId);
    if (!backupRequest) {
      return NextResponse.json({ error: "That backup request no longer exists." }, { status: 404 });
    }
    return NextResponse.json({ backupRequest });
  } catch (error) {
    console.error("Provincial backup acknowledgement failed", error);
    return NextResponse.json({ error: "Unable to acknowledge that request." }, { status: 500 });
  }
}

/** Declares an alarm level, which is what summons further municipalities. */
export async function POST(request: NextRequest) {
  const identity = await requireProvincialBfp(request);
  if (isProvincialAuthorizationResponse(identity)) return identity;

  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const fireReportId = typeof body.fireReportId === "string" ? body.fireReportId : "";
  const alarmLevel = Number(body.alarmLevel);

  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(fireReportId)) {
    return NextResponse.json({ error: "A valid incident is required." }, { status: 400 });
  }
  // The first alarm is raised by the report itself; the fifth is Region VI's.
  if (!isDeclarableAlarmLevel(alarmLevel)) {
    return NextResponse.json({ error: "Choose an alarm level from 2 to 4." }, { status: 400 });
  }

  try {
    const declared = await declareAlarmLevel({
      fireReportId,
      alarmLevel,
      declaredByUserId: identity.userId,
      backupRequestId: typeof body.backupRequestId === "string" ? body.backupRequestId : null,
      note: typeof body.note === "string" ? body.note : null,
    });
    return NextResponse.json({ ...declared }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "ALARM_LEVEL_NOT_HIGHER") {
      return NextResponse.json(
        { error: "That alarm level has already been declared. Declare a higher one." },
        { status: 409 },
      );
    }
    if (message === "INVALID_ALARM_LEVEL") {
      return NextResponse.json({ error: "Choose an alarm level from 2 to 4." }, { status: 400 });
    }
    if (message === "ALARM_NEEDS_DISPATCH") {
      return NextResponse.json(
        { error: "No station has been dispatched to this incident yet, so there is nothing to reinforce." },
        { status: 409 },
      );
    }
    if (message === "ALARM_INCIDENT_CLOSED") {
      return NextResponse.json(
        { error: "That incident is already closed." },
        { status: 409 },
      );
    }
    if (message === "ALARM_SUMMONS_FAILED") {
      // The level stands, but nobody was called: say so rather than let the
      // province believe mutual aid is on its way.
      return NextResponse.json(
        { error: "The alarm was recorded, but the other municipalities could not be called. Retry." },
        { status: 502 },
      );
    }
    console.error("Alarm declaration failed", error);
    return NextResponse.json({ error: "Unable to declare that alarm level." }, { status: 500 });
  }
}
