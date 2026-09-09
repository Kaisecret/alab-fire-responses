import "server-only";

import type { NextRequest } from "next/server";

import { getBfpIdentity } from "../auth/bfp-accounts";
import { bfpSessionCookieName, verifyBfpSession } from "../auth/session";
import { getDatabase, withTransaction } from "../db";
import { createAccountNotifications } from "../notifications/service";
import { enqueueResidentCorrectionDeliveries } from "./delivery-queue";

import { isLocalUiPreviewEnabled } from "../auth/local-ui-preview";

export async function getMunicipalReviewer(request: NextRequest) {
  if (isLocalUiPreviewEnabled()) {
    return {
      userId: "afbc9f03-312c-4208-a15c-05f87a3ad6fe",
      email: "preview@municipal-bfp.local",
      displayName: "Municipal BFP Preview",
      rankOrPosition: "Municipal Fire Marshal",
      stationName: "San Jose Main Fire Station",
      role: "MUNICIPAL_BFP" as const,
      accountStatus: "ACTIVE" as const,
      mustChangePassword: false,
      municipalityId: "a4ba607b-8863-4f0f-bcaf-a86beb0acb29",
      municipalityName: "San Jose de Buenavista",
      assignmentRole: "MUNICIPAL_ADMIN" as const,
    };
  }
  const session = verifyBfpSession(request.cookies.get(bfpSessionCookieName("MUNICIPAL_BFP"))?.value);
  if (!session || session.role !== "MUNICIPAL_BFP") return null;
  const identity = await getBfpIdentity(session.userId);
  return identity?.role === "MUNICIPAL_BFP" && identity.municipalityId ? identity : null;
}

export async function listResidentApplications(municipalityId: string) {
  const result = await getDatabase().query(
    `select distinct on (rv.resident_profile_id)
            rv.id, rv.application_reference as "reference", rv.status, rv.submitted_at as "submittedAt",
            rv.rejection_reason as "correctionReason", rp.first_name as "firstName", rp.last_name as "lastName",
            u.email, u.phone, u.account_status as "accountStatus", b.name as barangay,
            ra.complete_address as address
       from resident_verifications rv
       join resident_profiles rp on rp.id = rv.resident_profile_id
       join users u on u.id = rp.user_id
       join resident_addresses ra on ra.resident_profile_id = rp.id and ra.is_primary
       join barangays b on b.id = ra.barangay_id
      where ra.municipality_id = $1 and u.role = 'RESIDENT'
      order by rv.resident_profile_id, rv.submitted_at desc, rv.created_at desc`,
    [municipalityId],
  );
  return result.rows;
}

