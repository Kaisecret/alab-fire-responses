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

test("phone caller numbers use the intended PostgreSQL regex", () => {
  const migration = source("supabase/migrations/20260831100000_add_phone_call_incident_source.sql");
  const expression = migration.match(/caller_phone\s+~\s+E'([^']+)'/i)?.[1];
  assert.ok(expression, "phone constraint must use an escaped PostgreSQL E-string");
  const pattern = expression.replaceAll("\\\\", "\\");
  assert.match("+639171234567", new RegExp(pattern));
  assert.match("639171234567", new RegExp(pattern));
  assert.doesNotMatch("+6391712345678x", new RegExp(pattern));
  assert.doesNotMatch("63917", new RegExp(pattern));
});

test("phone incident creators are restricted to active municipal BFP assignments", () => {
  const migration = source("supabase/migrations/20260831100000_add_phone_call_incident_source.sql");
  assert.match(migration, /fire_reports_phone_creator_scope_fn/i);
  assert.match(migration, /create trigger fire_reports_phone_creator_scope_trg/i);
  assert.match(migration, /bfp_municipality_assignments/i);
  assert.match(migration, /assignment_role = 'MUNICIPAL_ADMIN'/i);
  assert.doesNotMatch(migration, /assignment_role in \('MUNICIPAL_ADMIN', 'MUNICIPAL_STAFF'\)/i);
  assert.match(migration, /status = 'ACTIVE'/i);
  assert.match(migration, /assignment\.municipality_id = new\.municipality_id/i);
  assert.match(migration, /u\.role = 'MUNICIPAL_BFP'/i);
});
