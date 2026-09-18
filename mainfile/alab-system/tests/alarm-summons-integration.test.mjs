import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { PGlite } from "@electric-sql/pglite";

const root = process.cwd();
const source = (path) => readFileSync(join(root, path), "utf8");

test("the first alarm is recorded by the dispatch, not by a person", () => {
  const dispatch = source("lib/municipal-bfp/dispatch.ts");

  // It belongs to the act of turning out, so it is written inside the dispatch
  // transaction rather than offered as a button the province has to press.
  assert.match(dispatch, /insert into incident_alarm_levels/);
  assert.match(dispatch, /select \$1, 1, \$2/);
  assert.match(dispatch, /where not exists \(/);
});

test("only the second through the fourth may be declared", () => {
  const route = source("app/api/provincial-bfp/backup-requests/route.ts");
  const escalation = source("lib/incidents/backup-escalation.ts");
  const dialog = source("app/_components/provincial-backup-alarm.tsx");
  const panel = source("app/_components/provincial-alarm-panel.tsx");

  assert.match(route, /isDeclarableAlarmLevel\(alarmLevel\)/);
  assert.match(route, /alarm level from 2 to 4/);
  assert.match(escalation, /isDeclarableAlarmLevel\(input\.alarmLevel\)/);

  // The fifth belonged to Region VI and the first is automatic, so neither is
  // on screen any more.
  for (const ui of [dialog, panel]) {
    assert.doesNotMatch(ui, /const ALARM_LEVELS = \[1, 2, 3, 4, 5\]/);
    assert.match(ui, /level: 2/);
    assert.match(ui, /level: 4/);
    assert.doesNotMatch(ui, /level: 5/);
  }
});

test("declaring a level asks the municipalities it reaches", () => {
  const escalation = source("lib/incidents/backup-escalation.ts");

  assert.match(escalation, /async function summonForAlarmLevel/);
  assert.match(escalation, /resolveAlarmSummons/);
  // Mutual aid is asked for, not commandeered: the summoned municipality still
  // accepts or declines through the ordinary assistance request.
  assert.match(escalation, /createAssistanceRequests/);
  assert.match(escalation, /allowProvincialReach: true/);
  assert.match(escalation, /incident_alarm_summons/);
});

test("a provincial alarm may reach past the two-neighbour limit a station has", () => {
  const assistance = source("lib/intermunicipality/assistance.ts");

  // The cap stops one station calling the province out on its own judgement.
  // A provincial alarm is a different authority, so it is named rather than
  // the cap being quietly removed for everyone.
  assert.match(assistance, /allowProvincialReach\?: boolean/);
  assert.match(assistance, /input\.allowProvincialReach === true \? 100 : 2/);
});

test("the summons record survives a station moving afterwards", async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      create table municipalities(id text primary key, name text);
      create table fire_reports(id text primary key);
      create table intermunicipal_assistance_requests(id text primary key);
      create table incident_alarm_summons(
        id serial primary key,
        fire_report_id text not null,
        alarm_level integer not null check (alarm_level between 1 and 4),
        summoned_municipality_id text,
        assistance_request_id text,
        distance_meters integer,
        created_at timestamptz not null default now(),
        unique (fire_report_id, summoned_municipality_id)
      );
      insert into municipalities values ('m-sanjose','San Jose'), ('m-sibalom','Sibalom');
      insert into fire_reports values ('fr-1');
    `);

    // A second alarm reaches San Jose.
    await db.query(
      `insert into incident_alarm_summons
         (fire_report_id, alarm_level, summoned_municipality_id, distance_meters)
       values ($1, 2, $2, $3)`,
      ["fr-1", "m-sanjose", 4200],
    );

    // The third alarm must not ask San Jose again, and the guard is the index
    // rather than a check the caller has to remember.
    await db.query(
      `insert into incident_alarm_summons
         (fire_report_id, alarm_level, summoned_municipality_id, distance_meters)
       values ($1, 3, $2, $3)
       on conflict (fire_report_id, summoned_municipality_id) do nothing`,
      ["fr-1", "m-sanjose", 4200],
    );

    const sanJose = await db.query(
      `select alarm_level, distance_meters from incident_alarm_summons
        where fire_report_id = 'fr-1' and summoned_municipality_id = 'm-sanjose'`,
    );
    assert.equal(sanJose.rows.length, 1, "nobody is summoned twice for one fire");
    assert.equal(sanJose.rows[0].alarm_level, 2, "the level that first called them stands");
    assert.equal(sanJose.rows[0].distance_meters, 4200, "the distance at the time is kept");

    // A municipality the third alarm newly reaches is recorded against it.
    await db.query(
      `insert into incident_alarm_summons
         (fire_report_id, alarm_level, summoned_municipality_id, distance_meters)
       values ($1, 3, $2, $3)
       on conflict (fire_report_id, summoned_municipality_id) do nothing`,
      ["fr-1", "m-sibalom", 18400],
    );

    const all = await db.query(
      `select summoned_municipality_id, alarm_level from incident_alarm_summons
        where fire_report_id = 'fr-1' order by alarm_level, summoned_municipality_id`,
    );
    assert.deepEqual(
      all.rows.map((row) => [row.summoned_municipality_id, row.alarm_level]),
      [["m-sanjose", 2], ["m-sibalom", 3]],
    );

    // The doctrine stops at four, and the table refuses anything higher.
    await assert.rejects(
      db.query(
        `insert into incident_alarm_summons (fire_report_id, alarm_level, summoned_municipality_id)
         values ('fr-1', 5, 'm-caluya')`,
      ),
      "a fifth alarm belongs to Region VI and is not recorded here",
    );
  } finally {
    await db.close();
  }
});