export async function getResidentApplication(municipalityId: string, applicationId: string) {
  type ResidentApplicationRow = {
    id: string; reference: string; status: string; submittedAt: Date; correctionReason: string | null;
    firstName: string; lastName: string; email: string; phone: string; username: string;
    municipality: string; barangay: string; address: string; frontReviewKey: string | null;
    legacyFrontKey: string | null; backReviewKey: string | null; legacyBackKey: string | null;
    selfieReviewKey: string | null; legacySelfieKey: string | null;
  };

  const queryApplication = (evidenceColumns: string) => getDatabase().query<ResidentApplicationRow>(
    `select rv.id, rv.application_reference as reference, rv.status, rv.submitted_at as "submittedAt",
            rv.rejection_reason as "correctionReason", rp.first_name as "firstName", rp.last_name as "lastName",
            u.email, u.phone, u.username, m.name as municipality, b.name as barangay, ra.complete_address as address,
            ${evidenceColumns}
       from resident_verifications rv
       join resident_profiles rp on rp.id = rv.resident_profile_id
       join users u on u.id = rp.user_id
       join resident_addresses ra on ra.resident_profile_id = rp.id and ra.is_primary
       join municipalities m on m.id = ra.municipality_id
       join barangays b on b.id = ra.barangay_id
      where (rv.id::text = $1 or rv.application_reference = $1) and ra.municipality_id = $2 and u.role = 'RESIDENT'
      limit 1`,
    [applicationId, municipalityId],
  );

  let result;
  try {
    result = await queryApplication(`
      rv.front_review_document_key as "frontReviewKey",
      rv.front_document_key as "legacyFrontKey",
      rv.back_review_document_key as "backReviewKey",
      rv.back_document_key as "legacyBackKey",
      rv.selfie_review_document_key as "selfieReviewKey",
      rv.selfie_key as "legacySelfieKey"`);
  } catch (error) {
    const databaseError = error as { code?: string };
    if (databaseError.code !== "42703") throw error;

    // Older deployments can list applications before the review-derivative
    // columns have been migrated. Use the protected legacy evidence keys so
    // the reviewer can still open the dossier.
    result = await queryApplication(`
      rv.front_document_key as "frontReviewKey",
      rv.front_document_key as "legacyFrontKey",
      rv.back_document_key as "backReviewKey",
      rv.back_document_key as "legacyBackKey",
      rv.selfie_key as "selfieReviewKey",
      rv.selfie_key as "legacySelfieKey"`);
  }
  const application = result.rows[0];
  if (!application) return null;

  let eventsRows: Array<{ type: string; notes: string | null; createdAt: Date }> = [];
  try {
    const events = await getDatabase().query<{ type: string; notes: string | null; createdAt: Date }>(
      `select event_type as type, notes, created_at as "createdAt"
         from resident_verification_events where resident_profile_id = (
           select resident_profile_id from resident_verifications where (id::text = $1 or application_reference = $1) limit 1
         ) order by created_at asc`,
      [applicationId],
    );
    eventsRows = events.rows;
  } catch (err) {
    console.warn("Unable to load resident verification events:", err);
  }

  // Fallback to legacy document keys if review derivative keys are missing
  application.frontReviewKey = application.frontReviewKey || application.legacyFrontKey || null;
  application.backReviewKey = application.backReviewKey || application.legacyBackKey || null;
  application.selfieReviewKey = application.selfieReviewKey || application.legacySelfieKey || null;

  let frontUrl: string | null = null;
  let backUrl: string | null = null;
  let selfieUrl: string | null = null;

  try {
    const { createIdentityEvidenceSignedUrl } = await import("./evidence");
    [frontUrl, backUrl, selfieUrl] = await Promise.all([
      createIdentityEvidenceSignedUrl(application.frontReviewKey),
      createIdentityEvidenceSignedUrl(application.backReviewKey),
      createIdentityEvidenceSignedUrl(application.selfieReviewKey),
    ]);
  } catch (evidenceError) {
    console.warn("Unable to load identity evidence signed URLs:", evidenceError);
  }

  const {
    frontReviewKey: _front,
    legacyFrontKey: _legacyFront,
    backReviewKey: _back,
    legacyBackKey: _legacyBack,
    selfieReviewKey: _selfie,
    legacySelfieKey: _legacySelfie,
    ...safe
  } = application;
  void _front; void _legacyFront; void _back; void _legacyBack; void _selfie; void _legacySelfie;

  return { ...safe, evidence: { frontUrl, backUrl, selfieUrl }, events: eventsRows };
}

async function lockedApplication(client: Parameters<Parameters<typeof withTransaction>[0]>[0], municipalityId: string, applicationId: string) {
  const result = await client.query<{
    id: string;
    resident_profile_id: string;
    user_id: string;
    status: string;
    submission_number: number;
    application_reference: string;
    first_name: string;
    email: string;
    phone: string;
    municipality_name: string;
  }>(
    `select rv.id, rv.resident_profile_id, rp.user_id, rv.status, rv.submission_number,
            rv.application_reference, rp.first_name, u.email, u.phone, m.name as municipality_name
       from resident_verifications rv
       join resident_profiles rp on rp.id = rv.resident_profile_id
       join users u on u.id = rp.user_id
       join resident_addresses ra on ra.resident_profile_id = rp.id and ra.is_primary
       join municipalities m on m.id = ra.municipality_id
      where (rv.id::text = $1 or rv.application_reference = $1) and ra.municipality_id = $2
      for update of rv`,
    [applicationId, municipalityId],
  );
  return result.rows[0] ?? null;
}

