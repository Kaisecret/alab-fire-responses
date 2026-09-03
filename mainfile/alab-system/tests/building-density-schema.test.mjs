import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const migrationsDirectory = join(process.cwd(), "supabase", "migrations");

function automaticDensityMigration() {
  const fileName = readdirSync(migrationsDirectory)
    .find((candidate) => candidate.endsWith("_automatic_building_density.sql"));
  assert.ok(fileName, "automatic building density migration is missing");
  return readFileSync(join(migrationsDirectory, fileName), "utf8");
}

test("automatic density migration creates private indexed PostGIS evidence", () => {
  const sql = automaticDensityMigration();

  assert.match(sql, /create extension if not exists postgis/i);
  assert.match(sql, /create schema if not exists gis/i);
  assert.match(sql, /create table if not exists gis\.building_footprints/i);
  assert.match(sql, /geometry\s+extensions\.geometry\(multipolygon,\s*4326\)/i);
  assert.match(sql, /using gist\s*\(geometry\)/i);
  assert.match(sql, /create table if not exists gis\.fire_report_density_evidence/i);
  assert.match(sql, /reported_house_density/i);
  assert.match(sql, /detected_building_density/i);
  assert.match(sql, /building_density_confidence/i);
  assert.match(sql, /building_density_building_count/i);
  assert.match(sql, /building_density_minimum_gap_meters/i);
  assert.match(sql, /revoke all on all tables in schema gis from anon/i);
  assert.match(sql, /revoke all on all tables in schema gis from authenticated/i);
});

test("automatic density migration preserves prior resident density as reported evidence", () => {
  const sql = automaticDensityMigration();

  assert.match(sql, /set reported_house_density = house_density/i);
  assert.match(sql, /where reported_house_density is null and house_density is not null/i);
});
