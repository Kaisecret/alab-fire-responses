import { NextResponse } from "next/server";

import { isMobileBfpAuthorization, requireMobileMunicipalBfp } from "../../../../../lib/auth/mobile-bfp";
import { acknowledgeDispatchRoute, recordDispatchLocation, resolveDispatchIncident } from "../../../../../lib/municipal-bfp/dispatch";

export const runtime = "nodejs";

function validId(value: string) {
  return /^[0-9a-f-]{36}$/i.test(value);
}

export async function POST(request: Request, context: { params: Promise<{ dispatchId: string }> }) {
  const session = requireMobileMunicipalBfp(request);
  if (isMobileBfpAuthorization(session)) return session;
  const { dispatchId } = await context.params;
  if (!validId(dispatchId)) return NextResponse.json({ error: "Invalid dispatch." }, { status: 400 });
  let body: { action?: unknown; latitude?: unknown; longitude?: unknown };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid dispatch update." }, { status: 400 }); }

  try {
    if (body.action === "START_ROUTE") {
      return NextResponse.json({ assignment: await acknowledgeDispatchRoute(session.userId, dispatchId) });
    }
    if (body.action === "LOCATION_PING") {
      return NextResponse.json({ arrival: await recordDispatchLocation(session.userId, dispatchId, Number(body.latitude), Number(body.longitude)) });
    }
    if (body.action === "RESOLVE_INCIDENT") {
      return NextResponse.json({ resolution: await resolveDispatchIncident(session.userId, dispatchId) });
    }
    return NextResponse.json({ error: "Unsupported dispatch update." }, { status: 400 });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (code === "ASSIGNMENT_NOT_FOUND") return NextResponse.json({ error: "This incident is not assigned to your account." }, { status: 404 });
    if (code === "INVALID_RECIPIENT_STATUS") return NextResponse.json({ error: "This dispatch cannot be updated in its current state." }, { status: 409 });
    if (code === "INVALID_LOCATION") return NextResponse.json({ error: "A valid current location is required." }, { status: 400 });
    console.error("Mobile dispatch update failed", error);
    return NextResponse.json({ error: "Unable to update the dispatch." }, { status: 500 });
  }
}
