import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";

import { withTransaction } from "../../../../lib/db";
import { hashPassword } from "../../../../lib/auth/password";
import { createResidentSession, residentSessionCookie, RESIDENT_SESSION_COOKIE } from "../../../../lib/auth/session";
import { getGoogleSignupPrefill, GOOGLE_SIGNUP_PREFILL_COOKIE } from "../../../../lib/auth/google-signup-prefill";

export const runtime = "nodejs";

type RegistrationPayload = {
  verificationId?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  municipality?: string;
  barangay?: string;
  address?: string;
  username?: string;
  password?: string;
  passwordHash?: string;
  frontDocumentName?: string;
  backDocumentName?: string;
  selfieCaptured?: boolean;
  termsAccepted?: boolean;
};

function clean(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

export async function POST(request: Request) {
  let input: RegistrationPayload;
  try {
    input = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid registration data." }, { status: 400 });
  }

  const verificationId = clean(input.verificationId, 36);
  if (!verificationId) return NextResponse.json({ error: "Verify your phone number before creating an account." }, { status: 400 });
  let pendingPasswordHash = "";
  const googlePrefill = await getGoogleSignupPrefill();
  try {
    const pending = await withTransaction(async (client) => client.query<{ payload: RegistrationPayload & { passwordHash?: string } }>(
      "select payload from registration_otps where id = $1 and consumed_at is not null and expires_at > now()", [verificationId],
    ));
    if (!pending.rowCount) return NextResponse.json({ error: "Your verification has expired. Please request a new code." }, { status: 400 });
    input = pending.rows[0].payload;
    pendingPasswordHash = input.passwordHash ?? "";
  } catch {
    return NextResponse.json({ error: "Unable to confirm phone verification." }, { status: 500 });
  }

  const firstName = clean(input.firstName, 50);
  const lastName = clean(input.lastName, 50);
  const email = googlePrefill?.email ?? clean(input.email, 100).toLowerCase();
  const phone = clean(input.phone, 15);
  const municipality = clean(input.municipality, 100);
  const barangay = clean(input.barangay, 100);
  const address = clean(input.address, 200);
  const username = clean(input.username, 30);
  const password = input.password ?? "";
  const frontDocumentName = clean(input.frontDocumentName, 255);

  if (!firstName || !lastName || !/^\S+@\S+\.\S+$/.test(email) || !/^\+?[0-9]{10,15}$/.test(phone) ||
    !municipality || !barangay || !address || !/^[A-Za-z0-9_.-]{3,30}$/.test(username) ||
    password.length < 8 || !frontDocumentName || !input.selfieCaptured || !input.termsAccepted) {
    return NextResponse.json({ error: "Please complete all required registration fields." }, { status: 400 });
  }

  try {
    const passwordHash = pendingPasswordHash || await hashPassword(password);
    const user = await withTransaction(async (client) => {
      const locality = await client.query<{ municipality_id: string; barangay_id: string }>(
        `SELECT m.id AS municipality_id, b.id AS barangay_id
         FROM municipalities m JOIN barangays b ON b.municipality_id = m.id
         WHERE m.name = $1 AND b.name = $2`,
        [municipality, barangay],
      );
      if (!locality.rowCount) throw new Error("INVALID_LOCALITY");

      const now = new Date();
      const userId = randomUUID();
      const profileId = randomUUID();
      const addressId = randomUUID();
      const verificationId = randomUUID();
      const preferencesId = randomUUID();
      const safeFrontName = frontDocumentName.replace(/[^A-Za-z0-9._-]/g, "_");
      const safeBackName = clean(input.backDocumentName, 255).replace(/[^A-Za-z0-9._-]/g, "_");

      await client.query(
        `INSERT INTO users (id, email, username, password_hash, phone, google_subject, role, account_status, terms_accepted_at, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, 'RESIDENT', 'ACTIVE', $7, $7, $7)`,
        [userId, email, username, passwordHash, phone, googlePrefill?.subject ?? null, now],
      );
      await client.query(
        `INSERT INTO resident_profiles (id, user_id, first_name, last_name, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $5)`,
        [profileId, userId, firstName, lastName, now],
      );
      await client.query(
        `INSERT INTO resident_addresses (id, resident_profile_id, municipality_id, barangay_id, province, complete_address, is_primary, created_at, updated_at)
         VALUES ($1, $2, $3, $4, 'Antique', $5, true, $6, $6)`,
        [addressId, profileId, locality.rows[0].municipality_id, locality.rows[0].barangay_id, address, now],
      );
      await client.query(
        `INSERT INTO resident_verifications (id, resident_profile_id, front_document_key, back_document_key, selfie_key, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, 'PENDING', $6, $6)`,
        [verificationId, profileId, `simulated/${userId}/front-${safeFrontName}`, safeBackName ? `simulated/${userId}/back-${safeBackName}` : null, `simulated/${userId}/selfie-camera`, now],
      );
      await client.query(
        `INSERT INTO notification_preferences (id, resident_profile_id, created_at, updated_at)
         VALUES ($1, $2, $3, $3)`,
        [preferencesId, profileId, now],
      );
      return { id: userId, username };
    });

    const response = NextResponse.json({ user: { id: user.id, username: user.username } }, { status: 201 });
    response.cookies.set(RESIDENT_SESSION_COOKIE, createResidentSession(user.id, user.username), residentSessionCookie);
    response.cookies.set(GOOGLE_SIGNUP_PREFILL_COOKIE, "", { ...residentSessionCookie, maxAge: 0, expires: new Date(0) });
    return response;
  } catch (error) {
    if (error instanceof Error && error.message === "INVALID_LOCALITY") {
      return NextResponse.json({ error: "Select a valid Antique municipality and barangay." }, { status: 400 });
    }
    if (typeof error === "object" && error && "code" in error && error.code === "23505") {
      return NextResponse.json({ error: "That email, username, or phone is already registered." }, { status: 409 });
    }
    console.error("Resident registration failed", error);
    return NextResponse.json({ error: "Unable to create the resident account." }, { status: 500 });
  }
}
