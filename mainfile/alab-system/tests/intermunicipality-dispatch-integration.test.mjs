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
