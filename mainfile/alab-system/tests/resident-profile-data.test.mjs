import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const appRoot = process.cwd();

test("resident security migration stores hashed PIN preferences and indexed login activity", () => {
  const migrationsPath = join(appRoot, "supabase", "migrations");
  const migrationName = "add_resident_security_settings";
  const migrationPath = readdirSync(migrationsPath).find((name) => name.endsWith(`_${migrationName}.sql`));

  assert.ok(migrationPath, "resident security settings migration should exist");
  const migration = readFileSync(join(migrationsPath, migrationPath), "utf8");

  assert.match(migration, /create table public\.resident_security_settings/);
  assert.match(migration, /pin_hash text not null check \(char_length\(trim\(pin_hash\)\) between 60 and 255\)/);
  assert.match(migration, /create table public\.resident_login_activity/);
  assert.match(migration, /alter table public\.resident_security_settings enable row level security/);
  assert.match(migration, /alter table public\.resident_login_activity enable row level security/);
  assert.match(migration, /create index resident_login_activity_profile_occurred_idx\s+on public\.resident_login_activity \(resident_profile_id, occurred_at desc\)/);

  const forwardMigrationPath = readdirSync(migrationsPath).find((name) =>
    name.endsWith("_allow_security_preferences_without_pin.sql"),
  );
  assert.ok(forwardMigrationPath, "a forward migration should allow privacy preferences without a PIN");
  const forwardMigration = readFileSync(join(migrationsPath, forwardMigrationPath), "utf8");

  assert.match(forwardMigration, /alter column pin_hash drop not null/i);
  assert.match(forwardMigration, /drop constraint.*pin_hash.*check/i);
  assert.match(forwardMigration, /check \(pin_hash is null or char_length\(trim\(pin_hash\)\) between 60 and 255\)/i);
});

test("resident profile reads only the signed-in resident's database record", () => {
  const routePath = join(appRoot, "app", "api", "resident", "profile", "route.ts");
  assert.ok(existsSync(routePath));
  const route = readFileSync(routePath, "utf8");
  const page = readFileSync(join(appRoot, "app", "resident", "profile", "page.tsx"), "utf8");

  assert.match(route, /verifyResidentSession/);
  assert.match(route, /WHERE u\.id = \$1/);
  assert.match(route, /resident_profiles/);
  assert.match(page, /fetch\("\/api\/resident\/profile"\)/);
  assert.match(page, /data-profile-field/);
});

