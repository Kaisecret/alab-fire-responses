import assert from "node:assert/strict";
import test from "node:test";

import { PGlite } from "@electric-sql/pglite";

import { findObserverForAcknowledgment } from "../lib/intermunicipality/observer-acknowledgment-query.mjs";

test("a municipality without a registered station can load its observer row for acknowledgment", async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      create table municipalities(id uuid primary key, name text not null);
      create table municipal_bfp_stations(id uuid primary key, station_name text not null);
      create table incident_municipal_observers(
        id uuid primary key,
        fire_report_id uuid not null,
        dispatch_id uuid not null,
        origin_municipality_id uuid not null,
        observer_municipality_id uuid not null,
        nearest_station_id uuid references municipal_bfp_stations(id),
        distance_meters numeric not null,
        status text not null,
        acknowledged_by_user_id uuid,
        acknowledged_at timestamptz
      );
    `);

    const ids = {
      observer: "00000000-0000-4000-8000-000000000001",
      fire: "00000000-0000-4000-8000-000000000002",
      dispatch: "00000000-0000-4000-8000-000000000003",
      origin: "00000000-0000-4000-8000-000000000004",
      municipality: "00000000-0000-4000-8000-000000000005",
    };

    await db.query("insert into municipalities(id, name) values ($1, 'San Jose de Buenavista')", [ids.municipality]);
    await db.query(
      `insert into incident_municipal_observers(
         id, fire_report_id, dispatch_id, origin_municipality_id,
         observer_municipality_id, nearest_station_id, distance_meters, status
       ) values ($1,$2,$3,$4,$5,null,14700,'ACTIVE')`,
      [ids.observer, ids.fire, ids.dispatch, ids.origin, ids.municipality],
    );

    const row = await findObserverForAcknowledgment(db, ids.fire, ids.municipality);

    assert.equal(row?.id, ids.observer);
    assert.equal(row?.nearest_station_id, null);
    assert.equal(row?.station_name, "San Jose de Buenavista Municipal BFP");
  } finally {
    await db.close();
  }
});
