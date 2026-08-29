import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();

test("station-team dispatch migration models per-station recipients and secure mobile devices", () => {
  const name = readdirSync(join(root, "supabase", "migrations"))
    .find((file) => file.endsWith("_add_station_team_mobile_dispatch.sql"));
  assert.ok(name, "station-team mobile dispatch migration is missing");

  const migration = readFileSync(join(root, "supabase", "migrations", name), "utf8");
  for (const table of [
    "incident_dispatches",
    "incident_dispatch_stations",
    "incident_dispatch_recipients",
    "bfp_mobile_devices",
    "push_notification_deliveries",
  ]) assert.match(migration, new RegExp(`create table public\\.${table}`, "i"));

  assert.match(migration, /unique index[\s\S]+incident_dispatches_one_active_report_idx/i);
  assert.match(migration, /unique \(dispatch_id, recipient_user_id\)/i);
  assert.match(migration, /unique \(user_id, installation_id\)/i);
  assert.match(migration, /fcm_token text not null unique/i);
  assert.match(migration, /enable row level security/i);
  assert.doesNotMatch(migration, /grant .*?(?:incident_dispatches|bfp_mobile_devices).*?(?:anon|authenticated)/i);
});
