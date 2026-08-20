import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";

import { getDatabase, withTransaction } from "../../../../lib/db";
import { hashPassword } from "../../../../lib/auth/password";
import {
  createResidentApplicantSession,
  residentApplicantCookie,
  RESIDENT_APPLICANT_COOKIE,
  RESIDENT_SESSION_COOKIE,
} from "../../../../lib/auth/session";
import { getGoogleSignupPrefill, GOOGLE_SIGNUP_PREFILL_COOKIE } from "../../../../lib/auth/google-signup-prefill";
import { removeIdentityEvidence, uploadIdentityEvidence } from "../../../../lib/resident-applications/evidence";

export const runtime = "nodejs";

type RegistrationPayload = {
  firstName?: string; lastName?: string; email?: string; phone?: string;
  municipality?: string; barangay?: string; address?: string; username?: string;
  password?: string; passwordHash?: string; termsAccepted?: boolean;
};

function clean(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function image(form: FormData, key: string, required = true) {
  const value = form.get(key);
  if (value instanceof File && value.size > 0) return value;
  if (required) throw new Error(`MISSING_${key.toUpperCase()}`);
  return null;
}

export async function POST(request: Request) {
  let form: FormData;
  try { form = await request.formData(); } catch {
    return NextResponse.json({ error: "Invalid registration data." }, { status: 400 });
  }

  const phoneVerificationId = clean(form.get("verificationId"), 36);
  if (!phoneVerificationId) return NextResponse.json({ error: "Verify your phone number before creating an account." }, { status: 400 });

  let input: RegistrationPayload;
  try {
    const pending = await getDatabase().query<{ payload: RegistrationPayload }>(
      "select payload from registration_otps where id = $1 and consumed_at is not null and expires_at > now()", [phoneVerificationId],
    );
    if (!pending.rowCount) return NextResponse.json({ error: "Your verification has expired. Please request a new code." }, { status: 400 });
    input = pending.rows[0].payload;
  } catch {
    return NextResponse.json({ error: "Unable to confirm phone verification." }, { status: 500 });
  }

  const googlePrefill = await getGoogleSignupPrefill();
  const firstName = clean(input.firstName, 50);
  const lastName = clean(input.lastName, 50);
  const email = googlePrefill?.email ?? clean(input.email, 100).toLowerCase();
  const phone = clean(input.phone, 15);
  const municipality = clean(input.municipality, 100);
  const barangay = clean(input.barangay, 100);
  const address = clean(input.address, 200);
  const username = clean(input.username, 30);
  const pendingPasswordHash = input.passwordHash ?? "";
  const password = input.password ?? "";

  if (!/^[A-Za-z0-9_.-]{3,30}$/.test(username)) return NextResponse.json({ error: "Username must contain 3 to 30 letters, numbers, dots, underscores, or hyphens." }, { status: 400 });
  if (!firstName || !lastName || !/^\S+@\S+\.\S+$/.test(email) || !/^\+?[0-9]{10,15}$/.test(phone) ||
      !municipality || !barangay || !address || (!pendingPasswordHash && password.length < 8) || !input.termsAccepted) {
    return NextResponse.json({ error: "Please complete all required registration fields." }, { status: 400 });
  }

  let front: File; let selfie: File; let back: File | null;
  try { front = image(form, "frontId")!; back = image(form, "backId", false); selfie = image(form, "selfie")!; } catch {
    return NextResponse.json({ error: "Upload the front of your ID and take a clear selfie before submitting." }, { status: 400 });
  }

  const duplicate = await getDatabase().query("select 1 from users where lower(email) = $1 or lower(username) = lower($2) or phone = $3 limit 1", [email, username, phone]);
  if (duplicate.rowCount) return NextResponse.json({ error: "That email, username, or phone is already registered." }, { status: 409 });

  const locality = await getDatabase().query<{ municipality_id: string; barangay_id: string }>(
    `select m.id as municipality_id, b.id as barangay_id from municipalities m
      join barangays b on b.municipality_id = m.id
      where lower(m.name) = lower($1) and lower(b.name) = lower($2) limit 1`, [municipality, barangay],
  );
  if (!locality.rowCount) return NextResponse.json({ error: "Select a valid Antique municipality and barangay." }, { status: 400 });

  const now = new Date();
  const userId = randomUUID();
  const profileId = randomUUID();
  const applicationId = randomUUID();
  const applicationReference = `ALAB-APP-${applicationId.replaceAll("-", "").slice(0, 10).toUpperCase()}`;
  let uploadedKeys: string[] = [];

  try {
    const evidence = await uploadIdentityEvidence({ applicationId, reference: applicationReference, submittedAt: now, front, back, selfie });
    uploadedKeys = evidence.uploadedKeys;
    const passwordHash = pendingPasswordHash || await hashPassword(password);
    await withTransaction(async (client) => {
      await client.query(
        `insert into users (id, email, username, password_hash, phone, google_subject, role, account_status, terms_accepted_at, created_at, updated_at)
         values ($1, $2, $3, $4, $5, $6, 'RESIDENT', 'PENDING_REVIEW', $7, $7, $7)`,
        [userId, email, username, passwordHash, phone, googlePrefill?.subject ?? null, now],
      );
      await client.query(`insert into resident_profiles (id, user_id, first_name, last_name, created_at, updated_at) values ($1,$2,$3,$4,$5,$5)`, [profileId, userId, firstName, lastName, now]);
      await client.query(
        `insert into resident_addresses (id, resident_profile_id, municipality_id, barangay_id, province, complete_address, is_primary, created_at, updated_at)
         values ($1,$2,$3,$4,'Antique',$5,true,$6,$6)`,
        [randomUUID(), profileId, locality.rows[0].municipality_id, locality.rows[0].barangay_id, address, now],
      );
      await client.query(
        `insert into resident_verifications
          (id, resident_profile_id, application_reference, front_document_key, back_document_key, selfie_key,
           front_review_document_key, back_review_document_key, selfie_review_document_key,
           front_document_sha256, back_document_sha256,
           selfie_sha256, front_document_mime_type, back_document_mime_type, selfie_mime_type,
           front_document_size_bytes, back_document_size_bytes, selfie_size_bytes, status, submitted_at, created_at, updated_at)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,'PENDING',$19,$19,$19)`,
        [applicationId, profileId, applicationReference, evidence.front.originalKey, evidence.back?.originalKey ?? null,
          evidence.selfie.originalKey, evidence.front.reviewKey, evidence.back?.reviewKey ?? null,
          evidence.selfie.reviewKey, evidence.front.sha256, evidence.back?.sha256 ?? null,
          evidence.selfie.sha256, evidence.front.mimeType, evidence.back?.mimeType ?? null,
          evidence.selfie.mimeType, evidence.front.sizeBytes, evidence.back?.sizeBytes ?? null,
          evidence.selfie.sizeBytes, now],
      );
      await client.query(
        `insert into resident_verification_events (verification_id, resident_profile_id, event_type, metadata, created_at)
         values ($1,$2,'SUBMITTED',$3::jsonb,$4)`,
        [applicationId, profileId, JSON.stringify({ municipalityId: locality.rows[0].municipality_id }), now],
      );
      await client.query(`insert into notification_preferences (id, resident_profile_id, created_at, updated_at) values ($1,$2,$3,$3)`, [randomUUID(), profileId, now]);
    });

    const response = NextResponse.json({ application: { reference: applicationReference, status: "PENDING", municipality }, redirectTo: "/resident/application" }, { status: 201 });
    response.cookies.set(RESIDENT_APPLICANT_COOKIE, createResidentApplicantSession(userId, username), residentApplicantCookie);
    response.cookies.set(RESIDENT_SESSION_COOKIE, "", { ...residentApplicantCookie, maxAge: 0, expires: new Date(0) });
    response.cookies.set(GOOGLE_SIGNUP_PREFILL_COOKIE, "", { ...residentApplicantCookie, maxAge: 0, expires: new Date(0) });
    return response;
  } catch (error) {
    await removeIdentityEvidence(uploadedKeys);
    if (typeof error === "object" && error && "code" in error && error.code === "23505") return NextResponse.json({ error: "That email, username, or phone is already registered." }, { status: 409 });
    const message = error instanceof Error && /(?:ID|Selfie|image|6 MB)/.test(error.message) ? error.message : "Unable to submit the resident application.";
    console.error("Resident registration failed", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
