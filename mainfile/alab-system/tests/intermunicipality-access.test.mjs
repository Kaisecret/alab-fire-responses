import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const source = (path) => readFileSync(join(process.cwd(), path), "utf8");

test("municipal incident access resolves origin and selected observer scopes", () => {
  const service = source("lib/intermunicipality/incident-access.ts");
  assert.match(service, /export async function resolveMunicipalIncidentAccess/);
  assert.match(service, /origin_municipality_id = \$[0-9]+/i);
  assert.match(service, /observer_municipality_id = \$[0-9]+/i);
  assert.match(service, /observer\.status = 'ACTIVE'/i);
  assert.match(service, /"ORIGIN"/);
  assert.match(service, /"OBSERVER"/);
});

test("observer detail query never selects protected reporter fields", () => {
  const service = source("lib/intermunicipality/incident-access.ts");
  const start = service.indexOf("const OBSERVER_INCIDENT_QUERY");
  const end = service.indexOf("const COORDINATION_CONTEXT_QUERY");
  assert.ok(start >= 0 && end > start);
  const observerQuery = service.slice(start, end);
  for (const forbidden of [
    "resident_profiles",
    "resident_addresses",
    "caller_name",
    "caller_phone",
    "reporter_name_snapshot",
    "reporter_phone_snapshot",
    "reporter_ip_address",
    "reporter_device_summary",
    "fire_report_photos",
  ]) {
    assert.doesNotMatch(observerQuery, new RegExp(forbidden, "i"));
  }
});

test("municipal APIs delegate scope decisions to the access service", () => {
  const queue = source("app/api/municipal-bfp/incidents/route.ts");
  const detail = source("app/api/municipal-bfp/incidents/[id]/route.ts");
  assert.match(queue, /listScopedMunicipalIncidents/);
  assert.match(detail, /resolveMunicipalIncidentAccess/);
  assert.match(detail, /getObserverIncidentDetail/);
  assert.match(detail, /getIncidentCoordinationContext/);
});

test("coordination context exposes acknowledgment without widening observer access", () => {
  const service = source("lib/intermunicipality/incident-access.ts");
  assert.match(service, /acknowledged_by_user_id/);
  assert.match(service, /acknowledged_at/);
  assert.match(service, /BACKUP_REQUESTED/);
  assert.match(service, /SEEN/);
  assert.match(service, /WAITING/);
});
