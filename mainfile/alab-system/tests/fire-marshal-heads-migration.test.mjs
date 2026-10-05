import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";

const VERSION = "20261005150000";
const NAME = "set_municipal_fire_marshal_heads";
const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");

// BFP Antique roster of municipal fire marshals, as printed.
const ROSTER = [
  ["Anini-y", "Anini-y Fire Station", "SFO2 Constantine E Puno"],
  ["Barbaza", "Barbaza Fire Station", "SFO2 Zandro R Navarette"],
  ["Belison", "Belison Fire Station", "SFO3 Ramil B Escander"],
  ["Bugasong", "Bugasong Fire Station", "SFO3 Helger A Francisco"],
  ["Caluya", "Caluya Fire Station", "SFO3 Romel E Cagbay Jr."],
  ["Culasi", "Culasi Fire Station", "FINSP Fatima B Hepertor"],
  ["Hamtic", "Hamtic Fire Station", "SFO4 Jose L Talidong Jr"],
  ["Laua-an", "Laua-an Fire Station", "SFO2 Felemar A Arricaya"],
  ["Libertad", "Libertad Fire Station", "SFO3 Michael O Crespo Jr"],
  ["Pandan", "Pandan Fire Station", "SFO3 John Randolph B Baria"],
  ["Patnongon", "Patnongon Fire Station", "SFO3 Ryan Vic V Jabile"],
  ["San Jose de Buenavista", "San Jose Fire Station", "FSINSP Macario I Montaña Jr"],
  ["San Remigio", "San Remigio Fire Station", "SFO3 Edwin F Cadiao"],
  ["Sebaste", "Sebaste Fire Station", "SFO2 Nelbert E Piogao Jr."],
  ["Sibalom", "Sibalom Fire Station", "SFO3 Alfredo N Ortiaga Jr"],
  ["Tibiao", "Tibiao Fire Station", "SFO2 Ma. Rosario L Osal"],
  ["Tobias Fornier", "Tobias Fornier Fire Station", "SFO3 Ardin Cyren T Tuante"],
  ["Valderrama", "Valderrama Fire Station", "SFO4 Gerardo R Clarito"],
];

function appliedCheck() {
  const runner = read("../scripts/apply-command-migration.mjs");
  const entry = runner.match(new RegExp(`version: "${VERSION}",\\s*name: "${NAME}",\\s*appliedCheck: \`([^\`]+)\``));
  assert.ok(entry, "the deploy runner lists the fire marshal migration");
  return entry[1];
}

async function fixture() {
  const db = new PGlite();
  await db.exec(`
    create table public.municipalities (
      id uuid primary key default gen_random_uuid(),
      name text not null,
      province text not null
    );
    create table public.municipal_bfp_stations (
      id uuid primary key default gen_random_uuid(),
      municipality_id uuid not null references public.municipalities(id),
      station_name text not null,
      status text not null default 'ACTIVE',
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );
  `);
  for (const [municipality, station] of ROSTER) {
    const { rows } = await db.query("insert into public.municipalities (name, province) values ($1, 'Antique') returning id", [municipality]);
    const name = municipality === "Barbaza" ? `${station} · Head: SFO1 Old Head` : station;
    await db.query("insert into public.municipal_bfp_stations (municipality_id, station_name) values ($1, $2)", [rows[0].id, name]);
  }
  await db.exec(`
    insert into public.municipal_bfp_stations (municipality_id, station_name)
      select id, 'May Bato Station · Head: SP02 Maghari' from public.municipalities where name = 'Hamtic';
    insert into public.municipal_bfp_stations (municipality_id, station_name)
      select id, 'San Angel Fire Sub-Station' from public.municipalities where name = 'San Jose de Buenavista';
    insert into public.municipal_bfp_stations (municipality_id, station_name, status, created_at)
      select id, 'Pandan Fire Station (old)', 'INACTIVE', now() - interval '1 year' from public.municipalities where name = 'Pandan';
  `);
  return db;
}

test("each municipality's main fire station is headed by its fire marshal", async () => {
  const db = await fixture();
  try {
    await db.exec(read(`../supabase/migrations/${VERSION}_${NAME}.sql`));
    const { rows } = await db.query(`
      select municipality.name as municipality, station.station_name as station
        from public.municipal_bfp_stations station
        join public.municipalities municipality on municipality.id = station.municipality_id
       where station.status = 'ACTIVE' and station.station_name like '%Fire Station%'`);
    const byMunicipality = new Map(rows.map((row) => [row.municipality, row.station]));
    for (const [municipality, station, head] of ROSTER) {
      assert.equal(byMunicipality.get(municipality), `${station} · Head: ${head}`, municipality);
    }
  } finally {
    await db.close();
  }
});

test("sub-stations and inactive stations keep their names", async () => {
  const db = await fixture();
  try {
    await db.exec(read(`../supabase/migrations/${VERSION}_${NAME}.sql`));
    const { rows } = await db.query(`
      select station_name from public.municipal_bfp_stations
       where station_name like 'May Bato%' or station_name like 'San Angel%' or status = 'INACTIVE'
       order by station_name`);
    assert.deepEqual(rows.map((row) => row.station_name), [
      "May Bato Station · Head: SP02 Maghari",
      "Pandan Fire Station (old)",
      "San Angel Fire Sub-Station",
    ]);
  } finally {
    await db.close();
  }
});

test("the deploy runs the migration once, so later head edits are not overwritten", async () => {
  const check = appliedCheck();
  const db = await fixture();
  try {
    assert.equal((await db.query(check)).rows[0].applied, false);
    await db.exec(read(`../supabase/migrations/${VERSION}_${NAME}.sql`));
    assert.equal((await db.query(check)).rows[0].applied, true);
    // An officer later changes a head on the Stations page.
    await db.exec(`update public.municipal_bfp_stations set station_name = 'Hamtic Fire Station · Head: SFO1 New Head'
                    where station_name like 'Hamtic Fire Station%'`);
    assert.equal((await db.query(check)).rows[0].applied, true);
  } finally {
    await db.close();
  }
});

test("a database without stations has nothing to apply", async () => {
  const db = new PGlite();
  try {
    assert.equal((await db.query(appliedCheck())).rows[0].applied, true);
  } finally {
    await db.close();
  }
});
