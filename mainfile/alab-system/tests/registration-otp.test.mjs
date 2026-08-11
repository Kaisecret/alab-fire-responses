import assert from "node:assert/strict";
import test from "node:test";

const otp = await import("../lib/auth/registration-otp.ts");

test("registration OTP normalizes Philippine phone numbers and verifies a hash", () => {
  assert.equal(otp.normalizePhilippinePhone("09171234567"), "639171234567");
  const code = otp.createOtpCode();
  assert.match(code, /^\d{6}$/);
  const hash = otp.hashOtp("639171234567", "123456");
  assert.equal(otp.verifyOtpHash("639171234567", "123456", hash), true);
  assert.equal(otp.verifyOtpHash("639171234567", "654321", hash), false);
});
