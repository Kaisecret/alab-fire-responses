import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { PGlite } from "@electric-sql/pglite";

const root = process.cwd();
const source = (path) => readFileSync(join(root, path), "utf8");

test("the dispatch modal shows status instead of the picker once responding", () => {
  const detail = source("app/_components/municipal-incident-detail.tsx");

  // The defect: an already-dispatched incident still opened the selection UI,
  // so the button promised status and delivered a form.
  assert.match(detail, /isResponding \? \(\s*<DispatchStatusBoard/);
  assert.match(detail, /function DispatchStatusBoard/);
  assert.match(detail, /dispatch-status/);
  // The board reads the real per-responder stages.
  for (const stage of ["ASSIGNED", "ACKNOWLEDGED", "EN_ROUTE", "ON_SCENE"]) {
    assert.match(detail, new RegExp(stage));
  }
});

test("the status endpoint is scoped to the municipality that owns the incident", () => {
  const route = source("app/api/municipal-bfp/incidents/[id]/dispatch-status/route.ts");
  const service = source("lib/municipal-bfp/dispatch.ts");

  assert.match(route, /requireMunicipalAdmin/);
  assert.match(route, /getIncidentDispatchProgress/);
  // Scope is enforced in the query, not trusted from the caller.
  assert.match(service, /fr\.municipality_id = \$2/);
});

test("the progress query reports each responder's furthest stage", async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      create table fire_reports(id uuid primary key, municipality_id uuid);
      create table bfp_personnel_profiles(user_id uuid, display_name text);
      create table incident_dispatches(
        id uuid primary key,
        fire_report_id uuid,
        dispatched_by_user_id uuid,
        dispatched_at timestamptz,
        cancelled_at timestamptz
      );
      create table incident_dispatch_stations(
        id uuid primary key,
        dispatch_id uuid,
        station_name_snapshot text
      );
      create table incident_dispatch_recipients(
        id uuid primary key,
        dispatch_id uuid,
        dispatch_station_id uuid,
        recipient_name_snapshot text,
        status text,
        assigned_at timestamptz,
        acknowledged_at timestamptz,
        en_route_at timestamptz,
        on_scene_at timestamptz,
        completed_at timestamptz,
        arrival_method text,
        latest_location_at timestamptz
      );

      insert into fire_reports values
        ('aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001'),
        -- An incident belonging to a different municipality.
        ('aaaaaaaa-0000-0000-0000-000000000002', 'bbbbbbbb-0000-0000-0000-000000000002');
      insert into bfp_personnel_profiles values ('cccccccc-0000-0000-0000-000000000001', 'SFO1 Cruz');
      insert into incident_dispatches values
        ('dddddddd-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001',
         'cccccccc-0000-0000-0000-000000000001', now() - interval '12 minutes', null),
        -- A cancelled dispatch must never appear on the board.
        ('dddddddd-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001',
         'cccccccc-0000-0000-0000-000000000001', now() - interval '30 minutes', now());
      insert into incident_dispatch_stations values
        ('eeeeeeee-0000-0000-0000-000000000001', 'dddddddd-0000-0000-0000-000000000001', 'May Bato Station'),
        ('eeeeeeee-0000-0000-0000-000000000002', 'dddddddd-0000-0000-0000-000000000002', 'Old Station');
      insert into incident_dispatch_recipients values
        ('ffffffff-0000-0000-0000-000000000001', 'dddddddd-0000-0000-0000-000000000001',
         'eeeeeeee-0000-0000-0000-000000000001', 'FO2 Reyes', 'ON_SCENE',
         now() - interval '12 minutes', now() - interval '11 minutes',
         now() - interval '10 minutes', now() - interval '4 minutes', null, 'AUTO_GEOFENCE', now()),
        ('ffffffff-0000-0000-0000-000000000002', 'dddddddd-0000-0000-0000-000000000001',
         'eeeeeeee-0000-0000-0000-000000000001', 'FO1 Abad', 'ASSIGNED',
         now() - interval '12 minutes', null, null, null, null, null, null),
        ('ffffffff-0000-0000-0000-000000000003', 'dddddddd-0000-0000-0000-000000000002',
         'eeeeeeee-0000-0000-0000-000000000002', 'Cancelled Crew', 'ASSIGNED',
         now(), null, null, null, null, null, null);
    `);

    const dispatches = await db.query(
      `select d.id as "dispatchId", d.dispatched_at as "dispatchedAt",
              p.display_name as "dispatchedByName",
              coalesce(array_agg(distinct ds.station_name_snapshot)
                filter (where ds.station_name_snapshot is not null), '{}') as "stationNames"
         from incident_dispatches d
         join fire_reports fr on fr.id = d.fire_report_id
         left join incident_dispatch_stations ds on ds.dispatch_id = d.id
         left join bfp_personnel_profiles p on p.user_id = d.dispatched_by_user_id
        where d.fire_report_id = $1 and fr.municipality_id = $2 and d.cancelled_at is null
        group by d.id, d.dispatched_at, p.display_name`,
      ["aaaaaaaa-0000-0000-0000-000000000001", "bbbbbbbb-0000-0000-0000-000000000001"],
    );

    // The cancelled dispatch is excluded, so only the live one is on the board.
    assert.equal(dispatches.rows.length, 1);
    assert.equal(dispatches.rows[0].dispatchedByName, "SFO1 Cruz");
    assert.deepEqual(dispatches.rows[0].stationNames, ["May Bato Station"]);

    const responders = await db.query(
      `select r.recipient_name_snapshot as name, r.status, r.arrival_method as "arrivalMethod"
         from incident_dispatch_recipients r
         join incident_dispatch_stations ds on ds.id = r.dispatch_station_id
        where r.dispatch_id = any($1::uuid[])
        order by case r.status
          when 'ON_SCENE' then 1 when 'EN_ROUTE' then 2
          when 'ACKNOWLEDGED' then 3 when 'ASSIGNED' then 4 else 5 end,
          lower(r.recipient_name_snapshot) asc`,
      [dispatches.rows.map((row) => row.dispatchId)],
    );

    assert.equal(responders.rows.length, 2);
    // Furthest along is listed first: that is the one a commander looks for.
    assert.equal(responders.rows[0].name, "FO2 Reyes");
    assert.equal(responders.rows[0].status, "ON_SCENE");
    assert.equal(responders.rows[0].arrivalMethod, "AUTO_GEOFENCE");
    assert.equal(responders.rows[1].status, "ASSIGNED");

    // Another municipality's incident returns nothing at all.
    const foreign = await db.query(
      `select d.id from incident_dispatches d
         join fire_reports fr on fr.id = d.fire_report_id
        where d.fire_report_id = $1 and fr.municipality_id = $2 and d.cancelled_at is null`,
      ["aaaaaaaa-0000-0000-0000-000000000001", "bbbbbbbb-0000-0000-0000-000000000002"],
    );
    assert.equal(foreign.rows.length, 0);
  } finally {
    await db.close();
  }
});

test("an incident whose crews are committed does not ask to be acknowledged", () => {
  const detail = source("app/_components/municipal-incident-detail.tsx");

  /*
   * Testing for RESPONDING alone left every later stage offering "Acknowledge
   * & Respond": a fire whose responders had already reached the scene invited
   * the station to decide whether to send anyone, as though nobody had gone.
   */
  assert.match(
    detail,
    /\["RESPONDING", "FIRETRUCK_DISPATCHED", "RESPONDER_ARRIVED", "UNDER_CONTROL"\]/,
  );
  assert.doesNotMatch(detail, /const isResponding = incident\.status === "RESPONDING";/);

  // Those stages show the board instead, which is what the button then means.
  assert.match(detail, /isResponding \? \(\s*<DispatchStatusBoard/);
  assert.match(detail, /aria-label=\{isResponding \? "View active BFP dispatch status"/);
});
