import assert from "node:assert/strict";
import test from "node:test";
import { loadServerModule } from "./helpers/load-server-module.mjs";

const { groupWaterSourceMapMarkers } = loadServerModule("lib/water-sources/map-positions.ts");

const centers = { Belison: [10.8374, 121.9621], Hamtic: [10.704, 121.982] };
const source = (id, municipalityName, latitude, longitude, recordOrigin = "BFP_LOCATOR_CHART_2018") => ({
  id,
  municipalityId: `${municipalityName}-id`,
  municipalityName,
  sourceKind: "FIRE_HYDRANT",
  quantity: 1,
  exactLocation: `${id} location`,
  latitude,
  longitude,
  typeColor: "Wet Barrel",
  recordOrigin,
  createdAt: "2018-06-26T00:00:00Z",
});

test("19 offshore Belison paper coordinates produce 19 distinct test-only positions near town", () => {
  const offshore = Array.from({ length: 19 }, (_, index) =>
    source(`belison-${String(index + 1).padStart(2, "0")}`, "Belison", 10.5010801, 121.573797));
  const groups = groupWaterSourceMapMarkers([
    ...offshore,
    source("hamtic-1", "Hamtic", 10.7011186, 121.9817536),
  ], centers);

  assert.equal(groups.length, 20);
  const mockGroups = groups.filter((group) => group.approximate);
  assert.equal(mockGroups.length, 19);
  assert.equal(new Set(mockGroups.map((group) => group.point.join(","))).size, 19);
  for (const group of mockGroups) {
    assert.equal(group.testOnly, true);
    assert.equal(group.sources.length, 1);
    assert.ok(group.point[0] > 10.832 && group.point[0] < 10.843);
    assert.ok(group.point[1] > 121.962 && group.point[1] < 121.973);
    assert.equal(group.sources[0].latitude, 10.5010801);
    assert.equal(group.sources[0].longitude, 121.573797);
  }
  assert.deepEqual(groups.find((group) => !group.approximate)?.point, [10.7011186, 121.9817536]);
});

test("a corrected Belison coordinate is shown at its exact point", () => {
  const groups = groupWaterSourceMapMarkers([
    source("corrected", "Belison", 10.83817, 121.95924),
    source("old-chart", "Belison", 10.5010801, 121.573797),
  ], centers);

  assert.equal(groups.length, 2);
  assert.deepEqual(groups.find((group) => group.sources[0].id === "corrected")?.point, [10.83817, 121.95924]);
  assert.equal(groups.find((group) => group.sources[0].id === "corrected")?.approximate, false);
  assert.equal(groups.find((group) => group.sources[0].id === "corrected")?.testOnly, false);
});

test("manual entries keep their recorded coordinates even outside the municipality", () => {
  const groups = groupWaterSourceMapMarkers([
    source("manual", "Belison", 10.5010801, 121.573797, "MUNICIPAL_ENTRY"),
  ], centers);

  assert.deepEqual(groups[0].point, [10.5010801, 121.573797]);
  assert.equal(groups[0].approximate, false);
});

test("test-only Belison positions stay tied to a record when API order changes", () => {
  const a = source("belison-a", "Belison", 10.5010801, 121.573797);
  const b = source("belison-b", "Belison", 10.5027853, 121.571982);
  const normal = groupWaterSourceMapMarkers([a, b], centers);
  const reversed = groupWaterSourceMapMarkers([b, a], centers);

  assert.deepEqual(
    Object.fromEntries(normal.map((group) => [group.sources[0].id, group.point])),
    Object.fromEntries(reversed.map((group) => [group.sources[0].id, group.point])),
  );
});
