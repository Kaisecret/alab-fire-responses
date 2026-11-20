import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

process.env.OTP_SECRET ??= "password-reset-test-secret-with-32-characters";

const { startPasswordReset, confirmPasswordReset } = await import("../lib/auth/password-reset.ts");
const { verifyPassword, hashPassword } = await import("../lib/auth/password.ts");

const userId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

async function fixture(email = null) {
  const { PGlite } = await import("@electric-sql/pglite");
  const db = new PGlite();
  await db.exec(`create table users (
    id uuid primary key, username text, email text, phone text, role text, account_status text,
    password_hash text, updated_at timestamptz)`);
  await db.exec(readFileSync(new URL("../supabase/migrations/20260812090000_add_registration_otps.sql", import.meta.url), "utf8"));
  await db.query("insert into users values ($1, 'juan', $3, '0917-123-4567', 'RESIDENT', 'ACTIVE', $2, now())", [userId, await hashPassword("old-password"), email]);
  const sent = [];
  const send = async (destination, code, channel) => { sent.push({ phone: destination, destination, code, channel }); };
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

test("a resident with an email receives the reset code at the stored email", async () => {
  const { db, sent, send } = await fixture("juan@example.com");
  try {
    const result = await startPasswordReset(db, "09171234567", send);
    assert.equal(result.sent, true);
    assert.equal(sent.length, 1);
    assert.equal(sent[0].channel, "EMAIL");
    assert.equal(sent[0].destination, "juan@example.com");
    assert.deepEqual(await confirmPasswordReset(db, { resetId: result.resetId, code: sent[0].code }), { ok: true });
    const again = await startPasswordReset(db, "JUAN@example.com", send);
    assert.equal(again.resetId, result.resetId);
    assert.equal(sent.length, 1);
  } finally { await db.close(); }
});

test("a resident without an email keeps SMS recovery", async () => {
  const { db, sent, send } = await fixture();
  try {
    await startPasswordReset(db, "juan", send);
    assert.equal(sent[0].channel, "SMS");
    assert.equal(sent[0].destination, "639171234567");
  } finally { await db.close(); }
});

test("an existing SMS code does not suppress a newly requested email code", async () => {
  const { db, sent, send } = await fixture();
  try {
    const sms = await startPasswordReset(db, "juan", send);
    // Simulate a pre-deployment SMS OTP, which has no recorded channel.
    await db.query("update registration_otps set payload = payload - 'channel' where id = $1", [sms.resetId]);
    await db.query("update users set email = 'juan@example.com' where id = $1", [userId]);
    const email = await startPasswordReset(db, "juan", send);
    assert.notEqual(email.resetId, sms.resetId);
    assert.equal(sent.length, 2);
    assert.equal(sent[1].channel, "EMAIL");
    assert.deepEqual(await confirmPasswordReset(db, { resetId: sms.resetId, code: sent[0].code }), { ok: false });
    assert.deepEqual(await confirmPasswordReset(db, { resetId: email.resetId, code: sent[1].code }), { ok: true });
  } finally { await db.close(); }
});

test("failed email delivery leaves no active unsent code and can be retried", async () => {
  const { db, sent, send } = await fixture("juan@example.com");
  try {
    await assert.rejects(startPasswordReset(db, "juan", async () => { throw new Error("GMAIL_DELIVERY_FAILED"); }), /GMAIL_DELIVERY_FAILED/);
    assert.equal((await db.query("select count(*)::int as n from registration_otps")).rows[0].n, 0);
    assert.equal((await startPasswordReset(db, "juan", send)).sent, true);
    assert.equal(sent[0].destination, "juan@example.com");
  } finally { await db.close(); }
});

test("switching from SMS to email cannot bypass the hourly send limit", async () => {
  const { db, sent, send } = await fixture();
  try {
    await startPasswordReset(db, "juan", send);
    await db.query(`insert into registration_otps (id, phone, payload, code_hash, expires_at, last_sent_at)
      select gen_random_uuid(), phone, payload, code_hash, expires_at, last_sent_at
      from registration_otps cross join generate_series(1, 4)`);
    await db.query("update users set email = 'juan@example.com' where id = $1", [userId]);
    const result = await startPasswordReset(db, "juan", send);
    assert.equal(result.sent, false);
    assert.equal(sent.length, 1);
    assert.equal((await db.query("select count(*)::int as n from registration_otps")).rows[0].n, 5);
  } finally { await db.close(); }
});
