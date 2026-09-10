import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as crypto from 'node:crypto';
import ts from 'typescript';
import { PGlite } from '@electric-sql/pglite';
function load(name, deps = {}) {
 const exports = {};
 const source = readFileSync(`lib/provincial-bfp/management/${name}.ts`, 'utf8');
 const code = ts.transpileModule(source, { compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022}}).outputText;
 new Function('require', 'exports', code)(id => { if (id === 'server-only') return {}; if(id === 'node:crypto') return crypto; if(id in deps) return deps[id]; throw Error(id); }, exports);
 return exports;
}
const actor = { userId: '00000000-0000-0000-0000-000000000001', role: 'PROVINCIAL_BFP', province: 'Antique' };
const scope = load('scope');
const filters = { page: 1, pageSize: 25 };
async function fixture() {
 const db = new PGlite();
 await db.exec(`create role anon; create role authenticated;
 create table users(id uuid primary key, role text, email text);
 create table municipalities(id uuid primary key, name text, province text);
 create table bfp_personnel_profiles(id uuid primary key, user_id uuid, display_name text);
 insert into users values ('${actor.userId}', 'PROVINCIAL_BFP', 'officer@example.test');
 insert into bfp_personnel_profiles values ('${actor.userId}', '${actor.userId}', 'Officer');`);
 await db.exec(readFileSync('supabase/migrations/20260910140000_provincial_management_support.sql', 'utf8'));
 const query = db.query.bind(db);
 db.query = async (...args) => { const result = await query(...args); return {...result, rowCount: result.rows.length || result.affectedRows || 0}; };
 return db;
}
test('audit listing executes against the actual management migration', async () => {
 const db = await fixture();
 try {
 await db.query(`insert into provincial_management_events(actor_user_id,target_type,target_id,action) values ($1,'STATION','station','CREATE_STATION')`, [actor.userId]);
 const audit = load('audit', {'../../db': { getDatabase: () => db }, './scope': scope });
 const page = await audit.listProvincialAuditEvents(actor, {...filters, search:'Officer'});
 assert.equal(page.total, 1); assert.equal(page.items[0].actorName, 'Officer');
 } finally { await db.close(); }
});
test('reusing a station request ID with changed input is rejected', async () => {
 const db = await fixture();
 try {
 await db.query(`insert into provincial_management_operations(actor_user_id,request_id,action,target_type,target_id,payload_digest,result_status,saved_result) values ($1,'retry','CREATE_STATION','STATION','station','different','SUCCESS','{}')`, [actor.userId]);
 const stations = load('stations', {'../../db': {withTransaction: fn => fn(db)}, './scope': scope});
 await assert.rejects(stations.createManagedStation({actor,requestId:'retry'}, {stationName:'Station', municipalityId:actor.userId,latitude:11,longitude:122}), /OPERATION_IDEMPOTENCY_CONFLICT/);
 } finally { await db.close(); }
});
test('application retries use the columns in the actual operations migration', async () => {
 const db = await fixture();
 try {
 const digest = crypto.createHash('sha256').update(JSON.stringify({applicationId:'application',expectedSubmissionNumber:1,reason:'review'})).digest('hex');
 await db.query(`insert into provincial_management_operations(actor_user_id,request_id,action,target_type,target_id,payload_digest,result_status,saved_result) values ($1,'retry','APPROVE_RESIDENT_APPLICATION','APPLICATION','application',$2,'SUCCESS',$3)`, [actor.userId,digest,JSON.stringify({status:'VERIFIED',applicationReference:'APP-1'})]);
 const app = load('applications', {'../../db':{withTransaction:fn=>fn(db)}, './scope':scope, '../../notifications/service':{}, '../../resident-applications/delivery-queue':{}});
 const result = await app.approveManagedApplication({actor,requestId:'retry',reason:'review'}, 'application',1);
 assert.equal(result.status,'VERIFIED');
 } finally { await db.close(); }
});

