import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import test, { after } from 'node:test';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const accountA = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const accountB = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const profileA = '11111111-1111-4111-8111-111111111111';
const profileB = '22222222-2222-4222-8222-222222222222';
const reportId = '33333333-3333-4333-8333-333333333333';
const deviceId = '44444444-4444-4444-8444-444444444444';
const otherDevice = '55555555-5555-4555-8555-555555555555';
const originalSecret = process.env.AUTH_SECRET;
process.env.AUTH_SECRET = 'same-device-report-test-secret-with-32-characters';
after(() => {
  if (originalSecret === undefined) delete process.env.AUTH_SECRET;
  else process.env.AUTH_SECRET = originalSecret;
});

async function moduleFor(path) {
  const url = new URL(path, import.meta.url);
  assert.ok(existsSync(url), `same-phone support must exist at ${path}`);
  return import(url.href);
}

async function databaseFixture() {
  const { PGlite } = await import('@electric-sql/pglite');
  const db = new PGlite();
  await db.exec(`
    create table users (id uuid primary key, phone text);
    create table resident_profiles (id uuid primary key, user_id uuid, first_name text, last_name text);
    create table municipalities (id uuid primary key, name text);
    create table barangays (id uuid primary key, name text);
    create table fire_reports (
      id uuid primary key, reference_number text, resident_profile_id uuid, status text,
      fire_type text, fire_types text[], latitude float8, longitude float8,
      submitted_at timestamptz default now(), duplicate_of_report_id uuid,
      description text, nearest_landmark text, municipality_id uuid, barangay_id uuid,
      structure_material text, reported_house_density text, house_density text, route_accessibility text,
      weather_temperature float8, weather_humidity float8, weather_wind_speed float8,
      weather_wind_direction float8, weather_wind_condition text, calculated_severity text,
      severity_score float8, severity_factors text[], detected_building_density text,
      building_density_confidence text, building_density_building_count integer,
      building_density_minimum_gap_meters float8, building_density_source text,
      building_density_assessed_at timestamptz
    );
    create table fire_report_photos (fire_report_id uuid, storage_key text, uploaded_at timestamptz);
    create table fire_report_status_history (fire_report_id uuid, next_status text, resident_message text, created_at timestamptz);
  `);
  await db.exec(readFileSync(new URL('../supabase/migrations/20261004130448_add_resident_fire_report_follows.sql', import.meta.url), 'utf8'));
  await db.query('insert into users values ($1, null), ($2, null)', [accountA, accountB]);
  await db.query('insert into resident_profiles values ($1, $2, null, null), ($3, $4, null, null)', [profileA, accountA, profileB, accountB]);
  await db.query(`insert into fire_reports (id, reference_number, resident_profile_id, status, fire_type, latitude, longitude)
    values ($1, 'HOUSE-PRIMARY', $2, 'RESPONDING', 'HOUSE_BUILDING', 10.74382, 121.9394)`, [reportId, profileA]);
  await db.query('insert into resident_fire_report_follows (fire_report_id, resident_profile_id, reporting_device_id) values ($1, $2, $3)', [reportId, profileA, deviceId]);
  await db.query(`insert into fire_report_status_history values ($1, 'RESPONDING', 'BFP is responding.', now())`, [reportId]);
  const client = { query: (sql, params) => /pg_advisory_xact_lock/.test(sql) ? Promise.resolve({ rows: [] }) : db.query(sql, params) };
  return { db, client };
}

async function serviceFor(db, client) {
  const sharing = await moduleFor('../lib/fire-reports/device-sharing.ts');
  const dependencies = {
    '../db': {
      getDatabase: () => client,
      withTransaction: async (work) => {
        await db.exec('begin');
        try { const result = await work(client); await db.exec('commit'); return result; }
        catch (error) { await db.exec('rollback'); throw error; }
      },
    },
    './validation': await import('../lib/fire-reports/validation.ts'),
    './duplicates': await import('../lib/fire-reports/duplicates.ts'),
    './rate-limiter': await import('../lib/fire-reports/rate-limiter.ts'),
    './device-sharing': sharing,
    '../notifications/service': {}, '../weather/service': {}, './building-density': {}, './danger-assessment': {},
  };
  const source = readFileSync(new URL('../lib/fire-reports/service.ts', import.meta.url), 'utf8');
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {};
  runInNewContext(output, { exports, console, require: (name) => name === 'node:crypto' ? require(name) : dependencies[name] });
  return exports;
}

