import assert from "node:assert/strict";
import test from "node:test";
import { loadServerModule } from "./helpers/load-server-module.mjs";

const { groupWaterSourceMapMarkers } = loadServerModule("lib/water-sources/map-positions.ts");

const centers = { Belison: [10.8374, 121.9621], Hamtic: [10.704, 121.982] };
const source = (id, municipalityName, latitude, longitude) => ({
  id,
  municipalityName,
  latitude,
  longitude,
});

test("offshore Belison paper coordinates produce one clearly approximate municipal marker", () => {
  const groups = groupWaterSourceMapMarkers([
    source("belison-1", "Belison", 10.5010801, 121.573797),
    source("belison-2", "Belison", 10.5027853, 121.571982),
    source("hamtic-1", "Hamtic", 10.7011186, 121.9817536),
  ], centers);

  assert.equal(groups.length, 2);
  assert.deepEqual(groups.find((group) => group.approximate)?.sources.map((item) => item.id), ["belison-1", "belison-2"]);
  assert.deepEqual(groups.find((group) => group.approximate)?.point, [10.8374, 121.9621]);
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
});
