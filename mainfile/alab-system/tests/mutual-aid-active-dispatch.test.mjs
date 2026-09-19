import assert from "node:assert/strict";
import test from "node:test";

import { PGlite } from "@electric-sql/pglite";

import { findMutualAidDispatchId } from "../lib/municipal-bfp/mutual-aid-dispatch-query.mjs";
import { loadServerModule } from "./helpers/load-server-module.mjs";

test("a summoned municipality joins the incident's active dispatch instead of creating a conflicting one", async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      create table incident_dispatches(
        id uuid primary key,
        fire_report_id uuid not null,
        status text not null
      );
      create unique index one_active_dispatch_per_report
        on incident_dispatches(fire_report_id) where status = 'ACTIVE';
      create table incident_municipal_observers(
        id uuid primary key,
        fire_report_id uuid not null,
        dispatch_id uuid not null references incident_dispatches(id),
        observer_municipality_id uuid not null,
        status text not null
      );
      create table intermunicipal_assistance_requests(
        dispatch_id uuid not null,
        fire_report_id uuid not null,
        observer_id uuid not null references incident_municipal_observers(id),
        recipient_municipality_id uuid not null,
        status text not null
      );
    `);
    const fireReportId = "00000000-0000-4000-8000-000000000101";
    const dispatchId = "00000000-0000-4000-8000-000000000102";
    const municipalityId = "00000000-0000-4000-8000-000000000103";
    const observerId = "00000000-0000-4000-8000-000000000104";
    await db.query("insert into incident_dispatches values ($1,$2,'ACTIVE')", [dispatchId, fireReportId]);
    await db.query("insert into incident_municipal_observers values ($1,$2,$3,$4,'ACTIVE')", [observerId, fireReportId, dispatchId, municipalityId]);
    await db.query("insert into intermunicipal_assistance_requests values ($1,$2,$3,$4,'ACCEPTED')", [dispatchId, fireReportId, observerId, municipalityId]);

    assert.equal(await findMutualAidDispatchId(db, fireReportId, municipalityId), dispatchId);
    const dispatches = await db.query("select count(*)::int as count from incident_dispatches where fire_report_id = $1", [fireReportId]);
    assert.equal(dispatches.rows[0].count, 1);
  } finally {
    await db.close();
  }
});

test("an unsummoned municipality receives no dispatch authority", async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      create table incident_dispatches(id uuid primary key, fire_report_id uuid not null, status text not null);
      create table incident_municipal_observers(
        id uuid primary key,
        fire_report_id uuid not null,
        dispatch_id uuid not null references incident_dispatches(id),
        observer_municipality_id uuid not null,
        status text not null
      );
      create table intermunicipal_assistance_requests(
        dispatch_id uuid not null,
        fire_report_id uuid not null,
        observer_id uuid not null references incident_municipal_observers(id),
        recipient_municipality_id uuid not null,
        status text not null
      );
    `);
    assert.equal(
      await findMutualAidDispatchId(
        db,
        "00000000-0000-4000-8000-000000000111",
        "00000000-0000-4000-8000-000000000112",
      ),
      null,
    );
  } finally {
    await db.close();
  }
});

test("a passive nearby observer cannot dispatch without accepting an assistance request", async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      create table incident_dispatches(id uuid primary key, fire_report_id uuid not null, status text not null);
      create table incident_municipal_observers(
        id uuid primary key, fire_report_id uuid not null,
        dispatch_id uuid not null references incident_dispatches(id),
        observer_municipality_id uuid not null, status text not null
      );
      create table intermunicipal_assistance_requests(
        dispatch_id uuid not null, fire_report_id uuid not null,
        observer_id uuid not null references incident_municipal_observers(id),
        recipient_municipality_id uuid not null, status text not null
      );
      insert into incident_dispatches values
        ('00000000-0000-4000-8000-000000000122','00000000-0000-4000-8000-000000000121','ACTIVE');
      insert into incident_municipal_observers values
        ('00000000-0000-4000-8000-000000000124','00000000-0000-4000-8000-000000000121',
         '00000000-0000-4000-8000-000000000122','00000000-0000-4000-8000-000000000123','ACTIVE');
    `);
    assert.equal(await findMutualAidDispatchId(
      db,
      "00000000-0000-4000-8000-000000000121",
      "00000000-0000-4000-8000-000000000123",
    ), null);
  } finally {
    await db.close();
  }
});

test("a repeated helper assignment is idempotent and never creates a new observer ring", async () => {
  const fireReportId = "00000000-0000-4000-8000-000000000131";
  const municipalityId = "00000000-0000-4000-8000-000000000132";
  const actorUserId = "00000000-0000-4000-8000-000000000133";
  const stationId = "00000000-0000-4000-8000-000000000134";
  const dispatchId = "00000000-0000-4000-8000-000000000135";
  const dispatchStationId = "00000000-0000-4000-8000-000000000136";
  let observerSelectionCalled = false;
  const query = async (sql) => {
    if (sql.includes("select fr.status")) {
      assert.match(sql, /intermunicipal_assistance_requests[\s\S]*ACCEPTED/);
      return { rowCount: 1, rows: [{
        status: "RESPONDING", municipality_id: "00000000-0000-4000-8000-000000000139",
        reference_number: "ALAB-2026-001", resident_user_id: null,
        barangay: "Poblacion", latitude: 10.7, longitude: 122,
      }] };
    }
    if (sql.includes('count(u.id)::int as "activePersonnelCount"')) {
      return { rowCount: 1, rows: [{ id: stationId, stationName: "Helper Station", latitude: 10.8, longitude: 122.1, activePersonnelCount: 1 }] };
    }
    if (sql.includes("select id, station_name")) {
      return { rowCount: 1, rows: [{ id: stationId, station_name: "Helper Station", latitude: 10.8, longitude: 122.1 }] };
    }
    if (sql.includes("select station_assignment.station_id")) {
      return { rowCount: 1, rows: [{ station_id: stationId, user_id: actorUserId, display_name: "FO1 Helper" }] };
    }
    if (sql.includes("select id from incident_dispatch_stations")) {
      return { rowCount: 1, rows: [{ id: dispatchStationId }] };
    }
    if (sql.includes("insert into incident_dispatch_recipients")) return { rowCount: 0, rows: [] };
    return { rowCount: 0, rows: [] };
  };
  const service = loadServerModule("lib/municipal-bfp/dispatch.ts", {
    "../db": { getDatabase: () => ({ query }), withTransaction: (work) => work({ query }) },
    "../fire-reports/validation": { canMunicipalResolveReport: () => false, canTransitionReportStatus: () => false },
    "../fire-reports/types": {},
    "../notifications/service": { createAccountNotifications: async () => {}, listProvincialNotificationRecipients: async () => [] },
    "../notifications/fcm": { sendDispatchPush: async () => {} },
    "../intermunicipality/assistance": { closeIncidentAssistance: async () => {} },
    "../intermunicipality/observers": {
      createNearbyIncidentObservers: async () => { observerSelectionCalled = true; throw new Error("must not create observers"); },
      endIncidentObservers: async () => {},
    },
    "./mutual-aid-dispatch-query.mjs": { findMutualAidDispatchId: async () => dispatchId },
  });

  const result = await service.dispatchIncidentToStations({
    fireReportId, municipalityId, actorUserId, municipalityName: "Helper Town",
    stationIds: [stationId],
  });
  assert.equal(observerSelectionCalled, false);
  assert.equal(result.dispatchId, dispatchId);
  assert.equal(result.recipientCount, 0, "a retry must not reassign or re-notify the same responder");
  assert.deepEqual(result.nearbyObservers, []);
});
