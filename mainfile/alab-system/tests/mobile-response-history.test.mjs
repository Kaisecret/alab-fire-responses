import assert from "node:assert/strict";
import test from "node:test";

import { PGlite } from "@electric-sql/pglite";

import { loadServerModule } from "./helpers/load-server-module.mjs";

const responder = "cccccccc-0000-4000-8000-000000000001";
const municipality = "bbbbbbbb-0000-4000-8000-000000000001";
const barangay = "bbbbbbbb-0000-4000-8000-000000000010";

async function fixture() {
  const db = new PGlite();
  await db.exec(`
    create table municipalities(id uuid primary key, name text);
    create table barangays(id uuid primary key, name text);
    create table resident_profiles(id uuid primary key);
    create table resident_addresses(resident_profile_id uuid, barangay_id uuid, is_primary boolean);
    create table fire_reports(id uuid primary key, reference_number text, fire_type text, status text,
      latitude numeric, longitude numeric, municipality_id uuid, barangay_id uuid, resident_profile_id uuid,
      address_label text, nearest_landmark text, calculated_severity text, severity_score integer);
    create table incident_dispatches(id uuid primary key, fire_report_id uuid, status text);
    create table incident_dispatch_stations(id uuid primary key, dispatch_id uuid, station_name_snapshot text,
      station_latitude_snapshot numeric, station_longitude_snapshot numeric);
    create table incident_dispatch_recipients(id uuid primary key, dispatch_id uuid, dispatch_station_id uuid,
      recipient_user_id uuid, status text, assigned_at timestamptz, en_route_at timestamptz, on_scene_at timestamptz,
      completed_at timestamptz, updated_at timestamptz, arrival_method text);
    insert into municipalities values ('${municipality}', 'San Jose de Buenavista');
    insert into barangays values ('${barangay}', 'Funda-Dalipe');
    insert into fire_reports values
      ('aaaaaaaa-0000-4000-8000-000000000001', 'FIRE-001', 'HOUSE_BUILDING', 'RESOLVED', 10.74, 121.94,
       '${municipality}', '${barangay}', null, null, 'Near the plaza', 'HIGH', 72),
      ('aaaaaaaa-0000-4000-8000-000000000002', 'FIRE-002', 'GRASS_FOREST', 'RESOLVED', 10.75, 121.95,
       '${municipality}', '${barangay}', null, null, null, null, null);
    insert into incident_dispatches values
      ('dddddddd-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001', 'COMPLETED'),
      ('dddddddd-0000-4000-8000-000000000002', 'aaaaaaaa-0000-4000-8000-000000000002', 'COMPLETED');
    insert into incident_dispatch_stations values
      ('eeeeeeee-0000-4000-8000-000000000001', 'dddddddd-0000-4000-8000-000000000001', 'San Jose Station', 10.7, 121.9),
      ('eeeeeeee-0000-4000-8000-000000000002', 'dddddddd-0000-4000-8000-000000000002', 'San Jose Station', 10.7, 121.9);
    insert into incident_dispatch_recipients values
      ('ffffffff-0000-4000-8000-000000000001', 'dddddddd-0000-4000-8000-000000000001',
       'eeeeeeee-0000-4000-8000-000000000001', '${responder}', 'COMPLETED',
       '2026-10-01T08:00:00Z', '2026-10-01T08:02:00Z', '2026-10-01T08:10:30Z', '2026-10-01T09:15:00Z',
       '2026-10-01T09:15:00Z', 'AUTO_GEOFENCE'),
      -- An older record: the responder never reached the arrival step.
      ('ffffffff-0000-4000-8000-000000000002', 'dddddddd-0000-4000-8000-000000000002',
       'eeeeeeee-0000-4000-8000-000000000002', '${responder}', 'COMPLETED',
       '2026-09-20T08:00:00Z', null, null, '2026-09-20T10:00:00Z', '2026-09-20T10:00:00Z', null);
  `);
  const dispatch = loadServerModule("lib/municipal-bfp/dispatch.ts", {
    "../db": { getDatabase: () => ({ query: (sql, params) => db.query(sql, params) }), withTransaction: async () => {} },
    "../fire-reports/validation": {},
    "../notifications/service": {},
    "../notifications/fcm": {},
    "../intermunicipality/assistance": {},
    "../intermunicipality/observers": {},
    "./mutual-aid-dispatch-query.mjs": {},
  });
  return { db, dispatch };
}

test("resolved assignments carry the responder timeline and Level of Danger", async () => {
  const { db, dispatch } = await fixture();
  try {
    const [latest] = await dispatch.listMobileResolvedAssignments(responder);

    assert.equal(latest.referenceNumber, "FIRE-001");
    assert.equal(new Date(latest.assignedAt).toISOString(), "2026-10-01T08:00:00.000Z");
    assert.equal(new Date(latest.enRouteAt).toISOString(), "2026-10-01T08:02:00.000Z");
    assert.equal(new Date(latest.onSceneAt).toISOString(), "2026-10-01T08:10:30.000Z");
    assert.equal(new Date(latest.completedAt).toISOString(), "2026-10-01T09:15:00.000Z");
    assert.equal(latest.arrivalMethod, "AUTO_GEOFENCE");
    assert.equal(latest.levelOfDanger, "HIGH");
    assert.equal(latest.dangerScore, 72);
    // Response time runs from assignment to arrival on scene.
    assert.equal(latest.responseSeconds, 630);
  } finally {
    await db.close();
  }
});

test("a record without an arrival time reports no response time instead of a guess", async () => {
  const { db, dispatch } = await fixture();
  try {
    const rows = await dispatch.listMobileResolvedAssignments(responder);
    const older = rows.find((row) => row.referenceNumber === "FIRE-002");

    assert.equal(older.onSceneAt, null);
    assert.equal(older.arrivalMethod, null);
    assert.equal(older.responseSeconds, null);
    assert.equal(older.levelOfDanger, null);
    assert.equal(older.dangerScore, null);
  } finally {
    await db.close();
  }
});
