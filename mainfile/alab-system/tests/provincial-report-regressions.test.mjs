import assert from 'node:assert/strict';
import test from 'node:test';
import { loadServerModule } from './helpers/load-server-module.mjs';
const path = 'lib/provincial-bfp/management/';
const filters = loadServerModule(path + 'filters.ts', {});
const actor = { userId: 'a', role: 'PROVINCIAL_BFP', province: 'Antique' };
const base = { page: 1, pageSize: 25 };
test('rejects normalized impossible dates, inverted ranges, and UUID suffixes', () => {
  for (const raw of [{from:'2026-02-30'}, {from:'2026-09-02',to:'2026-09-01'}, {municipalityId:'a4ba607b-8863-4f0f-bcaf-a86beb0acb29extra'}]) {
    assert.throws(() => filters.parseManagementFilters(raw));
  }
});
test('municipality count binds only municipality filters when dates are present', async () => {
  const db = { query: async (sql, params) => {
    const highest = Math.max(0, ...[...sql.matchAll(/\$(\d+)/g)].map(m => Number(m[1])));
    assert.equal(params.length, highest);
    return {rows: /select count\(\*\) as count/.test(sql) ? [{count:'0'}] : []};
  }};
  const mod = loadServerModule(path+'overview.ts', {'../../db':{getDatabase:()=>db}, './scope':{assertManagementActor(){}}, './filters':filters});
  await mod.listManagedMunicipalities(actor, {...base,from:'2026-09-01',to:'2026-09-10'});
});
test('CSV exports all report pages and uses schema-compatible audit columns', async () => {
  const mod = loadServerModule(path+'exports.ts', {
    '../../db':{getDatabase:()=>({query:async sql=>{assert.doesNotMatch(sql,/actor_role|'DATASET'/);return {rows:[]};}})},
    './scope':{assertManagementActor(){}}, './filters':filters,
    './reports':{listProvincialReports:async (_,f)=>({total:101,items:Array.from({length:f.page===1?100:1},(_,i)=>({referenceNumber:`report-${(f.page-1)*100+i}`}))})},
    './report-summaries':{}, './stations':{}, './personnel':{}, './residents':{}, './applications':{},
  });
  const result = await mod.exportManagementDataset(actor,'FIRE_REPORTS',base);
  assert.equal(result.csvContent.split('\r\n').length,102);
});

