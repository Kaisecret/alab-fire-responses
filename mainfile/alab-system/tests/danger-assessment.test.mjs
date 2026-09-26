import assert from "node:assert/strict";
import test from "node:test";

const unavailableDensity = {
  status: "INSUFFICIENT_DATA", confidence: "UNAVAILABLE", buildingCount: 0,
  minimumGapMeters: null, source: null, assessedAt: new Date(), evidence: [],
};

test("shared report assessment adds mapped-building distance to vegetation scoring", async () => {
  const { assessReportDanger } = await import("../lib/fire-reports/danger-assessment.ts");
  let queried = 0;
  const client = { query: async () => { queried++; return { rows: [{ distanceMeters: 20 }] }; } };
  const result = await assessReportDanger(client, {
    fireType: "FOREST", windSpeedKph: 42, temperatureC: 35, relativeHumidity: 40,
    routeAccessibility: "INTERIOR_ALLEY_ESKINITA",
  }, unavailableDensity, 10.7431, 121.9272);
  assert.equal(queried, 1);
  assert.equal(result.assessment.level, "CRITICAL");
  assert.ok(result.assessment.factors.some((factor) => factor.includes("mapped building")));
});

test("shared report assessment preserves automatic dense-house evidence for rule fires", async () => {
  const { assessReportDanger } = await import("../lib/fire-reports/danger-assessment.ts");
  const client = { query: async () => { throw new Error("vehicle should not query distance"); } };
  const result = await assessReportDanger(client, { fireType: "VEHICLE" }, {
    ...unavailableDensity, status: "DENSE_CLUSTER_DETECTED", confidence: "HIGH",
    buildingCount: 3, minimumGapMeters: 1.4, source: "GOOGLE_OPEN_BUILDINGS_V3_2023_05",
  }, 10.7431, 121.9272);
  assert.equal(result.assessment.level, "HIGH");
  assert.equal(result.densityContext.effectiveHouseDensity, "PACKED_MAGKAKADIKIT");
  assert.ok(result.assessment.factors.some((factor) => factor.includes("Automatic map assessment")));
});

test("vegetation factors describe its criteria without adding house-density criterion", async () => {
  const { assessReportDanger } = await import("../lib/fire-reports/danger-assessment.ts");
  const client = { query: async () => ({ rows: [{ distanceMeters: 30 }] }) };
  const result = await assessReportDanger(client, { fireType: "GRASS" }, {
    ...unavailableDensity, status: "DENSE_CLUSTER_DETECTED", confidence: "HIGH",
    buildingCount: 3, minimumGapMeters: 1.4, source: "GOOGLE_OPEN_BUILDINGS_V3_2023_05",
  }, 10.7431, 121.9272);
  assert.ok(result.assessment.factors.some((factor) => factor.includes("mapped building")));
  assert.ok(result.assessment.factors.every((factor) => !factor.includes("dense building cluster")));
});