export async function approveResidentApplication(municipalityId: string, applicationId: string, actorUserId: string) {
  return withTransaction(async (client) => {
    const application = await lockedApplication(client, municipalityId, applicationId);
    if (!application) throw new Error("APPLICATION_NOT_FOUND");
    if (application.status !== "PENDING") throw new Error("APPLICATION_NOT_PENDING");
    const now = new Date();
    await client.query(
      `update resident_verifications set status = 'VERIFIED', reviewed_by_user_id = $1,
              reviewed_at = $2, rejection_reason = null, updated_at = $2 where id = $3`,
      [actorUserId, now, application.id],
    );
    await client.query("update users set account_status = 'ACTIVE', updated_at = $1 where id = $2", [now, application.user_id]);
    await client.query(
      `insert into resident_verification_events (verification_id, resident_profile_id, actor_user_id, event_type, metadata, created_at)
       values ($1,$2,$3,'APPROVED',$4::jsonb,$5)`,
      [application.id, application.resident_profile_id, actorUserId, JSON.stringify({ municipalityId }), now],
    );
    await createAccountNotifications(client, {
      recipientUserIds: [application.user_id], actorUserId,
      eventType: "RESIDENT_APPLICATION_APPROVED", category: "APPLICATION",
      title: "Application approved", summary: "Your resident account is ready.",
      actionHref: "/resident/login", entityType: "resident_verification", entityId: application.id,
      dedupeKey: `resident-application:${application.id}:approved`, createdAt: now,
    });
    return { status: "VERIFIED" };
  });
}

export async function requestResidentApplicationCorrections(
  municipalityId: string,
  applicationId: string,
  actorUserId: string,
  reason: string,
) {
  const notes = reason.trim().slice(0, 1000);
  if (notes.length < 10) throw new Error("CORRECTION_REASON_REQUIRED");
  return withTransaction(async (client) => {
    const application = await lockedApplication(client, municipalityId, applicationId);
    if (!application) throw new Error("APPLICATION_NOT_FOUND");
    if (application.status !== "PENDING") throw new Error("APPLICATION_NOT_PENDING");
    const now = new Date();
    await client.query(
      `update resident_verifications set status = 'CHANGES_REQUESTED', reviewed_by_user_id = $1,
              reviewed_at = $2, rejection_reason = $3, updated_at = $2 where id = $4`,
      [actorUserId, now, notes, application.id],
    );
    await client.query("update users set account_status = 'PENDING_REVIEW', updated_at = $1 where id = $2", [now, application.user_id]);
    await client.query(
      `insert into resident_verification_events (verification_id, resident_profile_id, actor_user_id, event_type, notes, metadata, created_at)
       values ($1,$2,$3,'CHANGES_REQUESTED',$4,$5::jsonb,$6)`,
      [application.id, application.resident_profile_id, actorUserId, notes, JSON.stringify({ municipalityId }), now],
    );
    await createAccountNotifications(client, {
      recipientUserIds: [application.user_id], actorUserId,
      eventType: "RESIDENT_APPLICATION_CHANGES_REQUESTED", category: "APPLICATION",
      title: "Changes requested", summary: "Update your resident application.",
      actionHref: "/resident/application", entityType: "resident_verification", entityId: application.id,
      context: { reason: notes }, dedupeKey: `resident-application:${application.id}:changes`, createdAt: now,
    });
    const deliveryInput = {
      verificationId: application.id,
      recipientUserId: application.user_id,
      submissionNumber: application.submission_number,
      phone: application.phone,
      email: application.email,
      payload: {
        firstName: application.first_name,
        reference: application.application_reference,
        municipality: application.municipality_name,
        reason: notes,
      },
    };
    const deliveryQueue = await enqueueResidentCorrectionDeliveries(client, deliveryInput);
    return {
      status: "CHANGES_REQUESTED",
      deliveryIds: deliveryQueue.ids,
      directDelivery: deliveryQueue.queueAvailable ? null : deliveryInput,
    };
  });
}
