import { NextRequest, NextResponse } from "next/server";

import {
  isProvincialAuthorizationResponse,
  requireProvincialBfp,
} from "../../../../lib/provincial-bfp/auth";
import { listProvincialWaterSources } from "../../../../lib/water-sources/service";

export const runtime = "nodejs";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(request: NextRequest) {
  const identity = await requireProvincialBfp(request);
  if (isProvincialAuthorizationResponse(identity)) return identity;

  const municipalityId = new URL(request.url).searchParams.get("municipalityId")?.trim();
  if (municipalityId && !uuidPattern.test(municipalityId)) {
    return NextResponse.json({ error: "Invalid municipality filter." }, { status: 400 });
  }

  try {
    const registry = await listProvincialWaterSources(
      municipalityId ? { municipalityId } : undefined,
    );
    return NextResponse.json(registry);
  } catch (error) {
    console.error("Unable to load provincial water sources", error);
    return NextResponse.json({ error: "Unable to load water sources." }, { status: 500 });
  }
}
