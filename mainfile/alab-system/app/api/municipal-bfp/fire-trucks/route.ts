import { NextRequest, NextResponse } from "next/server";

import { isAuthorizationResponse, requireMunicipalBfp } from "../../../../lib/municipal-bfp/auth";
import { listMunicipalFireTrucks } from "../../../../lib/fire-trucks/service";

export const runtime = "nodejs";

// Read-only by design: fire trucks are added by Provincial BFP only.
export async function GET(request: NextRequest) {
  const identity = await requireMunicipalBfp(request);
  if (isAuthorizationResponse(identity)) return identity;

  try {
    const registry = await listMunicipalFireTrucks(identity.municipalityId);
    return NextResponse.json(
      {
        ...registry,
        municipality: {
          ...registry.municipality,
          name: registry.municipality.name || identity.municipalityName || "Assigned municipality",
        },
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    console.error("Unable to load municipal fire trucks", error);
    return NextResponse.json({ error: "Unable to load fire trucks." }, { status: 500 });
  }
}
