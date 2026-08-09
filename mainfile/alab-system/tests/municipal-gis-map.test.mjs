import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();

test("municipal GIS page renders a MapLibre map focused on Antique", () => {
  const pagePath = join(root, "app", "municipal-bfp", "gis-map", "page.tsx");
  const mapPath = join(root, "app", "_components", "antique-gis-map.tsx");

  assert.equal(existsSync(pagePath), true, "GIS page is missing");
  assert.equal(existsSync(mapPath), true, "Antique GIS map component is missing");

  const page = readFileSync(pagePath, "utf8");
  const map = readFileSync(mapPath, "utf8");

  assert.match(page, /AntiqueGisMap/);
  assert.match(map, /maplibre-gl/);
  assert.match(map, /ANTIQUE_BOUNDS/);
  assert.match(map, /maxBounds:\s*ANTIQUE_BOUNDS/);
  assert.match(map, /Province of Antique/);
});

test("municipal GIS MapLibre markers keep the ALAB incident palette", () => {
  const mapPath = join(root, "app", "_components", "antique-gis-map.tsx");
  const map = readFileSync(mapPath, "utf8");
  const incidentCount = (map.match(/type: 'incident',/g) ?? []).length;
  const stationCount = (map.match(/type: 'station',/g) ?? []).length;
  const waterCount = (map.match(/type: 'water',/g) ?? []).length;

  assert.match(map, /#D00F09/);
  assert.match(map, /#1565C0/);
  assert.match(map, /#00838f/);
  assert.equal(incidentCount, 4);
  assert.equal(stationCount, 2);
  assert.equal(waterCount, 3);
  assert.match(map, /Fire Incident \(\{markerCounts\.incident\}\)/);
  assert.match(map, /Fire Station \(\{markerCounts\.station\}\)/);
  assert.match(map, /Water Source \(\{markerCounts\.water\}\)/);
});
