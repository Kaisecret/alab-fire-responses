import assert from "node:assert/strict";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { loadServerModule } from "./helpers/load-server-module.mjs";

const MUNICIPALITY = "11111111-1111-4111-8111-111111111111";
const OTHER_MUNICIPALITY = "22222222-2222-4222-8222-222222222222";
const actor = { userId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", role: "PROVINCIAL_BFP", province: "Antique" };
const next = { NextResponse: { json: (body, init) => Response.json(body, init) } };

async function fixture() {
  const db = new PGlite();
  await db.exec(`
    create table municipalities(id text primary key, name text, province text);
    insert into municipalities values ('${MUNICIPALITY}','Hamtic','Antique'),('${OTHER_MUNICIPALITY}','San Jose','Antique'),('outside','Outside','Other');
    create table barangays(id int primary key, name text);
    insert into barangays values(1,'Mapatag');
    create table users(id int primary key, role text, email text, phone text, username text, account_status text);
    insert into users select n,case when n=12 then 'MUNICIPAL_BFP' else 'RESIDENT' end,'resident'||n||'@test.local','09'||n,'resident'||n,
      case when n=4 then 'SUSPENDED' when n=5 then 'PENDING_REVIEW' else 'ACTIVE' end from generate_series(1,16)n;
    create table resident_profiles(id int primary key, user_id int, first_name text, last_name text);
    insert into resident_profiles select n,n,'Resident '||n,'Surname' from generate_series(1,16)n;
    create table resident_addresses(resident_profile_id int, municipality_id text, barangay_id int, complete_address text, is_primary boolean);
    insert into resident_addresses select n,case when n=10 then '${OTHER_MUNICIPALITY}' when n=11 then 'outside' else '${MUNICIPALITY}' end,1,'Address '||n,true from generate_series(1,16)n;
    create table resident_verifications(id int primary key, resident_profile_id int, application_reference text, status text, submission_number int, rejection_reason text,
      submitted_at timestamptz, created_at timestamptz, reviewed_at timestamptz, reviewed_by_user_id int, front_document_key text default 'private/front',
      back_document_key text, selfie_key text, front_review_document_key text, back_review_document_key text, selfie_review_document_key text);
    create table resident_verification_events(id int, verification_id int, resident_profile_id int, event_type text, notes text, created_at timestamptz);
    insert into resident_verifications(id,resident_profile_id,application_reference,status,submission_number,submitted_at,created_at,reviewed_at)
      select n*10,n,'CURRENT-'||n,case when n in(2,6,14,15) then 'PENDING' when n in(3,7) then 'CHANGES_REQUESTED' else 'VERIFIED' end,
        2,'2026-10-20T00:00:00Z','2026-10-20T00:00:00Z','2026-10-20T00:00:00Z' from generate_series(1,16)n where n<>13;
    insert into resident_verifications(id,resident_profile_id,application_reference,status,submission_number,submitted_at,created_at)
      select n*10-1,n,'HISTORIC-'||n,'VERIFIED',1,'2026-10-19T00:00:00Z','2026-10-19T00:00:00Z' from generate_series(6,9)n;
    insert into resident_verifications(id,resident_profile_id,application_reference,status,submission_number,submitted_at,created_at)
      values(139,14,'SAME-SUBMITTED-OLD','VERIFIED',1,'2026-10-20T00:00:00Z','2026-10-19T00:00:00Z'),
            (149,15,'EXACT-TIMESTAMP-OLD','VERIFIED',1,'2026-10-20T00:00:00Z','2026-10-20T00:00:00Z'),
            (159,16,'DATE-FILTER-OLD','VERIFIED',1,'2026-10-19T00:00:00Z','2026-10-19T00:00:00Z');
  `);
  const municipal = loadServerModule("lib/resident-applications/service.ts", {
    "../auth/bfp-accounts": {}, "../auth/session": {}, "../db": { getDatabase: () => db }, "../notifications/service": {}, "./delivery-queue": {}, "../auth/local-ui-preview": {},
    "./evidence": { createIdentityEvidenceSignedUrl: async () => null },
  });
  const provincial = loadServerModule("lib/provincial-bfp/management/applications.ts", {
    "../../db": { getDatabase: () => db }, "../../notifications/service": {}, "../../resident-applications/delivery-queue": {},
    "../../resident-applications/evidence": { createIdentityEvidenceSignedUrl: async () => null },
    "./scope": loadServerModule("lib/provincial-bfp/management/scope.ts", {}),
  });
  return { db, municipal, provincial };
}

test("municipal registry returns only active residents whose latest verification is verified within the assigned municipality", async () => {
  const { db, municipal } = await fixture();
  try {
    const before = await db.query("select id,status from resident_verifications order by id");
    const rows = await municipal.listResidentApplications(MUNICIPALITY);
    assert.deepEqual(rows.map(row => row.id).sort((a,b) => a-b), [10,80,90,160]);
    assert.ok(rows.every(row => row.status === "VERIFIED" && row.accountStatus === "ACTIVE"));
    assert.equal(rows.some(row => "front_document_key" in row || "frontReviewKey" in row || "evidence" in row), false);
    assert.deepEqual((await municipal.listResidentApplications(OTHER_MUNICIPALITY)).map(row => row.id), [100]);
    assert.deepEqual((await db.query("select id,status from resident_verifications order by id")).rows, before.rows, "listing must never grant verification to old applicants");
  } finally { await db.close(); }
});

test("registry details expose current account status for read-only stale-result guards without changing old verification state", async () => {
  const { db, municipal, provincial } = await fixture();
  try {
    const municipalActive = await municipal.getResidentApplication(MUNICIPALITY, "10");
    assert.equal(municipalActive.accountStatus, "ACTIVE");
    assert.equal(municipalActive.status, "VERIFIED");
    const municipalSuspended = await municipal.getResidentApplication(MUNICIPALITY, "40");
    assert.equal(municipalSuspended.accountStatus, "SUSPENDED");
    assert.equal(await municipal.getResidentApplication(OTHER_MUNICIPALITY, "10"), null);
    const provincialActive = await provincial.getManagedApplication(actor, "10");
    assert.equal(provincialActive.accountStatus, "ACTIVE");
    const provincialPending = await provincial.getManagedApplication(actor, "60");
    assert.equal(provincialPending.status, "PENDING");
    assert.equal(provincialPending.accountStatus, "ACTIVE");
    const staleVerified = await provincial.getManagedApplication(actor, "HISTORIC-6");
    assert.equal(staleVerified.id, 60, "an old verified reference must resolve to the latest submission");
    assert.equal(staleVerified.status, "PENDING");
    const repeatedVerified = await provincial.getManagedApplication(actor, "79");
    assert.equal(repeatedVerified.id, 80, "a stale id must resolve to the current verified submission");
    assert.equal((await db.query("select status from resident_verifications where id=60")).rows[0].status, "PENDING");
  } finally { await db.close(); }
});

test("municipal details use the registry tie-break when submission timestamps are identical", async () => {
  const { db, municipal } = await fixture();
  try {
    // Updating the newer row changes physical storage order, which must not
    // decide whether an old verified or current pending submission is shown.
    await db.exec("update resident_verifications set submitted_at=submitted_at where id=150");
    const detail = await municipal.getResidentApplication(MUNICIPALITY, "149");
    assert.equal(detail.id, 150);
    assert.equal(detail.status, "PENDING");
    assert.equal((await municipal.listResidentApplications(MUNICIPALITY)).some(row => row.id === 149 || row.id === 150), false);
  } finally { await db.close(); }
});

test("provincial registry counts and pages latest active verified residents without historical duplicates", async () => {
  const { db, provincial } = await fixture();
  try {
    const filters = { page: 1, pageSize: 25 };
    const result = await provincial.listManagedApplications(actor, filters);
    assert.deepEqual(result.items.map(row => row.id).sort((a,b) => a-b), [10,80,90,100,160]);
    assert.equal(result.total, 5); assert.deepEqual(result.metrics, { pending: 0, verified: 5, changes: 0 });
    assert.ok(result.items.every(row => row.status === "VERIFIED" && row.accountStatus === "ACTIVE"));
    assert.equal(result.items.some(row => "front_document_key" in row || "evidence" in row), false);
    const scoped = await provincial.listManagedApplications(actor, { ...filters, municipalityId: MUNICIPALITY });
    assert.equal(scoped.total, 4); assert.ok(scoped.items.every(row => row.municipalityId === MUNICIPALITY));
    const pending = await provincial.listManagedApplications(actor, { ...filters, status: "PENDING" });
    assert.equal(pending.total, 0); assert.deepEqual(pending.items, []);
    const oldDate = await provincial.listManagedApplications(actor, { ...filters, from: "2026-10-19", to: "2026-10-19" });
    assert.equal(oldDate.total, 0, "date filters cannot select an outdated verification");
    const oldReference = await provincial.listManagedApplications(actor, { ...filters, search: "HISTORIC" });
    assert.equal(oldReference.total, 0, "search cannot select an outdated verification");
    await assert.rejects(() => provincial.listManagedApplications({ ...actor, role: "MUNICIPAL_BFP" }, filters), /FORBIDDEN_ROLE/);
    await assert.rejects(() => provincial.listManagedApplications({ ...actor, province: "Other" }, filters), /FORBIDDEN_PROVINCE/);
  } finally { await db.close(); }
});

test("verified registry APIs preserve municipal assignment and provincial authorization before listing", async () => {
  let municipalCalls = 0;
  const municipalRoute = loadServerModule("app/api/municipal-bfp/resident-applications/route.ts", {
    "next/server": next,
    "../../../../lib/resident-applications/service": { getMunicipalReviewer: async request => request.reviewer, listResidentApplications: async municipalityId => { municipalCalls++; assert.equal(municipalityId, MUNICIPALITY); return [{ id: 10, status: "VERIFIED", accountStatus: "ACTIVE" }]; } },
  });
  assert.equal((await municipalRoute.GET({ reviewer: null })).status, 401);
  assert.equal((await municipalRoute.GET({ reviewer: { municipalityId: null } })).status, 401);
  assert.equal(municipalCalls, 0);
  const municipalResponse = await municipalRoute.GET({ reviewer: { municipalityId: MUNICIPALITY, municipalityName: "Hamtic" } });
  assert.equal(municipalResponse.status, 200); assert.equal((await municipalResponse.json()).municipality, "Hamtic"); assert.equal(municipalCalls, 1);

  let provincialCalls = 0;
  const rejected = Response.json({ error: "Sign-in required" }, { status: 401 });
  const provincialRoute = loadServerModule("app/api/provincial-bfp/resident-applications/route.ts", {
    "next/server": next,
    "../../../../lib/provincial-bfp/auth": { getManagementActor: async request => request.actor ?? rejected, isProvincialAuthorizationResponse: value => value instanceof Response },
    "../../../../lib/provincial-bfp/management/filters": loadServerModule("lib/provincial-bfp/management/filters.ts", {}),
    "../../../../lib/provincial-bfp/management/applications": { listManagedApplications: async (identity, filters) => { provincialCalls++; assert.equal(identity, actor); assert.equal(filters.municipalityId, MUNICIPALITY); return { items: [], total: 0 }; } },
  });
  assert.equal(await provincialRoute.GET({}), rejected); assert.equal(provincialCalls, 0);
  const response = await provincialRoute.GET({ actor, nextUrl: new URL(`https://alab.test/api?municipalityId=${MUNICIPALITY}&status=VERIFIED`) });
  assert.equal(response.status, 200); assert.equal(provincialCalls, 1);
});
