import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { loadServerModule } from "./helpers/load-server-module.mjs";

const root = process.cwd();
const mapPositions = loadServerModule("lib/water-sources/map-positions.ts");

test("Provincial GIS page renders the province-wide GIS operations map", () => {
  const page = readFileSync(join(root, "app", "provincial-bfp", "gis-map", "page.tsx"), "utf8");

  assert.match(page, /ProvincialGisOperationsMap/);
  assert.doesNotMatch(page, /AntiqueGisMap/);
});

test("Provincial GIS operations map matches the municipal operational design across Antique", () => {
  const comp = readFileSync(join(root, "app", "_components", "provincial-gis-operations-map.tsx"), "utf8");

  // Telemetry and hook consumption
  assert.match(comp, /useProvincialIncidentFeed/);
  assert.match(comp, /includeHistory:\s*true/);
  assert.match(comp, /clusterProvincialIncidents/);

  // Stations and coverage layer
  assert.match(comp, /\/api\/provincial-bfp\/stations\?pageSize=100/);
  assert.match(comp, /STATION_COVERAGE_METERS\s*=\s*3_?000/);
  assert.match(comp, /Stations and coverage/);

  // Operational 4 KPI cards matching Municipal UI
  assert.match(comp, /mbfp-ops-stats/);
  assert.match(comp, /Active now/);
  assert.match(comp, /Resolved/);
  assert.match(comp, /Active stations/);
  assert.match(comp, /Water sources/);

  // Segmented filters
  assert.match(comp, /mbfp-ops-segmented/);
  assert.match(comp, /"ALL"/);
  assert.match(comp, /"ACTIVE"/);
  assert.match(comp, /"HISTORY"/);

  // Map markers and leaflet styling
  assert.match(comp, /mbfp-ops-fire-marker/);
  assert.match(comp, /mbfp-ops-marker-ring/);
  assert.match(comp, /mbfp-ops-station-pin/);
  assert.match(comp, /fa-fire/);
  assert.match(comp, /fa-truck-fast/);

  // Footnote and quick-queue navigation
  assert.match(comp, /province-wide report/);
  assert.match(comp, /\/provincial-bfp\/incidents/);

  // Provincial modal inspection
  assert.match(comp, /pbfp-gis-modal/);
  assert.match(comp, /\/provincial-bfp\/incident-reports\?report=/);

  // Province-wide water-network mode
  assert.match(comp, /Incidents/);
  assert.match(comp, /Water sources/);
  assert.match(comp, /Hydrant/);
  assert.match(comp, /Water source details/);
});

test("Provincial incident service selects coordinates for live mapping", () => {
  const service = readFileSync(join(root, "lib", "intermunicipality", "provincial.ts"), "utf8");

  assert.match(service, /fr\.latitude/);
  assert.match(service, /fr\.longitude/);
  assert.match(service, /latitude\?:\s*number/);
  assert.match(service, /longitude\?:\s*number/);
});

