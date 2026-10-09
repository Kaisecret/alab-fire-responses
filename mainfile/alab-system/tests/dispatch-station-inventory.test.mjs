import assert from "node:assert/strict";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { loadServerModule } from "./helpers/load-server-module.mjs";

test("dispatch choices return each local station's serviceable inventory without multiplying crew counts", async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      create table municipal_bfp_stations (id text primary key, municipality_id text, station_name text, latitude numeric, longitude numeric, status text);
      create table bfp_station_assignments (station_id text, personnel_profile_id text, status text);
      create table bfp_personnel_profiles (id text primary key, user_id text);
      create table users (id text primary key, role text, account_status text);
      create table fire_trucks (id text primary key, municipality_id text, station_id text, operational_status text);
      insert into municipal_bfp_stations values
        ('main', 'sanjose', 'San Jose Fire Station', 10.7431, 121.9394, 'ACTIVE'),
        ('angel', 'sanjose', 'San Angel Fire Sub-Station', 10.7388, 121.9503, 'ACTIVE'),
        ('dalipe', 'sanjose', 'Dalipe Fire Sub-Station', 10.756, 121.9355, 'ACTIVE'),
        ('closed', 'sanjose', 'Closed station', 10.75, 121.94, 'INACTIVE'),
        ('hamtic', 'hamtic', 'Hamtic Fire Station', 10.7, 121.95, 'ACTIVE');
      insert into users values ('u1', 'MUNICIPAL_BFP', 'ACTIVE'), ('u2', 'MUNICIPAL_BFP', 'ACTIVE'), ('u3', 'MUNICIPAL_BFP', 'INACTIVE');
      insert into bfp_personnel_profiles values ('p1', 'u1'), ('p2', 'u2'), ('p3', 'u3');
      insert into bfp_station_assignments values ('main', 'p1', 'ACTIVE'), ('main', 'p2', 'ACTIVE'), ('main', 'p3', 'ACTIVE');
      insert into fire_trucks values
        ('t1', 'sanjose', 'main', 'SERVICEABLE'), ('t2', 'sanjose', 'main', 'SERVICEABLE'),
        ('t3', 'sanjose', 'main', 'SERVICEABLE'), ('t4', 'sanjose', 'main', 'FOR_BER'),
        ('t5', 'sanjose', 'angel', 'SERVICEABLE'), ('t6', 'sanjose', 'dalipe', 'SERVICEABLE'),
        ('t7', 'sanjose', 'dalipe', 'SERVICEABLE'), ('t8', 'hamtic', 'hamtic', 'SERVICEABLE'),
        ('wrong-town', 'hamtic', 'main', 'SERVICEABLE');
    `);
    const service = loadServerModule("lib/municipal-bfp/dispatch.ts", {
      "../db": { getDatabase: () => db },
      "../fire-reports/validation": {},
      "../notifications/service": {},
      "../notifications/fcm": {},
      "../intermunicipality/assistance": {},
      "../intermunicipality/observers": {},
      "./mutual-aid-dispatch-query.mjs": {},
    });
    const stations = await service.listDispatchableStations("sanjose");
    assert.deepEqual(stations.map((s) => [s.id, s.activePersonnelCount, s.serviceableTruckCount]),
      [["dalipe", 0, 2], ["angel", 0, 1], ["main", 2, 3]]);
    await db.query("update fire_trucks set operational_status = 'UNSERVICEABLE' where station_id = 'angel'");
    assert.equal((await service.listDispatchableStations("sanjose")).find((s) => s.id === "angel").serviceableTruckCount, 0);
  } finally {
    await db.close();
  }
});
