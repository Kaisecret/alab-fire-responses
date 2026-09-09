import { NextRequest, NextResponse } from "next/server";

import { getProvincialCoordinationIncident } from "../../../../../lib/intermunicipality/provincial";
import { isProvincialAuthorizationResponse, requireProvincialBfp } from "../../../../../lib/provincial-bfp/auth";

export const runtime = "nodejs";

function validId(value: string) {
  return /^[0-9a-f-]{36}$/i.test(value);
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireProvincialBfp(request);
  if (isProvincialAuthorizationResponse(auth)) return auth;

  const { id } = await context.params;
  if (!validId(id)) {
    return NextResponse.json(
      { error: "Invalid incident ID." },
      {
        status: 400,
        headers: {
          "Cache-Control": "private, no-store",
        },
      },
    );
  }

  try {
    const incident = await getProvincialCoordinationIncident(id);
    if (!incident) {
      return NextResponse.json(
        { error: "Incident not found." },
        {
          status: 404,
          headers: {
            "Cache-Control": "private, no-store",
          },
        },
      );
    }

    return NextResponse.json(
      { incident },
      {
        headers: {
          "Cache-Control": "private, no-store",
        },
      },
    );
  } catch (error) {
    console.error("Provincial incident detail failed", error);
    return NextResponse.json(
      { error: "Unable to load provincial incident detail." },
      {
        status: 500,
        headers: {
          "Cache-Control": "private, no-store",
        },
      },
    );
  }
}
