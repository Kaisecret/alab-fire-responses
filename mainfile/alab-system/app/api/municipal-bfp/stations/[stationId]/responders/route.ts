import { NextRequest, NextResponse } from "next/server";

import { isAuthorizationResponse, requireMunicipalAdmin } from "../../../../../../lib/municipal-bfp/auth";
import { listStationResponders } from "../../../../../../lib/municipal-bfp/dispatch";

export const runtime = "nodejs";

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export async function GET(request: NextRequest, context: { params: Promise<{ stationId: string }> }) {
  const identity = await requireMunicipalAdmin(request);
  if (isAuthorizationResponse(identity)) return identity;

  const { stationId } = await context.params;
  if (!isUuid(stationId)) return NextResponse.json({ error: "Invalid station." }, { status: 400 });

  try {
    const rawResponders = await listStationResponders(identity.municipalityId, stationId);
    const { createBfpProfilePhotoUrl } = await import("../../../../../../lib/auth/bfp-profile-photos");
    const responders = await Promise.all(
      rawResponders.map(async (responder) => {
        let profilePhotoUrl: string | null = null;
        try {
          profilePhotoUrl = await createBfpProfilePhotoUrl(responder.id);
        } catch {
          // Fall back gracefully if storage is temporarily unreachable
        }
        return {
          ...responder,
          profilePhotoUrl,
        };
      }),
    );
    return NextResponse.json({ responders });
  } catch (error) {
    console.error("Municipal station responder list failed", error);
    return NextResponse.json({ error: "Unable to load station responders." }, { status: 500 });
  }
}
