import { NextRequest, NextResponse } from "next/server";

import { listProvincialCoordinationIncidents } from "../../../../lib/intermunicipality/provincial";
import { isProvincialAuthorizationResponse, requireProvincialBfp } from "../../../../lib/provincial-bfp/auth";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const auth = await requireProvincialBfp(request);
  if (isProvincialAuthorizationResponse(auth)) return auth;

  try {
    const includeHistory = request.nextUrl.searchParams.get("scope") === "all";
    const incidents = await listProvincialCoordinationIncidents(includeHistory);

    return NextResponse.json(
      { incidents },
      {
        headers: {
          "Cache-Control": "private, no-store",
        },
      },
    );
  } catch (error) {
    console.error("Provincial incident list failed", error);
    return NextResponse.json(
      { error: "Unable to load provincial incidents." },
      {
        status: 500,
        headers: {
          "Cache-Control": "private, no-store",
        },
      },
    );
  }
}
