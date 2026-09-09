import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const migrationPath = join(
  root,
  "supabase",
  "migrations",
  "20260907090000_add_intermunicipality_coordination.sql",
);

test("coordination migration creates secure observer, request, and audit tables", () => {
  const migration = readFileSync(migrationPath, "utf8");
  for (const table of [
    "incident_municipal_observers",
    "intermunicipal_assistance_requests",
    "intermunicipal_coordination_events",
  ]) {
    assert.match(migration, new RegExp("create table if not exists public\\." + table, "i"));
  }
  assert.match(migration, /unique \(dispatch_id, observer_municipality_id\)/i);
  assert.match(migration, /origin_municipality_id <> observer_municipality_id/i);
  assert.match(migration, /intermunicipal_assistance_one_open_recipient_idx/i);
  assert.match(migration, /where status in \('REQUESTED','ACCEPTED','PARTIALLY_ACCEPTED'\)/i);
  assert.match(migration, /acknowledged_by_user_id/i);
  assert.match(migration, /acknowledged_at/i);
  assert.match(migration, /intermunicipal_assistance_status_shape_check/i);
  assert.match(migration, /prevent_intermunicipal_coordination_event_mutation/i);
  assert.match(migration, /enable row level security/gi);
  assert.match(migration, /revoke all on table[\s\S]*?from public, anon, authenticated/i);
  assert.doesNotMatch(
    migration,
    /grant .*?(incident_municipal_observers|intermunicipal_assistance_requests|intermunicipal_coordination_events).*?(anon|authenticated)/i,
  );
});

test("coordination migration extends the account notification allowlist", () => {
  const migration = readFileSync(migrationPath, "utf8");
  for (const event of [
    "NEARBY_INCIDENT_ASSIGNED",
    "NEARBY_MONITORING_STARTED",
    "ASSISTANCE_REQUESTED",
    "ASSISTANCE_ACCEPTED",
    "ASSISTANCE_PARTIALLY_ACCEPTED",
    "ASSISTANCE_REJECTED",
    "ASSISTANCE_CANCELLED",
    "ASSISTANCE_COMPLETED",
    "NEARBY_SELECTION_DEGRADED",
  ]) {
    assert.match(migration, new RegExp(event));
  }
});
