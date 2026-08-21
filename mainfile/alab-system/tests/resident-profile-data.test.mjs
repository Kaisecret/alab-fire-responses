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
  assert.match(migration, /pin_hash text not null/);
  assert.match(migration, /create table public\.resident_login_activity/);
  assert.match(migration, /alter table public\.resident_security_settings enable row level security/);
  assert.match(migration, /alter table public\.resident_login_activity enable row level security/);
  assert.match(migration, /create index resident_login_activity_profile_occurred_idx\s+on public\.resident_login_activity \(resident_profile_id, occurred_at desc\)/);
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
