import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { PGlite } from '@electric-sql/pglite';
import { loadServerModule } from './helpers/load-server-module.mjs';
import * as proximity from '../lib/intermunicipality/proximity.ts';
import * as state from '../lib/intermunicipality/assistance-state.ts';

const id = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const origin=id(1), near=id(2), far=id(3), brgy=id(10), otherBrgy=id(11), officer=id(20), nearOfficer=id(21);
const migration = name => readFileSync(`supabase/migrations/${name}.sql`, 'utf8');
async function fixture(beforeMunicipalAlerts) {
  const db=new PGlite();
  await db.exec(`create role anon; create role authenticated;
    create table users(id uuid primary key, role text, account_status text);
    create table municipalities(id uuid primary key, name text);
    create table barangays(id uuid primary key, municipality_id uuid, name text);
    create table bfp_personnel_profiles(id uuid primary key, user_id uuid);
    create table bfp_municipality_assignments(personnel_profile_id uuid, municipality_id uuid, status text);
    create table municipal_bfp_stations(id uuid primary key, municipality_id uuid, station_name text, latitude numeric, longitude numeric, status text);
    create table fire_reports(id uuid primary key, reference_number text, municipality_id uuid, barangay_id uuid,
      latitude numeric, longitude numeric, fire_type text default 'HOUSE_BUILDING', status text default 'PENDING_VERIFICATION',
      submitted_at timestamptz default now(), duplicate_of_report_id uuid);
    create table incident_dispatches(id uuid primary key, fire_report_id uuid, municipality_id uuid, status text, created_at timestamptz default now());
    create table account_notifications(event_type text);
    insert into municipalities values ('${origin}','Origin'),('${near}','Nearest'),('${far}','Further');
    insert into barangays values ('${brgy}','${origin}','Same'),('${otherBrgy}','${origin}','Other');
    insert into users values ('${officer}','PROVINCIAL_BFP','ACTIVE'),('${nearOfficer}','MUNICIPAL_BFP','ACTIVE'),('${id(22)}','MUNICIPAL_BFP','ACTIVE');
    insert into bfp_personnel_profiles values ('${nearOfficer}','${nearOfficer}'),('${id(22)}','${id(22)}');
    insert into bfp_municipality_assignments values ('${nearOfficer}','${near}','ACTIVE'),('${id(22)}','${far}','ACTIVE');
    insert into municipal_bfp_stations values ('${id(30)}','${near}','Near station',10.701,122,'ACTIVE'),
      ('${id(31)}','${far}','Far station',10.72,122,'ACTIVE');`);
  await db.exec(migration('20260907090000_add_intermunicipality_coordination'));
  await db.exec(migration('20260910121800_harden_intermunicipality_coordination'));
  await db.exec('create table incident_alarm_summons(assistance_request_id uuid)');
  await db.exec(migration('20260920130000_enforce_provincial_assistance_commands'));
  await db.exec(migration('20261004133956_add_provincial_barangay_alerts'));
  await beforeMunicipalAlerts?.(db);
  await db.exec(migration('20261006090000_municipal_incident_alerts'));
  const notifications=[], queries=[];
  const withTransaction=work=>db.transaction(tx=>work({query:(sql,params)=>{
    queries.push(sql);
    return /pg_advisory_xact_lock/.test(sql) ? Promise.resolve({rows:[]}) : tx.query(sql,params);
  }}));
  const assistance=loadServerModule('lib/intermunicipality/assistance.ts', {
    '../db':{withTransaction}, './assistance-state':state,
    './audit':loadServerModule('lib/intermunicipality/audit.ts',{}),
    '../notifications/service':{
      listMunicipalNotificationRecipients:async()=>[nearOfficer], listProvincialNotificationRecipients:async()=>[officer],
      createAccountNotifications:async(_client,payload)=>notifications.push(payload),
    },
  });
  const api=loadServerModule('lib/intermunicipality/barangay-alerts.ts', {
    '../db':{withTransaction}, './proximity':proximity, './assistance':assistance,
    './assistance-state':state,
  });
  const report=async(n,opts={})=>{
    await db.query(`insert into fire_reports(id,reference_number,municipality_id,barangay_id,latitude,longitude,status,duplicate_of_report_id)
      values ($1,$2,$3,$4,10.7,122,$5,$6)`,[id(n),`FIRE-${n}`,opts.municipality??origin,opts.barangay===null?null:opts.barangay??brgy,opts.status??'PENDING_VERIFICATION',opts.duplicate??null]);
    if(opts.dispatched) await db.query("insert into incident_dispatches(id,fire_report_id,municipality_id,status) values ($1,$2,$3,'ACTIVE')",[id(n+1000),id(n),opts.municipality??origin]);
  };
  return {db,api,report,notifications,queries};
}

