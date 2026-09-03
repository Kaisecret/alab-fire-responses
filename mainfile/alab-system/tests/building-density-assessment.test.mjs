import assert from "node:assert/strict";
import test from "node:test";

const modulePromise = import("../lib/fire-reports/building-density.ts");

const square = (offset = 0) => ({
  type: "MultiPolygon",
  coordinates: [[[
    [121.9272 + offset, 10.7431],
    [121.9273 + offset, 10.7431],
    [121.9273 + offset, 10.7432],
    [121.9272 + offset, 10.7432],
    [121.9272 + offset, 10.7431],
  ]]],
});

function row(id, distance, neighbors, confidence = 0.9, gap = 1.4) {
  return {
    sourceFeatureId: id,
    geometry: JSON.stringify(square(Number(id.slice(1)) * 0.00001)),
    sourceConfidence: String(confidence),
    distanceToIncidentMeters: String(distance),
    neighborIds: neighbors,
    minimumNeighborGapMeters: gap == null ? null : String(gap),
  };
}

function fakeClient(rows) {
  return { query: async () => ({ rows }) };
}

test("three connected footprints at the incident become a high-confidence dense cluster", async () => {
  const { assessBuildingDensity } = await modulePromise;
  const result = await assessBuildingDensity(fakeClient([
    row("b1", 0, ["b2"]),
    row("b2", 7, ["b1", "b3"]),
    row("b3", 14, ["b2"]),
  ]), 10.7431, 121.9272);

  assert.equal(result.status, "DENSE_CLUSTER_DETECTED");
  assert.equal(result.confidence, "HIGH");
  assert.equal(result.buildingCount, 3);
  assert.equal(result.minimumGapMeters, 1.4);
  assert.equal(result.evidence.length, 3);
});

test("two connected footprints do not qualify as a dense cluster", async () => {
  const { assessBuildingDensity } = await modulePromise;
  const result = await assessBuildingDensity(fakeClient([
    row("b1", 0, ["b2"]),
    row("b2", 6, ["b1"]),
  ]), 10.7431, 121.9272);

  assert.equal(result.status, "NO_DENSE_CLUSTER_DETECTED");
  assert.equal(result.buildingCount, 2);
});

test("a connected cluster without a footprint within 15 meters does not qualify", async () => {
  const { assessBuildingDensity } = await modulePromise;
  const result = await assessBuildingDensity(fakeClient([
    row("b1", 16, ["b2"]),
    row("b2", 20, ["b1", "b3"]),
    row("b3", 24, ["b2"]),
  ]), 10.7431, 121.9272);

  assert.equal(result.status, "NO_DENSE_CLUSTER_DETECTED");
});

test("a qualifying cluster with a lower source confidence is medium confidence", async () => {
  const { assessBuildingDensity } = await modulePromise;
  const result = await assessBuildingDensity(fakeClient([
    row("b1", 3, ["b2"], 0.8),
    row("b2", 8, ["b1", "b3"], 0.9),
    row("b3", 13, ["b2"], 0.9),
  ]), 10.7431, 121.9272);

  assert.equal(result.status, "DENSE_CLUSTER_DETECTED");
  assert.equal(result.confidence, "MEDIUM");
});

test("no qualifying footprints is insufficient data rather than isolated", async () => {
  const { assessBuildingDensity } = await modulePromise;
  const result = await assessBuildingDensity(fakeClient([]), 10.7431, 121.9272);

  assert.equal(result.status, "INSUFFICIENT_DATA");
  assert.equal(result.confidence, "UNAVAILABLE");
});

test("assessment errors and invalid coordinates return insufficient data without throwing", async () => {
  const { assessBuildingDensity } = await modulePromise;
  const rejectingClient = { query: async () => { throw new Error("postgis unavailable"); } };

  assert.equal((await assessBuildingDensity(rejectingClient, 10.7431, 121.9272)).status, "INSUFFICIENT_DATA");
  assert.equal((await assessBuildingDensity(fakeClient([]), Number.NaN, 121.9272)).status, "INSUFFICIENT_DATA");
});

test("automatic dense evidence wins when the resident omitted or understated density", async () => {
  const { resolveEffectiveHouseDensity } = await modulePromise;

  assert.equal(resolveEffectiveHouseDensity(null, "DENSE_CLUSTER_DETECTED"), "PACKED_MAGKAKADIKIT");
  assert.equal(resolveEffectiveHouseDensity("ISOLATED_FAR", "DENSE_CLUSTER_DETECTED"), "PACKED_MAGKAKADIKIT");
  assert.equal(resolveEffectiveHouseDensity("PACKED_MAGKAKADIKIT", "INSUFFICIENT_DATA"), "PACKED_MAGKAKADIKIT");
});

test("density severity factors use factual mapped-structure wording", async () => {
  const { densitySeverityFactors } = await modulePromise;
  const factors = densitySeverityFactors({
    status: "DENSE_CLUSTER_DETECTED",
    confidence: "HIGH",
    buildingCount: 3,
    minimumGapMeters: 1.4,
    source: "GOOGLE_OPEN_BUILDINGS_V3_2023_05",
    assessedAt: new Date("2026-09-04T00:00:00Z"),
    evidence: [],
  });

  assert.deepEqual(factors, [
    "Automatic map assessment: dense building cluster detected",
    "3 mapped structures within 30 m; minimum mapped gap 1.4 m",
    "Google Open Buildings confidence: High",
  ]);
  assert.ok(factors.every((factor) => !factor.toLowerCase().includes("confirmed houses")));
});
