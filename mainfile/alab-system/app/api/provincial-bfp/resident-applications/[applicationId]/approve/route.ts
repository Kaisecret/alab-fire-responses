import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getManagementActor, isProvincialAuthorizationResponse } from "../../../../../../lib/provincial-bfp/auth";
import { approveManagedApplication } from "../../../../../../lib/provincial-bfp/management/applications";

export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ applicationId: string }> },
) {
  const actor = await getManagementActor(request);
  if (isProvincialAuthorizationResponse(actor)) {
    return actor;
  }

  let body: {
    requestId?: string;
    reason?: string;
    expectedSubmissionNumber?: number;
  } = {};

  try {
    const raw = await request.json();
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("INVALID_BODY");
    body = raw;
  } catch {
    return NextResponse.json({ error: "INVALID_REQUEST_BODY" }, { status: 400 });
  }

  if (!body || typeof body !== "object" || Array.isArray(body) ||
      (body.requestId !== undefined && typeof body.requestId !== "string") ||
      (body.reason !== undefined && typeof body.reason !== "string") ||
      !Number.isInteger(body.expectedSubmissionNumber) || (body.expectedSubmissionNumber ?? 0) < 1) {
    return NextResponse.json({ error: "A valid submission number and request body are required." }, { status: 400 });
  }
  const requestId = body.requestId || request.headers.get("x-request-id") || randomUUID();
  const reason = body.reason || "Provincial verification approval";
  const expectedSubmissionNumber =
    typeof body.expectedSubmissionNumber === "number" ? body.expectedSubmissionNumber : undefined;

  try {
    const { applicationId } = await context.params;
    const result = await approveManagedApplication(
      { actor, requestId, reason },
      applicationId,
      expectedSubmissionNumber,
    );
    return NextResponse.json({
      application: result,
      message: "Resident application approved successfully.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to approve application";
    if (message === "APPLICATION_NOT_FOUND") {
      return NextResponse.json({ error: "Application not found in Antique province." }, { status: 404 });
    }
    if (message === "APPLICATION_NOT_PENDING" || message === "APPLICATION_SUBMISSION_MISMATCH") {
      return NextResponse.json(
        { error: "Application is no longer pending or submission version changed." },
        { status: 409 },
      );
    }
    if (message === "OPERATION_IDEMPOTENCY_CONFLICT") {
      return NextResponse.json(
        { error: "Conflicting operation detected for this request ID." },
        { status: 409 },
      );
    }
    console.error("Provincial resident application approval failed:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
