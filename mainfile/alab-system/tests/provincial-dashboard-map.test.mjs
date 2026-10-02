import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { loadServerModule } from "./helpers/load-server-module.mjs";

let map = {};
try {
  map = loadServerModule("lib/provincial-bfp/dashboard-map.ts", {});
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}

const boundary = JSON.parse(readFileSync("public/data/antique-boundary.geojson", "utf8"));
const incident = (id, latitude, longitude, status = "VERIFIED") => ({ id, latitude, longitude, status });

test("dashboard maps mainland Antique and Caluya while excluding nearby provinces", () => {
  assert.equal(typeof map.groupAntiqueDashboardIncidents, "function");
  const groups = map.groupAntiqueDashboardIncidents([
    incident("hamtic", 10.704, 121.982),
    incident("caluya", 11.934, 121.548),
    incident("iloilo", 10.72, 122.56),
    incident("aklan", 11.7, 122.3),
  ], boundary);
  assert.deepEqual(groups.flatMap(group => group.incidents.map(row => row.id)), ["hamtic", "caluya"]);
});

test("dashboard counts reports at the same location together without losing their records", () => {
  assert.equal(typeof map.groupAntiqueDashboardIncidents, "function");
  const groups = map.groupAntiqueDashboardIncidents([
    incident("first", 10.70401, 121.98201),
    incident("second", 10.70402, 121.98202),
    incident("other", 11.289, 122.048),
  ], boundary);
  assert.equal(groups.length, 2);
  assert.deepEqual(groups[0].incidents.map(row => row.id), ["first", "second"]);
  assert.equal(groups[0].latitude, 10.70401);
  assert.equal(groups[0].longitude, 121.98201);
});

test("dashboard never invents coordinates or maps closed incident records", () => {
  assert.equal(typeof map.groupAntiqueDashboardIncidents, "function");
  const records = [
    incident("active", 10.704, 121.982),
    incident("missing", undefined, undefined),
    incident("null", null, null),
    incident("invalid", NaN, Infinity),
    ...["RESOLVED", "REJECTED", "FALSE_REPORT", "DUPLICATE", "CLOSED"].map(status => incident(status, 10.704, 121.982, status)),
  ];
  assert.deepEqual(map.groupAntiqueDashboardIncidents(records, boundary).flatMap(group => group.incidents.map(row => row.id)), ["active"]);
});

test("Antique geofence respects polygon holes and includes boundary points", () => {
  assert.equal(typeof map.isPointInAntique, "function");
  const polygon = { type: "FeatureCollection", features: [{ type: "Feature", properties: {}, geometry: {
    type: "Polygon", coordinates: [
      [[120, 10], [123, 10], [123, 13], [120, 13], [120, 10]],
      [[121, 11], [122, 11], [122, 12], [121, 12], [121, 11]],
    ],
  } }] };
  assert.equal(map.isPointInAntique(10.5, 120.5, polygon), true);
  assert.equal(map.isPointInAntique(11.5, 121.5, polygon), false);
  assert.equal(map.isPointInAntique(10, 121, polygon), true);
  assert.equal(map.isPointInAntique(14, 121, polygon), false);
});
