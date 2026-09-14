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
      create table incident_dispatch_recipients(dispatch_id uuid, on_scene_at timestamptz, acknowledged_at timestamptz, en_route_at timestamptz);
      create table incident_dispatch_stations(dispatch_id uuid);
      create table fire_report_status_history(fire_report_id uuid, next_status text, created_at timestamptz);
      insert into municipalities values ('${actor.municipalityId}', 'Hamtic');
      insert into barangays values ('33333333-3333-4333-8333-333333333333', '${actor.municipalityId}', 'Poblacion');
      insert into fire_reports values ('44444444-4444-4444-8444-444444444444','${actor.municipalityId}',null,'TEST','ALAB_APP','GRASS','HIGH','RESOLVED',10,120,'2026-09-14T00:00:00Z',null,'Private narrative','Private home address');
      insert into incident_dispatches values ('55555555-5555-4555-8555-555555555555','44444444-4444-4444-8444-444444444444','COMPLETED','2026-09-14T00:01:00Z');
      insert into incident_dispatch_recipients values
        ('55555555-5555-4555-8555-555555555555','2026-09-13T23:59:00Z','2026-09-14T00:01:00Z',null),
        ('55555555-5555-4555-8555-555555555555','2026-09-14T00:05:00Z','2026-09-14T00:01:00Z',null);
      insert into fire_report_status_history values ('44444444-4444-4444-8444-444444444444','RESOLVED','2026-09-14T00:20:00Z');
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
    const scope = { page: 1, pageSize: 25, from: '2026-09-14', to: '2026-09-14', search: 'TEST' };
    const list = await service.listMunicipalReports(actor, scope);
    assert.equal(list.total, 1);
    assert.equal(list.items[0].responseStartedAt, null);
    assert.equal(list.items[0].barangay, 'Unknown Barangay');
    assert.equal(list.items[0].timeToArrivalMinutes, 5);
    const summary = await service.getMunicipalReportSummary(actor, scope);
    assert.equal(summary.totalReports, 1);
    assert.equal(summary.timingMetrics.responseRecordsCount, 0);
    assert.equal(summary.timingMetrics.avgArrivalMinutes, 5);
    assert.equal(summary.byBarangay.reduce((sum, item) => sum + item.total, 0), summary.totalReports);
    assert.equal(summary.byBarangay.find(item => item.barangayName === 'Poblacion').total, 0);
  } finally { await db.close(); }
});
