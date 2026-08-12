import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const otp = await import("../lib/auth/registration-otp.ts");

test("registration OTP normalizes Philippine phone numbers and verifies a hash", () => {
  assert.equal(otp.normalizePhilippinePhone("09171234567"), "639171234567");
  const code = otp.createOtpCode();
  assert.match(code, /^\d{6}$/);
  const hash = otp.hashOtp("639171234567", "123456");
  assert.equal(otp.verifyOtpHash("639171234567", "123456", hash), true);
  assert.equal(otp.verifyOtpHash("639171234567", "654321", hash), false);
});

test("PhilSMS delivery rejects API error payloads even when HTTP succeeds", () => {
  const source = readFileSync(new URL("../lib/sms/philsms.ts", import.meta.url), "utf8");
  assert.match(source, /https:\/\/app\.philsms\.com\/api\/v3\/sms\/send/);
  assert.match(source, /await response\.json\(\)/);
  assert.match(source, /result\?\.status !== "success"/);
  assert.match(source, /result\?\.message/);
});
