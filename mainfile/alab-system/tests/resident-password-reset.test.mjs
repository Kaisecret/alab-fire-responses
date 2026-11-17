import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

process.env.OTP_SECRET ??= "password-reset-test-secret-with-32-characters";

const { startPasswordReset, confirmPasswordReset } = await import("../lib/auth/password-reset.ts");
const { verifyPassword, hashPassword } = await import("../lib/auth/password.ts");

const userId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

async function fixture() {
  const { PGlite } = await import("@electric-sql/pglite");
  const db = new PGlite();
  await db.exec(`create table users (
    id uuid primary key, username text, email text, phone text, role text, account_status text,
    password_hash text, updated_at timestamptz)`);
  await db.exec(readFileSync(new URL("../supabase/migrations/20260812090000_add_registration_otps.sql", import.meta.url), "utf8"));
  await db.query("insert into users values ($1, 'juan', 'juan@example.com', '0917-123-4567', 'RESIDENT', 'ACTIVE', $2, now())", [userId, await hashPassword("old-password")]);
  const sent = [];
  const send = async (phone, code) => { sent.push({ phone, code }); };
  return { db, sent, send };
}

test("an unknown account gets the same reply and no text message", async () => {
  const { db, sent, send } = await fixture();
  const result = await startPasswordReset(db, "nobody", send);
  assert.match(result.resetId, /^[0-9a-f-]{36}$/);
  assert.equal(sent.length, 0);
  assert.equal((await db.query("select count(*)::int as n from registration_otps")).rows[0].n, 0);
  assert.deepEqual(await confirmPasswordReset(db, { resetId: result.resetId, code: "123456" }), { ok: false });
});

test("a code texted to the account's number resets the password once", async () => {
  const { db, sent, send } = await fixture();
  const first = await startPasswordReset(db, "09171234567", send);
  assert.equal(sent.length, 1);
  assert.equal(sent[0].phone, "639171234567");

  // A second request inside a minute reuses the code instead of texting again.
  const again = await startPasswordReset(db, "juan", send);
  assert.equal(again.resetId, first.resetId);
  assert.equal(sent.length, 1);

  const wrong = sent[0].code === "000000" ? "111111" : "000000";
  assert.deepEqual(await confirmPasswordReset(db, { resetId: first.resetId, code: wrong }), { ok: false });
  assert.equal((await db.query("select attempt_count from registration_otps")).rows[0].attempt_count, 1);

  assert.deepEqual(await confirmPasswordReset(db, { resetId: first.resetId, code: sent[0].code }), { ok: true });
  assert.deepEqual(await confirmPasswordReset(db, { resetId: first.resetId, code: sent[0].code, password: "new-password-1" }), { ok: true, reset: true });
  const hash = (await db.query("select password_hash from users where id = $1", [userId])).rows[0].password_hash;
  assert.equal(await verifyPassword("new-password-1", hash), true);
  assert.deepEqual(await confirmPasswordReset(db, { resetId: first.resetId, code: sent[0].code, password: "another-one" }), { ok: false });
});

test("registration never accepts a password reset code", () => {
  const verify = readFileSync(new URL("../app/api/auth/register/verify/route.ts", import.meta.url), "utf8");
  const register = readFileSync(new URL("../app/api/auth/register/route.ts", import.meta.url), "utf8");
  assert.match(verify, /<> 'PASSWORD_RESET'/);
  assert.match(register, /<> 'PASSWORD_RESET'/);
});
