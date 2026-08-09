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

test("municipal GIS map uses OSM vector detail layers for Antique", () => {
  const mapPath = join(root, "app", "_components", "antique-gis-map.tsx");
  const map = readFileSync(mapPath, "utf8");

  assert.match(map, /https:\/\/tiles\.openfreemap\.org\/planet/);
  assert.match(map, /osm-raster-fallback/);
  assert.match(map, /type:\s*'raster'/);
  assert.match(map, /type:\s*'vector'/);
  assert.match(map, /NEXT_PUBLIC_OSM_VECTOR_TILES_URL/);
  assert.match(map, /maxZoom:\s*19/);
  assert.match(map, /['"]source-layer['"]:\s*'building'/);
  assert.match(map, /['"]source-layer['"]:\s*'transportation'/);
  assert.match(map, /['"]source-layer['"]:\s*'poi'/);
  assert.match(map, /alab-road-network/);
  assert.match(map, /queryRenderedFeatures/);
  assert.match(map, /Mapped buildings/);
  assert.match(map, /Schools & public facilities/);
});

test("municipal GIS map loads Antique public structures for the province overview", () => {
  const mapPath = join(root, "app", "_components", "antique-gis-map.tsx");
  const map = readFileSync(mapPath, "utf8");

  assert.match(map, /antique-public-structures/);
  assert.match(map, /overpass\.kumi\.systems\/api\/interpreter/);
  assert.match(map, /amenity.*school.*hospital.*fire_station/);
  assert.match(map, /office.*government/);
  assert.match(map, /out center tags/);
  assert.match(map, /minzoom:\s*8/);
  assert.match(map, /Schools & public facilities/);
});

test("municipal GIS map includes the supplied Antique satellite reference details", () => {
  const mapPath = join(root, "app", "_components", "antique-gis-map.tsx");
  const map = readFileSync(mapPath, "utf8");

  assert.match(map, /esri-satellite/);
  assert.match(map, /raster-dem/);
  assert.match(map, /setTerrain/);
  assert.match(map, /FullscreenControl/);
  assert.match(map, /ScaleControl/);
  assert.match(map, /antique-point/);
  assert.match(map, /antique-label/);
  assert.match(map, /antique-municipalities/);
});

test("municipal GIS map does not wash out the satellite imagery", () => {
  const pagePath = join(root, "app", "municipal-bfp", "gis-map", "page.tsx");
  const mapPath = join(root, "app", "_components", "antique-gis-map.tsx");
  const page = readFileSync(pagePath, "utf8");
  const map = readFileSync(mapPath, "utf8");

  assert.doesNotMatch(page, /mbfp-antique-map-wash/);
  assert.doesNotMatch(map, /mbfp-antique-map-wash/);
});

test("municipal GIS map adds rounded 3D building extrusions at close zoom", () => {
  const mapPath = join(root, "app", "_components", "antique-gis-map.tsx");
  const map = readFileSync(mapPath, "utf8");

  assert.match(map, /fill-extrusion/);
  assert.match(map, /building-extrusion/);
  assert.match(map, /fill-extrusion-rounded-corner-distance/);
  assert.match(map, /render_height/);
  assert.match(map, /fill-extrusion-height/);
});

test("municipal GIS controls expose operational layer visibility", () => {
  const pagePath = join(root, "app", "municipal-bfp", "gis-map", "page.tsx");
  const page = readFileSync(pagePath, "utf8");

  assert.match(page, /useState/);
  assert.match(page, /aria-pressed/);
  assert.match(page, /onClick/);
  assert.match(page, /All Layers/);
});