test('a signed browser identifier survives account switching and rejects forged identifiers', async () => {
  const device = await moduleFor('../lib/auth/reporting-device.ts');
  const token = device.createReportingDeviceToken(deviceId);
  assert.equal(device.verifyReportingDeviceToken(token), deviceId);
  assert.equal(device.verifyReportingDeviceToken(`${otherDevice}.${token.split('.')[1]}`), null);
  assert.equal(device.verifyReportingDeviceToken('Chrome on iOS'), null);
  assert.equal(device.reportingDeviceCookieOptions.httpOnly, true);
  assert.equal(device.reportingDeviceCookieOptions.sameSite, 'lax');
});

test('same phone and same recent fire creates only a follower link for the second account', async () => {
  const sharing = await moduleFor('../lib/fire-reports/device-sharing.ts');
  const { db, client } = await databaseFixture();
  try {
    const result = await sharing.followSameDeviceIncident(client, accountB, deviceId, 10.7431, 121.9394, ['HOUSE_BUILDING']);
    assert.equal(result?.id, reportId);
    assert.equal(result?.status, 'RESPONDING');
    assert.equal(result?.sameDeviceDuplicate, true);
    assert.equal(result?.existing, true);
    assert.equal((await db.query('select count(*)::int as count from fire_reports')).rows[0].count, 1);
    assert.equal((await db.query('select count(*)::int as count from resident_fire_report_follows where resident_profile_id = $1', [profileB])).rows[0].count, 1);
    await sharing.followSameDeviceIncident(client, accountB, deviceId, 10.7431, 121.9394, ['HOUSE_BUILDING']);
    assert.equal((await db.query('select count(*)::int as count from resident_fire_report_follows where resident_profile_id = $1', [profileB])).rows[0].count, 1, 'retries are idempotent');
  } finally { await db.close(); }
});

test('shared Wi-Fi, different fire types, far locations and expired or resolved fires are not same-phone duplicates', async () => {
  const sharing = await moduleFor('../lib/fire-reports/device-sharing.ts');
  const { db, client } = await databaseFixture();
  try {
    const find = (phone, lat, types) => sharing.findSameDeviceIncident(client, accountB, phone, lat, 121.9394, types);
    assert.equal(await find(otherDevice, 10.7431, ['HOUSE_BUILDING']), null, 'a different phone does not share the duplicate block');
    assert.equal(await find(deviceId, 10.7431, ['GRASS']), null);
    assert.equal(await find(deviceId, 10.74, ['HOUSE_BUILDING']), null);
    assert.equal(await sharing.findSameDeviceIncident(client, accountA, deviceId, 10.7431, 121.9394, ['HOUSE_BUILDING']), null, 'same-account repeats use the existing own-report behavior');
    await db.query("update resident_fire_report_follows set created_at = now() - interval '6 minutes'");
    assert.equal(await find(deviceId, 10.7431, ['HOUSE_BUILDING']), null);
    await db.query('update resident_fire_report_follows set created_at = now()');
    await db.query("update fire_reports set status = 'RESOLVED'");
    assert.equal(await find(deviceId, 10.7431, ['HOUSE_BUILDING']), null);
  } finally { await db.close(); }
});

test('the save transaction returns the existing incident without adding a report or alert', async () => {
  const { db, client } = await databaseFixture();
  try {
    const service = await serviceFor(db, client);
    const result = await service.createResidentFireReport(accountB, {
      latitude: 10.7431, longitude: 121.9394, fireTypes: ['HOUSE_BUILDING'], municipality: 'Hamtic', barangay: 'Mapatag',
    }, { ipAddress: '203.0.113.1', deviceSummary: 'Safari on iOS', deviceId });
    assert.equal(result.sameDeviceDuplicate, true);
    assert.equal(result.id, reportId);
    assert.equal((await db.query('select count(*)::int as count from fire_reports')).rows[0].count, 1);
  } finally { await db.close(); }
});