test('resident CSV reuses directory filters and excludes contact and evidence data', async () => {
  const calls = [];
  const mod = loadServerModule(path+'exports.ts', {
    '../../db': {getDatabase: () => ({query: async () => ({rows: []})})},
    './scope': {assertManagementActor() {}}, './reports': {}, './report-summaries': {}, './stations': {}, './personnel': {}, './applications': {},
    './residents': {listManagedResidents: async (_, filters) => {
      calls.push(filters);
      return {total: 1, items: [{firstName: '=FORMULA()', lastName: 'Resident', email:'private@example.test', phone:'09123456789', completeAddress:'private address', evidence:'private evidence', municipalityName:null, accountStatus:'SUSPENDED', latestApplicationStatus:'VERIFIED', createdAt:'2026-09-10'}]};
    }},
  });
  const result = await mod.exportManagementDataset(actor,'RESIDENTS',{...base, status:'SUSPENDED',search:'Resident'});
  assert.equal(calls[0].status, 'SUSPENDED');
  assert.equal(calls[0].search, 'Resident');
  assert.match(result.csvContent, /'=FORMULA\(\)/);
  assert.doesNotMatch(result.csvContent, /private|09123456789/);
});
import { PGlite } from '@electric-sql/pglite';
test('report SQL counts Manila day, honors search/severity, and excludes active rows from resolution timing', async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      create table municipalities(id text primary key,name text,province text);
      create table barangays(id text,name text);
      create table fire_reports(id text,municipality_id text,barangay_id text,status text,report_source text,fire_type text,calculated_severity text,submitted_at timestamptz,updated_at timestamptz,reference_number text,description text);
      alter table fire_reports add column response_started_at timestamptz;
      create table fire_report_status_history(fire_report_id text,next_status text,created_at timestamptz);
      insert into fire_report_status_history values ('a','RESOLVED','2026-09-09T17:00:00Z');
      create table incident_dispatches(id text,fire_report_id text,status text,completed_at timestamptz);
      create table incident_dispatch_recipients(dispatch_id text,acknowledged_at timestamptz,en_route_at timestamptz);
      insert into municipalities values ('m','San Jose','Antique'),('z','Zero','Antique');
      insert into fire_reports(id,municipality_id,barangay_id,status,report_source,fire_type,calculated_severity,submitted_at,updated_at,reference_number,description) values
      ('a','m',null,'RESOLVED','ALAB_APP','HOUSE_BUILDING','HIGH','2026-09-09T16:00:00Z','2026-09-09T17:00:00Z','MATCH-A',''),
      ('b','m',null,'RESPONDING','ALAB_APP','HOUSE_BUILDING','HIGH','2026-09-10T15:59:59Z','2026-09-10T17:59:59Z','MATCH-B',''),
      ('c','m',null,'RESOLVED','ALAB_APP','HOUSE_BUILDING','HIGH','2026-09-10T16:00:00Z','2026-09-10T18:00:00Z','MATCH-C','');
      insert into incident_dispatches values ('d','b','ACTIVE',null);
      insert into incident_dispatch_recipients values ('d','2026-09-10T16:09:59Z',null);
    `);
    const mod = loadServerModule(path+'report-summaries.ts', {'../../db':{getDatabase:()=>db}, './scope':{assertManagementActor(){}}, './filters':filters});
    const result = await mod.getProvincialReportSummary(actor, {...base,from:'2026-09-10',to:'2026-09-10',search:'MATCH',severity:'HIGH'});
    assert.equal(result.totalReports,2);
    assert.equal(result.byMunicipality.length,2);
    assert.equal(result.byMunicipality[0].resolved,1);
    assert.equal(result.timingMetrics.avgResolutionMinutes,60);
    assert.equal(result.timingMetrics.avgResponseMinutes,10);
    const empty = await mod.getProvincialReportSummary(actor, {...base,severity:'LOW'});
    assert.equal(empty.totalReports,0);
    await db.exec(`alter table fire_reports add column address_label text, add column latitude numeric default 11, add column longitude numeric default 122,
      add column reporter_name_snapshot text, add column reporter_phone_snapshot text, add column caller_name text, add column caller_phone text;
      alter table fire_report_status_history add column id integer default 1, add column resident_message text;
      alter table incident_dispatches add column dispatched_at timestamptz default now(), add column cancelled_at timestamptz;
      create table incident_dispatch_stations(dispatch_id text,station_id text,station_name_snapshot text);
      create table fire_report_photos(fire_report_id text,storage_key text);
      insert into municipalities values ('outside','Outside Province','Iloilo');
      insert into fire_reports(id,municipality_id,status,submitted_at) values ('outside-report','outside','RESOLVED',now());`);
    const query = async (...args) => { const result = await db.query(...args); return {...result,rowCount:result.rows.length}; };
    const reports = loadServerModule(path+'reports.ts', {
      '../../db': {getDatabase: () => ({query})}, './scope': {assertManagementActor(){}}, './filters': filters,
      '../../supabase/server-storage': {getFireReportPhotoUrl: async () => { throw new Error('No photo should be requested for this fixture'); }},
    });
    const page = await reports.listProvincialReports(actor, {...base,from:'2026-09-10',to:'2026-09-10'});
    assert.equal(page.total, 2);
    assert.equal(page.items.length, 2);
    assert.equal(page.items.find(row => row.id === 'b').resolvedAt, null);
    const detail = await reports.getProvincialReport(actor,'a');
    assert.equal(detail.id, 'a');
    assert.deepEqual(detail.dispatches, []);
    assert.equal(detail.timeline[0].stage, 'RESOLVED');
    assert.equal(await reports.getProvincialReport(actor,'outside-report'), null);
  } finally { await db.close(); }
});
