import { NextRequest, NextResponse } from "next/server";

import { isAuthorizationResponse, requireMunicipalAdmin } from "../../../../../lib/municipal-bfp/auth";
import { setMunicipalPersonnelStatus, transferMunicipalPersonnel } from "../../../../../lib/municipal-bfp/stations";

export const runtime = "nodejs";

export async function PATCH(request: NextRequest, context: { params: Promise<{ personnelId: string }> }) {
  let body: { action?: unknown; stationId?: unknown };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid personnel update." }, { status: 400 }); }
  try {
    const identity = await requireMunicipalAdmin(request);
    if (isAuthorizationResponse(identity)) return identity;
    const { personnelId } = await context.params;
    if (body.action === "transfer") await transferMunicipalPersonnel(identity.userId, identity.municipalityId, personnelId, body.stationId);
    else if (body.action === "suspend") await setMunicipalPersonnelStatus(identity.userId, identity.municipalityId, personnelId, false);
    else if (body.action === "activate") await setMunicipalPersonnelStatus(identity.userId, identity.municipalityId, personnelId, true);
    else return NextResponse.json({ error: "Choose a valid personnel action." }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Municipal personnel update failed", error);
    return NextResponse.json({ error: "Unable to update this personnel account." }, { status: 400 });
  }
}
