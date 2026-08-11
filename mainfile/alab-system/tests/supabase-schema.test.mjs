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
