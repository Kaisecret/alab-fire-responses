import assert from "node:assert/strict";
import test from "node:test";

import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { PGlite } from "@electric-sql/pglite";

/*
 * Exercises a declared alarm against the real constraints: the observer row an
 * assistance request hangs off, the unique indexes that stop a municipality
 * being asked twice, and the check constraints on each status. The unit tests
 * prove the doctrine picks the right municipalities; this proves the picking
 * survives contact with the schema.
 */

const SCHEMA = `
  create table municipalities(
    id uuid primary key default gen_random_uuid(),
    name text not null
  );
  create table users(id uuid primary key default gen_random_uuid());
  create table municipal_bfp_stations(
    id uuid primary key default gen_random_uuid(),
    municipality_id uuid not null references municipalities(id),
    station_name text not null,
    latitude numeric(9,6) not null,
    longitude numeric(9,6) not null,
    status text not null default 'ACTIVE'
  );
  create table fire_reports(
    id uuid primary key default gen_random_uuid(),
    municipality_id uuid not null references municipalities(id),
    reference_number text not null,
    status text not null default 'RESPONDING',
    latitude numeric(9,6),
    longitude numeric(9,6),
    barangay_id uuid
  );
  create table incident_dispatches(
    id uuid primary key default gen_random_uuid(),
    fire_report_id uuid not null references fire_reports(id),
    status text not null default 'ACTIVE',
    dispatched_at timestamptz not null default now()
  );
  create table incident_municipal_observers(
    -- No default, exactly as the real migration declares it: an insert that
    -- omits the id fails, which is the fault this suite missed once already.
    id uuid primary key,
    fire_report_id uuid not null references fire_reports(id),
    dispatch_id uuid not null references incident_dispatches(id),
    origin_municipality_id uuid not null references municipalities(id),
    observer_municipality_id uuid not null references municipalities(id),
    nearest_station_id uuid not null references municipal_bfp_stations(id),
    station_latitude_snapshot numeric(9,6) not null check (station_latitude_snapshot between 4 and 22),
    station_longitude_snapshot numeric(9,6) not null check (station_longitude_snapshot between 115 and 130),
    distance_meters numeric(12,2) not null check (distance_meters >= 0),
    status text not null check (status in ('ACTIVE','ENDED')),
    selected_at timestamptz not null,
    unique (dispatch_id, observer_municipality_id)
  );
  create table intermunicipal_assistance_requests(
    id uuid primary key,
    fire_report_id uuid not null references fire_reports(id),
    dispatch_id uuid not null references incident_dispatches(id),
    observer_id uuid not null references incident_municipal_observers(id),
    requester_municipality_id uuid not null references municipalities(id),
    recipient_municipality_id uuid not null references municipalities(id),
    status text not null check (
      status in ('REQUESTED','ACCEPTED','PARTIALLY_ACCEPTED','REJECTED','CANCELLED','COMPLETED')
    ),
    requested_at timestamptz not null default now()
  );
  create unique index assistance_one_open_idx
    on intermunicipal_assistance_requests (dispatch_id, recipient_municipality_id)
    where status in ('REQUESTED','ACCEPTED','PARTIALLY_ACCEPTED');
  create table incident_alarm_levels(
    id uuid primary key default gen_random_uuid(),
    fire_report_id uuid not null references fire_reports(id),
    alarm_level integer not null check (alarm_level between 1 and 5),
    declared_by_user_id uuid not null references users(id),
    note text,
    declared_at timestamptz not null default now()
  );
  create unique index alarm_levels_unique_idx
    on incident_alarm_levels (fire_report_id, alarm_level);
  create table incident_alarm_summons(
    id uuid primary key default gen_random_uuid(),
    fire_report_id uuid not null references fire_reports(id),
    alarm_level integer not null check (alarm_level between 1 and 4),
    summoned_municipality_id uuid references municipalities(id),
    assistance_request_id uuid references intermunicipal_assistance_requests(id),
    distance_meters integer,
    created_at timestamptz not null default now(),
    unique (fire_report_id, summoned_municipality_id)
  );
`;

