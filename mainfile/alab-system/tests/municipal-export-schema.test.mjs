import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const migrationPath = join(
  root,
  "supabase",
  "migrations",
  "20260914100000_add_municipal_export_events.sql",
);

const pdfMigrationPath = join(
  root,
  "supabase",
  "migrations",
  "20260916090000_allow_pdf_and_dossier_export_events.sql",
);

test("municipal export events migration creates secure audit log with immutability controls", () => {
  const migration = readFileSync(migrationPath, "utf8");

  assert.match(migration, /create table if not exists public\.municipal_export_events/i);
  assert.match(migration, /actor_user_id\s+uuid\s+not\s+null/i);
  assert.match(migration, /municipality_id\s+uuid\s+not\s+null/i);
  assert.match(migration, /dataset\s+text\s+not\s+null/i);
  assert.match(migration, /INCIDENT_REGISTER/);
  assert.match(migration, /MUNICIPAL_SUMMARY/);
  assert.match(migration, /BARANGAY_BREAKDOWN/);
  assert.match(migration, /enable row level security/i);
  assert.match(migration, /revoke all on table public\.municipal_export_events from public, anon, authenticated/i);
  assert.match(migration, /prevent_municipal_export_event_mutation/i);
});

test("export audit constraints accept generated PDF documents and incident dossiers", () => {
  const migration = readFileSync(pdfMigrationPath, "utf8");

  // A PDF export writes format 'PDF'; the original constraint allowed only
  // CSV and the two print modes, which failed every generated download.
  assert.match(migration, /municipal_export_events_format_check/);
  assert.match(migration, /check \(format in \('CSV', 'PDF'/);

  assert.match(migration, /municipal_export_events_dataset_check/);
  assert.match(migration, /INCIDENT_DOSSIER/);

  // Existing audit rows must stay valid under the replacement constraint.
  assert.match(migration, /PRINT_SUMMARY/);
  assert.match(migration, /PRINT_INCIDENT/);
});