test('three active reports anywhere in one municipality raise exactly one alert; duplicates and closed reports do not count',async()=>{
  const {db,api,report}=await fixture();
  try {
    await report(100);
    await report(110,{status:'DUPLICATE',duplicate:id(100)}); await report(111,{status:'RESPONDING',duplicate:id(100)});
    await report(112,{status:'RESOLVED'}); await report(113,{barangay:otherBrgy});
    assert.equal((await api.listProvincialBarangayAlerts()).length,0);
    await report(114,{barangay:null,dispatched:true});
    const [alert]=await api.listProvincialBarangayAlerts();
    assert.equal(alert.incidentCount,3,'three barangays (one unknown) in one municipality are one cluster');
    assert.equal(alert.municipalityId,origin); assert.equal(alert.municipalityName,'Origin');
    assert.equal(alert.acknowledgedAt,null); assert.deepEqual(alert.incidentIds,[id(100),id(113),id(114)]);
    assert.deepEqual(alert.incidents.map(r=>r.barangay),['Same','Other',null]);
    assert.equal(alert.incidents.find(r=>r.id===id(114)).dispatched,true);
    assert.deepEqual(alert.incidents[0].nearbyMunicipalities.map(m=>m.municipalityId),[near,far]);
    await report(101); await report(102);
    const grown=await api.listProvincialBarangayAlerts();
    assert.equal(grown.length,1,'three reports in one barangay never ring a second alert for the same municipality');
    assert.equal(grown[0].id,alert.id); assert.equal(grown[0].incidentCount,5);
    const permissions=await db.query("select has_table_privilege('anon','provincial_barangay_alerts','SELECT') as exposed");
    assert.equal(permissions.rows[0].exposed,false);
    await db.query('insert into barangays values ($1,$2,$3)',[id(12),far,'Same']);
    for(const n of [200,201,202])await report(n,{municipality:far,barangay:id(12)});
    const separated=await api.listProvincialBarangayAlerts();
    assert.equal(separated.length,2,'each municipality has its own alert');
    assert.deepEqual(separated.map(a=>a.incidentCount),[5,3]);
  }finally{await db.close();}
});

test('the release closes per-barangay alerts so they reopen once per municipality',async()=>{
  let legacy;
  const {db,api,report}=await fixture(async db=>{
    const inserted=await db.query(`insert into provincial_barangay_alerts(municipality_id,barangay_id,incident_ids,acknowledged_at)
      values ($1,$2,$3::uuid[],now()) returning id`,[origin,brgy,[id(100),id(101),id(102)]]);
    legacy=inserted.rows[0].id;
  });
  try {
    for(const n of [100,101,102])await report(n);
    const closed=await db.query('select closed_at from provincial_barangay_alerts where id=$1',[legacy]);
    assert.ok(closed.rows[0].closed_at);
    const [alert]=await api.listProvincialBarangayAlerts();
    assert.notEqual(alert.id,legacy);
    assert.equal(alert.acknowledgedAt,null,'the province hears the municipality alarm once after the release');
  }finally{await db.close();}
});

