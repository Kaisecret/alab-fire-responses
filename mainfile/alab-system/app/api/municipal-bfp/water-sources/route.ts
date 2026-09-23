import { NextRequest, NextResponse } from "next/server";

import {
  isAuthorizationResponse,
  requireMunicipalAdmin,
  requireMunicipalBfp,
} from "../../../../lib/municipal-bfp/auth";
import {
  createMunicipalWaterSource,
  listMunicipalWaterSources,
  updateMunicipalWaterSource,
  WaterSourceNotFoundError,
  WaterSourceValidationError,
} from "../../../../lib/water-sources/service";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const identity = await requireMunicipalBfp(request);
  if (isAuthorizationResponse(identity)) return identity;

  try {
    const registry = await listMunicipalWaterSources(identity.municipalityId);
    return NextResponse.json({
      ...registry,
      municipality: {
        ...registry.municipality,
        name: registry.municipality.name || identity.municipalityName || "Assigned municipality",
      },
    });
  } catch (error) {
    console.error("Unable to load municipal water sources", error);
    return NextResponse.json({ error: "Unable to load water sources." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const identity = await requireMunicipalAdmin(request);
  if (isAuthorizationResponse(identity)) return identity;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Submit a valid JSON request." }, { status: 400 });
  }

  try {
    const source = await createMunicipalWaterSource(
      identity.userId,
      identity.municipalityId,
      body,
    );
    return NextResponse.json({ source }, { status: 201 });
  } catch (error) {
    if (error instanceof WaterSourceValidationError) {
      return NextResponse.json(
        { error: error.message, code: error.code, issues: error.issues },
        { status: 400 },
      );
    }
    if (error && typeof error === "object" && "code" in error && error.code === "23505") {
      return NextResponse.json(
        { error: "A water source already exists at this location." },
        { status: 409 },
      );
    }
    console.error("Unable to add municipal water source", error);
    return NextResponse.json({ error: "Unable to add the water source." }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const identity = await requireMunicipalAdmin(request);
  if (isAuthorizationResponse(identity)) return identity;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Submit a valid JSON request." }, { status: 400 });
  }
  const id = typeof body.id === "string" ? body.id.trim() : "";
  if (!id) return NextResponse.json({ error: "Water source is required." }, { status: 400 });

  try {
    const source = await updateMunicipalWaterSource(
      identity.userId,
      identity.municipalityId,
      id,
      body,
    );
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
        { error: "A water source already exists at this location." },
        { status: 409 },
      );
    }
    console.error("Unable to update municipal water source", error);
    return NextResponse.json({ error: "Unable to update the water source." }, { status: 500 });
  }
}
