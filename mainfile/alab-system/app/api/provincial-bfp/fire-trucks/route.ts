import { NextRequest, NextResponse } from "next/server";

import {
  isProvincialAuthorizationResponse,
  requireProvincialBfp,
} from "../../../../lib/provincial-bfp/auth";
import {
  createProvincialFireTruck,
  FireTruckStationNotFoundError,
  FireTruckValidationError,
  listProvincialFireTrucks,
} from "../../../../lib/fire-trucks/service";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const identity = await requireProvincialBfp(request);
  if (isProvincialAuthorizationResponse(identity)) return identity;

  try {
    const registry = await listProvincialFireTrucks();
    return NextResponse.json(registry, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("Unable to load provincial fire trucks", error);
    return NextResponse.json({ error: "Unable to load fire trucks." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const identity = await requireProvincialBfp(request);
  if (isProvincialAuthorizationResponse(identity)) return identity;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Submit a valid JSON request." }, { status: 400 });
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Submit a valid JSON request." }, { status: 400 });
  }

  try {
    const truck = await createProvincialFireTruck(identity.userId, body);
    return NextResponse.json({ truck }, { status: 201 });
  } catch (error) {
    if (error instanceof FireTruckValidationError) {
      return NextResponse.json(
        { error: error.message, code: error.code, issues: error.issues },
        { status: 400 },
      );
    }
    if (error instanceof FireTruckStationNotFoundError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 400 });
    }
    console.error("Unable to add provincial fire truck", error);
    return NextResponse.json({ error: "Unable to add the fire truck." }, { status: 500 });
  }
}
