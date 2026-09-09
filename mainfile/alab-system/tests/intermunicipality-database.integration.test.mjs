import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import pg from "pg";

const databaseUrl = process.env.DATABASE_URL;

const isDirectRun = process.argv.some((a) =>
  a.endsWith("intermunicipality-database.integration.test.mjs")
);

if (!databaseUrl) {
  if (isDirectRun && process.env.npm_lifecycle_event !== "test") {
    test("database integration requires DATABASE_URL", () => {
      assert.fail("DATABASE_URL is required to run the intermunicipality database integration test.");
    });
  } else {
    test.skip("DATABASE_URL is absent; skipping database concurrency integration test in broad test suites", () => {});
  }
} else {
  test("concurrent assistance transitions: exactly one wins and state remains consistent", { timeout: 10_000 }, async () => {
    const { Pool } = pg;
    const pool = new Pool({ connectionString: databaseUrl });

    // Dynamic import to ensure server modules use the provided DATABASE_URL
    const { transitionAssistanceRequest } = await import("../lib/intermunicipality/assistance.ts");

    const runId = randomUUID().slice(0, 8);
    const originMuniId = randomUUID();
    const recipMuniId = randomUUID();
    const originUserId = randomUUID();
    const recipUser1Id = randomUUID();
    const recipUser2Id = randomUUID();
    const stationId = randomUUID();
    const reportId = randomUUID();
    const dispatchId = randomUUID();
    const observerId = randomUUID();
    const requestId = randomUUID();

    const client = await pool.connect();
    try {
      await client.query("begin");

      // 1. Municipalities
      await client.query(
        `insert into public.municipalities (id, name, province, created_at)
         values ($1, $2, 'Antique', now()), ($3, $4, 'Antique', now())`,
        [originMuniId, `Origin_${runId}`, recipMuniId, `Recipient_${runId}`]
      );

      // 2. Users & Profiles
      for (const [uid, email, muniId, role] of [
        [originUserId, `origin_${runId}@bfp.test`, originMuniId, "MUNICIPAL_ADMIN"],
        [recipUser1Id, `recip1_${runId}@bfp.test`, recipMuniId, "MUNICIPAL_ADMIN"],
        [recipUser2Id, `recip2_${runId}@bfp.test`, recipMuniId, "MUNICIPAL_STAFF"],
      ]) {
        await client.query(
          `insert into public.users (id, email, password_hash, role, account_status, created_at)
           values ($1, $2, 'scrypt$dummy$integration', 'MUNICIPAL_BFP', 'ACTIVE', now())
           on conflict (id) do nothing`,
          [uid, email]
        );
        const profileRes = await client.query(
          `insert into public.bfp_personnel_profiles (user_id, display_name, rank_or_position)
           values ($1, $2, 'Officer')
           on conflict (user_id) do update set display_name = excluded.display_name
           returning id`,
          [uid, `Officer_${runId}`]
        );
        const profileId = profileRes.rows[0].id;
        await client.query(
          `insert into public.bfp_municipality_assignments (personnel_profile_id, municipality_id, assignment_role, status)
           values ($1, $2, $3, 'ACTIVE')
           on conflict (personnel_profile_id) do update set status = 'ACTIVE'`,
          [profileId, muniId, role]
        );
      }

      // 3. BFP Station
      await client.query(
        `insert into public.municipal_bfp_stations (id, municipality_id, station_name, status, latitude, longitude, created_at)
         values ($1, $2, $3, 'ACTIVE', 10.74, 121.94, now())`,
        [stationId, recipMuniId, `Recip Station ${runId}`]
      );

      // 4. Fire Report
      await client.query(
        `insert into public.fire_reports (
           id, reference_number, municipality_id, status, fire_type, report_source,
           latitude, longitude, description, location_method, is_within_antique,
           caller_name, caller_phone, created_by_user_id, submitted_at
         ) values (
           $1, $2, $3, 'RESPONDING', 'HOUSE_BUILDING', 'PHONE_CALL',
           10.75, 121.93, 'Integration test incident', 'GPS', true,
           'Caller Test', '+639111111111', $4, now()
         )`,
        [reportId, `TEST-${runId}`, originMuniId, originUserId]
      );

      // 5. Active Dispatch
      await client.query(
        `insert into public.incident_dispatches (
           id, fire_report_id, municipality_id, dispatched_by_user_id, status, dispatched_at, created_at, updated_at
         ) values ($1, $2, $3, $4, 'ACTIVE', now(), now(), now())`,
        [dispatchId, reportId, originMuniId, originUserId]
      );

      // 6. Selected Observer
      await client.query(
        `insert into public.incident_municipal_observers (
           id, fire_report_id, dispatch_id, origin_municipality_id, observer_municipality_id,
           nearest_station_id, station_latitude_snapshot, station_longitude_snapshot,
           distance_meters, status, selected_at
         ) values ($1, $2, $3, $4, $5, $6, 10.74, 121.94, 1500, 'ACTIVE', now())`,
        [observerId, reportId, dispatchId, originMuniId, recipMuniId, stationId]
      );

      // 7. Open Assistance Request
      await client.query(
        `insert into public.intermunicipal_assistance_requests (
           id, fire_report_id, dispatch_id, observer_id, requester_municipality_id,
           recipient_municipality_id, requested_by_user_id, requested_firetrucks,
           requested_personnel, request_note, status, requested_at, updated_at
         ) values ($1, $2, $3, $4, $5, $6, $7, 2, 8, 'Urgent mutual aid needed', 'REQUESTED', now(), now())`,
        [requestId, reportId, dispatchId, observerId, originMuniId, recipMuniId, originUserId]
      );

      await client.query("commit");
    } catch (e) {
      await client.query("rollback");
      throw e;
    } finally {
      client.release();
    }

    // Two concurrent transition attempts
    const [result1, result2] = await Promise.allSettled([
      transitionAssistanceRequest({
        requestId,
        actorMunicipalityId: recipMuniId,
        actorUserId: recipUser1Id,
        action: "ACCEPT",
        offeredFiretrucks: 2,
        offeredPersonnel: 8,
        responseNote: "Accepting request fully",
      }),
      transitionAssistanceRequest({
        requestId,
        actorMunicipalityId: recipMuniId,
        actorUserId: recipUser2Id,
        action: "REJECT",
        offeredFiretrucks: 0,
        offeredPersonnel: 0,
        responseNote: "Station currently depleted",
      }),
    ]);

    // Exactly one operation commits and the other is rejected
    const fulfilled = [result1, result2].filter((r) => r.status === "fulfilled");
    const rejected = [result1, result2].filter((r) => r.status === "rejected");

    assert.equal(fulfilled.length, 1, "Exactly one transition must succeed");
    assert.equal(rejected.length, 1, "Exactly one transition must fail due to state conflict");

    // Verify row has a single consistent terminal response shape
    const checkClient = await pool.connect();
    try {
      const rowRes = await checkClient.query(
        `select status, offered_firetrucks, offered_personnel, response_note, responded_by_user_id
         from public.intermunicipal_assistance_requests
         where id = $1`,
        [requestId]
      );
      assert.equal(rowRes.rows.length, 1);
      const row = rowRes.rows[0];
      assert.ok(["ACCEPTED", "REJECTED"].includes(row.status));

      if (row.status === "ACCEPTED") {
        assert.equal(row.offered_firetrucks, 2);
        assert.equal(row.offered_personnel, 8);
        assert.equal(row.responded_by_user_id, recipUser1Id);
      } else {
        assert.equal(row.offered_firetrucks, 0);
        assert.equal(row.offered_personnel, 0);
        assert.equal(row.responded_by_user_id, recipUser2Id);
      }

      // Exactly one response coordination event exists (in addition to any initial event)
      const eventsRes = await checkClient.query(
        `select event_type from public.intermunicipal_coordination_events
         where assistance_request_id = $1 and event_type in ('ASSISTANCE_ACCEPTED', 'ASSISTANCE_REJECTED')`,
        [requestId]
      );
      assert.equal(eventsRes.rows.length, 1);
    } finally {
      checkClient.release();
      await pool.end();
    }
  });
}
