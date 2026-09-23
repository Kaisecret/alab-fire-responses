import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const migrations = join(process.cwd(), "supabase", "migrations");

function migrationPath() {
  const name = readdirSync(migrations).find((file) =>
    file.endsWith("_add_water_sources_registry.sql"),
  );
  assert.ok(name, "water-source migration is missing");
  return join(migrations, name);
}

test("water-source migration creates a server-only constrained registry", () => {
  const sql = readFileSync(migrationPath(), "utf8");
  assert.match(sql, /create table public\.water_sources/i);
  assert.match(sql, /source_kind in \('FIRE_HYDRANT', 'WATER_SOURCE'\)/i);
  assert.match(sql, /quantity > 0/i);
  assert.match(sql, /latitude between 4 and 22/i);
  assert.match(sql, /longitude between 116 and 127/i);
  assert.match(sql, /numeric\(10,7\)/i);
  assert.match(sql, /enable row level security/i);
  assert.match(
    sql,
    /revoke all on table public\.water_sources from public, anon, authenticated/i,
  );
  assert.match(sql, /water_sources_municipality_location_idx/i);
  assert.match(sql, /water_sources_municipality_coordinates_idx/i);
  assert.match(sql, /create table public\.water_source_events/i);
  assert.match(sql, /prevent_water_source_event_mutation/i);
});

test("paper import contains exactly the approved municipality totals", () => {
  const sql = readFileSync(migrationPath(), "utf8");
  const expected = {
    "Anini-y": 1,
    Barbaza: 5,
    Belison: 19,
    Bugasong: 2,
    Caluya: 6,
    Culasi: 6,
    Hamtic: 2,
    Libertad: 2,
    Pandan: 7,
    Patnongon: 1,
    "San Jose de Buenavista": 65,
    "San Remigio": 9,
    Sebaste: 5,
    Sibalom: 7,
    Tibiao: 3,
    "Tobias Fornier": 4,
    Valderrama: 4,
  };
  const imported = [...sql.matchAll(/\('([^']+)',\s*'FIRE_HYDRANT'/g)].map(
    (match) => match[1],
  );

  assert.equal(imported.length, 148);
  for (const [municipality, count] of Object.entries(expected)) {
    assert.equal(
      imported.filter((name) => name === municipality).length,
      count,
      municipality,
    );
  }
  assert.doesNotMatch(sql, /\('Laua-an',\s*'FIRE_HYDRANT'/);
});

test("paper import stores Hamtic hydrant type without pipe-size symbols", () => {
  const sql = readFileSync(migrationPath(), "utf8");

  assert.doesNotMatch(sql, /Wet Barrel \/ 2\\"/);
  assert.match(sql, /\('Hamtic',[^\n]+Wet Barrel'/);
});
