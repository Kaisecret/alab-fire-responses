import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (path) => readFileSync(join(root, ...path.split("/")), "utf8");

test("municipality density presentation distinguishes detected, clear, and unavailable assessments", async () => {
  const { densityRiskClass, densityAssessmentCopy } = await import("../lib/fire-reports/building-density-presentation.ts");

  assert.equal(densityRiskClass("DENSE_CLUSTER_DETECTED", "HIGH"), "density-critical");
  assert.equal(densityRiskClass("DENSE_CLUSTER_DETECTED", "MEDIUM"), "density-warning");
  assert.equal(densityRiskClass("NO_DENSE_CLUSTER_DETECTED", "MEDIUM"), "density-clear");
  assert.equal(densityRiskClass("INSUFFICIENT_DATA", "UNAVAILABLE"), "density-unknown");
  assert.match(densityAssessmentCopy("DENSE_CLUSTER_DETECTED"), /Dense building cluster detected/);
  assert.match(densityAssessmentCopy("INSUFFICIENT_DATA"), /Insufficient mapped-building data/);
});

test("municipal incident feeds expose automatic density summary fields with legacy fallbacks", () => {
  const feed = read("app/api/municipal-bfp/incidents/route.ts");
  const detail = read("app/api/municipal-bfp/incidents/[id]/route.ts");

  for (const source of [feed, detail]) {
    assert.match(source, /detectedBuildingDensity/);
    assert.match(source, /buildingDensityConfidence/);
    assert.match(source, /buildingDensityBuildingCount/);
  }
});

test("municipal density evidence endpoint is municipality-scoped and returns GeoJSON attribution", () => {
  const route = read("app/api/municipal-bfp/incidents/[id]/building-density/route.ts");

  assert.match(route, /fr\.municipality_id = \$2/);
  assert.match(route, /ST_AsGeoJSON/);
  assert.match(route, /FeatureCollection/);
  assert.match(route, /CC BY 4\.0/);
  assert.match(route, /Google Research Open Buildings V3/);
});

test("municipal GIS map uses live refresh and renders density evidence", () => {
  const map = read("app/_components/municipal-gis-operations-map.tsx");

  assert.doesNotMatch(map, /autoRefresh:\s*false/);
  assert.match(map, /building-density/);
  assert.match(map, /geoJSON/);
  assert.match(map, /Mapped building-density evidence/);
});
