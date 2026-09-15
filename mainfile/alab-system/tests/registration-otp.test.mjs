import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

process.env.OTP_SECRET = "test-only-otp-secret";
const otp = await import("../lib/auth/registration-otp.ts");

test("registration OTP normalizes Philippine phone numbers and verifies a hash", () => {
  assert.equal(otp.normalizePhilippinePhone("09171234567"), "639171234567");
  const code = otp.createOtpCode();
  assert.match(code, /^\d{6}$/);
  const hash = otp.hashOtp("639171234567", "123456");
  assert.equal(otp.verifyOtpHash("639171234567", "123456", hash), true);
  assert.equal(otp.verifyOtpHash("639171234567", "654321", hash), false);
});

test("the code expires in 5 minutes and the SMS and panel say so", () => {
  const start = readFileSync(new URL("../app/api/auth/register/start/route.ts", import.meta.url), "utf8");
  const sms = readFileSync(new URL("../lib/sms/philsms.ts", import.meta.url), "utf8");

  assert.match(start, /Date\.now\(\) \+ 5 \* 60_000/);
  assert.match(sms, /expires in 5 minutes/);
});

test("a verified registration is not rejected by the code's own 5 minute deadline", () => {
  // Regression: account creation re-checked expires_at, so a resident who
  // entered a live code and verified could still be told their verification
  // had expired while uploading ID photos and a selfie.
  const register = readFileSync(new URL("../app/api/auth/register/route.ts", import.meta.url), "utf8");

  assert.match(register, /consumed_at is not null/);
  assert.match(register, /consumed_at > now\(\) - interval '30 minutes'/);
  assert.doesNotMatch(register, /consumed_at is not null and expires_at > now\(\)/);
});

test("the resend cooldown is one minute and is separate from code expiry", () => {
  // The panel's "Resend code in 01:00" counts this cooldown, not expiry.
  const start = readFileSync(new URL("../app/api/auth/register/start/route.ts", import.meta.url), "utf8");

  assert.match(start, /last_sent_at > now\(\) - interval '60 seconds'/);
  assert.match(start, /wait one minute before requesting another code/);
});

test("PhilSMS delivery rejects API error payloads even when HTTP succeeds", () => {
  const source = readFileSync(new URL("../lib/sms/philsms.ts", import.meta.url), "utf8");
  assert.match(source, /https:\/\/dashboard\.philsms\.com\/api\/v3\/sms\/send/);
  assert.match(source, /await response\.json\(\)/);
  assert.match(source, /result\?\.status !== "success"/);
  assert.match(source, /result\?\.message/);
});