async function seed(db) {
  await db.exec(SCHEMA);
  const ids = {};

  const towns = [
    ["hamtic", "Hamtic", 10.7000, 121.9700],
    ["sanjose", "San Jose de Buenavista", 10.7500, 121.9400],
    ["sibalom", "Sibalom", 10.7920, 122.0100],
    ["tobias", "Tobias Fornier", 10.5200, 121.9300],
    ["caluya", "Caluya", 11.9400, 121.4700],
  ];

  for (const [key, name, lat, lon] of towns) {
    const m = await db.query(`insert into municipalities(name) values ($1) returning id`, [name]);
    ids[key] = m.rows[0].id;
    const s = await db.query(
      `insert into municipal_bfp_stations(municipality_id, station_name, latitude, longitude)
       values ($1,$2,$3,$4) returning id`,
      [ids[key], `${name} Station`, lat, lon],
    );
    ids[`${key}Station`] = s.rows[0].id;
  }

  const u = await db.query(`insert into users default values returning id`);
  ids.user = u.rows[0].id;

  // A fire in northern Hamtic, close to the San Jose line.
  const fr = await db.query(
    `insert into fire_reports(municipality_id, reference_number, latitude, longitude)
     values ($1,'ALAB-TEST-0001',10.7200,121.9500) returning id`,
    [ids.hamtic],
  );
  ids.fireReport = fr.rows[0].id;

  const d = await db.query(
    `insert into incident_dispatches(fire_report_id) values ($1) returning id`,
    [ids.fireReport],
  );
  ids.dispatch = d.rows[0].id;

  return ids;
}

/** Mirrors what summonForAlarmLevel does, against the real constraints. */
async function summon(db, ids, level, candidates) {
  const already = await db.query(
    `select summoned_municipality_id as id from incident_alarm_summons
      where fire_report_id = $1 and summoned_municipality_id is not null`,
    [ids.fireReport],
  );
  const seen = new Set(already.rows.map((row) => row.id));
  const fresh = candidates.filter((candidate) => !seen.has(candidate.municipalityId));
  if (fresh.length === 0) return [];

  for (const candidate of fresh) {
    await db.query(
      `insert into incident_municipal_observers (
         id, fire_report_id, dispatch_id, origin_municipality_id, observer_municipality_id,
         nearest_station_id, station_latitude_snapshot, station_longitude_snapshot,
         distance_meters, status, selected_at
       ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,'ACTIVE',now())
       on conflict (dispatch_id, observer_municipality_id) do nothing`,
      [
        randomUUID(), ids.fireReport, ids.dispatch, ids.hamtic, candidate.municipalityId,
        candidate.stationId, candidate.latitude, candidate.longitude, candidate.distanceMeters,
      ],
    );
  }

  const created = [];
  for (const candidate of fresh) {
    const observer = await db.query(
      `select id from incident_municipal_observers
        where dispatch_id = $1 and observer_municipality_id = $2`,
      [ids.dispatch, candidate.municipalityId],
    );
    const request = await db.query(
      `insert into intermunicipal_assistance_requests
         (id, fire_report_id, dispatch_id, observer_id, requester_municipality_id,
          recipient_municipality_id, status)
       values ($1,$2,$3,$4,$5,$6,'REQUESTED')
       on conflict (dispatch_id, recipient_municipality_id)
         where status in ('REQUESTED','ACCEPTED','PARTIALLY_ACCEPTED')
         do nothing
       returning id`,
      [randomUUID(), ids.fireReport, ids.dispatch, observer.rows[0].id, ids.hamtic, candidate.municipalityId],
    );
    await db.query(
      `insert into incident_alarm_summons
         (fire_report_id, alarm_level, summoned_municipality_id, assistance_request_id, distance_meters)
       values ($1,$2,$3,$4,$5)
       on conflict (fire_report_id, summoned_municipality_id) do nothing`,
      [
        ids.fireReport, level, candidate.municipalityId,
        request.rows[0]?.id ?? null, Math.round(candidate.distanceMeters),
      ],
    );
    created.push(candidate.municipalityId);
  }
  return created;
}

