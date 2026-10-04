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

test("reports within 100 meters count as the same fire", () => {
  assert.equal(DUPLICATE_RADIUS_METERS, 100);
  assert.ok(distanceMeters(10.7431, 121.9394, 10.7439, 121.9394) < 100);
  assert.ok(distanceMeters(10.7431, 121.9394, 10.7441, 121.9394) > 100);
});

test("the search box contains the whole 100 meter circle", () => {
  const { latitudeDelta, longitudeDelta } = searchBox(10.7431);
  assert.ok(distanceMeters(10.7431, 121.9394, 10.7431 + latitudeDelta, 121.9394) >= 99.999);
  assert.ok(distanceMeters(10.7431, 121.9394, 10.7431, 121.9394 + longitudeDelta) >= 99.999);
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

test("the open-incident search finds only open, recent, unlinked reports within 100 meters", async () => {
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
        fire_type text not null default 'HOUSE_BUILDING',
        fire_types text[],
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
    await insert("FAR", "PENDING_VERIFICATION", 10.7441, 121.9394);          // ~111 m away
    await insert("CLOSED", "RESOLVED", 10.7432, 121.9394);                  // ~11 m, but over
    await insert("STALE", "RESPONDING", 10.7432, 121.9395, 13);             // ~15 m, but 13 h old
    assert.equal(await findOpenIncidentNear(client, 10.7431, 121.9394, ['HOUSE_BUILDING']), null);

    await insert("OPEN", "RESPONDING", 10.7433, 121.9394, 2);               // ~22 m, open
    await insert("LATER", "PENDING_VERIFICATION", 10.7432, 121.9394, 0.5);  // nearer but newer
    const found = await findOpenIncidentNear(client, 10.7431, 121.9394, ['HOUSE_BUILDING']);
    assert.equal(found?.referenceNumber, "OPEN");

    // A report already linked to another never becomes the primary.
    await db.query("update fire_reports set duplicate_of_report_id = $1 where reference_number = 'OPEN'", [
      (await db.query("select id from fire_reports where reference_number = 'LATER'")).rows[0].id,
    ]);
    assert.equal((await findOpenIncidentNear(client, 10.7431, 121.9394, ['HOUSE_BUILDING']))?.referenceNumber, "LATER");
  } finally {
    await db.close();
  }
});

test("another account's same fire type at 80 meters links to the existing responding incident", async () => {
  const { PGlite } = await import('@electric-sql/pglite');
  const { findOpenIncidentNear } = await import('../lib/fire-reports/duplicates.ts');
  const db = new PGlite();
  try {
    await db.exec(`create table fire_reports (
      id uuid primary key default gen_random_uuid(), reference_number text, resident_profile_id uuid,
      status text, latitude float8, longitude float8, submitted_at timestamptz default now(),
      duplicate_of_report_id uuid, fire_type text, fire_types text[]
    )`);
    const client = { query: (sql, params) => db.query(sql, params) };
    await db.query(`insert into fire_reports (reference_number, resident_profile_id, status, latitude, longitude, fire_type)
      values ('HOUSE-A', '11111111-1111-4111-8111-111111111111', 'RESPONDING', 10.74382, 121.9394, 'HOUSE_BUILDING')`);
    const found = await findOpenIncidentNear(client, 10.7431, 121.9394, ['HOUSE_BUILDING']);
    assert.equal(found?.referenceNumber, 'HOUSE-A');
    assert.equal(found?.status, 'RESPONDING');
    assert.equal(await findOpenIncidentNear(client, 10.7431, 121.9394, ['GRASS']), null,
      'grass at the same location is a separate report');
    assert.equal(await findOpenIncidentNear(client, 10.7431, 121.9394, ['HOUSE_BUILDING', 'GRASS']), null,
      'a new selected fire type must not be swallowed by a house-only incident');

    await db.query(`update fire_reports set fire_type = 'GRASS', fire_types = array['GRASS', 'HOUSE_BUILDING']`);
    assert.equal((await findOpenIncidentNear(client, 10.7431, 121.9394, ['HOUSE_BUILDING', 'GRASS']))?.referenceNumber, 'HOUSE-A',
      'the same selections match regardless of order or primary severity type');
    assert.equal(await findOpenIncidentNear(client, 10.7431, 121.9394, ['HOUSE_BUILDING']), null);
  } finally {
    await db.close();
  }
});