test('a failed resource command rolls back the new observer and command together',async()=>{
  const {db,api,report}=await fixture();
  try {
    await report(100,{dispatched:true});await report(101);await report(102);
    const [alert]=await api.listProvincialBarangayAlerts();
    await assert.rejects(()=>api.assignBarangayIncidentAssistance({alertId:alert.id,fireReportId:id(100),recipientMunicipalityId:far,
      requestedFiretrucks:1,requestedPersonnel:0,actorUserId:id(9999)}),error=>error.code==='23503');
    assert.equal((await db.query('select count(*)::int as count from incident_municipal_observers')).rows[0].count,0);
    assert.equal((await db.query('select count(*)::int as count from intermunicipal_assistance_requests')).rows[0].count,0);
  }finally{await db.close();}
});

test('acknowledgment persists, new incidents re-alert, stale acknowledgment fails and resolving below three closes the alert',async()=>{
  const {db,api,report}=await fixture();
  try{
    for(const n of [100,101,102])await report(n);
    const [alert]=await api.listProvincialBarangayAlerts();
    await api.acknowledgeProvincialBarangayAlert(alert.id,alert.incidentIds,officer);
    assert.ok((await api.listProvincialBarangayAlerts())[0].acknowledgedAt);
    await report(103);
    await assert.rejects(()=>api.acknowledgeProvincialBarangayAlert(alert.id,alert.incidentIds,officer),/BARANGAY_ALERT_CHANGED/);
    assert.equal((await api.listProvincialBarangayAlerts())[0].acknowledgedAt,null);
    await db.query("update fire_reports set status='RESOLVED' where id=any($1::uuid[])",[[id(100),id(101)]]);
    assert.equal((await api.listProvincialBarangayAlerts()).length,0);
    await report(104);
    assert.notEqual((await api.listProvincialBarangayAlerts())[0].id,alert.id,'a new episode receives its own alert');
  }finally{await db.close();}
});

test('province assigns nearby mutual aid atomically, retries create no competing command, and undispached/invalid recipients fail',async()=>{
  const {db,api,report,notifications,queries}=await fixture();
  try{
    await report(100,{dispatched:true});await report(101);await report(102);
    const [alert]=await api.listProvincialBarangayAlerts();
    const input={alertId:alert.id,fireReportId:id(100),recipientMunicipalityId:near,requestedFiretrucks:1,requestedPersonnel:0,actorUserId:officer};
    queries.length=0;
    const result=await api.assignBarangayIncidentAssistance(input);
    const beforeEnrollment=queries.slice(0,queries.findIndex(sql=>/insert into incident_municipal_observers/i.test(sql)));
    const parentLocks=beforeEnrollment.filter(sql=>/select[\s\S]+from (fire_reports|incident_dispatches)/i.test(sql) && /for .*update/i.test(sql));
    assert.equal(parentLocks.length,2);
    assert.ok(parentLocks.every(sql=>/for no key update/i.test(sql)),
      'protect incident/dispatch status while allowing concurrent alarm enrollment foreign-key checks');
    assert.equal(result.length,1);assert.equal(result[0].isProvincialCommand,true);assert.equal(result[0].recipientMunicipalityId,near);
    assert.equal((await api.assignBarangayIncidentAssistance(input))[0].id,result[0].id);
    assert.equal((await db.query('select count(*)::int as count from intermunicipal_assistance_requests')).rows[0].count,1);
    assert.equal(notifications.filter(n=>n.recipientUserIds.includes(nearOfficer)).length,1);
    assert.equal((await api.listProvincialBarangayAlerts())[0].incidents.find(r=>r.id===id(100)).commands[0].status,'REQUESTED');
    await assert.rejects(()=>api.assignBarangayIncidentAssistance({...input,fireReportId:id(101)}),/BARANGAY_DISPATCH_REQUIRED/);
    await assert.rejects(()=>api.assignBarangayIncidentAssistance({...input,recipientMunicipalityId:origin}),/INVALID_BARANGAY_RECIPIENT/);
    await db.query("update fire_reports set status='RESOLVED' where id=$1",[id(102)]);
    await assert.rejects(()=>api.assignBarangayIncidentAssistance(input),/BARANGAY_ALERT_CHANGED/);
  }finally{await db.close();}
});
