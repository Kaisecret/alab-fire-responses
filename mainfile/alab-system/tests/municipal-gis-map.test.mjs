import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();

test("Municipal BFP incident map routes from the live municipal device when permission is available", () => {
  const map = readFileSync(join(root, "app", "_components", "municipal-incident-map.tsx"), "utf8");
  const detail = readFileSync(join(root, "app", "_components", "municipal-incident-detail.tsx"), "utf8");
  assert.match(map, /leaflet/);
  assert.match(map, /\/api\/routes\/road/);
  assert.match(map, /polyline/);
  assert.match(map, /Road route/);
  assert.match(map, /Road guidance is temporarily unavailable/);
  assert.match(map, /showDirectFallback/);
  assert.match(map, /fitBounds\(L\.latLngBounds\(data\.coordinates\)/);
  assert.match(map, /mbfp-incident-fire-pin/);
  assert.match(map, /fa-fire/);
  assert.match(map, /rgba\(220, 38, 38/);
  assert.match(map, /L\.divIcon/);
  assert.match(map, /navigator\.geolocation\.getCurrentPosition/);
  assert.match(map, /Municipal BFP device location/);
  assert.match(map, /enableHighAccuracy: true/);
  assert.match(map, /maximumAge: 0/);
  assert.match(detail, /\/api\/municipal-bfp\/incidents/);
  assert.match(detail, /RESPOND/);
  assert.match(detail, /Resident emergency profile/);
  assert.match(detail, /Public IP address/);
  assert.match(detail, /Device \/ browser/);
  assert.match(detail, /GPS coordinates/);
});

test("Municipal GIS tab is a municipality-scoped live operations map instead of an incident detail view", () => {
  const page = readFileSync(join(root, "app", "municipal-bfp", "gis-map", "page.tsx"), "utf8");

  assert.match(page, /MunicipalGisOperationsMap/);
  assert.doesNotMatch(page, /MunicipalIncidentDetail/);
});

test("Municipal GIS operations map draws every incident from the live municipal feed", () => {
  const operationsMap = readFileSync(join(root, "app", "_components", "municipal-gis-operations-map.tsx"), "utf8");

  assert.match(operationsMap, /useMunicipalIncidentFeed/);
  assert.match(operationsMap, /incidents\.forEach/);
  assert.match(operationsMap, /fitBounds/);
  assert.match(operationsMap, /Municipal incident map/);
  assert.match(operationsMap, /No active incidents in your assigned municipality/);
});
