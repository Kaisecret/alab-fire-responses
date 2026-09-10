import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getManagementActor, isProvincialAuthorizationResponse } from "../../../../../../lib/provincial-bfp/auth";
import { requestManagedApplicationCorrections } from "../../../../../../lib/provincial-bfp/management/applications";
import { deliverResidentCorrectionNotifications } from "../../../../../../lib/resident-applications/delivery-service";
import { unconfirmedDeliveries } from "../../../../../../lib/resident-applications/delivery-engine";
import type { DirectCorrectionDelivery } from "../../../../../../lib/resident-applications/delivery-queue";

export const runtime = "nodejs";
export const maxDuration = 60;

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
    message?: string;
    reason?: string;
    expectedSubmissionNumber?: number;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Enter a correction reason." }, { status: 400 });
  }

  if (!body || typeof body !== "object" || Array.isArray(body) ||
      (body.requestId !== undefined && typeof body.requestId !== "string") ||
      (body.reason !== undefined && typeof body.reason !== "string") ||
      !Number.isInteger(body.expectedSubmissionNumber) || (body.expectedSubmissionNumber ?? 0) < 1) {
    return NextResponse.json({ error: "A valid submission number and request body are required." }, { status: 400 });
  }
  if (body.message !== undefined && typeof body.message !== "string") return NextResponse.json({ error: "INVALID_CORRECTION_REASON" }, { status: 400 });
  const correctionReason = (body.message || body.reason || "").trim();
  if (correctionReason.length < 10) {
    return NextResponse.json(
      { error: "Explain what the resident must correct (at least 10 characters)." },
      { status: 400 },
    );
  }

  const requestId = body.requestId || request.headers.get("x-request-id") || randomUUID();
  const expectedSubmissionNumber =
    typeof body.expectedSubmissionNumber === "number" ? body.expectedSubmissionNumber : undefined;

  try {
    const { applicationId } = await context.params;
    const result = await requestManagedApplicationCorrections(
      { actor, requestId, reason: correctionReason },
      applicationId,
      expectedSubmissionNumber,
      correctionReason,
    );

    // Transaction is committed; deliver queued notifications
    const deliveryResults = result.replayed ? unconfirmedDeliveries() : await deliverResidentCorrectionNotifications(
      result.deliveryIds,
      result.directDelivery as DirectCorrectionDelivery | null,
    ).catch(() => unconfirmedDeliveries());

    return NextResponse.json({
      application: { status: result.status },
      delivery: deliveryResults,
      message: "Correction request saved and resident notifications processed.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to request corrections";
    if (message === "CORRECTION_REASON_REQUIRED") {
      return NextResponse.json(
        { error: "Explain what the resident must correct (at least 10 characters)." },
        { status: 400 },
      );
    }
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
    console.error("Provincial resident correction request failed:", error);
    return NextResponse.json({ error: "Unable to save the correction request. Please try again." }, { status: 500 });
  }
}