test("clusterProvincialIncidents groups coincident coordinates and counts active incidents accurately", () => {
  const mod = loadServerModule("app/_components/provincial-gis-operations-map.tsx", {
    "react": {
      useEffect() {},
      useMemo(fn) { return fn(); },
      useRef() { return { current: null }; },
      useState(val) { return [val, () => {}]; },
    },
    "react/jsx-runtime": {
      jsx: () => null,
      jsxs: () => null,
      Fragment: () => null,
    },
    "leaflet/dist/leaflet.css": {},
    "../../lib/water-sources/map-positions": mapPositions,
    "./use-provincial-incident-feed": {
      useProvincialIncidentFeed: () => ({ incidents: [], loading: false, checking: false, error: "", refresh: async () => {} }),
    },
  });

  const { clusterProvincialIncidents } = mod;
  assert.equal(typeof clusterProvincialIncidents, "function");

  const sampleIncidents = [
    {
      id: "inc-1",
      referenceNumber: "ALAB-2026-0001",
      originMunicipality: "San Jose de Buenavista",
      barangay: "Poblacion 1",
      fireType: "STRUCTURAL",
      calculatedSeverity: "HIGH",
      status: "RESPONDING",
      submittedAt: "2026-09-20T10:00:00Z",
      dispatchedAt: "2026-09-20T10:05:00Z",
      assignedStationCount: 1,
      observers: [],
      openAssistanceCount: 0,
      nearbySelectionDegraded: false,
      latitude: 10.7441,
      longitude: 121.9422,
    },
    {
      id: "inc-2",
      referenceNumber: "ALAB-2026-0002",
      originMunicipality: "San Jose de Buenavista",
      barangay: "Poblacion 2",
      fireType: "ELECTRICAL",
      calculatedSeverity: "LOW",
      status: "RESOLVED",
      submittedAt: "2026-09-20T08:00:00Z",
      dispatchedAt: null,
      assignedStationCount: 1,
      observers: [],
      openAssistanceCount: 0,
      nearbySelectionDegraded: false,
      latitude: 10.7441,
      longitude: 121.9422,
    },
    {
      id: "inc-3",
      referenceNumber: "ALAB-2026-0003",
      originMunicipality: "Tibiao",
      barangay: "Importante",
      fireType: "GRASS_FIRE",
      calculatedSeverity: "MODERATE",
      status: "UNDER_CONTROL",
      submittedAt: "2026-09-20T11:00:00Z",
      dispatchedAt: "2026-09-20T11:02:00Z",
      assignedStationCount: 2,
      observers: [],
      openAssistanceCount: 1,
      nearbySelectionDegraded: false,
      latitude: 11.289,
      longitude: 122.048,
    },
  ];

  const clusters = clusterProvincialIncidents(sampleIncidents);
  assert.equal(clusters.length, 2);

  const sanJoseCluster = clusters.find((c) => Math.abs(c.latitude - 10.7441) < 0.001);
  assert.ok(sanJoseCluster);
  assert.equal(sanJoseCluster.incidents.length, 2);
  assert.equal(sanJoseCluster.activeCount, 1);

  const tibiaoCluster = clusters.find((c) => Math.abs(c.latitude - 11.289) < 0.001);
  assert.ok(tibiaoCluster);
  assert.equal(tibiaoCluster.incidents.length, 1);
  assert.equal(tibiaoCluster.activeCount, 1);
});

test("provincial GIS loads the province-wide water-source registry and honors direct map links", async () => {
  const mod = loadServerModule("app/_components/provincial-gis-operations-map.tsx", {
    "react": {
      useEffect() {},
      useMemo(fn) { return fn(); },
      useRef() { return { current: null }; },
      useState(val) { return [val, () => {}]; },
    },
    "react/jsx-runtime": {
      jsx: () => null,
      jsxs: () => null,
      Fragment: () => null,
    },
    "leaflet/dist/leaflet.css": {},
    "../../lib/water-sources/map-positions": mapPositions,
    "./use-provincial-incident-feed": {
      useProvincialIncidentFeed: () => ({ incidents: [], loading: false, checking: false, error: "", refresh: async () => {} }),
    },
  });

  assert.equal(mod.resolveProvincialMapMode(new URLSearchParams("layer=water-sources")), "WATER_SOURCES");
  assert.equal(mod.resolveProvincialMapMode(new URLSearchParams()), "INCIDENTS");

  const calls = [];
  const registry = {
    municipalities: [],
    sources: [{
      id: "hydrant-1",
      municipalityId: "hamtic-id",
      municipalityName: "Hamtic",
      sourceKind: "FIRE_HYDRANT",
      quantity: 1,
      exactLocation: "Poblacion 2, Hamtic",
      latitude: 10.7011186,
      longitude: 121.9817536,
      typeColor: "Wet Barrel",
      recordOrigin: "BFP_LOCATOR_CHART_2018",
      createdAt: "2026-09-23T00:00:00.000Z",
    }],
  };
  const result = await mod.fetchProvincialWaterSources(async (url, init) => {
    calls.push({ url, init });
    return { ok: true, json: async () => registry };
  });

  assert.deepEqual(result, registry);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "/api/provincial-bfp/water-sources");
  assert.equal(calls[0].init.cache, "no-store");
});
