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

test("resident logout clears the secure session cookie and redirects to login", () => {
  const logoutPath = join(appRoot, "app", "api", "auth", "logout", "route.ts");
  assert.equal(existsSync(logoutPath), true, "logout route is missing");
  const logout = readFileSync(logoutPath, "utf8");
  const residentLayout = source("app/resident/layout.tsx");
  const profile = source("app/_content/resident-profile-content.ts");

  assert.match(logout, /export async function POST/);
  assert.match(logout, /NextResponse\.redirect/);
  assert.match(logout, /RESIDENT_SESSION_COOKIE/);
  assert.match(logout, /maxAge:\s*0/);
  assert.match(residentLayout, /action="\/api\/auth\/logout"/);
  assert.match(profile, /action="\/api\/auth\/logout"/);
});

test("resident logout uses an accessible branded confirmation dialog before ending the session", () => {
  const residentLayout = source("app/resident/layout.tsx");

  assert.match(residentLayout, /useState/);
  assert.match(residentLayout, /role="alertdialog"/);
  assert.match(residentLayout, /aria-modal="true"/);
  assert.match(residentLayout, /id="residentLogoutDialog"/);
  assert.match(residentLayout, /onSubmitCapture=\{requestLogoutConfirmation\}/);
  assert.match(residentLayout, /current\?\.submit\(\)/);
  assert.match(residentLayout, /event\.preventDefault\(\)/);
});

test("resident login shows a clear popup for incorrect credentials", () => {
  const loginPage = source("app/_components/login-page.tsx");

  assert.match(loginPage, /showLoginPopup/);
  assert.match(loginPage, /Incorrect username\/email or password\./);
  assert.match(loginPage, /Too many login attempts/);
  assert.match(loginPage, /Georgia.*Times New Roman.*serif/);
  assert.match(loginPage, /width:min\(94vw,34rem\)/);
});

test("proxy redirects unauthenticated visitors away from protected resident routes", () => {
  assert.equal(existsSync(join(appRoot, "proxy.ts")), true);
  const middleware = source("proxy.ts");

  assert.match(middleware, /\/resident\/:path\*/);
  assert.match(middleware, /\/resident\/login/);
  assert.match(middleware, /\/resident\/signup/);
  assert.match(middleware, /NextResponse\.redirect/);
  assert.match(middleware, /verifyResidentSession/);
});
