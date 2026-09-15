import { randomUUID } from "node:crypto";

import { NextRequest, NextResponse } from "next/server";

import { RESIDENT_APPLICANT_COOKIE, verifyResidentApplicantSession } from "../../../../../lib/auth/session";
import { getDatabase, withTransaction } from "../../../../../lib/db";
import { removeIdentityEvidence, uploadIdentityEvidence } from "../../../../../lib/resident-applications/evidence";
import { createAccountNotifications, listMunicipalNotificationRecipients } from "../../../../../lib/notifications/service";

export const runtime = "nodejs";

const clean = (value: FormDataEntryValue | null, max: number) => typeof value === "string" ? value.trim().slice(0, max) : "";

export async function POST(request: NextRequest) {
  const session = verifyResidentApplicantSession(request.cookies.get(RESIDENT_APPLICANT_COOKIE)?.value);
  if (!session) return NextResponse.json({ error: "Sign in to update your application." }, { status: 401 });
  let form: FormData;
  try { form = await request.formData(); } catch { return NextResponse.json({ error: "Invalid correction data." }, { status: 400 }); }

  const firstName = clean(form.get("firstName"), 50);
  const lastName = clean(form.get("lastName"), 50);
  const address = clean(form.get("address"), 200);
  const barangay = clean(form.get("barangay"), 100);
  const front = form.get("frontId");
  const back = form.get("backId");
  const selfie = form.get("selfie");
  if (!firstName || !lastName || !address || !barangay || !(front instanceof File) || !front.size || !(selfie instanceof File) || !selfie.size) {
    return NextResponse.json({ error: "Complete the corrected information, front ID, and selfie." }, { status: 400 });
  }

  // Every fallible step below runs inside this boundary. The lookups used to
  // sit outside it, so a database or storage failure escaped the handler and
  // the runtime answered with a bare 500 carrying no JSON error for the
  // resident's client to show.
  const applicationId = randomUUID();
  const reference = `ALAB-APP-${applicationId.replaceAll("-", "").slice(0, 10).toUpperCase()}`;
  const now = new Date();
  let uploadedKeys: string[] = [];
  let committed = false;
  try {
    const current = await getDatabase().query<{
      profile_id: string; verification_id: string; municipality_id: string; status: string; submission_number: number;
    }>(
      `select rp.id as profile_id, rv.id as verification_id, ra.municipality_id, rv.status, rv.submission_number
         from resident_profiles rp join resident_addresses ra on ra.resident_profile_id = rp.id and ra.is_primary
         join lateral (select * from resident_verifications where resident_profile_id = rp.id order by submitted_at desc limit 1) rv on true
        where rp.user_id = $1`, [session.userId],
    );
    const previous = current.rows[0];
    if (!previous || previous.status !== "CHANGES_REQUESTED") return NextResponse.json({ error: "Corrections are not currently requested for this application." }, { status: 409 });
    const locality = await getDatabase().query<{ barangay_id: string }>(
      "select id as barangay_id from barangays where municipality_id = $1 and lower(name) = lower($2) limit 1",
      [previous.municipality_id, barangay],
    );
    if (!locality.rowCount) return NextResponse.json({ error: "Enter a valid barangay in your registered municipality." }, { status: 400 });

    const evidence = await uploadIdentityEvidence({
      applicationId, reference, submittedAt: now, front,
      back: back instanceof File && back.size ? back : null, selfie,
    });
    uploadedKeys = evidence.uploadedKeys;
    await withTransaction(async (client) => {
      await client.query("update resident_profiles set first_name = $1, last_name = $2, updated_at = $3 where id = $4", [firstName, lastName, now, previous.profile_id]);
      await client.query("update resident_addresses set barangay_id = $1, complete_address = $2, updated_at = $3 where resident_profile_id = $4 and is_primary", [locality.rows[0].barangay_id, address, now, previous.profile_id]);
      await client.query(
        `insert into resident_verifications
          (id, resident_profile_id, application_reference, submission_number, front_document_key, back_document_key,
           selfie_key, front_review_document_key, back_review_document_key, selfie_review_document_key,
           front_document_sha256,
           back_document_sha256, selfie_sha256, front_document_mime_type, back_document_mime_type,
           selfie_mime_type, front_document_size_bytes, back_document_size_bytes, selfie_size_bytes,
           status, submitted_at, created_at, updated_at)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,'PENDING',$20,$20,$20)`,
        [applicationId, previous.profile_id, reference, previous.submission_number + 1, evidence.front.originalKey,
          evidence.back?.originalKey ?? null, evidence.selfie.originalKey, evidence.front.reviewKey,
          evidence.back?.reviewKey ?? null, evidence.selfie.reviewKey, evidence.front.sha256,
          evidence.back?.sha256 ?? null, evidence.selfie.sha256, evidence.front.mimeType,
          evidence.back?.mimeType ?? null, evidence.selfie.mimeType, evidence.front.sizeBytes,
          evidence.back?.sizeBytes ?? null, evidence.selfie.sizeBytes, now],
      );
      await client.query(
        `insert into resident_verification_events (verification_id, resident_profile_id, event_type, metadata, created_at)
         values ($1,$2,'RESUBMITTED',$3::jsonb,$4)`,
        [applicationId, previous.profile_id, JSON.stringify({ previousVerificationId: previous.verification_id }), now],
      );
      await createAccountNotifications(client, {
        recipientUserIds: await listMunicipalNotificationRecipients(client, previous.municipality_id),
        actorUserId: session.userId,
        eventType: "RESIDENT_APPLICATION_RESUBMITTED", category: "APPLICATION",
        title: "Application resubmitted", summary: `${reference} · Corrections ready`,
        actionHref: "/municipal-bfp/verification-queue", entityType: "resident_verification", entityId: applicationId,
        context: { reference }, dedupeKey: `resident-application:${applicationId}:resubmitted`, createdAt: now,
      });
    });
    committed = true;
    return NextResponse.json({ application: { reference, status: "PENDING", submittedAt: now.toISOString() }, message: "Corrections resubmitted for Municipal BFP review." });
  } catch (error) {
    console.error("Resident correction resubmission failed", error);
    // Cleanup is best effort and must never become the response: building a
    // storage client throws when the storage key is unusable, and that throw
    // used to escape this catch and surface as a bare 500. Evidence belonging
    // to a committed verification is never removed.
    if (!committed && uploadedKeys.length) {
      try {
        await removeIdentityEvidence(uploadedKeys);
      } catch (cleanupError) {
        console.error("Resident correction evidence cleanup failed", cleanupError);
      }
    }
    // Image processing depends on a native binary that can be missing from a
    // deployment. Name that case so the resident is not told to retry
    // something that cannot succeed until the deployment is fixed.
    if (error instanceof Error && error.message === "IMAGE_PROCESSING_UNAVAILABLE") {
      return NextResponse.json({ error: "We cannot process photos right now. Your corrections were not saved. Please try again later." }, { status: 503 });
    }
    // Database and storage messages can carry connection and schema detail, so
    // the resident sees fixed copy while the cause stays in the server log.
    return NextResponse.json({ error: "We could not save your corrections. Check your application status before trying again." }, { status: 500 });
  }
}
