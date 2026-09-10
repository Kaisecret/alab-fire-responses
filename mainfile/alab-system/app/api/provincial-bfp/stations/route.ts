import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";

import { getManagementActor, isProvincialAuthorizationResponse } from "../../../../lib/provincial-bfp/auth";
import { listManagedStations, createManagedStation } from "../../../../lib/provincial-bfp/management/stations";
import { parseManagementFilters } from "../../../../lib/provincial-bfp/management/filters";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const actor = await getManagementActor(request);
  if (isProvincialAuthorizationResponse(actor)) {
    return actor;
  }

  try {
    const filters = parseManagementFilters(request.nextUrl.searchParams);
    const page = await listManagedStations(actor, filters);
    return NextResponse.json(page, {
      headers: {
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "STATIONS_QUERY_FAILED";
    let status = message.startsWith("INVALID_") ? 400 : 500;
    if (error instanceof SyntaxError) status = 400;
    if (message === "OPERATION_IDEMPOTENCY_CONFLICT") status = 409;
    return NextResponse.json({ error: status >= 500 ? "Unable to complete this request. Please try again." : message }, { status });
  }
}

export async function POST(request: NextRequest) {
  const actor = await getManagementActor(request);
  if (isProvincialAuthorizationResponse(actor)) {
    return actor;
  }

  try {
    const body = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) return NextResponse.json({ error: "INVALID_REQUEST_BODY" }, { status: 400 });
    for (const field of ["action", "reason", "expectedVersion", "stationName", "name", "displayName", "rankOrPosition", "email", "temporaryPassword", "municipalityId", "stationId", "assignmentRole", "completeAddress", "sitioOrPurok", "nearbyLandmark"]) {
      if (body[field] !== undefined && typeof body[field] !== "string") return NextResponse.json({ error: "INVALID_REQUEST_BODY" }, { status: 400 });
    }
    if (body.reason?.length > 1000) return NextResponse.json({ error: "INVALID_REASON" }, { status: 400 });
    const requestId = request.headers.get("x-request-id") || randomUUID();
    const station = await createManagedStation(
      {
        actor,
        requestId,
        expectedVersion: "genesis",
        reason: body.reason,
      },
      body,
    );
    return NextResponse.json(station, {
      status: 201,
      headers: {
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "STATION_CREATION_FAILED";
    let status =
      message.startsWith("INVALID_") || message === "MUNICIPALITY_NOT_FOUND"
        ? 400
        : message === "MUNICIPALITY_NOT_IN_ANTIQUE"
        ? 403
        : 500;
    if (error instanceof SyntaxError) status = 400;
    if (message === "OPERATION_IDEMPOTENCY_CONFLICT") status = 409;
    return NextResponse.json({ error: status >= 500 ? "Unable to complete this request. Please try again." : message }, { status });
  }
}
