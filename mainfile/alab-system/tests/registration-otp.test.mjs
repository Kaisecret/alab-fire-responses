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
  const sms = readFileSync(new URL("../lib/sms/iprogsms.ts", import.meta.url), "utf8");

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

test("iProgSMS sends normalized OTP messages and rejects provider errors even when HTTP succeeds", async () => {
  const { sendIprogSmsMessage, sendIprogSmsOtp } = await import("../lib/sms/iprogsms.ts");
  const originalFetch = globalThis.fetch;
  const originalToken = process.env.IPROGSMS_API_TOKEN;
  let request;
  let result = { status: 200, message_id: "iSms-1" };
  process.env.IPROGSMS_API_TOKEN = "test-token";
  globalThis.fetch = async (url, init) => {
    request = { url, init };
    return Response.json(result);
  };
  try {
    assert.deepEqual(await sendIprogSmsMessage({ phone: "0917 123 4567", message: "ALAB test" }), { providerId: "iSms-1" });
    assert.equal(request.url, "https://www.iprogsms.com/api/v1/sms_messages");
    assert.doesNotMatch(request.url, /test-token|api_token/);
    assert.equal(request.init.method, "POST");
    assert.deepEqual(request.init.headers, { Accept: "application/json", "Content-Type": "application/json" });
    assert.deepEqual(JSON.parse(request.init.body), {
      api_token: "test-token", phone_number: "639171234567", message: "ALAB test",
    });
    assert.ok(request.init.signal instanceof AbortSignal);

    await sendIprogSmsOtp({ phone: "0917 123 4567", code: "123456" });
    assert.equal(JSON.parse(request.init.body).message, "Your ALAB verification code is 123456. It expires in 5 minutes.");

    result = { status: 500, message: "Invalid Token" };
    await assert.rejects(sendIprogSmsMessage({ phone: "09171234567", message: "Test" }), /IPROGSMS_DELIVERY_FAILED: Invalid Token/);

    result = { status: 400, message: "x".repeat(301) };
    await assert.rejects(sendIprogSmsMessage({ phone: "09171234567", message: "Test" }), { message: `IPROGSMS_DELIVERY_FAILED: ${"x".repeat(300)}` });
    result = { status: 400 };
    await assert.rejects(sendIprogSmsMessage({ phone: "09171234567", message: "Test" }), /IPROGSMS_DELIVERY_FAILED: unknown provider error/);

    result = { status: 200, message_id: 123 };
    assert.deepEqual(await sendIprogSmsMessage({ phone: "09171234567", message: "Test" }), { providerId: "123" });
    result = { status: 200 };
    assert.deepEqual(await sendIprogSmsMessage({ phone: "09171234567", message: "Test" }), { providerId: null });

    delete process.env.IPROGSMS_API_TOKEN;
    globalThis.fetch = async () => assert.fail("missing configuration must not send a request");
    await assert.rejects(sendIprogSmsMessage({ phone: "09171234567", message: "Test" }), /IPROGSMS_NOT_CONFIGURED/);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalToken === undefined) delete process.env.IPROGSMS_API_TOKEN; else process.env.IPROGSMS_API_TOKEN = originalToken;
  }
});

test("iProgSMS distinguishes ambiguous responses from confirmed HTTP rejection", async () => {
  const { sendIprogSmsMessage } = await import("../lib/sms/iprogsms.ts");
  const originalFetch = globalThis.fetch;
  const originalToken = process.env.IPROGSMS_API_TOKEN;
  process.env.IPROGSMS_API_TOKEN = "test-token";
  try {
    for (const [status, body] of [
      [500, '{"status":200}'], [503, '{"status":500,"message":"Unavailable"}'],
      [408, '{"status":200}'], [200, "not JSON"], [200, "null"],
      [200, "{}"], [200, '{"status":"200"}'], [400, "not JSON"],
    ]) {
      globalThis.fetch = async () => new Response(body, { status });
      await assert.rejects(sendIprogSmsMessage({ phone: "09171234567", message: "Test" }), { message: "IPROGSMS_DELIVERY_UNCONFIRMED" });
    }
    globalThis.fetch = async () => Response.json({ status: 200, message: "Rejected" }, { status: 400 });
    await assert.rejects(sendIprogSmsMessage({ phone: "09171234567", message: "Test" }), /IPROGSMS_DELIVERY_FAILED: Rejected/);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalToken === undefined) delete process.env.IPROGSMS_API_TOKEN; else process.env.IPROGSMS_API_TOKEN = originalToken;
  }
});
