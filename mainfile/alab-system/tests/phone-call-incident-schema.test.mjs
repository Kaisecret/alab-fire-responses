import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path) => readFileSync(path, "utf8");

test("phone call incident migration keeps app reports intact and constrains phone reports", () => {
  const migration = source("supabase/migrations/20260831100000_add_phone_call_incident_source.sql");
  assert.match(migration, /alter column resident_profile_id drop not null/i);
  assert.match(migration, /report_source text not null default 'ALAB_APP'/i);
  assert.match(migration, /caller_name text/i);
  assert.match(migration, /caller_phone text/i);
  assert.match(migration, /created_by_user_id uuid references public\.users/i);
  assert.match(migration, /reported_at timestamptz not null default now\(\)/i);
  assert.match(migration, /report_source = 'PHONE_CALL'/i);
  assert.match(migration, /fire_reports_municipality_source_submitted_idx/i);
});
