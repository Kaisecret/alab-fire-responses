import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const source = (path) => readFileSync(join(process.cwd(), path), "utf8");

test("observer service persists ranked snapshots and emits scoped notifications", () => {
  const service = source("lib/intermunicipality/observers.ts");
  assert.match(service, /rankNearbyMunicipalities/);
  assert.match(service, /status = 'ACTIVE'/);
  assert.match(service, /municipality_id <> \$1/);
  assert.match(service, /exists[\s\S]*?users/i);
  assert.match(service, /account_status = 'ACTIVE'/i);
  assert.match(service, /insert into incident_municipal_observers/i);
  assert.match(service, /listMunicipalNotificationRecipients/);
  assert.match(service, /listProvincialNotificationRecipients/);
  assert.match(service, /NEARBY_INCIDENT_ASSIGNED/);
  assert.match(service, /NEARBY_MONITORING_STARTED/);
  assert.match(service, /NEARBY_SELECTION_DEGRADED/);
  assert.match(service, /recordCoordinationEvent/);
});

test("observer acknowledgment is scoped, idempotent, and audited", () => {
  const service = source("lib/intermunicipality/observers.ts");
  assert.match(service, /export async function acknowledgeNearbyIncident/);
  assert.match(service, /observer_municipality_id = \$2/i);
  assert.match(service, /acknowledged_at = coalesce/i);
  assert.match(service, /OBSERVER_ALERT_ACKNOWLEDGED/);
});

test("observer lifecycle ends access without deleting snapshots", () => {
  const service = source("lib/intermunicipality/observers.ts");
  assert.match(service, /export async function endIncidentObservers/);
  assert.match(service, /set status = 'ENDED'/);
  assert.match(service, /ended_at = \$1/);
  assert.doesNotMatch(service, /delete from incident_municipal_observers/i);
});
