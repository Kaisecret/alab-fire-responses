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

test("municipal GIS map includes the complete Antique extent and Caluya", () => {
  const mapPath = join(root, "app", "_components", "antique-gis-map.tsx");
  const map = readFileSync(mapPath, "utf8");

  assert.match(map, /10\.2712376/);
  assert.match(map, /12\.2794760/);
  assert.match(map, /121\.1450673/);
  assert.match(map, /122\.3323830/);
  assert.match(map, /ANTIQUE_RELATION_ID\s*=\s*1506746/);
  assert.match(map, /map\.fitBounds\(ANTIQUE_BOUNDS/);
});

test("municipal GIS map loads detail automatically without municipality selection", () => {
  const mapPath = join(root, "app", "_components", "antique-gis-map.tsx");
  const map = readFileSync(mapPath, "utf8");

  assert.match(map, /tileLayer\(OSM_TILE_URL/);
  assert.match(map, /maxZoom:\s*19/);
  assert.match(map, /addAntiqueResetControl/);
  assert.doesNotMatch(map, /antiqueMunicipalities|municipality-selector|<select/);
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
  assert.match(map, /maps\.mail\.ru\/osm\/tools\/overpass\/api\/interpreter[\s\S]*overpass\.private\.coffee\/api\/interpreter/);
  assert.doesNotMatch(map, /overpass\.kumi\.systems/);
  assert.match(map, /window\.setTimeout\(\(\) => controller\.abort\(\), 45000\)/);
  assert.match(map, /amenity.*school.*hospital.*fire_station/);
  assert.match(map, /office.*government/);
  assert.match(map, /map_to_area->\.antique/);
  assert.match(map, /nwr\(area\.antique\)/);
  assert.match(map, /emergency.*assembly_point/);
  assert.match(map, /social_facility.*shelter/);
  assert.match(map, /out center tags/);
  assert.match(map, /getZoom\(\) >= 12/);
  assert.match(map, /Schools & public facilities/);
});

test("municipal GIS map stores the exact Antique boundary locally", () => {
  const boundaryPath = join(root, "public", "data", "antique-boundary.geojson");

  assert.equal(existsSync(boundaryPath), true);
  const boundary = readFileSync(boundaryPath, "utf8");
  assert.match(boundary, /"name":"Province of Antique"/);
  assert.match(boundary, /"osmRelationId":1506746/);
  assert.match(boundary, /"MultiPolygon"|"Polygon"/);
});

test("municipal GIS Leaflet map includes the supplied reference controls", () => {
  const mapPath = join(root, "app", "_components", "antique-gis-map.tsx");
  const map = readFileSync(mapPath, "utf8");

  assert.match(map, /control\.zoom/);
  assert.match(map, /control\.scale/);
  assert.match(map, /addAntiqueResetControl/);
  assert.doesNotMatch(map, /nearby-shelters|antiqueMunicipalities/);
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

test("municipal GIS map keeps reset and legend controls usable on mobile", () => {
  const pagePath = join(root, "app", "municipal-bfp", "gis-map", "page.tsx");
  const page = readFileSync(pagePath, "utf8");

  assert.match(page, /leaflet-control-antique-reset/);
  assert.match(page, /@media \(max-width: 768px\)[\s\S]*mbfp-gis-legend/);
  assert.match(page, /@media \(max-width: 768px\)[\s\S]*leaflet-control-antique-reset/);
});
