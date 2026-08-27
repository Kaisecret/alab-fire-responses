import { NextRequest, NextResponse } from "next/server";

import { isAuthorizationResponse, requireMunicipalAdmin } from "../../../../lib/municipal-bfp/auth";
import { createMunicipalStation, listMunicipalStations } from "../../../../lib/municipal-bfp/stations";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const identity = await requireMunicipalAdmin(request);
    if (isAuthorizationResponse(identity)) return identity;
    const stations = await listMunicipalStations(identity.municipalityId);
    return NextResponse.json({ stations });
  } catch (error) {
    console.error("Municipal stations lookup failed", error);
    return NextResponse.json({ error: "Unable to load stations." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  let body: { stationName?: unknown; latitude?: unknown; longitude?: unknown };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid station data." }, { status: 400 }); }
  try {
    const identity = await requireMunicipalAdmin(request);
    if (isAuthorizationResponse(identity)) return identity;
    const station = await createMunicipalStation(identity.userId, identity.municipalityId, body);
    return NextResponse.json({ station }, { status: 201 });
  } catch (error) {
    const duplicate = typeof error === "object" && error && "code" in error && error.code === "23505";
    if (!duplicate) console.error("Municipal station create failed", error);
    return NextResponse.json({ error: duplicate ? "An active station with that name already exists." : "Enter a station name and valid Philippine coordinates." }, { status: duplicate ? 409 : 400 });
  }
}
