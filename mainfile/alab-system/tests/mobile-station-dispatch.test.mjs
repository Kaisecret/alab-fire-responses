import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const source = (path) => readFileSync(join(root, path), "utf8");

test("mobile responders receive only their dispatches and can start route or report location", () => {
  const paths = ["app/api/mobile-bfp/dispatches/route.ts", "app/api/mobile-bfp/dispatches/[dispatchId]/route.ts"];
  for (const path of paths) assert.equal(existsSync(join(root, path)), true, `${path} is missing`);
  const combined = paths.map(source).join("\n");
  assert.match(combined, /requireMobileMunicipalBfp/);
  assert.match(combined, /listMobileDispatchAssignments/);
  assert.match(combined, /acknowledgeDispatchRoute/);
  assert.match(combined, /recordDispatchLocation/);
  assert.match(combined, /START_ROUTE/);
  assert.match(combined, /LOCATION_PING/);
  assert.doesNotMatch(combined, /RESOLVE_INCIDENT/);
});

test("dispatch service uses the approved 100-meter, 30-second automatic arrival rule", () => {
  const service = source("lib/municipal-bfp/dispatch.ts");
  assert.match(service, /metersAway > 100/);
  assert.match(service, /candidateSeconds < 30/);
  assert.match(service, /'AUTO_GEOFENCE'/);
  assert.match(service, /'RESPONDER_ARRIVED'/);
});
