import { NextResponse } from "next/server";

import { isMobileBfpAuthorization, requireMobileMunicipalBfp } from "../../../../lib/auth/mobile-bfp";
import { listProvincialWaterSources } from "../../../../lib/water-sources/service";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const session = requireMobileMunicipalBfp(request);
  if (isMobileBfpAuthorization(session)) return session;

  try {
    const registry = await listProvincialWaterSources();
    return NextResponse.json({ sources: registry.sources });
  } catch (error) {
    console.error("Mobile water source list failed", error);
    return NextResponse.json({ error: "Unable to load water sources." }, { status: 500 });
  }
}
