import { NextRequest, NextResponse } from "next/server";

import { isAuthorizationResponse, requireMunicipalAdmin } from "../../../../../lib/municipal-bfp/auth";
import { deactivateMunicipalStation, updateMunicipalStation } from "../../../../../lib/municipal-bfp/stations";

export const runtime = "nodejs";

const STATION_OUTSIDE_MUNICIPALITY = "That pin is outside your municipality. Place the station inside your own town.";

export async function PATCH(request: NextRequest, context: { params: Promise<{ stationId: string }> }) {
  let body: { action?: unknown; stationName?: unknown; latitude?: unknown; longitude?: unknown };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid station data." }, { status: 400 }); }
  try {
    const identity = await requireMunicipalAdmin(request);
    if (isAuthorizationResponse(identity)) return identity;
    const { stationId } = await context.params;
    if (body.action === "deactivate") {
      await deactivateMunicipalStation(identity.userId, identity.municipalityId, stationId);
      return NextResponse.json({ ok: true });
    }
    const station = await updateMunicipalStation(identity.userId, identity.municipalityId, stationId, body);
    return NextResponse.json({ station });
  } catch (error) {
    if (error instanceof Error && error.message === "INVALID_STATION_OUTSIDE_MUNICIPALITY") {
      return NextResponse.json({ error: STATION_OUTSIDE_MUNICIPALITY }, { status: 400 });
    }
    const message = error instanceof Error && error.message === "STATION_HAS_ACTIVE_PERSONNEL"
      ? "Move active personnel before deactivating this station."
      : "Enter a unique station name and valid Philippine coordinates.";
    const status = error instanceof Error && error.message === "STATION_HAS_ACTIVE_PERSONNEL" ? 409 : 400;
    if (status !== 409) console.error("Municipal station update failed", error);
    return NextResponse.json({ error: message }, { status });
  }
}