test('following an incident does not extend the original phone submission window', async () => {
  const sharing = await moduleFor('../lib/fire-reports/device-sharing.ts');
  const { db, client } = await databaseFixture();
  try {
    await sharing.followSameDeviceIncident(client, accountB, deviceId, 10.7431, 121.9394, ['HOUSE_BUILDING']);
    await db.query("update resident_fire_report_follows set created_at = now() - interval '6 minutes' where resident_profile_id = $1", [profileA]);
    const thirdAccount = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
    assert.equal(await sharing.findSameDeviceIncident(client, thirdAccount, deviceId, 10.7431, 121.9394, ['HOUSE_BUILDING']), null);
  } finally { await db.close(); }
});

test('a followed incident logged by BFP remains readable without a resident owner', async () => {
  const sharing = await moduleFor('../lib/fire-reports/device-sharing.ts');
  const { db, client } = await databaseFixture();
  try {
    const childId = '66666666-6666-4666-8666-666666666666';
    await db.query('update fire_reports set resident_profile_id = null where id = $1', [reportId]);
    await db.query(`insert into fire_reports (id, reference_number, resident_profile_id, status, fire_type, latitude, longitude, duplicate_of_report_id)
      values ($1, 'HOUSE-CHILD', $2, 'DUPLICATE', 'HOUSE_BUILDING', 10.7431, 121.9394, $3)`, [childId, profileA, reportId]);
    await db.query('delete from resident_fire_report_follows');
    await sharing.recordResidentIncidentFollow(client, accountA, childId, deviceId);
    assert.equal((await sharing.followSameDeviceIncident(client, accountB, deviceId, 10.7431, 121.9394, ['HOUSE_BUILDING']))?.id, reportId);
    const service = await serviceFor(db, client);
    const report = await service.findResidentReport(accountB, reportId);
    assert.equal(report?.status, 'RESPONDING');
    assert.equal(report?.can_edit, false);
    assert.equal((await service.listResidentReports(accountB))[0]?.id, reportId);
    assert.equal(await service.findResidentReport('cccccccc-cccc-4ccc-8ccc-cccccccccccc', reportId), null);
    await assert.rejects(() => service.updateResidentReportTacticalDetails(accountB, reportId, { routeAccessibility: 'WIDE_ROAD' }), /REPORT_NOT_FOUND/);
  } finally { await db.close(); }
});

test('the second account can read live status and list the followed incident while unrelated accounts cannot', async () => {
  const sharing = await moduleFor('../lib/fire-reports/device-sharing.ts');
  const { db, client } = await databaseFixture();
  try {
    const service = await serviceFor(db, client);
    assert.equal(await service.findResidentReport(accountB, reportId), null);
    await sharing.followSameDeviceIncident(client, accountB, deviceId, 10.7431, 121.9394, ['HOUSE_BUILDING']);
    const report = await service.findResidentReport(accountB, reportId);
    assert.equal(report?.status, 'RESPONDING');
    assert.equal(report?.can_edit, false);
    assert.equal(report?.resident_profile_id, null, 'the original reporter profile is not exposed');
    assert.equal((await service.listResidentReports(accountB))[0]?.id, reportId);
    assert.equal((await service.findResidentReport(accountA, reportId))?.can_edit, true);
    await assert.rejects(() => service.updateResidentReportTacticalDetails(accountB, reportId, { routeAccessibility: 'WIDE_ROAD' }), /REPORT_NOT_FOUND/);
    await db.query("update fire_reports set status = 'FIRETRUCK_DISPATCHED'");
    assert.equal((await service.findResidentReport(accountB, reportId))?.status, 'FIRETRUCK_DISPATCHED');
    assert.equal((await service.listResidentReports(accountB))[0]?.status, 'FIRETRUCK_DISPATCHED');
    assert.equal(await service.findResidentReport('cccccccc-cccc-4ccc-8ccc-cccccccccccc', reportId), null);
  } finally { await db.close(); }
});
