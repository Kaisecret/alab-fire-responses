import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const appRoot = process.cwd();

function source(path) {
  return readFileSync(join(appRoot, path), "utf8");
}

test("login rate limiter limits to exactly 3 failed attempts and locks out for 2 minutes", async () => {
  const rateLimitModule = await import("../lib/auth/login-rate-limit.ts");
  const rateLimitSource = source("lib/auth/login-rate-limit.ts");

  assert.equal(rateLimitModule.MAX_LOGIN_ATTEMPTS, 3, "MAX_LOGIN_ATTEMPTS must be 3");
  assert.match(rateLimitSource, /1000\s*\*\s*60\s*\*\s*2|120000|120_000/, "Lockout window must be 2 minutes");

  const testKey = `test-user-${Date.now()}`;

  // Initially allowed
  assert.equal(rateLimitModule.checkLoginRateLimit(testKey).allowed, true);

  // 1st failed attempt
  const first = rateLimitModule.recordLoginFailure(testKey);
  assert.equal(first.locked, false);
  assert.equal(first.attemptsRemaining, 2);
  assert.equal(rateLimitModule.checkLoginRateLimit(testKey).allowed, true);

  // 2nd failed attempt
  const second = rateLimitModule.recordLoginFailure(testKey);
  assert.equal(second.locked, false);
  assert.equal(second.attemptsRemaining, 1);
  assert.equal(rateLimitModule.checkLoginRateLimit(testKey).allowed, true);

  // 3rd failed attempt -> MUST lock out!
  const third = rateLimitModule.recordLoginFailure(testKey);
  assert.equal(third.locked, true);
  assert.equal(third.attemptsRemaining, 0);

  // Check rate limit status while locked
  const status = rateLimitModule.checkLoginRateLimit(testKey);
  assert.equal(status.allowed, false);
  assert.ok(status.retryAfterSeconds > 0 && status.retryAfterSeconds <= 120);

  // Clean up
  rateLimitModule.clearLoginFailures(testKey);
  assert.equal(rateLimitModule.checkLoginRateLimit(testKey).allowed, true);
});

test("resident login route enforces 2-minute lockout on 3 failed attempts", () => {
  const login = source("app/api/auth/login/route.ts");

  assert.match(login, /checkLoginRateLimit/);
  assert.match(login, /recordLoginFailure/);
  assert.match(login, /2 minutes/i, "Resident login error message must state 2 minutes");
});

test("BFP municipal and provincial login route enforces 2-minute lockout on 3 failed attempts", () => {
  const bfpLogin = source("app/api/auth/bfp/login/route.ts");

  assert.match(bfpLogin, /checkLoginRateLimit/);
  assert.match(bfpLogin, /recordLoginFailure/);
  assert.match(bfpLogin, /2 minutes/i, "BFP login error message must state 2 minutes");
});

test("failing wrong account locks out client device and blocks login even if real account is submitted", async () => {
  const rateLimitModule = await import("../lib/auth/login-rate-limit.ts");

  const clientIp = `test-ip-${Date.now()}`;
  const wrongEmail = "wrong-account@bfp.gov.ph";
  const realEmail = "real-station@bfp.gov.ph";

  const ipKey = `bfp:ip:${clientIp}`;
  const wrongAccountKey = `bfp:acc:${wrongEmail}`;
  const realAccountKey = `bfp:acc:${realEmail}`;

  const wrongKeys = [ipKey, wrongAccountKey, `bfp:${clientIp}:${wrongEmail}`];
  const realKeys = [ipKey, realAccountKey, `bfp:${clientIp}:${realEmail}`];

  // 1. Initial check on wrong account is allowed
  assert.equal(rateLimitModule.checkLoginRateLimits(wrongKeys).allowed, true);

  // 2. Fail 3 times on wrong account
  rateLimitModule.recordLoginFailures(wrongKeys);
  rateLimitModule.recordLoginFailures(wrongKeys);
  const thirdFail = rateLimitModule.recordLoginFailures(wrongKeys);
  assert.equal(thirdFail.locked, true);

  // 3. Client IP is now locked out
  assert.equal(rateLimitModule.checkLoginRateLimits(wrongKeys).allowed, false);

  // 4. User now tries logging into real account from the same client IP -> MUST BE BLOCKED!
  const realAttempt = rateLimitModule.checkLoginRateLimits(realKeys);
  assert.equal(realAttempt.allowed, false, "Real account attempt from locked client device must be blocked!");
  assert.ok(realAttempt.retryAfterSeconds > 0, "Must have active retry-after seconds");

  // 5. Clean up
  rateLimitModule.clearAllLoginFailures(wrongKeys);
  rateLimitModule.clearAllLoginFailures(realKeys);
  assert.equal(rateLimitModule.checkLoginRateLimits(realKeys).allowed, true);
});

