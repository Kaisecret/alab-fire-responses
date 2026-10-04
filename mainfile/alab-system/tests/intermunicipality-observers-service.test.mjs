import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { loadServerModule } from "./helpers/load-server-module.mjs";

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
  const service = source("lib/intermunicipality/observers.ts")
    + source("lib/intermunicipality/observer-acknowledgment-query.mjs");
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

test("municipal acknowledgment waits for the incident lock before taking an observer lock", async () => {
  let releaseReport;
  const reportLock = new Promise(resolve => { releaseReport = resolve; });
  let observerReads = 0;
  const events = [];
  const client = {
    async query(sql, params) {
      if (/from fire_reports/i.test(sql)) {
        assert.match(sql, /for update/i);
        assert.deepEqual(params, ["fire-1"]);
        await reportLock;
      }
      return { rows: [] };
    },
  };
  const service = loadServerModule("lib/intermunicipality/observers.ts", {
    "../db": { withTransaction: work => work(client) },
    "../notifications/service": {},
    "./audit": { recordCoordinationEvent: async (_, event) => events.push(event) },
    "./proximity": {},
    "./observer-acknowledgment-query.mjs": {
      findObserverForAcknowledgment: async () => {
        observerReads++;
        return { id: "observer-1", fire_report_id: "fire-1", dispatch_id: "dispatch-1",
          origin_municipality_id: "origin", observer_municipality_id: "nearby",
          observer_municipality_name: "Nearby", station_name: "Nearby BFP", nearest_station_id: null,
          distance_meters: "1000", status: "ACTIVE", acknowledged_at: null, acknowledged_by_user_id: null };
      },
    },
  });
  const pending = service.acknowledgeNearbyIncident({ fireReportId: "fire-1", observerMunicipalityId: "nearby",
    actorUserId: "officer", acknowledgedAt: new Date("2026-10-04T00:00:00Z") });
  try {
    await Promise.resolve();
    assert.equal(observerReads, 0, "an assignment holding the incident must not leave acknowledgment holding its observer");
  } finally {
    releaseReport();
    await pending;
  }
  assert.equal(observerReads, 1);
  assert.equal(events[0].eventType, "OBSERVER_ALERT_ACKNOWLEDGED");
});
