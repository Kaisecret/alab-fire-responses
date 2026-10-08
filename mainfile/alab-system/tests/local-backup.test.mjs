import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { loadServerModule } from "./helpers/load-server-module.mjs";
import * as options from "../lib/municipal-bfp/local-backup-options.ts";

const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const SAN_JOSE = id(1), HAMTIC = id(2);
const MAIN = id(10), DALIPE = id(11), SAN_ANGEL = id(12), HAMTIC_FS = id(13);
const ADMIN = id(20), AT_SAN_ANGEL = id(21), AT_DALIPE = id(22), AT_MAIN = id(23), AT_HAMTIC = id(24);
const FIRE = id(30), DISPATCH = id(31), HAMTIC_FIRE = id(32), HAMTIC_DISPATCH = id(33);

async function fixture() {
  const db = new PGlite();
  await db.exec(`create role anon; create role authenticated;
    create table users(id uuid primary key, role text, account_status text);
    create table municipalities(id uuid primary key, name text);
    create table barangays(id uuid primary key, name text);
    create table bfp_personnel_profiles(id uuid primary key, user_id uuid, display_name text);
    create table bfp_municipality_assignments(personnel_profile_id uuid, municipality_id uuid, status text);
    create table municipal_bfp_stations(id uuid primary key, municipality_id uuid, station_name text, latitude numeric, longitude numeric, status text);
    create table bfp_station_assignments(personnel_profile_id uuid, station_id uuid, status text);
    create table fire_reports(id uuid primary key, reference_number text, barangay_id uuid, latitude numeric, longitude numeric,
      status text, updated_at timestamptz);
    create table fire_report_status_history(fire_report_id uuid, previous_status text, next_status text, actor_user_id uuid,
      resident_message text, created_at timestamptz);
    create table incident_dispatches(id uuid primary key, fire_report_id uuid references fire_reports(id), status text);
    create table incident_dispatch_stations(id uuid primary key, dispatch_id uuid, station_id uuid, station_name_snapshot text,
      station_latitude_snapshot numeric, station_longitude_snapshot numeric, created_at timestamptz, unique(dispatch_id, station_id));
    create table incident_dispatch_recipients(id uuid primary key, dispatch_id uuid, dispatch_station_id uuid, recipient_user_id uuid,
      recipient_name_snapshot text, status text, assigned_at timestamptz, created_at timestamptz, updated_at timestamptz,
      unique(dispatch_id, recipient_user_id));
    create table account_notifications(event_type text);

    insert into municipalities values ('${SAN_JOSE}','San Jose de Buenavista'),('${HAMTIC}','Hamtic');
    insert into municipal_bfp_stations values
      ('${MAIN}','${SAN_JOSE}','San Jose Fire Station · Head: FSINSP Macario I Montaña Jr',10.7431,121.9394,'ACTIVE'),
      ('${DALIPE}','${SAN_JOSE}','Dalipe Fire Sub-Station · Head: SFO3 Edgardo P. Villareal',10.756,121.9355,'ACTIVE'),
      ('${SAN_ANGEL}','${SAN_JOSE}','San Angel Fire Sub-Station',10.7388,121.9503,'ACTIVE'),
      ('${HAMTIC_FS}','${HAMTIC}','Hamtic Fire Station',10.6969,121.9803,'ACTIVE');
    insert into users select x, 'MUNICIPAL_BFP', 'ACTIVE' from unnest(array['${ADMIN}','${AT_SAN_ANGEL}','${AT_DALIPE}','${AT_MAIN}','${AT_HAMTIC}']::uuid[]) x;
    insert into bfp_personnel_profiles values ('${ADMIN}','${ADMIN}','FSINSP Macario I Montaña Jr'),
      ('${AT_SAN_ANGEL}','${AT_SAN_ANGEL}','SFO2 Dennis O. Pascual'),('${AT_DALIPE}','${AT_DALIPE}','SFO2 Noel A. Pacheco'),
      ('${AT_MAIN}','${AT_MAIN}','SFO2 Jessa Mae R. Castillo'),('${AT_HAMTIC}','${AT_HAMTIC}','SFO2 Jerome P. Bautista');
    insert into bfp_municipality_assignments values ('${ADMIN}','${SAN_JOSE}','ACTIVE'),('${AT_SAN_ANGEL}','${SAN_JOSE}','ACTIVE'),
      ('${AT_DALIPE}','${SAN_JOSE}','ACTIVE'),('${AT_MAIN}','${SAN_JOSE}','ACTIVE'),('${AT_HAMTIC}','${HAMTIC}','ACTIVE');
    insert into bfp_station_assignments values ('${AT_SAN_ANGEL}','${SAN_ANGEL}','ACTIVE'),('${AT_DALIPE}','${DALIPE}','ACTIVE'),
      ('${AT_MAIN}','${MAIN}','ACTIVE'),('${AT_HAMTIC}','${HAMTIC_FS}','ACTIVE');

    insert into fire_reports values ('${FIRE}','ALAB-1',null,10.765727,121.930322,'RESPONDING',now()),
      ('${HAMTIC_FIRE}','ALAB-2',null,10.70,121.98,'RESPONDING',now());
    insert into incident_dispatches values ('${DISPATCH}','${FIRE}','ACTIVE'),('${HAMTIC_DISPATCH}','${HAMTIC_FIRE}','ACTIVE');
    insert into incident_dispatch_stations values (gen_random_uuid(),'${DISPATCH}','${SAN_ANGEL}','San Angel Fire Sub-Station',10.7388,121.9503,now()),
      (gen_random_uuid(),'${HAMTIC_DISPATCH}','${HAMTIC_FS}','Hamtic Fire Station',10.6969,121.9803,now());
    insert into incident_dispatch_recipients values
      (gen_random_uuid(),'${DISPATCH}',null,'${AT_SAN_ANGEL}','SFO2 Dennis O. Pascual','EN_ROUTE',now(),now(),now()),
      (gen_random_uuid(),'${HAMTIC_DISPATCH}',null,'${AT_HAMTIC}','SFO2 Jerome P. Bautista','EN_ROUTE',now(),now(),now());`);
  await db.exec(readFileSync("supabase/migrations/20261009090000_add_local_backup_requests.sql", "utf8"));

  const notifications = [], pushes = [];
  const local = loadServerModule("lib/municipal-bfp/local-backup.ts", {
    "../db": { getDatabase: () => db, withTransaction: (work) => db.transaction((tx) => work(tx)) },
    "../notifications/fcm": { sendDispatchPush: async (input) => pushes.push(input) },
    "../notifications/service": {
      createAccountNotifications: async (_client, input) => notifications.push(input),
      listMunicipalNotificationRecipients: async (_client, municipalityId) =>
        municipalityId === SAN_JOSE ? [ADMIN, AT_SAN_ANGEL, AT_DALIPE, AT_MAIN] : [AT_HAMTIC],
    },
    "./local-backup-options": options,
  });
  return { db, local, notifications, pushes };
}

