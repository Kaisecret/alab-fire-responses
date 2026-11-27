import { NextRequest, NextResponse } from "next/server";

import { isAuthorizationResponse, requireMunicipalAdmin, requireMunicipalBfp } from "../../../../lib/municipal-bfp/auth";
import { FireTruckValidationError, listMunicipalFireTrucks, updateMunicipalFireTruckStatus } from "../../../../lib/fire-trucks/service";

export const runtime = "nodejs";

// Fire trucks are added by Provincial BFP only; a municipality can only mark its own truck Ready or Under maintenance.
export async function PATCH(request: NextRequest) {
  const identity = await requireMunicipalAdmin(request);
  if (isAuthorizationResponse(identity)) return identity;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Submit a valid JSON request." }, { status: 400 });
  }

  try {
    const truck = await updateMunicipalFireTruckStatus(identity.municipalityId, body.id, body.operationalStatus);
    if (!truck) return NextResponse.json({ error: "That fire truck is not in your municipality." }, { status: 404 });
    return NextResponse.json({ truck });
  } catch (error) {
    if (error instanceof FireTruckValidationError) {
      return NextResponse.json({ error: Object.values(error.issues)[0] ?? error.message, issues: error.issues }, { status: 400 });
    }
    console.error("Unable to update municipal fire truck status", error);
    return NextResponse.json({ error: "Unable to update the fire truck status." }, { status: 500 });
  }
}

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
