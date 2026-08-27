import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();

function source(path) {
  return readFileSync(join(root, path), "utf8");
}

test("BFP migration supports individual assigned municipal accounts and audits provisioning", () => {
  const migrations = readdirSync(join(root, "supabase", "migrations"));
  const name = migrations.find((file) => file.endsWith("_add_bfp_account_provisioning.sql"));
  assert.ok(name, "BFP account migration is missing");
  const migration = source(join("supabase", "migrations", name));

  assert.match(migration, /'PROVINCIAL_BFP'/);
  assert.match(migration, /'MUNICIPAL_BFP'/);
  assert.match(migration, /create table public\.bfp_personnel_profiles/i);
  assert.match(migration, /create table public\.bfp_municipality_assignments/i);
  assert.match(migration, /create table public\.bfp_credential_events/i);
  assert.match(migration, /one_active_admin/i);
  assert.match(migration, /enable row level security/i);
  assert.match(migration, /Valderrama/);
  assert.match(migration, /0600618000/);
});

test("BFP authentication uses a separate signed cookie and protects both BFP areas", () => {
  const session = source("lib/auth/session.ts");
  const proxy = source("proxy.ts");

  assert.match(session, /bfpSessionCookieName/);
  assert.match(session, /createBfpSession/);
  assert.match(session, /verifyBfpSession/);
  assert.match(proxy, /\/municipal-bfp\/:path\*/);
  assert.match(proxy, /\/provincial-bfp\/:path\*/);
});

test("Provincial and Municipal BFP sessions use independent cookies", () => {
  const session = source("lib/auth/session.ts");
  const login = source("app/api/auth/bfp/login/route.ts");
  const changePassword = source("app/api/auth/bfp/change-password/route.ts");
  const logout = source("app/api/auth/bfp/logout/route.ts");
  const municipalMe = source("app/api/municipal-bfp/me/route.ts");
  const provincialMe = source("app/api/provincial-bfp/me/route.ts");
  const proxy = source("proxy.ts");

  assert.match(session, /PROVINCIAL_BFP_SESSION_COOKIE\s*=\s*"alab_provincial_bfp_session"/);
  assert.match(session, /MUNICIPAL_BFP_SESSION_COOKIE\s*=\s*"alab_municipal_bfp_session"/);
  assert.match(session, /bfpSessionCookieName/);
  assert.match(login, /bfpSessionCookieName\(identity\.role\)/);
  assert.match(changePassword, /portal/);
  assert.match(changePassword, /bfpSessionCookieName\(session\.role\)/);
  assert.match(logout, /bfpSessionCookieName/);
  assert.match(municipalMe, /bfpSessionCookieName\("MUNICIPAL_BFP"\)/);
  assert.match(provincialMe, /bfpSessionCookieName\("PROVINCIAL_BFP"\)/);
  assert.match(proxy, /bfpSessionCookieName\(requiredRole\)/);
});