test("a San Angel responder is offered the other San Jose stations, nearest first", async () => {
  const { local } = await fixture();
  const offer = await local.getLocalBackupOptions(AT_SAN_ANGEL, DISPATCH);
  assert.equal(offer.eligible, true);
  assert.equal(offer.municipalityName, "San Jose de Buenavista");
  assert.deepEqual(offer.stations.map((s) => [s.id, s.status, s.recommended]), [
    [DALIPE, "AVAILABLE", true], [MAIN, "AVAILABLE", false], [SAN_ANGEL, "ON_THIS_FIRE", false],
  ]);
  assert.equal(offer.request, null);
});

test("a one-station town is never offered local backup", async () => {
  const { local } = await fixture();
  const offer = await local.getLocalBackupOptions(AT_HAMTIC, HAMTIC_DISPATCH);
  assert.equal(offer.eligible, false);
  await assert.rejects(local.requestLocalBackup({ userId: AT_HAMTIC, dispatchId: HAMTIC_DISPATCH, stationIds: [HAMTIC_FS] }),
    /LOCAL_BACKUP_NOT_AVAILABLE/);
});

test("only a responder on the response can ask, and only for a free local station", async () => {
  const { local } = await fixture();
  await assert.rejects(local.getLocalBackupOptions(AT_DALIPE, DISPATCH), /DISPATCH_NOT_FOUND/);
  await assert.rejects(local.requestLocalBackup({ userId: AT_SAN_ANGEL, dispatchId: DISPATCH, stationIds: [SAN_ANGEL] }),
    /INVALID_STATION_SELECTION/);
  await assert.rejects(local.requestLocalBackup({ userId: AT_SAN_ANGEL, dispatchId: DISPATCH, stationIds: [HAMTIC_FS] }),
    /INVALID_STATION_SELECTION/);
  await assert.rejects(local.requestLocalBackup({ userId: AT_SAN_ANGEL, dispatchId: DISPATCH, stationIds: [] }),
    /INVALID_STATION_SELECTION/);
});

