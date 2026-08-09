import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();

test("municipal GIS page renders a Leaflet map focused on Antique", () => {
  const pagePath = join(root, "app", "municipal-bfp", "gis-map", "page.tsx");
  const mapPath = join(root, "app", "_components", "antique-gis-map.tsx");

  assert.equal(existsSync(pagePath), true, "GIS page is missing");
  assert.equal(existsSync(mapPath), true, "Antique GIS map component is missing");

  const page = readFileSync(pagePath, "utf8");
  const map = readFileSync(mapPath, "utf8");

  assert.match(page, /AntiqueGisMap/);
  assert.match(map, /leaflet/);
  assert.match(map, /tileLayer/);
  assert.match(map, /ANTIQUE_BOUNDS/);
  assert.match(map, /fitBounds/);
  assert.match(map, /Province of Antique/);
});

test("municipal GIS Leaflet markers keep the ALAB incident palette", () => {
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

test("municipal GIS Leaflet map uses OpenStreetMap detail tiles for Antique", () => {
  const mapPath = join(root, "app", "_components", "antique-gis-map.tsx");
  const map = readFileSync(mapPath, "utf8");

  assert.match(map, /https:\/\/\{s\}\.tile\.openstreetmap\.org/);
  assert.match(map, /tileLayer/);
  assert.match(map, /geoJSON/);
  assert.match(map, /OpenStreetMap/);
  assert.match(map, /maxZoom:\s*19/);
  assert.match(map, /publicStructuresLayer/);
  assert.match(map, /Mapped buildings/);
  assert.match(map, /Schools & public facilities/);
});

test("municipal GIS map loads Antique public structures for the province overview", () => {
  const mapPath = join(root, "app", "_components", "antique-gis-map.tsx");
  const map = readFileSync(mapPath, "utf8");

  assert.match(map, /publicStructuresLayer/);
  assert.match(map, /overpass\.kumi\.systems\/api\/interpreter/);
  assert.match(map, /amenity.*school.*hospital.*fire_station/);
  assert.match(map, /office.*government/);
  assert.match(map, /out center tags/);
  assert.match(map, /getZoom\(\) >= 9\.5/);
  assert.match(map, /Schools & public facilities/);
});

test("municipal GIS Leaflet map includes the supplied reference controls", () => {
  const mapPath = join(root, "app", "_components", "antique-gis-map.tsx");
  const map = readFileSync(mapPath, "utf8");

  assert.match(map, /control\.zoom/);
  assert.match(map, /control\.scale/);
  assert.match(map, /nearby-shelters/);
  assert.match(map, /antiqueMunicipalities/);
});

test("municipal GIS map does not wash out the satellite imagery", () => {
  const pagePath = join(root, "app", "municipal-bfp", "gis-map", "page.tsx");
  const mapPath = join(root, "app", "_components", "antique-gis-map.tsx");
  const page = readFileSync(pagePath, "utf8");
  const map = readFileSync(mapPath, "utf8");

  assert.doesNotMatch(page, /mbfp-antique-map-wash/);
  assert.doesNotMatch(map, /mbfp-antique-map-wash/);
});

test("municipal GIS map keeps building and public facility overlays readable", () => {
  const mapPath = join(root, "app", "_components", "antique-gis-map.tsx");
  const map = readFileSync(mapPath, "utf8");

  assert.match(map, /tile\.openstreetmap\.org/);
  assert.match(map, /publicStructuresLayer/);
  assert.doesNotMatch(map, /maplibre-gl/);
});

test("municipal GIS controls expose operational layer visibility", () => {
  const pagePath = join(root, "app", "municipal-bfp", "gis-map", "page.tsx");
  const page = readFileSync(pagePath, "utf8");

  assert.match(page, /useState/);
  assert.match(page, /aria-pressed/);
  assert.match(page, /onClick/);
  assert.match(page, /All Layers/);
});
