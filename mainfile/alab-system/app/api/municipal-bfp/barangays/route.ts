import { NextRequest, NextResponse } from "next/server";

import { getDatabase } from "../../../../lib/db";
import { isAuthorizationResponse, requireMunicipalAdmin } from "../../../../lib/municipal-bfp/auth";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const identity = await requireMunicipalAdmin(request);
  if (isAuthorizationResponse(identity)) return identity;

  try {
    const result = await getDatabase().query<{ id: string; name: string }>(
      "select id, name from barangays where municipality_id = $1 order by lower(name) asc",
      [identity.municipalityId],
    );
    const barangays = result.rows;
    const data = { barangays };
    return NextResponse.json({ ...data, municipality: identity.municipalityName });
  } catch (error) {
    console.error("Municipal barangay lookup failed", error);
    return NextResponse.json({ error: "Unable to load municipal barangays." }, { status: 500 });
  }
}
