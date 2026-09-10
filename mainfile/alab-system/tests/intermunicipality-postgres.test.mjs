import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { loadServerModule } from './helpers/load-server-module.mjs';
import * as state from '../lib/intermunicipality/assistance-state.ts';

// Run the actual table DDL and production read queries against isolated PostgreSQL.
// This never connects to DATABASE_URL or writes to a deployed database.
const readMigration = name => readFileSync(`supabase/migrations/${name}.sql`, 'utf8');
const origin = '11111111-1111-4111-8111-111111111111';
const recipient = '22222222-2222-4222-8222-222222222222';
const user = '33333333-3333-4333-8333-333333333333';
const report = '44444444-4444-4444-8444-444444444444';
const dispatch = '55555555-5555-4555-8555-555555555555';
const observer = '66666666-6666-4666-8666-666666666666';
const station = '77777777-7777-4777-8777-777777777777';

async function database() {
  const db = new PGlite();
  await db.exec("set timezone = 'UTC'");
  await db.exec(readMigration('20260811125353_create_alab_resident_schema').replace('create extension if not exists pgcrypto;', ''));
  const createTables = (name, tables) => {
    const migration = readMigration(name);
    return tables.map(table => {
      const ddl = migration.match(new RegExp(`create table (?:if not exists )?public\\.${table} \\([\\s\\S]*?\\n\\);`));
      assert.ok(ddl, `Migration must define ${table}`);
      return ddl[0];
    }).join('\n');
  };
  await db.exec(createTables('20260814083624_add_bfp_account_provisioning', ['bfp_personnel_profiles']));
  await db.exec(createTables('20260816090000_add_resident_bfp_response_workflow', ['municipal_bfp_stations']));
  await db.exec(createTables('20260830090000_add_station_team_mobile_dispatch', ['incident_dispatches', 'incident_dispatch_stations', 'incident_dispatch_recipients']));
  await db.exec(`create role anon; create role authenticated;
    create table account_notifications (event_type text);
    alter table fire_reports add column calculated_severity text;
    alter table fire_reports drop constraint fire_reports_status_check;
    insert into municipalities(id, name) values ('${origin}', 'Origin'), ('${recipient}', 'Recipient');
    insert into users(id, email, username, password_hash, phone, terms_accepted_at)
      values ('${user}', 'officer@example.test', 'officer', 'test', '09123456789', now());
    insert into resident_profiles(id,user_id,first_name,last_name) values ('${user}','${user}','Test','Resident');
    insert into fire_reports(id,reference_number,resident_profile_id,reporter_name_snapshot,reporter_phone_snapshot,
      fire_type,description,status,latitude,longitude,location_method,is_within_antique,municipality_id)
      values ('${report}','TEST','${user}','Private Name','09123456789','HOUSE_BUILDING','Private note','RESPONDING',10.7,122,'GPS',true,'${origin}');
    insert into municipal_bfp_stations(id,municipality_id,station_name,latitude,longitude)
      values ('${station}','${recipient}','Test station',10.71,122);
    insert into incident_dispatches(id,fire_report_id,municipality_id,dispatched_by_user_id)
      values ('${dispatch}','${report}','${origin}','${user}');`);
  await db.exec(readMigration('20260907090000_add_intermunicipality_coordination'));
  await db.exec(readMigration('20260910121800_harden_intermunicipality_coordination'));
  await db.exec(`insert into incident_municipal_observers(id,fire_report_id,dispatch_id,origin_municipality_id,
    observer_municipality_id,nearest_station_id,station_latitude_snapshot,station_longitude_snapshot,distance_meters,status,selected_at)
    values ('${observer}','${report}','${dispatch}','${origin}','${recipient}','${station}',10.71,122,1110,'ACTIVE',now());
    insert into intermunicipal_assistance_requests(id,fire_report_id,dispatch_id,observer_id,requester_municipality_id,
    recipient_municipality_id,requested_by_user_id,requested_firetrucks,requested_personnel,status,requested_at,updated_at,
    offered_firetrucks,offered_personnel,responded_by_user_id,responded_at,completed_at)
    values ('${observer}','${report}','${dispatch}','${observer}','${origin}','${recipient}','${user}',1,4,'COMPLETED',
    '2026-09-01','2026-09-03',1,4,'${user}','2026-09-02','2026-09-03');`);
  return db;
}

