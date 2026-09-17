import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { PGlite } from "@electric-sql/pglite";

const root = process.cwd();
const source = (path) => readFileSync(join(root, path), "utf8");

test("the provincial alarm is mounted in the shell, not on a single page", () => {
  const layout = source("app/_components/provincial-bfp-layout.tsx");

  // Mounting it on one page was the original defect: a forwarded request only
  // surfaced if the duty officer happened to be on the assistance screen.
  assert.match(layout, /import \{ ProvincialBackupAlarm \}/);
  assert.match(layout, /<ProvincialBackupAlarm \/>/);
});

test("the provincial alarm raises a dialog and sounds until it is acknowledged", () => {
  const alarm = source("app/_components/provincial-backup-alarm.tsx");

  assert.match(alarm, /role="alertdialog"/);
  assert.match(alarm, /aria-modal="true"/);
  assert.match(alarm, /AudioContext/);
  assert.match(alarm, /startProvincialTone/);
  // Only unacknowledged requests ring.
  assert.match(alarm, /!request\.provincialAcknowledgedAt/);
  // Acknowledging silences the tone rather than only hiding the dialog.
  assert.match(alarm, /stopToneRef\.current\?\.\(\)/);
});

test("the provincial acknowledgement is recorded apart from the municipal one", async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      create table users(id uuid primary key);
      create table incident_backup_requests(
        id uuid primary key,
        status text not null,
        acknowledged_at timestamptz,
        acknowledged_by_user_id uuid,
        provincial_acknowledged_at timestamptz,
        provincial_acknowledged_by_user_id uuid,
        updated_at timestamptz not null default now()
      );
      insert into users values ('11111111-1111-1111-1111-111111111111');
      -- A request the municipality acknowledged before forwarding it on.
      insert into incident_backup_requests(id, status, acknowledged_at)
        values ('22222222-2222-2222-2222-222222222222', 'FORWARDED_PROVINCIAL', now());
    `);

    const before = await db.query(
      `select acknowledged_at, provincial_acknowledged_at
         from incident_backup_requests
        where id = '22222222-2222-2222-2222-222222222222'`,
    );
    // The municipality had seen it, but the province has not: this is exactly
    // the case that must still ring.
    assert.ok(before.rows[0].acknowledged_at !== null);
    assert.equal(before.rows[0].provincial_acknowledged_at, null);

    await db.query(
      `update incident_backup_requests
          set provincial_acknowledged_by_user_id = $2,
              provincial_acknowledged_at = coalesce(provincial_acknowledged_at, now()),
              updated_at = now()
        where id = $1 and status = 'FORWARDED_PROVINCIAL'`,
      ["22222222-2222-2222-2222-222222222222", "11111111-1111-1111-1111-111111111111"],
    );

    const after = await db.query(
      `select provincial_acknowledged_at, provincial_acknowledged_by_user_id
         from incident_backup_requests
        where id = '22222222-2222-2222-2222-222222222222'`,
    );
    assert.ok(after.rows[0].provincial_acknowledged_at !== null);
    assert.equal(
      after.rows[0].provincial_acknowledged_by_user_id,
      "11111111-1111-1111-1111-111111111111",
    );

    // A request still with the municipality is never marked by that statement.
    await db.query(
      `insert into incident_backup_requests(id, status)
         values ('33333333-3333-3333-3333-333333333333', 'PENDING_MUNICIPAL')`,
    );
    await db.query(
      `update incident_backup_requests
          set provincial_acknowledged_at = now()
        where id = '33333333-3333-3333-3333-333333333333'
          and status = 'FORWARDED_PROVINCIAL'`,
    );
    const untouched = await db.query(
      `select provincial_acknowledged_at from incident_backup_requests
        where id = '33333333-3333-3333-3333-333333333333'`,
    );
    assert.equal(untouched.rows[0].provincial_acknowledged_at, null);
  } finally {
    await db.close();
  }
});

test("the escalation query serves the province its unacknowledged requests", () => {
  const service = source("lib/incidents/backup-escalation.ts");

  assert.match(service, /export async function acknowledgeProvincialBackupRequest/);
  assert.match(service, /provincial_acknowledged_at as "provincialAcknowledgedAt"/);
  // The municipal acknowledgement must stay scoped to municipal rows.
  assert.match(service, /where id = \$1 and status = 'PENDING_MUNICIPAL'/);
  assert.match(service, /where id = \$1 and status = 'FORWARDED_PROVINCIAL'/);
});

test("the provincial route accepts an acknowledgement", () => {
  const route = source("app/api/provincial-bfp/backup-requests/route.ts");

  assert.match(route, /export async function PATCH/);
  assert.match(route, /acknowledgeProvincialBackupRequest/);
  assert.match(route, /requireProvincialBfp/);
});
