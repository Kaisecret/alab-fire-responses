import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const appRoot = process.cwd();

function source(path) {
  return readFileSync(join(appRoot, path), "utf8");
}

test("resident registration persists account, profile, address, and verification records", () => {
  const register = source("app/api/auth/register/route.ts");

  assert.match(register, /INSERT INTO users/);
  assert.match(register, /INSERT INTO resident_profiles/);
  assert.match(register, /INSERT INTO resident_addresses/);
  assert.match(register, /INSERT INTO resident_verifications/);
  assert.match(register, /hashPassword/);
});

test("resident login has a five-attempt limit and writes a secure session cookie", () => {
  const login = source("app/api/auth/login/route.ts");
  const rateLimit = source("lib/auth/login-rate-limit.ts");
  const session = source("lib/auth/session.ts");

  assert.match(rateLimit, /MAX_LOGIN_ATTEMPTS\s*=\s*5/);
  assert.match(login, /checkLoginRateLimit/);
  assert.match(login, /recordLoginFailure/);
  assert.match(session, /httpOnly:\s*true/);
  assert.match(session, /sameSite:\s*"lax"/);
});

test("resident login shows a clear popup for incorrect credentials", () => {
  const loginPage = source("app/_components/login-page.tsx");

  assert.match(loginPage, /showLoginPopup/);
  assert.match(loginPage, /Incorrect username\/email or password\./);
  assert.match(loginPage, /Too many login attempts/);
  assert.match(loginPage, /Georgia.*Times New Roman.*serif/);
  assert.match(loginPage, /width:min\(94vw,34rem\)/);
});

test("middleware redirects unauthenticated visitors away from protected resident routes", () => {
  assert.equal(existsSync(join(appRoot, "middleware.ts")), true);
  const middleware = source("middleware.ts");

  assert.match(middleware, /\/resident\/:path\*/);
  assert.match(middleware, /\/resident\/login/);
  assert.match(middleware, /\/resident\/signup/);
  assert.match(middleware, /NextResponse\.redirect/);
  assert.match(middleware, /verifyResidentSession/);
});
