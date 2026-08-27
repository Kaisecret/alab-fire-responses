import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const migrationsDirectory = join(root, "supabase", "migrations");
const expectedTables = [
  "users",
  "municipalities",
  "barangays",
  "resident_profiles",
  "resident_addresses",
  "resident_verifications",
  "notification_preferences",
  "fire_reports",
  "fire_report_photos",
  "notifications",
];

test("Supabase migration creates every current resident table with RLS", () => {
  assert.equal(existsSync(migrationsDirectory), true);
  const migrationName = readdirSync(migrationsDirectory).find((name) => name.endsWith("_create_alab_resident_schema.sql"));
  assert.ok(migrationName, "resident schema migration is missing");
  const migration = readFileSync(join(migrationsDirectory, migrationName), "utf8");

  for (const table of expectedTables) {
    assert.match(migration, new RegExp(`create table public\\.${table}`));
    assert.match(migration, new RegExp(`alter table public\\.${table} enable row level security`));
  }
  assert.match(migration, /create index fire_reports_resident_submitted_idx/);
  assert.match(migration, /create unique index resident_addresses_one_primary_idx/);
});

test("Supabase seed imports Antique municipalities and barangays idempotently", () => {
  const seedPath = join(root, "supabase", "seed.sql");
  assert.equal(existsSync(seedPath), true);
  const seed = readFileSync(seedPath, "utf8");

  assert.match(seed, /insert into public\.municipalities/i);
  assert.match(seed, /insert into public\.barangays/i);
  assert.match(seed, /on conflict/i);
  assert.match(seed, /Antique/);
});

test("Supabase phone validation accepts Philippine numbers with or without a leading plus", () => {
  const schemaMigration = readFileSync(
    join(migrationsDirectory, "20260811125353_create_alab_resident_schema.sql"),
    "utf8",
  );
  const repairMigration = join(migrationsDirectory, "20260811150000_fix_users_phone_check.sql");

  assert.ok(schemaMigration.includes("phone ~ '^\\+?[0-9]{10,15}$'"));
  assert.equal(existsSync(repairMigration), true, "phone-check repair migration is missing");
  const repair = readFileSync(repairMigration, "utf8");
  assert.match(repair, /drop constraint if exists users_phone_check/i);
  assert.ok(repair.includes("phone ~ '^\\+?[0-9]{10,15}$'"));
});

test("Supabase schema stores pending registration OTPs securely", () => {
  const migrationPath = join(migrationsDirectory, "20260812090000_add_registration_otps.sql");
  assert.equal(existsSync(migrationPath), true, "registration OTP migration is missing");
  const migration = readFileSync(migrationPath, "utf8");

  assert.match(migration, /create table public\.registration_otps/i);
  assert.match(migration, /code_hash text not null/i);
  assert.match(migration, /attempt_count integer not null default 0/i);
  assert.match(migration, /enable row level security/i);
});

test("Supabase schema links a resident to a unique Google provider identity", () => {
  const migrationPath = join(migrationsDirectory, "20260813090000_add_google_resident_identity.sql");
  assert.equal(existsSync(migrationPath), true, "Google identity migration is missing");
  const migration = readFileSync(migrationPath, "utf8");

  assert.match(migration, /add column if not exists google_subject text/i);
  assert.match(migration, /create unique index .*google_subject/i);
});

test("emergency workflow schema stores operational response history securely", () => {
  const migrationPath = join(migrationsDirectory, "20260816090000_add_resident_bfp_response_workflow.sql");
  assert.equal(existsSync(migrationPath), true, "emergency workflow migration is missing");
  const migration = readFileSync(migrationPath, "utf8");

  assert.match(migration, /create table (if not exists )?public\.fire_report_status_history/i);
  assert.match(migration, /responding_bfp_user_id uuid references public\.users/i);
  assert.match(migration, /create table (if not exists )?public\.municipal_bfp_stations/i);
  assert.match(migration, /fire_reports_municipality_status_submitted_idx/i);
  assert.match(migration, /enable row level security/i);
});

test("fire reports retain protected server-side submission audit data", () => {
  const migrationPath = join(migrationsDirectory, "20260818090000_add_fire_report_submission_audit.sql");
  assert.equal(existsSync(migrationPath), true, "submission audit migration is missing");
  const migration = readFileSync(migrationPath, "utf8");

  assert.match(migration, /add column if not exists reporter_ip_address inet/i);
  assert.match(migration, /add column if not exists reporter_device_summary text/i);
  assert.match(migration, /char_length\(reporter_device_summary\) <= 160/i);
});

test("municipal BFP supports multiple stations and safe personnel station assignments", () => {
  const migrationName = readdirSync(migrationsDirectory)
    .find((name) => name.endsWith("_add_municipal_station_personnel_assignments.sql"));
  assert.ok(migrationName, "municipal station/personnel migration is missing");
  const migration = readFileSync(join(migrationsDirectory, migrationName), "utf8");

  assert.match(migration, /drop constraint if exists municipal_bfp_stations_municipality_id_key/i);
  assert.match(migration, /create unique index.*municipal_bfp_stations_active_name_idx/i);
  assert.match(migration, /create table public\.bfp_station_assignments/i);
  assert.match(migration, /personnel_profile_id uuid not null references public\.bfp_personnel_profiles/i);
  assert.match(migration, /where status = 'ACTIVE'/i);
  assert.match(migration, /bfp_station_assignments_station_status_idx/i);
  assert.match(migration, /alter table public\.bfp_station_assignments enable row level security/i);
  assert.match(migration, /revoke all on table public\.bfp_station_assignments from anon, authenticated/i);
});
