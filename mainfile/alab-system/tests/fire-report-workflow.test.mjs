import assert from "node:assert/strict";
import test from "node:test";

test("fire report workflow exposes validated operational lifecycle utilities", async () => {
  const validation = await import("../lib/fire-reports/validation.ts");
  assert.equal(validation.canTransitionReportStatus("SUBMITTED", "RESPONDING"), true);
  assert.equal(validation.canTransitionReportStatus("RESOLVED", "RESPONDING"), false);
  assert.equal(validation.canMunicipalResolveReport("RESPONDING"), true);
  assert.equal(validation.canMunicipalResolveReport("FIRETRUCK_DISPATCHED"), true);
  assert.equal(validation.canMunicipalResolveReport("RESPONDER_ARRIVED"), true);
  assert.equal(validation.canMunicipalResolveReport("RESOLVED"), false);
});
