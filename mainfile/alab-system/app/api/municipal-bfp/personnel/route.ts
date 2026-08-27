import { NextRequest, NextResponse } from "next/server";

import { isAuthorizationResponse, requireMunicipalAdmin } from "../../../../lib/municipal-bfp/auth";
import { listMunicipalPersonnel, listMunicipalStations, provisionMunicipalPersonnel } from "../../../../lib/municipal-bfp/stations";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const identity = await requireMunicipalAdmin(request);
    if (isAuthorizationResponse(identity)) return identity;
    const personnel = await listMunicipalPersonnel(identity.municipalityId);
    return NextResponse.json({ personnel });
  } catch (error) {
    console.error("Municipal personnel lookup failed", error);
    return NextResponse.json({ error: "Unable to load personnel." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  let body: { displayName?: unknown; email?: unknown; rankOrPosition?: unknown; stationId?: unknown; temporaryPassword?: unknown };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid personnel data." }, { status: 400 }); }
  try {
    const identity = await requireMunicipalAdmin(request);
    if (isAuthorizationResponse(identity)) return identity;
    const stations = await listMunicipalStations(identity.municipalityId);
    if (!stations.some((station) => station.status === "ACTIVE")) {
      return NextResponse.json({ error: "Create a station before issuing personnel accounts." }, { status: 400 });
    }
    const account = await provisionMunicipalPersonnel(identity.userId, identity.municipalityId, body);
    return NextResponse.json({ account: { userId: account.userId, displayName: account.displayName, email: account.email, stationName: account.stationName }, temporaryPassword: account.temporaryPassword }, { status: 201 });
  } catch (error) {
    const duplicate = typeof error === "object" && error && "code" in error && error.code === "23505";
    if (!duplicate) console.error("Municipal personnel provisioning failed", error);
    const message = duplicate ? "That official email is already in use." : error instanceof Error && error.message === "TEMPORARY_PASSWORD_TOO_SHORT" ? "A temporary password must have at least 12 characters." : "Complete the personnel details and select an active station.";
    return NextResponse.json({ error: message }, { status: duplicate ? 409 : 400 });
  }
}
