import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";

import { getManagementActor, isProvincialAuthorizationResponse } from "../../../../lib/provincial-bfp/auth";
import { listManagedPersonnel, createManagedPersonnel } from "../../../../lib/provincial-bfp/management/personnel";
import { parseManagementFilters } from "../../../../lib/provincial-bfp/management/filters";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const actor = await getManagementActor(request);
  if (isProvincialAuthorizationResponse(actor)) {
    return actor;
  }

  try {
    const filters = parseManagementFilters(request.nextUrl.searchParams);
    const page = await listManagedPersonnel(actor, filters);
    return NextResponse.json(page, {
      headers: {
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "PERSONNEL_QUERY_FAILED";
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
    const personnel = await createManagedPersonnel(
      {
        actor,
        requestId,
        expectedVersion: "genesis",
        reason: body.reason,
      },
      body,
    );
    return NextResponse.json(personnel, {
      status: 201,
      headers: {
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "PERSONNEL_CREATION_FAILED";
    let status = 500;
    if (message.startsWith("INVALID_") || message === "EMAIL_ALREADY_EXISTS") status = 400;
    else if (message === "MUNICIPALITY_ALREADY_HAS_ACTIVE_ADMIN") status = 409;
    else if (message === "MUNICIPALITY_NOT_IN_ANTIQUE") status = 403;

    if (error instanceof SyntaxError) status = 400;
    if (message === "OPERATION_IDEMPOTENCY_CONFLICT") status = 409;
    return NextResponse.json({ error: status >= 500 ? "Unable to complete this request. Please try again." : message }, { status });
  }
}