test("the request reaches the town's officers and a second one waits on it", async () => {
  const { local, notifications } = await fixture();
  const request = await local.requestLocalBackup({ userId: AT_SAN_ANGEL, dispatchId: DISPATCH, stationIds: [DALIPE], reason: "Fire spreading" });
  assert.equal(request.status, "PENDING");
  assert.deepEqual(request.requestedStationIds, [DALIPE]);
  const alert = notifications.find((n) => n.eventType === "LOCAL_BACKUP_REQUESTED");
  assert.ok(alert && !alert.recipientUserIds.includes(AT_SAN_ANGEL) && alert.recipientUserIds.includes(ADMIN));
  assert.match(alert.summary, /Dalipe Fire Sub-Station/);

  await assert.rejects(local.requestLocalBackup({ userId: AT_SAN_ANGEL, dispatchId: DISPATCH, stationIds: [MAIN] }),
    /LOCAL_BACKUP_ALREADY_REQUESTED/);

  const open = await local.listMunicipalLocalBackupRequests(SAN_JOSE);
  assert.equal(open.length, 1);
  assert.equal(open[0].reason, "Fire spreading");
  assert.equal(open[0].stations.find((s) => s.recommended).id, DALIPE);
  assert.deepEqual(await local.listMunicipalLocalBackupRequests(HAMTIC), []);
});

