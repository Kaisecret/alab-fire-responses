import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const source = (path) => readFileSync(join(root, path), "utf8");

test("resident correction delivery queue is retry-safe and deduplicated", () => {
  const migrationPath = "supabase/migrations/20260910090000_add_resident_notification_deliveries.sql";
  const repositoryPath = "lib/resident-applications/delivery-queue.ts";
  assert.equal(existsSync(join(root, migrationPath)), true);
  assert.equal(existsSync(join(root, repositoryPath)), true);

  const migration = source(migrationPath);
  const repository = source(repositoryPath);
  assert.match(migration, /channel in \('SMS', 'EMAIL'\)/i);
  assert.match(migration, /status in \('PENDING', 'PROCESSING', 'SENT', 'FAILED'\)/i);
  assert.match(migration, /attempt_count/i);
  assert.match(migration, /provider_message_id/i);
  assert.match(migration, /last_error/i);
  assert.match(migration, /unique[^;]+dedupe_key/is);
  assert.match(repository, /for update skip locked/i);
  assert.match(repository, /on conflict \(dedupe_key\) do nothing/i);
  assert.match(repository, /attempt_count < max_attempts/i);
});

test("correction messages keep sensitive reasons out of SMS and escape email HTML", async () => {
  const { createCorrectionMessages } = await import("../lib/resident-applications/correction-messages.ts");
  const messages = createCorrectionMessages({
    firstName: "Ana <script>",
    reference: "ALAB-APP-123",
    municipality: "San Jose & Hamtic",
    reason: "Replace the <b>front ID</b> photo.",
    applicationUrl: "https://alab.example/resident/application",
  });

  assert.doesNotMatch(messages.sms, /front ID/i);
  assert.match(messages.sms, /ALAB-APP-123/);
  assert.doesNotMatch(messages.emailHtml, /<script>/i);
  assert.doesNotMatch(messages.emailHtml, /<b>front ID<\/b>/i);
  assert.match(messages.emailHtml, /Replace the &lt;b&gt;front ID&lt;\/b&gt; photo/);
});

test("PhilSMS correction delivery normalizes the number and uses existing credentials", async () => {
  const { sendPhilSmsMessage } = await import("../lib/sms/philsms.ts");
  const originalFetch = globalThis.fetch;
  const originalToken = process.env.PHILSMS_API_TOKEN;
  const originalSender = process.env.PHILSMS_SENDER_ID;
  let request;
  process.env.PHILSMS_API_TOKEN = "test-token";
  process.env.PHILSMS_SENDER_ID = "ALAB";
  globalThis.fetch = async (url, init) => {
    request = { url, init };
    return new Response(JSON.stringify({ status: "success", data: { message_id: "sms-123" } }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };
  try {
    const result = await sendPhilSmsMessage({ phone: "0917 123 4567", message: "ALAB test" });
    const body = JSON.parse(request.init.body);
    assert.equal(request.url, "https://dashboard.philsms.com/api/v3/sms/send");
    assert.equal(request.init.headers.Authorization, "Bearer test-token");
    assert.equal(body.recipient, "639171234567");
    assert.equal(result.providerId, "sms-123");
  } finally {
    globalThis.fetch = originalFetch;
    if (originalToken === undefined) delete process.env.PHILSMS_API_TOKEN; else process.env.PHILSMS_API_TOKEN = originalToken;
    if (originalSender === undefined) delete process.env.PHILSMS_SENDER_ID; else process.env.PHILSMS_SENDER_ID = originalSender;
  }
});

test("Resend email delivery uses authorization and an idempotency key", async () => {
  const { sendResendEmail } = await import("../lib/email/resend.ts");
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.RESEND_API_KEY;
  const originalFrom = process.env.RESEND_FROM_EMAIL;
  let request;
  process.env.RESEND_API_KEY = "re_test";
  process.env.RESEND_FROM_EMAIL = "ALAB <updates@example.gov.ph>";
  globalThis.fetch = async (url, init) => {
    request = { url, init };
    return new Response(JSON.stringify({ id: "email-123" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };
  try {
    const result = await sendResendEmail({
      to: "resident@example.com", subject: "Changes requested", html: "<p>Update</p>",
      text: "Update", idempotencyKey: "resident-correction:123:email",
    });
    assert.equal(request.url, "https://api.resend.com/emails");
    assert.equal(request.init.headers.Authorization, "Bearer re_test");
    assert.equal(request.init.headers["Idempotency-Key"], "resident-correction:123:email");
    assert.equal(result.providerId, "email-123");
  } finally {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.RESEND_API_KEY; else process.env.RESEND_API_KEY = originalKey;
    if (originalFrom === undefined) delete process.env.RESEND_FROM_EMAIL; else process.env.RESEND_FROM_EMAIL = originalFrom;
  }
});

test("correction transaction queues resident-owned destinations before provider delivery", () => {
  const service = source("lib/resident-applications/service.ts");
  const route = source("app/api/municipal-bfp/resident-applications/[applicationId]/request-corrections/route.ts");
  assert.match(service, /u\.email, u\.phone/);
  assert.match(service, /enqueueResidentCorrectionDeliveries\(client/);
  assert.match(service, /submission_number/);
  assert.match(route, /deliverResidentCorrectionNotifications/);
  assert.ok(route.indexOf("requestResidentApplicationCorrections") < route.indexOf("deliverResidentCorrectionNotifications"));
});

test("provider failure does not turn a saved correction into an API failure", () => {
  const route = source("app/api/municipal-bfp/resident-applications/[applicationId]/request-corrections/route.ts");
  const deliveryServicePath = "lib/resident-applications/delivery-service.ts";
  assert.equal(existsSync(join(root, deliveryServicePath)), true);
  assert.match(route, /delivery:\s*deliveryResults/);
  assert.match(source(deliveryServicePath), /Promise\.allSettled/);
});

test("municipal reviewer sees saved correction and per-channel delivery feedback", () => {
  const page = source("app/municipal-bfp/verification-queue/page.tsx");
  assert.match(page, /Correction request saved/);
  assert.match(page, /SMS sent/);
  assert.match(page, /Email sent/);
  assert.match(page, /SMS queued for retry/);
  assert.match(page, /Email is not configured/);
});

test("correction delivery falls back safely when the queue migration is not yet applied", () => {
  const queue = source("lib/resident-applications/delivery-queue.ts");
  const route = source("app/api/municipal-bfp/resident-applications/[applicationId]/request-corrections/route.ts");
  assert.match(queue, /to_regclass\('public\.resident_notification_deliveries'\)/);
  assert.match(route, /directDelivery/);
  assert.doesNotMatch(route, /application:\s*result/);
});
