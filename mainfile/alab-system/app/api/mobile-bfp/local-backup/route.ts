import { NextResponse } from "next/server";

import { isMobileBfpAuthorization, requireMobileMunicipalBfp } from "../../../../lib/auth/mobile-bfp";
import { getLocalBackupOptions, requestLocalBackup } from "../../../../lib/municipal-bfp/local-backup";

export const runtime = "nodejs";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const REFUSALS: Record<string, [number, string]> = {
  DISPATCH_NOT_FOUND: [404, "This dispatch is no longer active."],
  LOCAL_BACKUP_NOT_AVAILABLE: [409, "Your town has no other station free for local backup."],
  INVALID_STATION_SELECTION: [400, "Pick a station from your town that is not already on this fire."],
  LOCAL_BACKUP_ALREADY_REQUESTED: [409, "Local backup is already waiting for the fire marshal."],
};

function refusal(error: unknown, fallback: string) {
  const known = error instanceof Error ? REFUSALS[error.message] : undefined;
  if (known) return NextResponse.json({ error: known[1], code: (error as Error).message }, { status: known[0] });
  console.error(fallback, error);
  return NextResponse.json({ error: "Local backup is unavailable right now." }, { status: 500 });
}

/** The station cards behind the app's Local backup button. */
export async function GET(request: Request) {
  const session = requireMobileMunicipalBfp(request);
  if (isMobileBfpAuthorization(session)) return session;
  const dispatchId = new URL(request.url).searchParams.get("dispatchId") ?? "";
  if (!UUID.test(dispatchId)) return NextResponse.json({ error: "A valid dispatch is required." }, { status: 400 });
  try {
    return NextResponse.json(await getLocalBackupOptions(session.userId, dispatchId));
  } catch (error) {
    return refusal(error, "Local backup options failed");
  }
}

/** A responder asks their own town's fire marshal for the stations they picked. */
export async function POST(request: Request) {
  const session = requireMobileMunicipalBfp(request);
  if (isMobileBfpAuthorization(session)) return session;
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const dispatchId = typeof body.dispatchId === "string" ? body.dispatchId : "";
  if (!UUID.test(dispatchId)) return NextResponse.json({ error: "A valid dispatch is required." }, { status: 400 });
  try {
    const localBackupRequest = await requestLocalBackup({
      userId: session.userId,
      dispatchId,
      stationIds: body.stationIds,
      reason: typeof body.reason === "string" ? body.reason : null,
    });
    return NextResponse.json({ localBackupRequest }, { status: 201 });
  } catch (error) {
    return refusal(error, "Local backup request failed");
  }
}
