import { NextRequest, NextResponse } from "next/server";

import { listProvincialAssistanceRequests } from "../../../../lib/intermunicipality/provincial";
import { isProvincialAuthorizationResponse, requireProvincialBfp } from "../../../../lib/provincial-bfp/auth";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const auth = await requireProvincialBfp(request);
  if (isProvincialAuthorizationResponse(auth)) return auth;

  try {
    const includeClosed = request.nextUrl.searchParams.get("scope") === "all";
    const assistanceRequests = await listProvincialAssistanceRequests(includeClosed);

    return NextResponse.json(
      { assistanceRequests },
      {
        headers: {
          "Cache-Control": "private, no-store",
        },
      },
    );
  } catch (error) {
    console.error("Provincial assistance requests failed", error);
    return NextResponse.json(
      { error: "Unable to load provincial assistance requests." },
      {
        status: 500,
        headers: {
          "Cache-Control": "private, no-store",
        },
      },
    );
  }
}