test("sending puts the station and its crew on the same response, and nothing else changes", async () => {
  const { db, local, notifications, pushes } = await fixture();
  const request = await local.requestLocalBackup({ userId: AT_SAN_ANGEL, dispatchId: DISPATCH, stationIds: [DALIPE] });
  await assert.rejects(local.sendLocalBackup({ actorUserId: AT_HAMTIC, municipalityId: HAMTIC, requestId: request.id, stationIds: [DALIPE] }),
    /LOCAL_BACKUP_NOT_FOUND/);

  const sent = await local.sendLocalBackup({ actorUserId: ADMIN, municipalityId: SAN_JOSE, requestId: request.id, stationIds: [DALIPE] });
  assert.deepEqual(sent.recipientUserIds, [AT_DALIPE]);
  assert.deepEqual(sent.stationNames, ["Dalipe Fire Sub-Station"]);

  const stations = await db.query(`select station_id from incident_dispatch_stations where dispatch_id = $1 order by station_id`, [DISPATCH]);
  assert.deepEqual(stations.rows.map((r) => r.station_id), [DALIPE, SAN_ANGEL]);
  const crew = await db.query(`select recipient_user_id, status from incident_dispatch_recipients where dispatch_id = $1 order by recipient_user_id`, [DISPATCH]);
  assert.deepEqual(crew.rows, [{ recipient_user_id: AT_SAN_ANGEL, status: "EN_ROUTE" }, { recipient_user_id: AT_DALIPE, status: "ASSIGNED" }]
    .sort((a, b) => a.recipient_user_id.localeCompare(b.recipient_user_id)));
  const report = await db.query(`select status from fire_reports where id = $1`, [FIRE]);
  assert.equal(report.rows[0].status, "RESPONDING");
  const history = await db.query(`select previous_status, next_status, resident_message from fire_report_status_history`);
  assert.deepEqual(history.rows, [{ previous_status: "RESPONDING", next_status: "RESPONDING",
    resident_message: "Local backup: San Jose de Buenavista has assigned Dalipe Fire Sub-Station." }]);

  assert.deepEqual(pushes.map((p) => p.recipientUserIds), [[AT_DALIPE]]);
  assert.ok(notifications.some((n) => n.eventType === "INCIDENT_DISPATCH_ASSIGNED" && n.dedupeKey === `incident-dispatch:${DISPATCH}:assigned`));
  assert.ok(notifications.some((n) => n.eventType === "LOCAL_BACKUP_SENT" && n.recipientUserIds[0] === AT_SAN_ANGEL));

  const after = await local.getLocalBackupOptions(AT_SAN_ANGEL, DISPATCH);
  assert.equal(after.request.status, "SENT");
  assert.deepEqual(after.request.sentStationNames, ["Dalipe Fire Sub-Station"]);
  assert.equal(after.stations.find((s) => s.id === DALIPE).status, "ON_THIS_FIRE");
  assert.equal(after.eligible, true, "the main station is still free");
  await assert.rejects(local.sendLocalBackup({ actorUserId: ADMIN, municipalityId: SAN_JOSE, requestId: request.id, stationIds: [MAIN] }),
    /LOCAL_BACKUP_NOT_FOUND/);
});

test("a declined request tells the responder, who can ask again", async () => {
  const { local, notifications } = await fixture();
  const request = await local.requestLocalBackup({ userId: AT_SAN_ANGEL, dispatchId: DISPATCH, stationIds: [MAIN] });
  await local.declineLocalBackup({ actorUserId: ADMIN, municipalityId: SAN_JOSE, requestId: request.id });
  assert.ok(notifications.some((n) => n.eventType === "LOCAL_BACKUP_DECLINED" && n.recipientUserIds[0] === AT_SAN_ANGEL));
  assert.equal((await local.getLocalBackupOptions(AT_SAN_ANGEL, DISPATCH)).request.status, "DECLINED");
  assert.deepEqual(await local.listMunicipalLocalBackupRequests(SAN_JOSE), []);
  const again = await local.requestLocalBackup({ userId: AT_SAN_ANGEL, dispatchId: DISPATCH, stationIds: [DALIPE] });
  assert.equal(again.status, "PENDING");
});

test("a response that has ended cannot be reinforced", async () => {
  const { db, local } = await fixture();
  const request = await local.requestLocalBackup({ userId: AT_SAN_ANGEL, dispatchId: DISPATCH, stationIds: [DALIPE] });
  await db.query(`update incident_dispatches set status = 'COMPLETED' where id = $1`, [DISPATCH]);
  await assert.rejects(local.sendLocalBackup({ actorUserId: ADMIN, municipalityId: SAN_JOSE, requestId: request.id, stationIds: [DALIPE] }),
    /DISPATCH_ENDED/);
  assert.deepEqual(await local.listMunicipalLocalBackupRequests(SAN_JOSE), []);
});

test("local backup leaves alarms, observers, assistance and province backup alone", () => {
  const source = readFileSync("lib/municipal-bfp/local-backup.ts", "utf8");
  for (const table of ["incident_alarm_levels", "incident_alarm_summons", "incident_municipal_observers",
    "intermunicipal_assistance_requests", "incident_backup_requests", "provincial"]) {
    assert.doesNotMatch(source, new RegExp(table), `${table} is not touched`);
  }
});
