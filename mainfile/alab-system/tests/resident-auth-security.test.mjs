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

test("the resident home route uses resident protection instead of the Provincial BFP fallback", () => {
  const middleware = source("proxy.ts");

  assert.match(middleware, /path === "\/resident" \|\| path\.startsWith\("\/resident\/"\)/);
});

test("resident OTP sending enforces a server-side one-minute resend cooldown", () => {
  const start = source("app/api/auth/register/start/route.ts");

  assert.match(start, /interval '60 seconds'/);
  assert.match(start, /OTP_RESEND_COOLDOWN/);
  assert.match(start, /status: 429/);
});

test("a failed SMS delivery removes its unusable OTP record before returning an error", () => {
  const start = source("app/api/auth/register/start/route.ts");

  assert.match(start, /let otpStored = false/);
  assert.match(start, /otpStored = true/);
  assert.match(start, /delete from registration_otps where id = \$1/);
});

test("verified OTP registration accepts the securely stored password hash", () => {
  const register = source("app/api/auth/register/route.ts");

  assert.match(register, /pendingPasswordHash/);
  assert.match(register, /!pendingPasswordHash && password\.length < 8/);
});

test("Google OAuth links verified existing residents or creates a safe signup prefill", () => {
  const googleStart = join(appRoot, "app", "api", "auth", "google", "start", "route.ts");
  const googleCallback = join(appRoot, "app", "auth", "callback", "route.ts");
  const googlePrefill = join(appRoot, "app", "api", "auth", "google", "prefill", "route.ts");

  assert.equal(existsSync(googleStart), true, "Google OAuth start route is missing");
  assert.equal(existsSync(googleCallback), true, "Google OAuth callback route is missing");
  assert.equal(existsSync(googlePrefill), true, "Google signup prefill route is missing");
  const start = readFileSync(googleStart, "utf8");
  const callback = readFileSync(googleCallback, "utf8");
  const register = source("app/api/auth/register/route.ts");

  assert.match(start, /signInWithOAuth/);
  assert.match(callback, /exchangeCodeForSession/);
  assert.match(callback, /email_confirmed_at/);
  assert.match(callback, /google_subject/);
  assert.match(callback, /createResidentSession/);
  assert.match(callback, /createGoogleSignupPrefill/);
  assert.match(register, /getGoogleSignupPrefill/);
});