test("resident mobile settings use the same vertical rhythm as personal information", () => {
  const content = readFileSync(join(appRoot, "app", "_content", "resident-profile-content.ts"), "utf8");

  assert.match(content, /\.settings-menu-card\s*\{[\s\S]*?padding:\s*1\.5rem\s*!important/);
  assert.match(content, /\.settings-item\s*\{\s*padding:\s*1rem 0\s*!important/);
  assert.match(content, /\.settings-menu-card \.profile-card-header\s*\{[\s\S]*?margin-bottom:\s*1\.2rem/);
});

test("resident settings update only contact details and require the current password", () => {
  const profileRoute = readFileSync(join(appRoot, "app", "api", "resident", "profile", "route.ts"), "utf8");
  const passwordRoute = join(appRoot, "app", "api", "resident", "profile", "password", "route.ts");

  assert.match(profileRoute, /export async function PUT/);
  assert.match(profileRoute, /verifyResidentSession/);
  assert.match(profileRoute, /update users set email = \$1, phone = \$2/);
  assert.doesNotMatch(profileRoute, /update resident_profiles set/);
  assert.ok(existsSync(passwordRoute));
  const password = readFileSync(passwordRoute, "utf8");
  assert.match(password, /verifyPassword\(currentPassword, user\.password_hash\)/);
  assert.match(password, /hashPassword\(newPassword\)/);
  assert.match(password, /newPassword !== confirmPassword/);
});

test("resident profile settings expose contact-only and password forms", () => {
  const content = readFileSync(join(appRoot, "app", "_content", "resident-profile-content.ts"), "utf8");
  const page = readFileSync(join(appRoot, "app", "resident", "profile", "page.tsx"), "utf8");

  assert.match(content, /data-profile-action="edit-profile"/);
  assert.match(content, /data-profile-action="change-password"/);
  assert.match(content, /name="name"[^>]*readonly/);
  assert.match(content, /name="barangay"[^>]*readonly/);
  assert.match(page, /"\/api\/resident\/profile\/password"/);
  assert.match(page, /"\/api\/resident\/profile"/);
  assert.match(page, /fetch\(endpoint, \{ method: "PUT"/);
});

test("resident settings dialogs leave the dimmed page scrollable", () => {
  const content = readFileSync(join(appRoot, "app", "_content", "resident-profile-content.ts"), "utf8");

  assert.match(content, /\.profile-dialog-backdrop\s*\{[^}]*pointer-events:\s*none/);
  assert.match(content, /\.profile-dialog\s*\{[^}]*pointer-events:\s*auto/);
});

test("resident security settings stay owned by the signed-in resident and never expose PIN hashes", () => {
  const securityPath = join(appRoot, "app", "api", "resident", "profile", "security", "route.ts");
  assert.ok(existsSync(securityPath), "resident security settings route should exist");
  const security = readFileSync(securityPath, "utf8");

  assert.match(security, /export async function GET/);
  assert.match(security, /export async function PUT/);
  assert.match(security, /verifyResidentSession/);
  assert.match(security, /WHERE rp\.user_id = \$1/);
  assert.match(security, /security:\s*\{\s*pinConfigured/);
  assert.match(security, /bfpContactAllowed/);
  assert.match(security, /verifyPassword\(currentPassword, user\.password_hash\)/);
  assert.match(security, /!\/\^\\d\{4\}\$\/\.test\(pin\)/);
  assert.match(security, /hashPassword\(pin\)/);
  assert.match(security, /insert into resident_security_settings/i);
  assert.match(security, /on conflict \(resident_profile_id\) do update/i);
  assert.match(security, /returning pin_hash, bfp_contact_allowed/i);
  assert.match(security, /pinConfigured:\s*Boolean\(saved\.rows\[0\]\.pin_hash\)/);
  assert.doesNotMatch(security, /Set a PIN before changing this preference/);
});

test("resident activity returns only the current resident's ten newest safe records", () => {
  const activityPath = join(appRoot, "app", "api", "resident", "profile", "activity", "route.ts");
  assert.ok(existsSync(activityPath), "resident activity route should exist");
  const activity = readFileSync(activityPath, "utf8");

  assert.match(activity, /verifyResidentSession/);
  assert.match(activity, /WHERE rp\.user_id = \$1/);
  assert.match(activity, /ORDER BY rla\.occurred_at DESC/);
  assert.match(activity, /LIMIT 10/);
  assert.match(activity, /deviceLabel/);
  assert.match(activity, /occurredAt/);
  assert.doesNotMatch(activity, /residentProfileId/);
  assert.doesNotMatch(activity, /ipAddress/);
});

test("resident profile notifications validate all toggles and persist through the session-owned profile", () => {
  const profile = readFileSync(join(appRoot, "app", "api", "resident", "profile", "route.ts"), "utf8");

  assert.match(profile, /notifications\?:\s*\{\s*push\?: unknown; incidents\?: unknown; emergency\?: unknown/);
  assert.match(profile, /typeof notifications\.push !== "boolean"/);
  assert.match(profile, /typeof notifications\.incidents !== "boolean"/);
  assert.match(profile, /typeof notifications\.emergency !== "boolean"/);
  assert.match(profile, /insert into notification_preferences/i);
  assert.match(profile, /on conflict \(resident_profile_id\) do update/i);
  assert.match(profile, /where user_id = \$1/i);
  assert.match(profile, /notifications:\s*savedNotifications/);
});

test("only successful active resident logins record a bounded server-derived device label", () => {
  const login = readFileSync(join(appRoot, "app", "api", "auth", "login", "route.ts"), "utf8");

  assert.match(login, /function deviceLabel\(request: Request\)/);
  assert.match(login, /user-agent/);
  assert.match(login, /slice\(0, 200\)/);
  assert.match(login, /insert into resident_login_activity/i);
  assert.match(login, /select id from resident_profiles where user_id = \$1/);
  assert.match(login, /Resident login activity recording failed/);
  assert.match(login, /catch \(activityError\)/);
  assert.doesNotMatch(login, /resident_login_activity[\s\S]{0,300}x-forwarded-for/i);
});

test("resident profile security actions, notification controls, and activity endpoint are connected", () => {
  const content = readFileSync(join(appRoot, "app", "_content", "resident-profile-content.ts"), "utf8");
  const page = readFileSync(join(appRoot, "app", "resident", "profile", "page.tsx"), "utf8");

  assert.match(content, /data-profile-action="pin-security"/);
  assert.match(content, /data-profile-action="login-activity"/);
  assert.match(content, /data-profile-action="privacy-settings"/);
  ["push", "incidents", "emergency"].forEach((preference) => {
    assert.match(content, new RegExp(`<button type="button"[^>]*data-notification-toggle="${preference}"[^>]*aria-pressed="(?:true|false)"`));
  });
  assert.match(page, /"\/api\/resident\/profile\/security"/);
  assert.match(page, /"\/api\/resident\/profile\/activity"/);
});

test("resident security dialogs recover from save failures and remain non-modal", () => {
  const content = readFileSync(join(appRoot, "app", "_content", "resident-profile-content.ts"), "utf8");
  const page = readFileSync(join(appRoot, "app", "resident", "profile", "page.tsx"), "utf8");

  assert.match(page, /try\s*\{[\s\S]*?await fetch\(endpoint,[\s\S]*?\}\s*catch\s*\{[\s\S]*?Unable to save changes\. Please try again\./);
  assert.match(page, /\[data-profile-initial-focus\]/);
  ["pin-security", "login-activity", "privacy-settings"].forEach((dialog) => {
    const dialogPattern = new RegExp(`data-profile-dialog="${dialog}"[\\s\\S]*?role="dialog"[\\s\\S]*?aria-labelledby="[^"]+"`);
    assert.match(content, dialogPattern);
  });
  assert.match(content, /id="pin-security-title"/);
  assert.match(content, /id="login-activity-title"/);
  assert.match(content, /id="privacy-settings-title"/);
  assert.match(content, /data-profile-initial-focus/);
  assert.doesNotMatch(content, /aria-modal="true"/);
});
