import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  CLOSED_INCIDENT_STATUSES,
  DUPLICATE_RADIUS_METERS,
  distanceMeters,
  incidentStage,
  searchBox,
} from "../lib/fire-reports/duplicate-rules.mjs";

test("reports within 50 meters count as the same fire", () => {
  assert.equal(DUPLICATE_RADIUS_METERS, 50);
  // About 33 m north and 44 m north of a point in San Jose de Buenavista.
  assert.ok(distanceMeters(10.7431, 121.9394, 10.7434, 121.9394) < 50);
  assert.ok(distanceMeters(10.7431, 121.9394, 10.7436, 121.9394) > 50);
});

test("the search box always contains the whole 50 meter circle", () => {
  const { latitudeDelta, longitudeDelta } = searchBox(10.7431);
  assert.ok(distanceMeters(10.7431, 121.9394, 10.7431 + latitudeDelta, 121.9394) >= 49.9);
  assert.ok(distanceMeters(10.7431, 121.9394, 10.7431, 121.9394 + longitudeDelta) >= 49.9);
});

test("shared incident stages follow the BFP response", () => {
  assert.equal(incidentStage("PENDING_VERIFICATION"), "REPORTED");
  assert.equal(incidentStage("VERIFIED"), "ACKNOWLEDGED");
  assert.equal(incidentStage("RESPONDING"), "RESPONDING");
  assert.equal(incidentStage("FIRETRUCK_DISPATCHED"), "RESPONDING");
  assert.equal(incidentStage("RESPONDER_ARRIVED"), "ON_SCENE");
  assert.equal(incidentStage("RESOLVED"), "RESOLVED");
});

test("closed or already-linked reports never become the primary incident", () => {
  for (const status of ["RESOLVED", "CLOSED", "REJECTED", "FALSE_REPORT", "DUPLICATE"]) {
    assert.ok(CLOSED_INCIDENT_STATUSES.includes(status), status);
  }
  assert.ok(!CLOSED_INCIDENT_STATUSES.includes("RESPONDING"));
});

test("new reports near an open incident are linked instead of raising a second alarm", () => {
  const service = readFileSync(new URL("../lib/fire-reports/service.ts", import.meta.url), "utf8");
  assert.match(service, /findOpenIncidentNear\(/);
  assert.match(service, /duplicate_of_report_id/);
  // One report at a time per municipality, so two people reporting at once
  // cannot both become the primary incident.
  assert.match(service, /pg_advisory_xact_lock/);
  const migration = readFileSync(new URL("../scripts/apply-command-migration.mjs", import.meta.url), "utf8");
  assert.match(migration, /link_duplicate_fire_reports/);
});

test("the open-incident search finds only open, recent, unlinked reports within 50 meters", async () => {
  const { PGlite } = await import("@electric-sql/pglite");
  const { findOpenIncidentNear } = await import("../lib/fire-reports/duplicates.ts");
  const db = new PGlite();
  try {
    await db.exec(`
      create table public.fire_reports (
        id uuid primary key default gen_random_uuid(),
        reference_number text not null,
        resident_profile_id uuid,
        status text not null,
        latitude numeric(9, 6) not null,
        longitude numeric(9, 6) not null,
        submitted_at timestamptz not null default now()
      );
    `);
    await db.exec(readFileSync(new URL("../supabase/migrations/20260930030000_link_duplicate_fire_reports.sql", import.meta.url), "utf8"));
    const client = { query: (sql, params) => db.query(sql, params) };
    const insert = (reference, status, latitude, longitude, hoursAgo = 1) => db.query(
      `insert into fire_reports (reference_number, status, latitude, longitude, submitted_at)
       values ($1, $2, $3, $4, now() - ($5::text || ' hours')::interval)`,
      [reference, status, latitude, longitude, hoursAgo],
    );
    await insert("FAR", "PENDING_VERIFICATION", 10.7440, 121.9394);          // ~100 m away
    await insert("CLOSED", "RESOLVED", 10.7432, 121.9394);                  // ~11 m, but over
    await insert("STALE", "RESPONDING", 10.7432, 121.9395, 13);             // ~15 m, but 13 h old
    assert.equal(await findOpenIncidentNear(client, 10.7431, 121.9394), null);

    await insert("OPEN", "RESPONDING", 10.7433, 121.9394, 2);               // ~22 m, open
    await insert("LATER", "PENDING_VERIFICATION", 10.7432, 121.9394, 0.5);  // nearer but newer
    const found = await findOpenIncidentNear(client, 10.7431, 121.9394);
    assert.equal(found?.referenceNumber, "OPEN");

    // A report already linked to another never becomes the primary.
    await db.query("update fire_reports set duplicate_of_report_id = $1 where reference_number = 'OPEN'", [
      (await db.query("select id from fire_reports where reference_number = 'LATER'")).rows[0].id,
    ]);
    assert.equal((await findOpenIncidentNear(client, 10.7431, 121.9394))?.referenceNumber, "LATER");
  } finally {
    await db.close();
  }
});
