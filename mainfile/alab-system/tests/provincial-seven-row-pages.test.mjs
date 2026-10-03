import assert from 'node:assert/strict';
import test from 'node:test';
import { PGlite } from '@electric-sql/pglite';
import { loadServerModule } from './helpers/load-server-module.mjs';

test('registry pages contain seven distinct rows while metrics count all matching records', async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      create table municipalities(id int, name text, province text);
      insert into municipalities values(1,'Antique town','Antique'),(2,'Outside town','Other');
      create table barangays(id int, name text);
      insert into barangays values(1,'Poblacion');
      create table users(id int, role text, email text, phone text, username text, account_status text, created_at timestamptz default now(), updated_at timestamptz default now());
      insert into users(id,role,email,phone,username,account_status)
        select n,'RESIDENT','resident'||n,'09'||n,'resident'||n,'ACTIVE' from generate_series(1,15)n;
      insert into users(id,role,email,phone,username,account_status)
        select n,'MUNICIPAL_BFP','officer'||n,'09'||n,'officer'||n,case when n<=25 then 'ACTIVE' else 'INACTIVE' end from generate_series(16,30)n;
      create table resident_profiles(id int,user_id int,first_name text,last_name text);
      insert into resident_profiles select n,n,'Resident '||n,'Test' from generate_series(1,15)n;
      create table resident_addresses(resident_profile_id int,municipality_id int,barangay_id int,complete_address text,is_primary boolean);
      insert into resident_addresses select n,1,1,'Address '||n,true from generate_series(1,15)n;
      create table resident_verifications(id int, resident_profile_id int, application_reference text, status text, submission_number int, rejection_reason text, submitted_at timestamptz, created_at timestamptz, reviewed_at timestamptz, reviewed_by_user_id int);
      insert into resident_verifications select n,n,'APP-'||n,case when n<=8 then 'PENDING' when n<=12 then 'VERIFIED' else 'CHANGES_REQUESTED' end,1,null,now()-n*interval '1 minute',now(),null,null from generate_series(1,15)n;
      create table municipal_bfp_stations(id int,municipality_id int,station_name text,status text,latitude numeric,longitude numeric,created_at timestamptz default now(),updated_at timestamptz default now());
      insert into municipal_bfp_stations(id,municipality_id,station_name,status,latitude,longitude) select n,1,'Station '||lpad(n::text,2,'0'),case when n<=10 then 'ACTIVE' else 'INACTIVE' end,11,122 from generate_series(1,15)n;
      insert into municipal_bfp_stations(id,municipality_id,station_name,status) values(16,2,'Outside station','ACTIVE');
      create table bfp_personnel_profiles(id int,user_id int,display_name text,rank_or_position text);
      insert into bfp_personnel_profiles select n,n,'Officer '||n,'FO1' from generate_series(16,30)n;
      create table bfp_municipality_assignments(personnel_profile_id int,municipality_id int,status text,assignment_role text);
      insert into bfp_municipality_assignments select n,1,'ACTIVE',case when n<=20 then 'MUNICIPAL_ADMIN' else 'STAFF' end from generate_series(16,30)n;
      create table bfp_station_assignments(personnel_profile_id int,station_id int,status text);
      insert into bfp_station_assignments select n,n-15,'ACTIVE' from generate_series(16,27)n;
      create table incident_dispatches(id int,status text);
      create table incident_dispatch_stations(dispatch_id int,station_id int);
    `);
    const dependencies = {
      '../../db': { getDatabase: () => db }, './scope': { assertManagementActor() {} },
      '../../auth/password': {}, '../../notifications/service': {}, '../../resident-applications/delivery-queue': {},
    };
    const actor = { userId: 'test', role: 'PROVINCIAL_BFP', province: 'Antique' };
    for (const [file, fn, metrics, idKey] of [
      ['applications', 'listManagedApplications', { pending: 8, verified: 4, changes: 3 }, 'id'],
      ['personnel', 'listManagedPersonnel', { assigned: 12, admins: 5, active: 10 }, 'userId'],
      ['stations', 'listManagedStations', { active: 10, municipalities: 1, personnel: 12 }, 'id'],
    ]) {
      const service = loadServerModule(`lib/provincial-bfp/management/${file}.ts`, dependencies);
      const first = await service[fn](actor, { page: 1, pageSize: 7 });
      const second = await service[fn](actor, { page: 2, pageSize: 7 });
      const last = await service[fn](actor, { page: 3, pageSize: 7 });
      assert.equal(first.items.length, 7, file);
      assert.equal(second.items.length, 7, file);
      assert.equal(last.items.length, 1, file);
      assert.equal(first.total, 15, file);
      assert.deepEqual(first.metrics, metrics, file);
      assert.deepEqual(second.metrics, metrics, file);
      assert.equal(new Set([...first.items, ...second.items, ...last.items].map(row => row[idKey])).size, 15, file);
    }
    const applications = loadServerModule('lib/provincial-bfp/management/applications.ts', dependencies);
    const pending = await applications.listManagedApplications(actor, { page: 1, pageSize: 7, status: 'PENDING' });
    assert.equal(pending.total, 8);
    assert.deepEqual(pending.metrics, { pending: 8, verified: 0, changes: 0 });
  } finally { await db.close(); }
});
