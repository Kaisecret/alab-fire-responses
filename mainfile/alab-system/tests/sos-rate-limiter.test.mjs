import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const appRoot = "c:/Users/janna/OneDrive/Documents/Bestcapstone for us/mainfile/alab-system";

test("SOS Rate Limiter module exports constants, memory window, and check function", async () => {
  const rateLimiterModule = await import("../lib/fire-reports/rate-limiter.ts");

  assert.equal(rateLimiterModule.SOS_RATE_LIMIT_MAX_REPORTS, 2);
  assert.equal(rateLimiterModule.SOS_RATE_LIMIT_WINDOW_MS, 300000); // 5 minutes
  assert.equal(rateLimiterModule.SOS_RATE_LIMIT_WINDOW_SECONDS, 300);
  assert.match(rateLimiterModule.SOS_RATE_LIMIT_ERROR_EN, /up to 2 fire reports every 5 minutes/);

  assert.equal(typeof rateLimiterModule.checkResidentSosRateLimit, "function");
  assert.equal(typeof rateLimiterModule.recordSuccessfulSosReportMemory, "function");
  assert.equal(typeof rateLimiterModule.getMemorySosReportCount, "function");
  assert.equal(typeof rateLimiterModule.clearMemorySosReports, "function");
});

test("SOS Rate Limiter sliding window permits exactly 2 reports and rejects 3rd within 5 minutes", async () => {
  const {
    checkResidentSosRateLimit,
    recordSuccessfulSosReportMemory,
    clearMemorySosReports,
    SOS_RATE_LIMIT_ERROR_EN,
  } = await import("../lib/fire-reports/rate-limiter.ts");

  const testUser = `test-user-${Date.now()}`;
  clearMemorySosReports(testUser);

  // Attempt 1: Should be allowed
  const check1 = await checkResidentSosRateLimit(testUser, undefined, null);
  assert.equal(check1.allowed, true, "1st report must be allowed");
  assert.equal(check1.count, 0);

  // Successfully submitted 1st report -> recorded
  recordSuccessfulSosReportMemory(testUser);

  // Attempt 2: Should be allowed (1 existing report in window)
  const check2 = await checkResidentSosRateLimit(testUser, undefined, null);
  assert.equal(check2.allowed, true, "2nd report must be allowed");
  assert.equal(check2.count, 1);

  // Successfully submitted 2nd report -> recorded
  recordSuccessfulSosReportMemory(testUser);

  // Attempt 3: Should be BLOCKED (2 existing reports in window)
  const check3 = await checkResidentSosRateLimit(testUser, undefined, null);
  assert.equal(check3.allowed, false, "3rd report must be blocked");
  assert.equal(check3.count, 2);
  assert.equal(check3.message, SOS_RATE_LIMIT_ERROR_EN);
  assert.ok(check3.retryAfterSeconds > 0);
});

test("Failed submissions do NOT increment rate limit count", async () => {
  const {
    checkResidentSosRateLimit,
    clearMemorySosReports,
  } = await import("../lib/fire-reports/rate-limiter.ts");

  const testUser = `test-failed-user-${Date.now()}`;
  clearMemorySosReports(testUser);

  // Simulating 5 failed submission attempts (network drop, validation error)
  // Because submission failed, recordSuccessfulSosReportMemory is NEVER called!
  for (let i = 0; i < 5; i++) {
    const check = await checkResidentSosRateLimit(testUser, undefined, null);
    assert.equal(check.allowed, true, `Failed attempts must not block report submission`);
    assert.equal(check.count, 0, `Count must remain 0 when submissions fail`);
  }
});

test("Sliding window unlocks after 5 minutes have elapsed", async () => {
  const {
    checkResidentSosRateLimit,
    recordSuccessfulSosReportMemory,
    clearMemorySosReports,
  } = await import("../lib/fire-reports/rate-limiter.ts");

  const testUser = `test-window-user-${Date.now()}`;
  clearMemorySosReports(testUser);

  // Record 2 reports in the past (> 5 minutes ago)
  const sixMinutesAgo = Date.now() - 6 * 60 * 1000;
  recordSuccessfulSosReportMemory(testUser, sixMinutesAgo);
  recordSuccessfulSosReportMemory(testUser, sixMinutesAgo + 1000);

  // Now, sliding window should have expired the old reports!
  const check = await checkResidentSosRateLimit(testUser, undefined, null);
  assert.equal(check.allowed, true, "Expired reports should allow new submissions");
  assert.equal(check.count, 0);
});

test("Backend fire-reports route integrates rate limit check and returns 429 when quota is exceeded", () => {
  const routePath = join(appRoot, "app", "api", "resident", "fire-reports", "route.ts");
  assert.ok(existsSync(routePath), "Fire reports route must exist");

  const routeSource = readFileSync(routePath, "utf8");
  assert.match(routeSource, /checkResidentSosRateLimit/);
  assert.match(routeSource, /status:\s*429/);
  assert.match(routeSource, /recordSuccessfulSosReportMemory/);
});

test("Report fire UI contains short English rate limit popup with zero peacetime text clutter", () => {
  const contentPath = join(appRoot, "app", "_content", "resident-report-fire-content.ts");
  const pagePath = join(appRoot, "app", "resident", "report-fire", "page.tsx");

  assert.ok(existsSync(contentPath), "Report fire content file must exist");
  assert.ok(existsSync(pagePath), "Report fire page file must exist");

  const contentSource = readFileSync(contentPath, "utf8");
  const pageSource = readFileSync(pagePath, "utf8");

  // Popup markup in English
  assert.match(contentSource, /data-rate-limit-dialog/);
  assert.match(contentSource, /Report Limit Reached/);
  assert.match(contentSource, /You can only send up to <strong>2 fire reports every 5 minutes<\/strong>/);
  assert.match(contentSource, /Okay, Understood/);
  assert.match(contentSource, /data-rate-limit-close/);

  // Peacetime: dialog is hidden by default
  assert.match(contentSource, /<div class="rate-limit-dialog-backdrop" data-rate-limit-dialog hidden>/);

  // Page logic: client pre-flight check and success-only recording
  assert.match(pageSource, /checkClientSosRateLimit/);
  assert.match(pageSource, /alab_successful_sos_reports/);
  assert.match(pageSource, /recordClientSuccessfulSos/);
  assert.match(pageSource, /showRateLimitDialog/);
});
