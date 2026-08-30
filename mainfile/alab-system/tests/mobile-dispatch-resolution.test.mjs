import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const source = (path) => readFileSync(join(process.cwd(), path), "utf8");

test("BFP mobile dispatches cannot resolve incidents", () => {
  const route = source("app/api/mobile-bfp/dispatches/[dispatchId]/route.ts");
  const service = source("lib/municipal-bfp/dispatch.ts");

  assert.doesNotMatch(route, /RESOLVE_INCIDENT/);
  assert.doesNotMatch(route, /resolveDispatchIncident/);
  assert.match(service, /resolveMunicipalIncident/);
  assert.match(service, /canMunicipalResolveReport/);
  assert.doesNotMatch(service, /row\.status !== "RESPONDING"/);
  assert.match(service, /update incident_dispatches\s+set status = 'COMPLETED'/);
  assert.doesNotMatch(service, /resolved_at/);
});
