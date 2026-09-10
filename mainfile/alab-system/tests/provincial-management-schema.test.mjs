import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const migrationPath = join(
  root,
  "supabase",
  "migrations",
  "20260910140000_provincial_management_support.sql",
);

test("provincial management migration creates secure audit, operations, and immutability controls", () => {
  const migration = readFileSync(migrationPath, "utf8");
  for (const table of [
    "provincial_management_events",
    "provincial_management_operations",
  ]) {
    assert.match(migration, new RegExp("create table if not exists public\\." + table, "i"));
  }

  assert.match(migration, /unique\s*\(\s*actor_user_id\s*,\s*request_id\s*\)/i);
  assert.match(migration, /payload_digest\s+text\s+not\s+null/i);
  assert.match(migration, /prevent_provincial_management_event_mutation/i);
  assert.match(migration, /enable row level security/gi);
  assert.match(migration, /revoke all on table[\s\S]*?from public, anon, authenticated/i);
  assert.doesNotMatch(
    migration,
    /grant .*?(provincial_management_events|provincial_management_operations).*?(anon|authenticated)/i,
  );
});