test("a wider alarm enrols the municipalities it reaches as observers", async () => {
  const db = new PGlite();
  try {
    const ids = await seed(db);

    // Only the two nearest are observers when the incident is first dispatched,
    // which is what the wider alarms used to founder on.
    for (const key of ["sanjose", "sibalom"]) {
      await db.query(
        `insert into incident_municipal_observers (
           id, fire_report_id, dispatch_id, origin_municipality_id, observer_municipality_id,
           nearest_station_id, station_latitude_snapshot, station_longitude_snapshot,
           distance_meters, status, selected_at
         ) values ($1,$2,$3,$4,$5,$6,10.75,121.94,5000,'ACTIVE',now())`,
        [randomUUID(), ids.fireReport, ids.dispatch, ids.hamtic, ids[key], ids[`${key}Station`]],
      );
    }

    // A fourth alarm reaches municipalities that were never observers.
    const created = await summon(db, ids, 4, [
      { municipalityId: ids.tobias, stationId: ids.tobiasStation, latitude: 10.52, longitude: 121.93, distanceMeters: 22000 },
      { municipalityId: ids.caluya, stationId: ids.caluyaStation, latitude: 11.94, longitude: 121.47, distanceMeters: 140000 },
    ]);

    assert.equal(created.length, 2, "both distant municipalities were called");

    const observers = await db.query(
      `select count(*)::int as count from incident_municipal_observers where dispatch_id = $1`,
      [ids.dispatch],
    );
    assert.equal(observers.rows[0].count, 4, "the distant ones became observers so they could be asked");

    const requests = await db.query(
      `select count(*)::int as count from intermunicipal_assistance_requests where dispatch_id = $1`,
      [ids.dispatch],
    );
    assert.equal(requests.rows[0].count, 2, "each was sent an assistance request it may decline");
  } finally {
    await db.close();
  }
});

test("raising the alarm does not ask the same municipality twice", async () => {
  const db = new PGlite();
  try {
    const ids = await seed(db);

    const second = await summon(db, ids, 2, [
      { municipalityId: ids.sanjose, stationId: ids.sanjoseStation, latitude: 10.75, longitude: 121.94, distanceMeters: 4200 },
    ]);
    assert.deepEqual(second, [ids.sanjose]);

    // The third alarm covers San Jose again plus Sibalom; only Sibalom is new.
    const third = await summon(db, ids, 3, [
      { municipalityId: ids.sanjose, stationId: ids.sanjoseStation, latitude: 10.75, longitude: 121.94, distanceMeters: 4200 },
      { municipalityId: ids.sibalom, stationId: ids.sibalomStation, latitude: 10.792, longitude: 122.01, distanceMeters: 9600 },
    ]);
    assert.deepEqual(third, [ids.sibalom], "only the newly reached municipality is called");

    const summons = await db.query(
      `select summoned_municipality_id as id, alarm_level from incident_alarm_summons
        where fire_report_id = $1 order by alarm_level`,
      [ids.fireReport],
    );
    assert.equal(summons.rows.length, 2);
    assert.equal(summons.rows[0].alarm_level, 2, "San Jose stays recorded against the level that called it");

    const requests = await db.query(
      `select count(*)::int as count from intermunicipal_assistance_requests where dispatch_id = $1`,
      [ids.dispatch],
    );
    assert.equal(requests.rows[0].count, 2, "one request each, never a duplicate");
  } finally {
    await db.close();
  }
});

test("a declared level is recorded once and cannot be re-declared", async () => {
  const db = new PGlite();
  try {
    const ids = await seed(db);

    await db.query(
      `insert into incident_alarm_levels (fire_report_id, alarm_level, declared_by_user_id)
       values ($1, 2, $2)`,
      [ids.fireReport, ids.user],
    );

    await assert.rejects(
      db.query(
        `insert into incident_alarm_levels (fire_report_id, alarm_level, declared_by_user_id)
         values ($1, 2, $2)`,
        [ids.fireReport, ids.user],
      ),
      "the same level cannot be declared twice for one fire",
    );
  } finally {
    await db.close();
  }
});

