import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { PGlite } from "@electric-sql/pglite";

const root = process.cwd();
const source = (path) => readFileSync(join(root, path), "utf8");

test("two responders calling for backup at once produce one request, not an error", async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      create table incident_backup_requests(
        id uuid primary key default gen_random_uuid(),
        fire_report_id uuid not null,
        municipality_id uuid not null,
        requested_by_user_id uuid not null,
        status text not null default 'PENDING_MUNICIPAL',
        auto_forward_at timestamptz not null default now() + interval '60 seconds',
        created_at timestamptz not null default now()
      );
      create unique index incident_backup_requests_open_idx
        on incident_backup_requests (fire_report_id)
        where status in ('PENDING_MUNICIPAL', 'FORWARDED_PROVINCIAL');
    `);

    const insert = (userId) =>
      db.query(
        `insert into incident_backup_requests
           (fire_report_id, municipality_id, requested_by_user_id)
         select $1, $2, $3
          where not exists (
            select 1 from incident_backup_requests
             where fire_report_id = $1
               and status in ('PENDING_MUNICIPAL','FORWARDED_PROVINCIAL')
          )
         returning id`,
        [
          "aaaaaaaa-0000-0000-0000-000000000001",
          "bbbbbbbb-0000-0000-0000-000000000001",
          userId,
        ],
      );

    const first = await insert("cccccccc-0000-0000-0000-000000000001");
    assert.equal(first.rows.length, 1, "the first responder raises the request");

    // The second responder on the same fire must be refused cleanly, which is
    // what the mobile app turns into "backup was already requested" rather
    // than a generic failure.
    const second = await insert("cccccccc-0000-0000-0000-000000000002");
    assert.equal(second.rows.length, 0, "the second is refused without an error");

    const all = await db.query(
      `select count(*)::int as count from incident_backup_requests
        where fire_report_id = 'aaaaaaaa-0000-0000-0000-000000000001'`,
    );
    assert.equal(all.rows[0].count, 1, "exactly one open request exists");

    // Once the first is resolved, a later fire on the same incident can raise
    // a new request: the index only guards the open ones.
    await db.query(
      `update incident_backup_requests set status = 'RESOLVED'
        where fire_report_id = 'aaaaaaaa-0000-0000-0000-000000000001'`,
    );
    const third = await insert("cccccccc-0000-0000-0000-000000000003");
    assert.equal(third.rows.length, 1, "a new request is allowed once the last closed");
  } finally {
    await db.close();
  }
});

test("the insert guards itself rather than trusting a separate read", () => {
  const service = source("lib/incidents/backup-escalation.ts");

  // The defect: a select-then-insert let two concurrent calls both pass the
  // check, and the loser struck the unique index as an unmapped 23505.
  assert.match(service, /where not exists \(/);
  assert.match(service, /=== "23505"/);
  assert.match(service, /BACKUP_ALREADY_REQUESTED/);
});

test("an unacknowledged request still rings after it has escalated", () => {
  const alarm = source("app/_components/municipal-backup-alarm.tsx");
  const service = source("lib/incidents/backup-escalation.ts");

  // Gating on PENDING_MUNICIPAL alone meant a request that auto-forwarded
  // before the next 5s poll never rang at the station that raised it.
  assert.match(alarm, /!request\.acknowledgedAt/);
  assert.match(alarm, /request\.status === "FORWARDED_PROVINCIAL"/);
  // ...and it has to be silenceable once it is showing.
  assert.match(
    service,
    /where id = \$1 and status in \('PENDING_MUNICIPAL','FORWARDED_PROVINCIAL'\)/,
  );
});

test("a forwarded request is not offered a second forward", () => {
  const alarm = source("app/_components/municipal-backup-alarm.tsx");

  assert.match(alarm, /alreadyForwarded/);
  assert.match(alarm, /\{!alreadyForwarded && \(/);
  assert.match(alarm, /Already escalated to the province/);
});

test("photo uploads fail with an instruction rather than a raw timeout", () => {
  const api = source(
    "../../apps/bfp_mobile_app/flutter_application_1/lib/services/mobile_bfp_api.dart",
  );

  assert.match(api, /_uploadTimeout/);
  assert.match(api, /on TimeoutException/);
  assert.match(api, /on http\.ClientException/);
  assert.match(api, /taking too long to upload/);
});
