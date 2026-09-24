import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { PGlite } from "@electric-sql/pglite";

const municipalities = [
  "Anini-y", "Barbaza", "Belison", "Bugasong", "Caluya", "Culasi", "Hamtic",
  "Laua-an", "Libertad", "Pandan", "Patnongon", "San Jose de Buenavista",
  "San Remigio", "Sebaste", "Sibalom", "Tibiao", "Tobias Fornier", "Valderrama",
];

const migration = readFileSync(
  "supabase/migrations/20260924090000_add_fire_truck_inventory.sql",
  "utf8",
);

test("all imported truck details match the 29 source-sheet rows", () => {
  const sheet = readFileSync("../../outputs/firetruck-inventory-antique.md", "utf8");
  const sourceRows = sheet.split(/\r?\n/)
    .filter((line) => /^\|\s*\d+\s*\|/.test(line))
    .map((line) => line.split("|").slice(1, -1).map((value) => value.trim()));
  const importedRows = [...migration.matchAll(/^\s*\((\d+), '([^']+)', '(?:MAIN|SAN_ANGEL|DALIPE)', '([^']+)', (\d+), (null|\d+), (?:null|'[^']+'), (?:null|'[^']+'), '([^']+)',/gm)];
  assert.equal(sourceRows.length, 29);
  assert.equal(importedRows.length, 29);
  for (const [index, row] of sourceRows.entries()) {
    const imported = importedRows[index];
    assert.equal(Number(imported[1]), Number(row[0]), `row ${index + 1} sequence`);
    assert.equal(imported[3], row[4], `row ${index + 1} make`);
    assert.equal(Number(imported[4]), Number(row[5].replace(/\D/g, "")), `row ${index + 1} capacity`);
    assert.equal(imported[5] === "null" ? "" : imported[5], row[6], `row ${index + 1} model year`);
    assert.equal(imported[6], row[7], `row ${index + 1} acquired label`);
  }
});

async function createDatabase() {
  const db = new PGlite();
  await db.exec(`
    create role anon;
    create role authenticated;
    create table public.users (id uuid primary key);
    create table public.municipalities (
      id uuid primary key default gen_random_uuid(),
      name text not null,
      province text not null,
      latitude numeric(9, 6),
      longitude numeric(9, 6),
      updated_at timestamptz not null default now()
    );
    create table public.municipal_bfp_stations (
      id uuid primary key default gen_random_uuid(),
      municipality_id uuid not null references public.municipalities(id),
      station_name text not null,
      latitude numeric(9, 6) not null,
      longitude numeric(9, 6) not null,
      status text not null default 'ACTIVE',
      deactivated_at timestamptz,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );
  `);
  for (const name of municipalities) {
    await db.query("insert into public.municipalities (name, province) values ($1, 'Antique')", [name]);
  }
  return db;
}

async function stationTrucks(db) {
  const result = await db.query(`
    select municipality.name as municipality, station.station_name as station, count(truck.id)::int as trucks
      from public.fire_trucks truck
      join public.municipal_bfp_stations station on station.id = truck.station_id
      join public.municipalities municipality on municipality.id = truck.municipality_id
     group by municipality.name, station.station_name
     order by municipality.name, station.station_name`);
  return result.rows;
}

test("fire truck migration creates stations and imports all 29 inventory trucks", async () => {
  const db = await createDatabase();
  try {
    await db.exec(`begin; ${migration} commit;`);

    const total = await db.query("select count(*)::int as count from public.fire_trucks");
    assert.equal(total.rows[0].count, 29);

    const stations = await db.query(`
      select municipality.name, station.station_name
        from public.municipal_bfp_stations station
        join public.municipalities municipality on municipality.id = station.municipality_id
       order by municipality.name, station.station_name`);
    assert.equal(stations.rows.length, 20);
    assert.deepEqual(
      stations.rows.filter((row) => row.name === "San Jose de Buenavista").map((row) => row.station_name),
      ["Dalipe Fire Sub-Station", "San Angel Fire Sub-Station", "San Jose Fire Station"],
    );

    const sanJose = (await stationTrucks(db)).filter((row) => row.municipality === "San Jose de Buenavista");
    assert.deepEqual(sanJose, [
      { municipality: "San Jose de Buenavista", station: "Dalipe Fire Sub-Station", trucks: 2 },
      { municipality: "San Jose de Buenavista", station: "San Angel Fire Sub-Station", trucks: 1 },
      { municipality: "San Jose de Buenavista", station: "San Jose Fire Station", trucks: 4 },
    ]);

    const flagged = await db.query(`
      select import_sequence, operational_status, ownership, remarks
        from public.fire_trucks
       where operational_status <> 'SERVICEABLE' or ownership <> 'BFP'
       order by import_sequence`);
    assert.deepEqual(flagged.rows, [
      { import_sequence: 14, operational_status: "UNSERVICEABLE", ownership: "BFP", remarks: "UNSERVICEABLE (for general repair)" },
      { import_sequence: 15, operational_status: "SERVICEABLE", ownership: "LGU", remarks: "LGU (not BFP)" },
      { import_sequence: 17, operational_status: "FOR_BER", ownership: "BFP", remarks: "FOR BER (due to accident)" },
      { import_sequence: 26, operational_status: "BER", ownership: "BFP", remarks: "BER (due to accident)" },
    ]);

    const noYear = await db.query(`
      select count(*)::int as count from public.fire_trucks
       where acquired_on is null and acquired_label is not null`);
    assert.equal(noYear.rows[0].count, 8);

    const capacity = await db.query("select sum(capacity_gallons)::int as total from public.fire_trucks");
    assert.equal(capacity.rows[0].total, 28000);

    const classes = await db.query(`
      select name, income_class from public.municipalities
       where name in ('Caluya', 'Hamtic', 'Belison', 'Pandan') order by name`);
    assert.deepEqual(classes.rows, [
      { name: "Belison", income_class: "5th" },
      { name: "Caluya", income_class: "1st" },
      { name: "Hamtic", income_class: "3rd" },
      { name: "Pandan", income_class: "2nd" },
    ]);
  } finally {
    await db.close();
  }
});

test("fire truck migration keeps stations a municipality already registered", async () => {
  const db = await createDatabase();
  try {
    await db.exec(`
      insert into public.municipal_bfp_stations (municipality_id, station_name, latitude, longitude)
      select id, 'Hamtic Central Fire Station', 10.701, 121.981 from public.municipalities where name = 'Hamtic';
      insert into public.municipal_bfp_stations (municipality_id, station_name, latitude, longitude)
      select id, 'BFP San Jose Central', 10.744, 121.941 from public.municipalities where name = 'San Jose de Buenavista';
      insert into public.municipal_bfp_stations (municipality_id, station_name, latitude, longitude)
      select id, 'San Angel FSS', 10.7391, 121.9502 from public.municipalities where name = 'San Jose de Buenavista';
    `);
    await db.exec(`begin; ${migration} commit;`);

    const hamtic = await db.query(`
      select station.station_name
        from public.municipal_bfp_stations station
        join public.municipalities municipality on municipality.id = station.municipality_id
       where municipality.name = 'Hamtic'`);
    assert.deepEqual(hamtic.rows, [{ station_name: "Hamtic Central Fire Station" }]);

    const trucks = await stationTrucks(db);
    assert.deepEqual(trucks.filter((row) => row.municipality === "Hamtic"), [
      { municipality: "Hamtic", station: "Hamtic Central Fire Station", trucks: 2 },
    ]);
    assert.deepEqual(trucks.filter((row) => row.municipality === "San Jose de Buenavista"), [
      { municipality: "San Jose de Buenavista", station: "BFP San Jose Central", trucks: 4 },
      { municipality: "San Jose de Buenavista", station: "Dalipe Fire Sub-Station", trucks: 2 },
      { municipality: "San Jose de Buenavista", station: "San Angel FSS", trucks: 1 },
    ]);
  } finally {
    await db.close();
  }
});

test("an unrelated existing Hamtic station does not receive the inventory's main-station trucks", async () => {
  const db = await createDatabase();
  try {
    await db.exec(`
      insert into public.municipal_bfp_stations (municipality_id, station_name, latitude, longitude)
      select id, 'May Bato Station', 10.7442, 121.9422 from public.municipalities where name = 'Hamtic';
    `);
    await db.exec(`begin; ${migration} commit;`);

    assert.deepEqual((await stationTrucks(db)).filter((row) => row.municipality === "Hamtic"), [
      { municipality: "Hamtic", station: "Hamtic Fire Station", trucks: 2 },
    ]);
    const stations = await db.query(`
      select station_name from public.municipal_bfp_stations
       where municipality_id = (select id from public.municipalities where name = 'Hamtic')
       order by station_name`);
    assert.deepEqual(stations.rows, [
      { station_name: "Hamtic Fire Station" },
      { station_name: "May Bato Station" },
    ]);
  } finally {
    await db.close();
  }
});

test("new Tibiao and Valderrama stations use town-area proxies rather than distant stored seats", async () => {
  const db = await createDatabase();
  try {
    await db.exec(`begin; ${migration} commit;`);
    const positions = await db.query(`
      select municipality.name, station.latitude::float8 as latitude, station.longitude::float8 as longitude
        from public.municipal_bfp_stations station
        join public.municipalities municipality on municipality.id = station.municipality_id
       where municipality.name in ('Tibiao', 'Valderrama')
       order by municipality.name`);
    assert.deepEqual(positions.rows, [
      { name: "Tibiao", latitude: 11.28856, longitude: 122.03457 },
      { name: "Valderrama", latitude: 11.00372, longitude: 122.12971 },
    ]);
  } finally {
    await db.close();
  }
});

test("fire truck rows reject a station from another municipality and audit events are immutable", async () => {
  const db = await createDatabase();
  try {
    await db.exec(`begin; ${migration} commit;`);
    const wrongStation = db.query(`
      insert into public.fire_trucks (municipality_id, station_id, make, capacity_gallons, record_origin)
      select hamtic.id, sibalom_station.id, 'Test Pumper', 1000, 'PROVINCIAL_ENTRY'
        from public.municipalities hamtic,
             public.municipal_bfp_stations sibalom_station
        join public.municipalities sibalom on sibalom.id = sibalom_station.municipality_id
       where hamtic.name = 'Hamtic' and sibalom.name = 'Sibalom'
       limit 1`);
    await assert.rejects(wrongStation, /fire_trucks_station_municipality_fkey/);

    const actorId = crypto.randomUUID();
    await db.query("insert into public.users (id) values ($1)", [actorId]);
    const truck = await db.query("select id, municipality_id from public.fire_trucks limit 1");
    await db.query(
      `insert into public.fire_truck_events (fire_truck_id, municipality_id, actor_user_id, action)
       values ($1, $2, $3, 'CREATED')`,
      [truck.rows[0].id, truck.rows[0].municipality_id, actorId],
    );
    await assert.rejects(
      db.query("delete from public.fire_truck_events"),
      /fire truck audit events are immutable/,
    );
  } finally {
    await db.close();
  }
});