test("local UI preview is explicitly development-only and serves every portal", () => {
  const previewPath = join(root, "lib", "auth", "local-ui-preview.ts");
  assert.equal(existsSync(previewPath), true, "local UI preview guard is missing");

  const preview = source("lib/auth/local-ui-preview.ts");
  const proxy = source("proxy.ts");
  const residentDashboard = source("app/api/resident/dashboard/route.ts");
  const residentProfile = source("app/api/resident/profile/route.ts");
  const municipalMe = source("app/api/municipal-bfp/me/route.ts");
  const provincialMe = source("app/api/provincial-bfp/me/route.ts");

  assert.match(preview, /NODE_ENV\s*===\s*["']development["']/);
  assert.match(preview, /LOCAL_UI_BYPASS\s*===\s*["']true["']/);
  assert.match(proxy, /isLocalUiPreviewEnabled/);
  for (const route of [residentDashboard, residentProfile, municipalMe, provincialMe]) {
    assert.match(route, /isLocalUiPreviewEnabled/);
  }
});

test("BFP APIs provision individual staff, require a password change, and never expose hashes", () => {
  for (const path of [
    "app/api/auth/bfp/login/route.ts",
    "app/api/auth/bfp/change-password/route.ts",
    "app/api/auth/bfp/logout/route.ts",
    "app/api/provincial-bfp/municipal-accounts/route.ts",
    "app/api/municipal-bfp/me/route.ts",
    "lib/auth/bfp-accounts.ts",
  ]) assert.equal(existsSync(join(root, path)), true, `${path} is missing`);

  const provisioning = source("lib/auth/bfp-accounts.ts");
  const login = source("app/api/auth/bfp/login/route.ts");
  const me = source("app/api/municipal-bfp/me/route.ts");

  assert.match(provisioning, /withTransaction/);
  assert.match(provisioning, /hashPassword/);
  assert.match(provisioning, /bfp_credential_events/);
  assert.match(provisioning, /must_change_password/);
  assert.match(login, /checkLoginRateLimit/);
  assert.match(login, /createBfpSession/);
  assert.match(me, /verifyBfpSession/);
  assert.doesNotMatch(me, /password_hash/);
});

test("mobile BFP APIs use bearer sessions and never issue Supabase credentials", () => {
  const paths = [
    "app/api/mobile-bfp/login/route.ts",
    "app/api/mobile-bfp/me/route.ts",
    "app/api/mobile-bfp/change-password/route.ts",
    "lib/auth/mobile-bfp.ts",
  ];
  for (const path of paths) assert.equal(existsSync(join(root, path)), true, `${path} is missing`);

  const [login, me, changePassword, auth] = paths.map(source);
  assert.match(login, /verifyBfpCredentials/);
  assert.match(login, /checkLoginRateLimit/);
  assert.match(login, /createBfpSession/);
  assert.match(me, /requireMobileMunicipalBfp/);
  assert.match(changePassword, /requireMobileMunicipalBfp/);
  assert.match(changePassword, /changeBfpPassword/);
  assert.match(auth, /Authorization/);
  assert.match(auth, /Bearer/);
  assert.match(auth, /MUNICIPAL_BFP/);

  const combined = [login, me, changePassword, auth].join("\n");
  assert.doesNotMatch(combined, /DATABASE_URL/);
  assert.doesNotMatch(combined, /SUPABASE_SECRET_KEY/);
  assert.doesNotMatch(combined, /password_hash/);
});

test("Provincial bootstrap reads the local database URL without requiring it in the terminal", () => {
  const bootstrap = source("scripts/bootstrap-provincial-bfp.mjs");
  assert.match(bootstrap, /\.env\.local/);
  assert.match(bootstrap, /readFileSync/);
  assert.match(bootstrap, /process\.env\[match\[1\]\] !== undefined/);
});

test("Provincial BFP can provision municipal accounts and Municipal BFP pages use signed-in identity", () => {
  for (const path of [
    "app/provincial-bfp/municipal-accounts/page.tsx",
    "app/_components/provincial-municipal-accounts.tsx",
    "app/municipal-bfp/login/page.tsx",
    "app/municipal-bfp/change-password/page.tsx",
  ]) assert.equal(existsSync(join(root, path)), true, `${path} is missing`);

  const provincial = source("app/_components/provincial-municipal-accounts.tsx");
  const layout = source("app/_components/municipal-bfp-layout.tsx");
  assert.match(provincial, /Municipal BFP Accounts/);
  assert.match(provincial, /api\/provincial-bfp\/municipal-accounts/);
  assert.match(layout, /api\/municipal-bfp\/me/);
  assert.match(layout, /mustChangePassword/);
});

test("Provincial BFP sign-out clears its own BFP session", () => {
  const layout = source("app/_components/provincial-bfp-layout.tsx");

  assert.match(layout, /fetch\('\/api\/auth\/bfp\/logout'/);
  assert.match(layout, /portal:\s*'PROVINCIAL'/);
});

test("latest provincial UI defines its identity model and avoids synchronous timer updates", () => {
  const layout = source("app/_components/provincial-bfp-layout.tsx");
  const dashboard = source("app/_components/provincial-bfp-dashboard.tsx");
  const incidents = source("app/provincial-bfp/incidents/page.tsx");

  assert.match(layout, /type ProvincialIdentity\s*=/);
  assert.doesNotMatch(dashboard, /if \(!matches\)\s*\{\s*setDisplay\(/);
  assert.doesNotMatch(incidents, /if \(!matches\)\s*\{\s*setDisplay\(/);
});

test("Provincial BFP login keeps the artwork edge free of animated glow lines", () => {
  const login = source("app/_components/provincial-bfp-login.tsx");

  assert.doesNotMatch(login, /prov-emergency-glow-svg/);
  assert.doesNotMatch(login, /prov-travelling-beam/);
  assert.doesNotMatch(login, /prov-travelling-hotspot/);
});

test("BFP login pages use the resident-style full-screen loader instead of button spinners", () => {
  const municipal = source("app/_components/municipal-bfp-login.tsx");
  const provincial = source("app/_components/provincial-bfp-login.tsx");
  const loader = source("app/_components/bfp-login-loader.tsx");

  assert.match(municipal, /BfpLoginLoader theme="municipal"/);
  assert.match(provincial, /BfpLoginLoader theme="provincial"/);
  assert.doesNotMatch(municipal, /muni-spinner/);
  assert.doesNotMatch(provincial, /prov-spinner/);
  assert.match(loader, /#0B132B/);
  assert.match(loader, /bfp-fire-loader-flame/);
  assert.match(loader, /mask: url\("\/images\/fire%20logo\.webp"\)/);
  assert.doesNotMatch(loader, /fa-fire-flame-simple/);
  assert.doesNotMatch(loader, /--bfp-loader-backdrop:\s*rgba\(11,\s*19,\s*43/);
});

test("BFP login artwork uses the converted WebP assets", () => {
  const municipal = source("app/_components/municipal-bfp-login.tsx");
  const provincial = source("app/_components/provincial-bfp-login.tsx");

  assert.match(municipal, /\/images\/formunicipallogin\.webp/);
  assert.match(municipal, /\/images\/WHITE%20LOGO\.webp/);
  assert.match(provincial, /\/images\/FOR%20PROVOCIAL%20SIDE\.webp/);
  assert.match(provincial, /\/images\/WHITE%20LOGO\.webp/);
  assert.doesNotMatch(`${municipal}\n${provincial}`, /\/images\/[^"']+\.png/);
});

test("BFP login fields keep browser autofill from applying a blue background", () => {
  const municipal = source("app/_components/municipal-bfp-login.tsx");
  const provincial = source("app/_components/provincial-bfp-login.tsx");

  assert.match(municipal, /\.muni-input:-webkit-autofill/);
  assert.match(provincial, /\.prov-input:-webkit-autofill/);
  assert.match(municipal, /-webkit-box-shadow:\s*0 0 0 1000px #FFFFFF inset/);
  assert.match(provincial, /-webkit-box-shadow:\s*0 0 0 1000px #FFFFFF inset/);
});
