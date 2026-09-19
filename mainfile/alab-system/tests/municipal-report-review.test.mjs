import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { loadServerModule } from './helpers/load-server-module.mjs';
import { PGlite } from '@electric-sql/pglite';

const actor = { userId: '11111111-1111-4111-8111-111111111111', municipalityId: '22222222-2222-4222-8222-222222222222', municipalityName: 'Hamtic', role: 'MUNICIPAL_BFP', assignmentRole: 'MUNICIPAL_ADMIN', accountStatus: 'ACTIVE', mustChangePassword: false };
const filters = { page: 2, pageSize: 25, period: 'ALL' };
function exporter({ auditFails = false } = {}) {
  const calls = [];
  const db = { query: async (sql, params) => {
    calls.push({ sql, params });
    if (sql.includes('insert into') && auditFails) throw new Error('Audit unavailable');
    return { rows: [], rowCount: 0 };
  }, release() {} };
  const mod = loadServerModule('lib/municipal-bfp/reports/exports.ts', {
    '../../db': { getDatabase: () => ({ ...db, connect: async () => db }) },
    './formatters': loadServerModule('lib/municipal-bfp/reports/formatters.ts', {}),
    './service': { listMunicipalReports: async () => ({ items: [{ referenceNumber: 'TEST', municipalityName: 'Hamtic', barangay: 'Unknown', submittedAt: null }], total: 1, totalPages: 1 }), getMunicipalReportSummary: async () => ({}) },
    './pdf': { buildMunicipalReportPdf: async () => Buffer.from('%PDF-1.3 stub') },
    './excel': { buildMunicipalReportExcel: async () => Buffer.from('PK stub') },
  });
  return { ...mod, calls };
}
test('municipal report clients preserve the tab session and print in the same tab', () => {
  for (const path of ['app/_components/municipal-report-directory.tsx', 'app/_components/municipal-report-detail.tsx', 'app/_components/municipal-report-export-dialog.tsx', 'app/municipal-bfp/incident-reports/print/page.tsx']) {
    const source = readFileSync(path, 'utf8');
    assert.match(source, /municipalTabFetch/);
    assert.doesNotMatch(source, /\bfetch\(/);
    assert.doesNotMatch(source, /target="_blank"/);
  }
});
test('numeric JSON page filters retain the requested page', () => {
  const { parseMunicipalReportFilters } = loadServerModule('lib/municipal-bfp/reports/filters.ts', {});
  assert.equal(parseMunicipalReportFilters(filters).page, 2);
});
test('an export fails rather than silently skipping the required audit', async () => {
  const mod = exporter({ auditFails: true });
  await assert.rejects(mod.exportMunicipalDataset(actor, filters, { dataset: 'INCIDENT_REGISTER', scope: 'CURRENT_PAGE', format: 'CSV' }), /Audit unavailable/);
});
test('export uses one repeatable-read snapshot and leaves missing raw values blank', async () => {
  const mod = exporter();
  const result = await mod.exportMunicipalDataset(actor, filters, { dataset: 'INCIDENT_REGISTER', scope: 'CURRENT_PAGE', format: 'CSV' });
  assert.match(mod.calls[0].sql, /BEGIN.*REPEATABLE READ/i);
  assert.equal(mod.calls.at(-1).sql, 'COMMIT');
  assert.doesNotMatch(result.csvContent, /Not recorded/);
});
test('aggregate exports reject selected-only scope and invalid selected IDs', async () => {
  const mod = exporter();
  await assert.rejects(mod.exportMunicipalDataset(actor, filters, { dataset: 'MUNICIPAL_SUMMARY', scope: 'SELECTED', format: 'CSV' }), /INVALID_SCOPE/);
  await assert.rejects(mod.exportMunicipalDataset(actor, filters, { dataset: 'INCIDENT_REGISTER', scope: 'SELECTED', format: 'CSV', selectedIds: ['invalid'] }), /INVALID_SELECTION/);
});

test('real report SQL preserves missing response times and reconciles unknown barangays', async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      create table municipalities(id uuid primary key, name text);
      create table barangays(id uuid primary key, municipality_id uuid, name text);
      create table fire_reports(id uuid primary key, municipality_id uuid, barangay_id uuid, reference_number text,
        report_source text, fire_type text, calculated_severity text, status text, latitude numeric, longitude numeric,
        submitted_at timestamptz, response_started_at timestamptz, description text, address_label text, nearest_landmark text, reporter_name_snapshot text, caller_name text);
      create table incident_dispatches(id uuid, fire_report_id uuid, status text, dispatched_at timestamptz);
      create table municipal_bfp_stations(id uuid primary key, municipality_id uuid);
      create table incident_dispatch_stations(id uuid primary key, dispatch_id uuid, station_id uuid, station_name_snapshot text);
      create table incident_dispatch_recipients(id uuid, dispatch_id uuid, dispatch_station_id uuid, on_scene_at timestamptz, acknowledged_at timestamptz, en_route_at timestamptz);
      create table fire_report_status_history(fire_report_id uuid, next_status text, created_at timestamptz);
      create table incident_municipal_observers(id uuid primary key, fire_report_id uuid, observer_municipality_id uuid);
      create table intermunicipal_assistance_requests(id uuid primary key, fire_report_id uuid, observer_id uuid, recipient_municipality_id uuid, status text, is_provincial_command boolean not null default false);
      create table incident_alarm_summons(assistance_request_id uuid);
      insert into municipalities values ('${actor.municipalityId}', 'Hamtic');
      insert into municipalities values ('66666666-6666-4666-8666-666666666666', 'San Jose de Buenavista');
      insert into barangays values ('33333333-3333-4333-8333-333333333333', '${actor.municipalityId}', 'Poblacion');
      insert into fire_reports values ('44444444-4444-4444-8444-444444444444','${actor.municipalityId}',null,'TEST','ALAB_APP','GRASS','HIGH','RESOLVED',10,120,'2026-09-14T00:00:00Z',null,'Private narrative','Private home address');
      insert into incident_dispatches values ('55555555-5555-4555-8555-555555555555','44444444-4444-4444-8444-444444444444','COMPLETED','2026-09-14T00:01:00Z');
      insert into municipal_bfp_stations values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','${actor.municipalityId}');
      insert into incident_dispatch_stations values
        ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','55555555-5555-4555-8555-555555555555','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','Hamtic Station');
      insert into incident_dispatch_recipients(id,dispatch_id,dispatch_station_id,on_scene_at,acknowledged_at,en_route_at) values
        ('cccccccc-cccc-4ccc-8ccc-cccccccccccc','55555555-5555-4555-8555-555555555555','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','2026-09-13T23:59:00Z','2026-09-14T00:01:00Z',null),
        ('dddddddd-dddd-4ddd-8ddd-dddddddddddd','55555555-5555-4555-8555-555555555555','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','2026-09-14T00:05:00Z','2026-09-14T00:01:00Z',null);
      insert into fire_report_status_history values ('44444444-4444-4444-8444-444444444444','RESOLVED','2026-09-14T00:20:00Z');
      insert into fire_reports values
        ('77777777-7777-4777-8777-777777777777','66666666-6666-4666-8666-666666666666',null,'ASSIST-001','ALAB_APP','HOUSE_BUILDING','CRITICAL','RESOLVED',10.7,121.9,'2026-09-14T01:00:00Z',null,'Private assisting narrative','Private assisting address',null,'Protected Resident',null);
      insert into incident_municipal_observers values
        ('88888888-8888-4888-8888-888888888888','77777777-7777-4777-8777-777777777777','${actor.municipalityId}');
      insert into intermunicipal_assistance_requests values
        ('99999999-9999-4999-8999-999999999999','77777777-7777-4777-8777-777777777777','88888888-8888-4888-8888-888888888888','${actor.municipalityId}','COMPLETED',true);
      insert into incident_alarm_summons values ('99999999-9999-4999-8999-999999999999');
    `);
    const connection = { query: async (sql, params) => {
      const result = await db.query(sql, params);
      return { ...result, rowCount: result.rows.length };
    } };
    const service = loadServerModule('lib/municipal-bfp/reports/service.ts', {
      '../../db': { getDatabase: () => connection },
      '../../supabase/server-storage': { getFireReportPhotoUrl: async () => null },
      './filters': loadServerModule('lib/municipal-bfp/reports/filters.ts', {}),
    });
    const scope = { page: 1, pageSize: 25, from: '2026-09-14', to: '2026-09-14' };
    const list = await service.listMunicipalReports(actor, scope);
    assert.equal(list.total, 2);
    const owned = list.items.find(item => item.referenceNumber === 'TEST');
    const assisting = list.items.find(item => item.referenceNumber === 'ASSIST-001');
    assert.equal(owned.responseStartedAt, null);
    assert.equal(owned.barangay, 'Unknown Barangay');
    assert.equal(owned.timeToArrivalMinutes, 5);
    assert.equal(owned.recordRole, 'OWNER');
    assert.equal(assisting.recordRole, 'ASSISTING');
    assert.equal(assisting.reporterName, undefined);
    assert.equal(assisting.description, undefined);
    assert.equal(assisting.nearestLandmark, null);
    const privateSearch = await service.listMunicipalReports(actor, {
      ...scope, search: 'Private assisting narrative',
    });
    assert.equal(privateSearch.total, 0, 'private assisting text must not be a search oracle');
    const referenceSearch = await service.listMunicipalReports(actor, {
      ...scope, search: 'ASSIST-001',
    });
    assert.equal(referenceSearch.total, 1);
    const summary = await service.getMunicipalReportSummary(actor, scope);
    assert.equal(summary.totalReports, 2);
    assert.equal(summary.timingMetrics.responseRecordsCount, 0);
    assert.equal(summary.timingMetrics.avgArrivalMinutes, 5);
    assert.equal(summary.byBarangay.reduce((sum, item) => sum + item.total, 0), summary.totalReports);
    assert.equal(summary.byBarangay.find(item => item.barangayName === 'Poblacion').total, 0);
  } finally { await db.close(); }
});