test('provincial list and detail execute against coordination migration schema', async () => {
  const db = await database();
  try {
    const api = loadServerModule('lib/intermunicipality/provincial.ts', { '../db': { getDatabase: () => db } });
    const items = await api.listProvincialCoordinationIncidents(false);
    assert.equal(items.length, 1);
    assert.equal(items[0].observers[0].stationName, 'Test station');
    const detail = await api.getProvincialCoordinationIncident(report);
    assert.equal(detail.id, report);
    assert.equal(detail.assistanceRequests[0].completedAt, '2026-09-03T00:00:00.000Z');
    const requests = await api.listProvincialAssistanceRequests(true);
    assert.equal(requests[0].completedAt, '2026-09-03T00:00:00.000Z');
  } finally { await db.close(); }
});

test('database rejects null accepted offers and mismatched observer request scope', async () => {
  const db = await database();
  try {
    // Both migrations must also be safe to replay against existing rows.
    await db.exec(readMigration('20260907090000_add_intermunicipality_coordination'));
    await db.exec(readMigration('20260910121800_harden_intermunicipality_coordination'));
    await assert.rejects(db.query(`update intermunicipal_assistance_requests
      set offered_firetrucks = null where id = $1`, [observer]), error => error.code === '23514');
    await assert.rejects(db.query(`update intermunicipal_assistance_requests
      set requester_municipality_id = $1, recipient_municipality_id = $2 where id = $3`,
      [recipient, origin, observer]), error => error.code === '23503');
    await assert.rejects(db.query(`update incident_municipal_observers
      set distance_meters = 999 where id = $1`, [observer]), /immutable/);
  } finally { await db.close(); }
});

test('cancellation service commits once with real constraints and immutable audit records', async () => {
  const db = await database();
  try {
    await db.exec(`update intermunicipal_assistance_requests set status = 'REQUESTED', offered_firetrucks = null,
      offered_personnel = null, responded_by_user_id = null, responded_at = null, completed_at = null;`);
    const notifications = [];
    const api = loadServerModule('lib/intermunicipality/assistance.ts', {
      '../db': { withTransaction: work => db.transaction(work) },
      './assistance-state': state,
      './audit': loadServerModule('lib/intermunicipality/audit.ts', {}),
      '../notifications/service': {
        listMunicipalNotificationRecipients: async (_client, municipality) => [municipality],
        listProvincialNotificationRecipients: async () => ['province'],
        createAccountNotifications: async (_client, payload) => notifications.push(payload),
      },
    });
    const input = { requestId: observer, actorMunicipalityId: origin, actorUserId: user,
      action: 'CANCEL', offeredFiretrucks: 0, offeredPersonnel: 0 };
    assert.equal((await api.transitionAssistanceRequest(input)).status, 'CANCELLED');
    assert.equal((await api.transitionAssistanceRequest(input)).status, 'CANCELLED');
    assert.equal(notifications.length, 2, 'retry must not create another set of notifications');
    const events = await db.query('select * from intermunicipal_coordination_events');
    assert.equal(events.rows.length, 1);
    assert.equal(events.rows[0].event_type, 'ASSISTANCE_CANCELLED');
    await assert.rejects(db.exec('delete from intermunicipal_coordination_events'), /immutable/);
    const grants = await db.query(`select has_table_privilege('anon', 'incident_municipal_observers', 'SELECT') as readable`);
    assert.equal(grants.rows[0].readable, false);
  } finally { await db.close(); }
});
