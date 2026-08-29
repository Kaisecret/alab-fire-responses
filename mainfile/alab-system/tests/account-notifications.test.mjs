import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const source = (path) => readFileSync(join(root, path), "utf8");

test("account notification migration is secure, indexed, and retry safe", () => {
  const name = readdirSync(join(root, "supabase", "migrations"))
    .find((file) => file.endsWith("_add_account_notifications.sql"));
  assert.ok(name, "account notification migration is missing");
  const migration = source(join("supabase", "migrations", name));

  assert.match(migration, /create table public\.account_notifications/i);
  assert.match(migration, /recipient_user_id uuid not null references public\.users\(id\)/i);
  assert.match(migration, /check \(category in \('INCIDENT', 'APPLICATION', 'RESPONSE', 'ACCOUNT', 'SYSTEM'\)\)/i);
  assert.match(migration, /account_notifications_recipient_created_idx/i);
  assert.match(migration, /where read_at is null/i);
  assert.match(migration, /unique index[\s\S]+dedupe_key/i);
  assert.match(migration, /enable row level security/i);
  assert.doesNotMatch(migration, /grant .*account_notifications.*(?:anon|authenticated)/i);
});

test("notification service scopes recipients, ownership, and deduplicated events", () => {
  const path = "lib/notifications/service.ts";
  assert.equal(existsSync(join(root, path)), true, `${path} is missing`);
  const service = source(path);

  assert.match(service, /insert into account_notifications/i);
  assert.match(service, /on conflict \(recipient_user_id, dedupe_key\)/i);
  assert.match(service, /bfp_municipality_assignments/i);
  assert.match(service, /assignment\.municipality_id = \$1/i);
  assert.match(service, /u\.role = 'PROVINCIAL_BFP'/i);
  assert.match(service, /recipient_user_id = \$1/i);
  assert.match(service, /read_at is null/i);
  assert.match(service, /update account_notifications[\s\S]+recipient_user_id = \$2/i);
  assert.match(service, /to_regclass\('public\.account_notifications'\)/i);
  assert.match(service, /return \{ notifications: \[\], unreadCount: 0 \}/i);
});

test("each role exposes a session-owned notification API", () => {
  const paths = [
    "app/api/resident/notifications/route.ts",
    "app/api/municipal-bfp/notifications/route.ts",
    "app/api/provincial-bfp/notifications/route.ts",
  ];
  for (const path of paths) {
    assert.equal(existsSync(join(root, path)), true, `${path} is missing`);
    const route = source(path);
    assert.match(route, /export async function GET/);
    assert.match(route, /export async function PATCH/);
    assert.match(route, /listAccountNotifications/);
    assert.match(route, /markAccountNotificationRead/);
    assert.doesNotMatch(route, /recipientUserId\s*=\s*(?:body|request|searchParams)/);
  }
});

test("domain transactions emit connected notification events", () => {
  const combined = [
    "lib/fire-reports/service.ts",
    "app/api/municipal-bfp/incidents/[id]/respond/route.ts",
    "lib/municipal-bfp/dispatch.ts",
    "lib/resident-applications/service.ts",
    "lib/auth/bfp-accounts.ts",
    "app/api/auth/register/route.ts",
    "app/api/resident/application-status/resubmit/route.ts",
  ].filter((path) => existsSync(join(root, path))).map(source).join("\n");

  for (const event of [
    "FIRE_REPORT_CREATED",
    "INCIDENT_DISPATCH_ASSIGNED",
    "INCIDENT_DISPATCH_STATUS_CHANGED",
    "RESIDENT_APPLICATION_SUBMITTED",
    "RESIDENT_APPLICATION_RESUBMITTED",
    "RESIDENT_APPLICATION_APPROVED",
    "RESIDENT_APPLICATION_CHANGES_REQUESTED",
    "MUNICIPAL_ACCOUNT_CREATED",
  ]) assert.match(combined, new RegExp(event));
  assert.match(combined, /createAccountNotifications/);
});
