import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import test, { after } from 'node:test';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

import * as sessions from '../lib/auth/session.ts';
import * as limiter from '../lib/fire-reports/rate-limiter.ts';
import * as validation from '../lib/fire-reports/validation.ts';
import * as duplicates from '../lib/fire-reports/duplicates.ts';
import * as audit from '../lib/fire-reports/submission-audit.ts';
import * as reportingDevice from '../lib/auth/reporting-device.ts';
import * as deviceSharing from '../lib/fire-reports/device-sharing.ts';

const require = createRequire(import.meta.url);
const { NextRequest, NextResponse } = require('next/server');
const originalSecret = process.env.AUTH_SECRET;
process.env.AUTH_SECRET = 'report-isolation-test-secret-with-32-characters';
after(() => {
  if (originalSecret === undefined) delete process.env.AUTH_SECRET;
  else process.env.AUTH_SECRET = originalSecret;
  limiter.clearMemorySosReports();
});

function loadRoute(path, dependencies) {
  const source = readFileSync(new URL(path, import.meta.url), 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  runInNewContext(output, {
    exports, console, File,
    require: (name) => {
      if (name === 'next/server') return { NextRequest, NextResponse };
      const key = name.slice(name.lastIndexOf('/lib/') + 5);
      const shared = { 'auth/reporting-device': reportingDevice, 'fire-reports/device-sharing': deviceSharing };
      assert.ok(key in dependencies || key in shared, `dependency supplied: ${key}`);
      return dependencies[key] ?? shared[key];
    },
  });
  return exports;
}

function requestFor(path, userId, init = {}) {
  const headers = new Headers(init.headers);
  if (userId) headers.set('Cookie', `${sessions.RESIDENT_SESSION_COOKIE}=${sessions.createResidentSession(userId, 'test.resident')}; ${headers.get('Cookie') ?? ''}`);
  headers.set('x-forwarded-for', '203.0.113.20');
  return new NextRequest(`http://localhost${path}`, { ...init, headers });
}

function reportForm(fireType = 'GRASS') {
  const form = new FormData();
  for (const [key, value] of Object.entries({ fireType, latitude: '10.7431', longitude: '121.9394', municipality: 'Hamtic', barangay: 'Mapatag' })) {
    form.set(key, value);
  }
  form.append('fireTypes', fireType);
  return form;
}

test('cooldown GET uses the authenticated account across sign-ins on one device and IP', async () => {
  const { PGlite } = await import('@electric-sql/pglite');
  const db = new PGlite();
  try {
    await db.exec(`
      create table resident_profiles (id uuid primary key, user_id uuid);
      create table fire_reports (resident_profile_id uuid, submitted_at timestamptz);
      insert into resident_profiles values ('11111111-1111-4111-8111-111111111111', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
      insert into fire_reports values ('11111111-1111-4111-8111-111111111111', now() - interval '2 minutes');
    `);
    const client = { query: (sql, params) => db.query(sql, params) };
    const route = loadRoute('../app/api/resident/fire-reports/route.ts', {
      'auth/session': sessions,
      db: { getDatabase: () => client },
      'fire-reports/duplicates': duplicates,
      'fire-reports/service': {},
      'media/watermark': {},
      'fire-reports/submission-audit': audit,
      'fire-reports/validation': validation,
      'supabase/server-storage': {},
      'fire-reports/rate-limiter': { ...limiter, checkResidentSosRateLimit: (userId) => limiter.checkResidentSosRateLimit(userId, null, client) },
    });
    const first = await route.GET(requestFor('/api/resident/fire-reports?cooldown=1', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'));
    assert.equal(first.status, 200);
    assert.equal(first.headers.get('Cache-Control'), 'no-store');
    const deviceCookie = first.cookies.get(reportingDevice.REPORTING_DEVICE_COOKIE);
    assert.ok(reportingDevice.verifyReportingDeviceToken(deviceCookie?.value));
    assert.match(first.headers.get('Set-Cookie'), /HttpOnly/i);
    const cooldown = await first.json();
    assert.equal(cooldown.allowed, false);
    assert.ok(cooldown.retryAfterSeconds > 150 && cooldown.retryAfterSeconds <= 180);
    const second = await route.GET(requestFor('/api/resident/fire-reports?cooldown=1&userId=aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'));
    assert.equal((await second.json()).allowed, true, 'another sign-in has its own quota, regardless of query parameters');
    assert.equal((await route.GET(requestFor('/api/resident/fire-reports?cooldown=1'))).status, 401);
  } finally {
    await db.close();
  }
});

test('same-phone submission returns the popup and existing status without saving a second report, photo or quota entry', async () => {
  const { PGlite } = await import('@electric-sql/pglite');
  const db = new PGlite();
  let newReportCount = 0;
  let photoCount = 0;
  let quotaCount = 0;
  try {
    await db.exec(`
      create table resident_profiles (id uuid primary key, user_id uuid);
      create table fire_reports (
        id uuid primary key, reference_number text, resident_profile_id uuid, status text,
        fire_type text, fire_types text[], latitude float8, longitude float8,
        submitted_at timestamptz default now(), duplicate_of_report_id uuid
      );
      insert into resident_profiles values
        ('11111111-1111-4111-8111-111111111111', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
        ('22222222-2222-4222-8222-222222222222', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
      insert into fire_reports (id, reference_number, resident_profile_id, status, fire_type, latitude, longitude)
        values ('33333333-3333-4333-8333-333333333333', 'HOUSE-PRIMARY', '11111111-1111-4111-8111-111111111111', 'RESPONDING', 'HOUSE_BUILDING', 10.7431, 121.9394);
    `);
    await db.exec(readFileSync(new URL('../supabase/migrations/20261004130448_add_resident_fire_report_follows.sql', import.meta.url), 'utf8'));
    const deviceId = '44444444-4444-4444-8444-444444444444';
    await db.query('insert into resident_fire_report_follows (fire_report_id, resident_profile_id, reporting_device_id) values ($1, $2, $3)', [
      '33333333-3333-4333-8333-333333333333', '11111111-1111-4111-8111-111111111111', deviceId,
    ]);
    const client = { query: (sql, params) => db.query(sql, params) };
    const route = loadRoute('../app/api/resident/fire-reports/route.ts', {
      'auth/session': sessions, db: { getDatabase: () => client }, 'fire-reports/duplicates': duplicates,
      'fire-reports/service': { createResidentFireReport: async () => { newReportCount += 1; throw new Error('must not save another fire report'); } },
      'media/watermark': {}, 'fire-reports/submission-audit': audit, 'fire-reports/validation': validation,
      'supabase/server-storage': { uploadFireReportPhoto: async () => { photoCount += 1; } },
      'fire-reports/rate-limiter': {
        ...limiter,
        checkResidentSosRateLimit: async () => ({ allowed: false, retryAfterSeconds: 240 }),
        recordSuccessfulSosReportMemory: () => { quotaCount += 1; },
      },
    });
    const deviceHeaders = { Cookie: `${reportingDevice.REPORTING_DEVICE_COOKIE}=${reportingDevice.createReportingDeviceToken(deviceId)}` };
    const eligibility = await route.GET(requestFor('/api/resident/fire-reports?cooldown=1&latitude=10.7431&longitude=121.9394&municipality=Hamtic&barangay=Mapatag&fireTypes=HOUSE_BUILDING', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', { headers: deviceHeaders }));
    const eligibilityData = await eligibility.json();
    assert.equal(eligibilityData.allowed, false, 'following does not reset the account quota');
    assert.equal(eligibilityData.sameDeviceDuplicateAvailable, true, 'an existing incident can still be followed while this account has a cooldown');
    assert.equal((await db.query('select count(*)::int as count from resident_fire_report_follows')).rows[0].count, 1, 'eligibility GET grants no access');
    const differentType = await route.GET(requestFor('/api/resident/fire-reports?cooldown=1&latitude=10.7431&longitude=121.9394&municipality=Hamtic&barangay=Mapatag&fireTypes=GRASS', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', { headers: deviceHeaders }));
    assert.equal((await differentType.json()).sameDeviceDuplicateAvailable, false, 'a different type cannot bypass the account cooldown');
    const forgedDevice = await route.GET(requestFor('/api/resident/fire-reports?cooldown=1&latitude=10.7431&longitude=121.9394&municipality=Hamtic&barangay=Mapatag&fireTypes=HOUSE_BUILDING', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', { headers: { Cookie: `${reportingDevice.REPORTING_DEVICE_COOKIE}=${deviceId}.forged` } }));
    assert.equal((await forgedDevice.json()).sameDeviceDuplicateAvailable, false, 'device identifiers must be signed');
    const response = await route.POST(requestFor('/api/resident/fire-reports', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', {
      method: 'POST', body: reportForm('HOUSE_BUILDING'),
      headers: deviceHeaders,
    }));
    const data = await response.json();
    assert.equal(response.status, 200);
    assert.equal(data.sameDeviceDuplicate, true);
    assert.equal(data.report.id, '33333333-3333-4333-8333-333333333333');
    assert.equal(data.report.status, 'RESPONDING');
    assert.match(data.message, /This phone.*another account/);
    assert.equal(newReportCount, 0);
    assert.equal(photoCount, 0);
    assert.equal(quotaCount, 0);
    assert.equal((await db.query('select count(*)::int as count from fire_reports')).rows[0].count, 1);
    assert.equal((await db.query('select count(*)::int as count from resident_fire_report_follows')).rows[0].count, 2);
  } finally { await db.close(); }
});

test('submission forwards all fire types and returns 429 when the transaction finds a concurrent report', async () => {
  let submittedTypes;
  let successfulRecordCount = 0;
  const route = loadRoute('../app/api/resident/fire-reports/route.ts', {
    'auth/session': sessions,
    db: { getDatabase: () => ({}) },
    'fire-reports/duplicates': { findOwnOpenReportNear: async (_client, _user, _lat, _lon, fireTypes) => {
      submittedTypes = fireTypes;
      return null;
    } },
    'fire-reports/service': { createResidentFireReport: async () => { throw new limiter.SosRateLimitError(240); } },
    'media/watermark': {},
    'fire-reports/submission-audit': audit,
    'fire-reports/validation': validation,
    'supabase/server-storage': {},
    'fire-reports/rate-limiter': {
      ...limiter,
      checkResidentSosRateLimit: async () => ({ allowed: true }),
      recordSuccessfulSosReportMemory: () => { successfulRecordCount += 1; },
    },
  });
  const form = reportForm();
  form.append('fireTypes', 'HOUSE_BUILDING');
  const response = await route.POST(requestFor('/api/resident/fire-reports', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', { method: 'POST', body: form }));
  assert.deepEqual(submittedTypes, ['GRASS', 'HOUSE_BUILDING']);
  assert.equal(response.status, 429);
  assert.equal(response.headers.get('Retry-After'), '240');
  assert.equal((await response.json()).retryAfter, 240);
  assert.equal(successfulRecordCount, 0, 'a rejected transaction consumes no submission quota');
});

test('the nearby-report API rejects missing or invalid types and preserves valid selections', async () => {
  let lookedUpTypes;
  const route = loadRoute('../app/api/resident/fire-reports/open-nearby/route.ts', {
    'auth/session': sessions,
    db: { getDatabase: () => ({}) },
    'fire-reports/validation': validation,
    'fire-reports/duplicates': { findOwnOpenReportNear: async (_client, _user, _lat, _lon, fireTypes) => {
      lookedUpTypes = fireTypes;
      return null;
    } },
  });
  const query = '/api/resident/fire-reports/open-nearby?latitude=10.7431&longitude=121.9394&municipality=Hamtic&barangay=Mapatag';
  const account = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  assert.equal((await route.GET(requestFor(query, account))).status, 400);
  assert.equal((await route.GET(requestFor(`${query}&fireTypes=INVALID`, account))).status, 400);
  const response = await route.GET(requestFor(`${query}&fireTypes=GRASS&fireTypes=HOUSE_BUILDING`, account));
  assert.equal(response.status, 200);
  assert.deepEqual(lookedUpTypes, ['GRASS', 'HOUSE_BUILDING']);
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
});
