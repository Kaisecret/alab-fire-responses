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

  assert.match(session, /BFP_SESSION_COOKIE/);
  assert.match(session, /createBfpSession/);
  assert.match(session, /verifyBfpSession/);
  assert.match(proxy, /\/municipal-bfp\/:path\*/);
  assert.match(proxy, /\/provincial-bfp\/:path\*/);
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

test("Provincial BFP can provision municipal accounts and Municipal BFP pages use signed-in identity", () => {
  for (const path of [
    "app/provincial-bfp/municipal-accounts/page.tsx",
    "app/_components/provincial-municipal-accounts.tsx",
    "app/municipal-bfp/login/page.tsx",
    "app/municipal-bfp/change-password/page.tsx",
  ]) assert.equal(existsSync(join(root, path)), true, `${path} is missing`);

  const provincial = source("app/_components/provincial-municipal-accounts.tsx");
  const layout = source("app/_components/municipal-bfp-layout.tsx");
  assert.match(provincial, /Municipal Accounts/);
  assert.match(provincial, /api\/provincial-bfp\/municipal-accounts/);
  assert.match(layout, /api\/municipal-bfp\/me/);
  assert.match(layout, /mustChangePassword/);
});
