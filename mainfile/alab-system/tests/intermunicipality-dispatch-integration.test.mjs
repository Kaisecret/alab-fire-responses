import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const source = (path) => readFileSync(join(process.cwd(), path), "utf8");

test("both dispatch transactions create nearby observers after assignment", () => {
  for (const path of [
    "lib/municipal-bfp/dispatch.ts",
    "lib/municipal-bfp/phone-incidents.ts",
  ]) {
    const service = source(path);
    assert.match(service, /createNearbyIncidentObservers/);
    assert.match(service, /latitude/);
    assert.match(service, /longitude/);
    assert.match(service, /withTransaction/);
  }
});

test("municipal resolution closes assistance before ending observer access", () => {
  const service = source("lib/municipal-bfp/dispatch.ts");
  const closeIndex = service.indexOf("closeIncidentAssistance");
  const endIndex = service.indexOf("endIncidentObservers");
  assert.ok(closeIndex >= 0);
  assert.ok(endIndex > closeIndex);
});

test("assigned incident connects selection, monitoring, backup, provincial oversight, and closure", () => {
  const files = {
    dispatch: source("lib/municipal-bfp/dispatch.ts"),
    observers: source("lib/intermunicipality/observers.ts"),
    assistance: source("lib/intermunicipality/assistance.ts"),
    access: source("lib/intermunicipality/incident-access.ts"),
    provincial: source("lib/intermunicipality/provincial.ts"),
  };
  assert.match(files.dispatch, /createNearbyIncidentObservers/);
  assert.match(files.observers, /NEARBY_INCIDENT_ASSIGNED/);
  assert.match(files.observers, /acknowledgeNearbyIncident/);
  assert.match(files.observers, /OBSERVER_ALERT_ACKNOWLEDGED/);
  assert.match(files.access, /observer_municipality_id/);
  assert.match(files.assistance, /ASSISTANCE_REQUESTED/);
  assert.match(files.provincial, /intermunicipal_assistance_requests/);
  assert.match(files.dispatch, /closeIncidentAssistance/);
  assert.match(files.dispatch, /endIncidentObservers/);
});

