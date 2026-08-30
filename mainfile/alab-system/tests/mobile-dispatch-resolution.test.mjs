import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const source = (path) => readFileSync(join(process.cwd(), path), "utf8");

test("BFP incident resolution is an on-scene action that completes the dispatch without an undefined report column", () => {
  const route = source("app/api/mobile-bfp/dispatches/[dispatchId]/route.ts");
  const service = source("lib/municipal-bfp/dispatch.ts");

  assert.match(route, /body\.action === "RESOLVE_INCIDENT"/);
  assert.match(route, /resolveDispatchIncident/);
  assert.match(service, /row\.recipient_status !== "ON_SCENE"/);
  assert.match(service, /update incident_dispatches\s+set status = 'COMPLETED'/);
  assert.doesNotMatch(service, /resolved_at/);
});