test("the automatic first alarm is written once however often a dispatch repeats", async () => {
  const db = new PGlite();
  try {
    const ids = await seed(db);

    const writeFirst = () => db.query(
      `insert into incident_alarm_levels (fire_report_id, alarm_level, declared_by_user_id, note)
       select $1, 1, $2, 'Raised automatically when the municipality dispatched.'
        where not exists (
          select 1 from incident_alarm_levels
           where fire_report_id = $1 and alarm_level = 1
        )`,
      [ids.fireReport, ids.user],
    );

    await writeFirst();
    // A second dispatch to the same incident must not collide with the index.
    await writeFirst();

    const levels = await db.query(
      `select count(*)::int as count from incident_alarm_levels
        where fire_report_id = $1 and alarm_level = 1`,
      [ids.fireReport],
    );
    assert.equal(levels.rows[0].count, 1);
  } finally {
    await db.close();
  }
});

test("an alarm asks for something, since a request for nothing is refused", () => {
  const escalation = readFileSync(
    join(process.cwd(), "lib/incidents/backup-escalation.ts"),
    "utf8",
  );

  // validateRequestedResources throws ASSISTANCE_RESOURCES_REQUIRED when both
  // counts are zero, which would have failed every declaration.
  assert.match(escalation, /requestedFiretrucks: 1/);
  assert.doesNotMatch(escalation, /requestedFiretrucks: 0,\s*requestedPersonnel: 0,/);
});

test("a level that could not summon anyone is given back", () => {
  const escalation = readFileSync(
    join(process.cwd(), "lib/incidents/backup-escalation.ts"),
    "utf8",
  );

  // A level is unique per incident, so one left behind by a failed summons
  // could never be declared again: the alarm would be stuck having called
  // nobody.
  assert.match(escalation, /delete from public\.incident_alarm_levels/);
  assert.match(escalation, /where fire_report_id = \$1 and alarm_level = \$2/);
});

test("the province is told why a summons failed, not just that it did", () => {
  const escalation = readFileSync(
    join(process.cwd(), "lib/incidents/backup-escalation.ts"),
    "utf8",
  );
  const route = readFileSync(
    join(process.cwd(), "app/api/provincial-bfp/backup-requests/route.ts"),
    "utf8",
  );

  assert.match(escalation, /ALARM_NEEDS_DISPATCH/);
  assert.match(escalation, /ALARM_INCIDENT_CLOSED/);
  assert.match(route, /No station has been dispatched to this incident yet/);
  assert.match(route, /That incident is already closed/);
});

test("the summons enrols observers before asking for aid", () => {
  const escalation = readFileSync(
    join(process.cwd(), "lib/incidents/backup-escalation.ts"),
    "utf8",
  );

  // An assistance request hangs off an observer row, and only the two nearest
  // are enrolled at dispatch, so a wider alarm was refused outright.
  assert.match(escalation, /insert into public\.incident_municipal_observers/);
  assert.match(escalation, /on conflict \(dispatch_id, observer_municipality_id\) do nothing/);
});

test("the test schema matches the migration it stands in for", () => {
  const migration = readFileSync(
    join(process.cwd(), "supabase/migrations/20260907090000_add_intermunicipality_coordination.sql"),
    "utf8",
  );

  /*
   * This suite once declared these tables with a generated primary key while
   * the real ones have none, so an insert that omitted the id passed here and
   * failed in production. Whatever the migration says about defaults, the
   * fixture has to say too.
   */
  const observerTable = migration.slice(
    migration.indexOf("create table if not exists public.incident_municipal_observers"),
  );
  assert.match(observerTable.slice(0, 120), /id uuid primary key,/);
  assert.doesNotMatch(
    SCHEMA.slice(SCHEMA.indexOf("create table incident_municipal_observers"), SCHEMA.indexOf("create table intermunicipal_assistance_requests")),
    /id uuid primary key default/,
  );

  // ...and the service supplies one rather than trusting the database to.
  const escalation = readFileSync(join(process.cwd(), "lib/incidents/backup-escalation.ts"), "utf8");
  assert.match(escalation, /import \{ randomUUID \} from "node:crypto"/);
  assert.match(escalation, /randomUUID\(\),\s*\n\s*input\.fireReportId,/);
});
