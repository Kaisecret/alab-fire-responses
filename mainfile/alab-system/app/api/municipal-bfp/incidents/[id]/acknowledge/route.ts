import { NextRequest, NextResponse } from "next/server";

import { getDatabase } from "../../../../../../lib/db";
import { acknowledgeMunicipalReport } from "../../../../../../lib/fire-reports/municipal-acknowledgement";
import { isAuthorizationResponse, requireMunicipalBfp } from "../../../../../../lib/municipal-bfp/auth";

export const runtime = "nodejs";

/** The origin station saw this report; its alarm should not sound again. */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  // Any officer of the station who sees the alarm can acknowledge it.
  const identity = await requireMunicipalBfp(request);
  if (isAuthorizationResponse(identity)) return identity;

  const { id } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: "Invalid incident ID." }, { status: 400 });
  }

  try {
    const acknowledged = await acknowledgeMunicipalReport(getDatabase(), {
      reportId: id,
      municipalityId: identity.municipalityId,
      userId: identity.userId,
    });
    if (!acknowledged) return NextResponse.json({ error: "Incident not found for this station." }, { status: 404 });
    return NextResponse.json(acknowledged, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("Municipal report acknowledgement failed", id, error);
    return NextResponse.json({ error: "Unable to acknowledge the report." }, { status: 500 });
  }
}
