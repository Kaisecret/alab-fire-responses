import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";

import { getManagementActor, isProvincialAuthorizationResponse } from "../../../../../lib/provincial-bfp/auth";
import { getManagedResident, updateManagedResident } from "../../../../../lib/provincial-bfp/management/residents";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ residentId: string }> },
) {
  const actor = await getManagementActor(request);
  if (isProvincialAuthorizationResponse(actor)) {
    return actor;
  }

  const { residentId } = await context.params;
  if (!residentId || !/^[0-9a-f-]{36}$/i.test(residentId)) {
    return NextResponse.json({ error: "INVALID_RESIDENT_ID" }, { status: 400 });
  }

  try {
    const resident = await getManagedResident(actor, residentId);
    if (!resident) {
      return NextResponse.json({ error: "RESIDENT_NOT_FOUND" }, { status: 404 });
    }
    return NextResponse.json(resident, {
      headers: {
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "RESIDENT_QUERY_FAILED";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ residentId: string }> },
) {
  const actor = await getManagementActor(request);
  if (isProvincialAuthorizationResponse(actor)) {
    return actor;
  }

  const { residentId } = await context.params;
  if (!residentId || !/^[0-9a-f-]{36}$/i.test(residentId)) {
    return NextResponse.json({ error: "INVALID_RESIDENT_ID" }, { status: 400 });
  }

  try {
    const body = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) return NextResponse.json({ error: "INVALID_REQUEST_BODY" }, { status: 400 });
    for (const field of ["action", "reason", "expectedVersion", "stationName", "name", "displayName", "rankOrPosition", "email", "temporaryPassword", "municipalityId", "stationId", "assignmentRole", "completeAddress", "sitioOrPurok", "nearbyLandmark"]) {
      if (body[field] !== undefined && typeof body[field] !== "string") return NextResponse.json({ error: "INVALID_REQUEST_BODY" }, { status: 400 });
    }
    if (body.reason?.length > 1000) return NextResponse.json({ error: "INVALID_REASON" }, { status: 400 });
    const expectedVersion = request.headers.get("if-match") || body.expectedVersion;
    if (!expectedVersion) {
      return NextResponse.json(
        { error: "EXPECTED_VERSION_REQUIRED" },
        { status: 400 },
      );
    }

    const requestId = request.headers.get("x-request-id") || randomUUID();
    const updated = await updateManagedResident(
      {
        actor,
        requestId,
        expectedVersion,
        reason: body.reason,
      },
      residentId,
      body,
    );
    return NextResponse.json(updated, {
      headers: {
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "RESIDENT_UPDATE_FAILED";
    let status = 500;
    if (message === "STALE_REVISION_CONFLICT" || message === "OPERATION_IDEMPOTENCY_CONFLICT") status = 409;
    else if (message === "CANNOT_ACTIVATE_UNVERIFIED_RESIDENT") status = 409;
    else if (message.startsWith("REASON_REQUIRED_") || message.startsWith("INVALID_")) status = 400;
    else if (message === "TARGET_NOT_FOUND") status = 404;

    if (error instanceof SyntaxError) status = 400;
    if (message === "OPERATION_IDEMPOTENCY_CONFLICT") status = 409;
    return NextResponse.json({ error: status >= 500 ? "Unable to complete this request. Please try again." : message }, { status });
  }
}
