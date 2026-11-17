import { randomUUID } from "node:crypto";

import { hashPassword } from "./password.ts";
import { createOtpCode, hashOtp, normalizePhilippinePhone, verifyOtpHash } from "./registration-otp.ts";

type Queryable = {
  query: <T = Record<string, unknown>>(sql: string, params?: unknown[]) => Promise<{ rows: T[]; rowCount?: number | null }>;
};

/*
 * Reset codes live in registration_otps, marked by payload.purpose, so the
 * feature needs no schema change. Registration reads skip these rows.
 * shortcut: shared table, move to its own table if more OTP purposes appear.
 */
export const RESET_PURPOSE = "PASSWORD_RESET";
export const RESET_CODE_MINUTES = 10;
const MAX_SENDS_PER_HOUR = 5;
const MAX_ATTEMPTS = 5;

export type ResetStart = { resetId: string; expiresAt: string; sent: boolean };

async function findResident(client: Queryable, identifier: string) {
  let phones: string[] = [];
  try {
    const phone = normalizePhilippinePhone(identifier);
    phones = [phone, `0${phone.slice(2)}`];
  } catch {
    // Not a mobile number: match on username or email only.
  }
  const result = await client.query<{ id: string; phone: string | null }>(
    `select id, phone from users
      where role = 'RESIDENT' and account_status <> 'SUSPENDED'
        and (lower(email) = lower($1) or lower(username) = lower($1)
             or regexp_replace(coalesce(phone, ''), '\\D', '', 'g') = any($2::text[]))
      limit 1`,
    [identifier, phones],
  );
  return result.rows[0] ?? null;
}

/**
 * Texts a 6-digit reset code to the mobile number on the resident account the
 * identifier names. The reply has the same shape whether or not the account
 * exists, so the form cannot be used to find out who has an account.
 */
export async function startPasswordReset(
  client: Queryable,
  identifier: string,
  send: (phone: string, code: string) => Promise<unknown>,
): Promise<ResetStart> {
  const unknown = (): ResetStart => ({
    resetId: randomUUID(),
    expiresAt: new Date(Date.now() + RESET_CODE_MINUTES * 60_000).toISOString(),
    sent: false,
  });

  const user = await findResident(client, identifier);
  let phone: string | null = null;
  try { phone = user?.phone ? normalizePhilippinePhone(user.phone) : null; } catch { phone = null; }
  if (!user || !phone) return unknown();

  const latest = (await client.query<{ id: string; expires_at: string | Date; consumed_at: string | Date | null; recent: boolean }>(
    `select id, expires_at, consumed_at, last_sent_at > now() - interval '60 seconds' as recent
       from registration_otps where phone = $1 and payload->>'purpose' = $2
      order by last_sent_at desc limit 1`,
    [phone, RESET_PURPOSE],
  )).rows[0];
  const sends = (await client.query<{ sends: number }>(
    `select count(*)::int as sends from registration_otps
      where phone = $1 and payload->>'purpose' = $2 and last_sent_at > now() - interval '1 hour'`,
    [phone, RESET_PURPOSE],
  )).rows[0]?.sends ?? 0;

  if (latest && (latest.recent || sends >= MAX_SENDS_PER_HOUR)) {
    // Too soon for another text: point the form at the code already sent.
    const usable = !latest.consumed_at && new Date(latest.expires_at) > new Date();
    return usable ? { resetId: latest.id, expiresAt: new Date(latest.expires_at).toISOString(), sent: false } : unknown();
  }

  const code = createOtpCode();
  const resetId = randomUUID();
  const expiresAt = new Date(Date.now() + RESET_CODE_MINUTES * 60_000);
  await client.query(
    `update registration_otps set consumed_at = now(), updated_at = now()
      where phone = $1 and payload->>'purpose' = $2 and consumed_at is null`,
    [phone, RESET_PURPOSE],
  );
  await client.query(
    `insert into registration_otps (id, phone, payload, code_hash, expires_at, last_sent_at)
     values ($1, $2, $3::jsonb, $4, $5, now())`,
    [resetId, phone, JSON.stringify({ purpose: RESET_PURPOSE, userId: user.id }), hashOtp(phone, code), expiresAt],
  );
  try {
    await send(phone, code);
  } catch (error) {
    await client.query("delete from registration_otps where id = $1", [resetId]);
    throw error;
  }
  return { resetId, expiresAt: expiresAt.toISOString(), sent: true };
}

/**
 * Checks a reset code and, when a new password is given, sets it and uses up
 * the code. Without a password the code is only checked, so the form can
 * confirm it before asking for the new password. A wrong code counts toward
 * the five attempts; the caller must commit even when ok is false.
 */
export async function confirmPasswordReset(
  client: Queryable,
  input: { resetId: string; code: string; password?: string },
): Promise<{ ok: boolean; reset?: boolean }> {
  const row = (await client.query<{
    phone: string; payload: { userId?: string } | string; code_hash: string;
    expires_at: string | Date; attempt_count: number; consumed_at: string | Date | null;
  }>(
    `select phone, payload, code_hash, expires_at, attempt_count, consumed_at
       from registration_otps where id = $1 and payload->>'purpose' = $2 for update`,
    [input.resetId, RESET_PURPOSE],
  )).rows[0];
  if (!row || row.consumed_at || new Date(row.expires_at) <= new Date() || row.attempt_count >= MAX_ATTEMPTS) return { ok: false };

  if (!verifyOtpHash(row.phone, input.code, row.code_hash)) {
    await client.query("update registration_otps set attempt_count = attempt_count + 1, updated_at = now() where id = $1", [input.resetId]);
    return { ok: false };
  }
  if (input.password == null) return { ok: true };

  const payload = typeof row.payload === "string" ? JSON.parse(row.payload) as { userId?: string } : row.payload;
  const updated = await client.query(
    "update users set password_hash = $2, updated_at = now() where id = $1 and role = 'RESIDENT'",
    [payload.userId, await hashPassword(input.password)],
  );
  if (!updated.rowCount) return { ok: false };
  await client.query("update registration_otps set consumed_at = now(), updated_at = now() where id = $1", [input.resetId]);
  return { ok: true, reset: true };
}
