import { NextRequest, NextResponse } from "next/server";

import { getBfpIdentity } from "../../../../lib/auth/bfp-accounts";
import { bfpSessionCookieName, verifyBfpSession } from "../../../../lib/auth/session";
import { listScopedMunicipalIncidents } from "../../../../lib/intermunicipality/incident-access";
// Delegates incident retrieval including fr.report_source as "reportSource" to listScopedMunicipalIncidents.
// Underlying scoped query filters by fr.municipality_id = $1 or observer_municipality_id,
// excludes terminal records via fr.status not in ('RESOLVED', 'CLOSED', 'REJECTED', 'FALSE_REPORT', 'DUPLICATE'),
// and returns detectedBuildingDensity, buildingDensityConfidence, buildingDensityBuildingCount.

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const session = verifyBfpSession(request.cookies.get(bfpSessionCookieName("MUNICIPAL_BFP"))?.value);
  if (!session || session.role !== "MUNICIPAL_BFP") return NextResponse.json({ error: "Municipal BFP sign-in is required." }, { status: 401 });
  try {
    const identity = await getBfpIdentity(session.userId);
    if (!identity?.municipalityId) return NextResponse.json({ error: "Your Municipal BFP assignment is not active." }, { status: 403 });
    const includeHistory = request.nextUrl.searchParams.get("scope") === "all";

    const incidents = await listScopedMunicipalIncidents(
      identity.municipalityId,
      includeHistory,
    );

    return NextResponse.json({
      municipality: identity.municipalityName,
      incidents,
    });
  } catch (error) {
    console.error("Municipal incident queue failed", error);
    return NextResponse.json({ error: "Unable to load municipal incidents." }, { status: 500 });
  }
}
