import { NextRequest, NextResponse } from "next/server";

import {
  isProvincialAuthorizationResponse,
  requireProvincialBfp,
} from "../../../../lib/provincial-bfp/auth";
import {
  declareAlarmLevel,
  forwardExpiredBackupRequests,
  listProvincialBackupRequests,
} from "../../../../lib/incidents/backup-escalation";

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
  if (!Number.isInteger(alarmLevel) || alarmLevel < 1 || alarmLevel > 5) {
    return NextResponse.json({ error: "Choose an alarm level from 1 to 5." }, { status: 400 });
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
      return NextResponse.json({ error: "Choose an alarm level from 1 to 5." }, { status: 400 });
    }
    console.error("Alarm declaration failed", error);
    return NextResponse.json({ error: "Unable to declare that alarm level." }, { status: 500 });
  }
}
