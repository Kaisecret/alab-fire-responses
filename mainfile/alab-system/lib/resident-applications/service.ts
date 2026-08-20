import "server-only";

import type { NextRequest } from "next/server";

import { getBfpIdentity } from "../auth/bfp-accounts";
import { bfpSessionCookieName, verifyBfpSession } from "../auth/session";
import { getDatabase, withTransaction } from "../db";
import { createIdentityEvidenceSignedUrl } from "./evidence";

export async function getMunicipalReviewer(request: NextRequest) {
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
  const result = await getDatabase().query<{
    id: string; reference: string; status: string; submittedAt: Date; correctionReason: string | null;
    firstName: string; lastName: string; email: string; phone: string; username: string;
    municipality: string; barangay: string; address: string; frontReviewKey: string | null;
    backReviewKey: string | null; selfieReviewKey: string | null;
  }>(
    `select rv.id, rv.application_reference as reference, rv.status, rv.submitted_at as "submittedAt",
            rv.rejection_reason as "correctionReason", rp.first_name as "firstName", rp.last_name as "lastName",
            u.email, u.phone, u.username, m.name as municipality, b.name as barangay, ra.complete_address as address,
            rv.front_review_document_key as "frontReviewKey", rv.back_review_document_key as "backReviewKey",
            rv.selfie_review_document_key as "selfieReviewKey"
       from resident_verifications rv
       join resident_profiles rp on rp.id = rv.resident_profile_id
       join users u on u.id = rp.user_id
       join resident_addresses ra on ra.resident_profile_id = rp.id and ra.is_primary
       join municipalities m on m.id = ra.municipality_id
       join barangays b on b.id = ra.barangay_id
      where rv.id = $1 and ra.municipality_id = $2 and u.role = 'RESIDENT'
      limit 1`,
    [applicationId, municipalityId],
  );
  const application = result.rows[0];
  if (!application) return null;

  const events = await getDatabase().query(
    `select event_type as type, notes, created_at as "createdAt"
       from resident_verification_events where resident_profile_id = (
         select resident_profile_id from resident_verifications where id = $1
       ) order by created_at asc`,
    [applicationId],
  );
  const [frontUrl, backUrl, selfieUrl] = await Promise.all([
    createIdentityEvidenceSignedUrl(application.frontReviewKey),
    createIdentityEvidenceSignedUrl(application.backReviewKey),
    createIdentityEvidenceSignedUrl(application.selfieReviewKey),
  ]);
  const { frontReviewKey: _front, backReviewKey: _back, selfieReviewKey: _selfie, ...safe } = application;
  void _front; void _back; void _selfie;
  return { ...safe, evidence: { frontUrl, backUrl, selfieUrl }, events: events.rows };
}

async function lockedApplication(client: Parameters<Parameters<typeof withTransaction>[0]>[0], municipalityId: string, applicationId: string) {
  const result = await client.query<{ id: string; resident_profile_id: string; user_id: string; status: string }>(
    `select rv.id, rv.resident_profile_id, rp.user_id, rv.status
       from resident_verifications rv
       join resident_profiles rp on rp.id = rv.resident_profile_id
       join resident_addresses ra on ra.resident_profile_id = rp.id and ra.is_primary
      where rv.id = $1 and ra.municipality_id = $2
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
      [actorUserId, now, applicationId],
    );
    await client.query("update users set account_status = 'ACTIVE', updated_at = $1 where id = $2", [now, application.user_id]);
    await client.query(
      `insert into resident_verification_events (verification_id, resident_profile_id, actor_user_id, event_type, metadata, created_at)
       values ($1,$2,$3,'APPROVED',$4::jsonb,$5)`,
      [applicationId, application.resident_profile_id, actorUserId, JSON.stringify({ municipalityId }), now],
    );
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
      [actorUserId, now, notes, applicationId],
    );
    await client.query("update users set account_status = 'PENDING_REVIEW', updated_at = $1 where id = $2", [now, application.user_id]);
    await client.query(
      `insert into resident_verification_events (verification_id, resident_profile_id, actor_user_id, event_type, notes, metadata, created_at)
       values ($1,$2,$3,'CHANGES_REQUESTED',$4,$5::jsonb,$6)`,
      [applicationId, application.resident_profile_id, actorUserId, notes, JSON.stringify({ municipalityId }), now],
    );
    return { status: "CHANGES_REQUESTED" };
  });
}