test('station deactivation respects dispatch links and the timestamp constraint', async () => {
 const db = await fixture();
 try {
 await db.exec(`alter table users add column account_status text default 'ACTIVE';
 create table municipal_bfp_stations(id uuid primary key default gen_random_uuid(), municipality_id uuid unique references municipalities(id), station_name text, latitude numeric, longitude numeric, created_at timestamptz default now(), updated_at timestamptz default now());
 create table bfp_credential_events(event_type text);
 create table fire_reports(id uuid primary key);`);
 await db.exec(readFileSync('supabase/migrations/20260827090000_add_municipal_station_personnel_assignments.sql','utf8'));
 const dispatchMigration = readFileSync('supabase/migrations/20260830090000_add_station_team_mobile_dispatch.sql','utf8');
 await db.exec(dispatchMigration.slice(0,dispatchMigration.indexOf('create table public.bfp_mobile_devices')));
 await db.query(`insert into municipalities values ($1,'San Jose','Antique')`,[actor.userId]);
 await db.query(`insert into municipal_bfp_stations(id,municipality_id,station_name,latitude,longitude) values ($1,$1,'Central',11,122)`,[actor.userId]);
 const station = load('stations', {'../../db': {getDatabase:()=>db,withTransaction:fn=>fn(db)}, './scope':scope});
 const initial = await station.getManagedStation(actor,actor.userId);
 assert.equal(initial.name,'Central'); assert.equal(initial.activeDispatchCount,0);
 const updated = await station.updateManagedStation({actor,requestId:'deactivate',expectedVersion:initial.updatedAt,reason:'Relocated station'},actor.userId,{action:'DEACTIVATE'});
 assert.equal(updated.status,'INACTIVE');
 const stored = await db.query('select deactivated_at from municipal_bfp_stations');
 assert.ok(stored.rows[0].deactivated_at);
 } finally { await db.close(); }
});

test('municipal personnel scope excludes provincial officers and other provinces', async () => {
 const db = await fixture();
 try {
 await db.exec(`create table bfp_municipality_assignments(personnel_profile_id uuid, municipality_id uuid, status text);`);
 await assert.rejects(scope.assertManagementTarget(db,actor,'PERSONNEL',actor.userId),/TARGET_NOT_FOUND/);
 } finally { await db.close(); }
});

test('resident directory includes unknown unassigned registrations but excludes known outside-province residents', async () => {
 const db = await fixture();
 try {
 await db.exec(`alter table users add column phone text, add column username text, add column account_status text default 'PENDING_REVIEW', add column created_at timestamptz default now(), add column updated_at timestamptz default now();
 create table resident_profiles(id uuid primary key, user_id uuid, first_name text, last_name text);
 create table barangays(id uuid primary key, name text);
 create table resident_addresses(id uuid primary key default gen_random_uuid(), resident_profile_id uuid, municipality_id uuid, barangay_id uuid, complete_address text, is_primary boolean);
 create table resident_verifications(id uuid primary key default gen_random_uuid(), resident_profile_id uuid, status text, application_reference text, submitted_at timestamptz, created_at timestamptz default now());
 insert into municipalities values ('00000000-0000-0000-0000-000000000010','Other Province','Iloilo');`);
 for (const suffix of ['11', '12', '13']) {
   const id = `00000000-0000-0000-0000-0000000000${suffix}`;
   await db.query(`insert into users(id,role,email) values ($1,'RESIDENT',$2)`, [id, `${suffix}@example.test`]);
   await db.query(`insert into resident_profiles values ($1,$1,'Resident',$2)`, [id, suffix]);
 }
 await db.exec(`insert into resident_addresses(resident_profile_id,municipality_id,is_primary) values
 ('00000000-0000-0000-0000-000000000012','00000000-0000-0000-0000-000000000010',true),
 ('00000000-0000-0000-0000-000000000013','00000000-0000-0000-0000-000000000010',false);`);
 const residents = load('residents', {'../../db': {getDatabase:()=>db}, './scope':scope});
 const result = await residents.listManagedResidents(actor, filters);
 assert.equal(result.total, 1);
 assert.equal(result.items[0].lastName, '11');
 assert.equal(result.items[0].municipalityId, null);
 assert.equal(result.items[0].latestApplicationStatus, 'NO_APPLICATION');
 assert.equal(await residents.getManagedResident(actor,'00000000-0000-0000-0000-000000000012'), null);
 assert.equal(await residents.getManagedResident(actor,'00000000-0000-0000-0000-000000000013'), null);
 } finally { await db.close(); }
});
