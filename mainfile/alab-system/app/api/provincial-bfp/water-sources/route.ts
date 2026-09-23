import { NextRequest, NextResponse } from "next/server";

import {
  isProvincialAuthorizationResponse,
  requireProvincialBfp,
} from "../../../../lib/provincial-bfp/auth";
import {
  listProvincialWaterSources,
  updateProvincialWaterSourceCoordinates,
  WaterSourceNotFoundError,
  WaterSourceValidationError,
} from "../../../../lib/water-sources/service";

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

export async function PATCH(request: NextRequest) {
  const identity = await requireProvincialBfp(request);
  if (isProvincialAuthorizationResponse(identity)) return identity;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Submit a valid JSON request." }, { status: 400 });
  }
  const id = typeof body.id === "string" ? body.id.trim() : "";
  if (!id) return NextResponse.json({ error: "Water source is required." }, { status: 400 });

  try {
    const source = await updateProvincialWaterSourceCoordinates(identity.userId, id, body);
    return NextResponse.json({ source });
  } catch (error) {
    if (error instanceof WaterSourceValidationError) {
      return NextResponse.json(
        { error: error.message, code: error.code, issues: error.issues },
        { status: 400 },
      );
    }
    if (error instanceof WaterSourceNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    if (error && typeof error === "object" && "code" in error && error.code === "23505") {
      return NextResponse.json(
        { error: "Another water source already uses this location and coordinates." },
        { status: 409 },
      );
    }
    console.error("Unable to update provincial water-source coordinates", error);
    return NextResponse.json({ error: "Unable to update the coordinates." }, { status: 500 });
  }
}
