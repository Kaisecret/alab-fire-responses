import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const source = (path) => readFileSync(join(root, path), "utf8");

test("dispatch service selects only active station personnel and keeps assignment writes atomic", () => {
  const path = "lib/municipal-bfp/dispatch.ts";
  assert.equal(existsSync(join(root, path)), true, `${path} is missing`);
  const service = source(path);

  assert.match(service, /export async function listDispatchableStations/);
  assert.match(service, /export async function dispatchIncidentToStations/);
  assert.match(service, /municipal_bfp_stations/);
  assert.match(service, /bfp_station_assignments/);
  assert.match(service, /u\.account_status = 'ACTIVE'/);
  assert.match(service, /incident_dispatches/);
  assert.match(service, /incident_dispatch_stations/);
  assert.match(service, /incident_dispatch_recipients/);
  assert.match(service, /createAccountNotifications/);
  assert.match(service, /INCIDENT_DISPATCH_ASSIGNED/);
  assert.match(service, /withTransaction/);
  assert.match(service, /for update of fr/i);
  assert.doesNotMatch(service, /body\.municipalityId/);
});

test("notification domain recognizes an individual station dispatch event", () => {
  const types = source("lib/notifications/types.ts");
  assert.match(types, /INCIDENT_DISPATCH_ASSIGNED/);
});
