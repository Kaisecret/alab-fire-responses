# Antique-Only Automatic Leaflet Detail Map Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Municipal BFP Leaflet map open on the complete Province of Antique and automatically reveal OpenStreetMap-mapped structures and public facilities as users zoom, without a municipality selector.

**Architecture:** Keep Leaflet and the standard OpenStreetMap raster basemap as the automatic road/building detail source. Correct the map extent to include mainland Antique and Caluya, load an exact local Antique boundary generated from OpenStreetMap relation `1506746`, and constrain all application overlays and Overpass facility data to that relation. Keep operational markers separate from public-facility reference markers so existing layer buttons remain predictable.

**Tech Stack:** Next.js 16.2.12, React 19.2.4, TypeScript, Leaflet 1.9.4, OpenStreetMap raster tiles, Overpass API, Node test runner.

## Global Constraints

- Change only map-specific source, styles, generated boundary data, scripts, and focused GIS tests.
- Keep Leaflet 1.9 and visible OpenStreetMap attribution.
- Use the complete Antique extent: `10.2712376–12.2794760° N`, `121.1450673–122.3323830° E`.
- Include Caluya and use OpenStreetMap administrative relation `1506746` for exact boundary/facility scope.
- Do not add a municipality selector, offline structure bundle, MapLibre, satellite imagery, or a color wash.
- Let OpenStreetMap building and road detail load automatically as users pan and zoom.
- Preserve existing incident red, station blue, water teal, and dashed response-route styling.
- Do not change the surrounding desktop dashboard layout or non-map application behavior.

---

### Task 1: Lock the Complete-Antique and Automatic-Detail Requirements in Tests

**Files:**
- Modify: `tests/municipal-gis-map.test.mjs`

**Interfaces:**
- Consumes: current source files as UTF-8 text through `readFileSync`
- Produces: regression requirements for complete bounds, relation-scoped facilities, no selector, automatic OpenStreetMap detail, and local boundary data

- [ ] **Step 1: Add failing complete-province assertions**

Add these tests after the existing Leaflet overview test:

```js
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
```

- [ ] **Step 2: Add failing Antique-only facility and boundary assertions**

Add this test and import `existsSync` from `node:fs`:

```js
test("municipal GIS reference data is scoped to the Antique relation", () => {
  const mapPath = join(root, "app", "_components", "antique-gis-map.tsx");
  const boundaryPath = join(root, "public", "data", "antique-boundary.geojson");
  const map = readFileSync(mapPath, "utf8");

  assert.equal(existsSync(boundaryPath), true);
  assert.match(map, /map_to_area->\.antique/);
  assert.match(map, /nwr\(area\.antique\)/);
  assert.match(map, /emergency.*assembly_point/);
  assert.match(map, /social_facility.*shelter/);
  assert.match(map, /getZoom\(\) >= 12/);
});
```

- [ ] **Step 3: Run the focused test and verify the expected failures**

Run:

```powershell
node --test tests/municipal-gis-map.test.mjs
```

Expected: FAIL because the current bounds exclude Caluya, `antiqueMunicipalities` still exists, the relation-scoped query/reset control are absent, and the local boundary asset does not exist.

- [ ] **Step 4: Commit the red tests**

```powershell
git add tests/municipal-gis-map.test.mjs
git commit -m "test: define complete Antique Leaflet coverage"
```

---

### Task 2: Generate and Validate the Exact Antique Boundary Asset

**Files:**
- Create: `scripts/fetch-antique-boundary.mjs`
- Create: `public/data/antique-boundary.geojson`
- Test: `tests/municipal-gis-map.test.mjs`

**Interfaces:**
- Consumes: Nominatim lookup for OpenStreetMap relation `R1506746`
- Produces: `/data/antique-boundary.geojson` as a GeoJSON `FeatureCollection` consumed by `loadAntiqueBoundary`

- [ ] **Step 1: Create the deterministic boundary fetch script**

Create `scripts/fetch-antique-boundary.mjs` with:

```js
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const relationId = 1506746;
const scriptDir = dirname(fileURLToPath(import.meta.url));
const outputPath = resolve(scriptDir, "..", "public", "data", "antique-boundary.geojson");
const endpoint = new URL("https://nominatim.openstreetmap.org/lookup");
endpoint.searchParams.set("osm_ids", `R${relationId}`);
endpoint.searchParams.set("format", "geojson");
endpoint.searchParams.set("polygon_geojson", "1");
endpoint.searchParams.set("polygon_threshold", "0.0005");

const response = await fetch(endpoint, {
  headers: { "User-Agent": "ALAB-GIS-Boundary-Generator/1.0" },
});

if (!response.ok) {
  throw new Error(`Boundary request failed with HTTP ${response.status}`);
}

const collection = await response.json();
if (collection?.type !== "FeatureCollection" || collection.features?.length !== 1) {
  throw new Error("Expected one Antique boundary feature");
}

const [feature] = collection.features;
if (feature?.properties?.osm_id !== relationId) {
  throw new Error("Boundary response does not match Antique relation 1506746");
}

feature.properties = {
  name: "Province of Antique",
  osmRelationId: relationId,
  source: "OpenStreetMap",
};

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(collection)}\n`, "utf8");
console.log(`Wrote ${outputPath}`);
```

- [ ] **Step 2: Generate the local GeoJSON asset**

Run:

```powershell
node scripts/fetch-antique-boundary.mjs
```

Expected: one `Wrote ...\public\data\antique-boundary.geojson` line and exit code 0.

- [ ] **Step 3: Extend the boundary test with content validation**

In the relation-scoping test, read the asset and add:

```js
  const boundary = readFileSync(boundaryPath, "utf8");
  assert.match(boundary, /"name":"Province of Antique"/);
  assert.match(boundary, /"osmRelationId":1506746/);
  assert.match(boundary, /"MultiPolygon"|"Polygon"/);
```

- [ ] **Step 4: Run the focused test**

```powershell
node --test tests/municipal-gis-map.test.mjs
```

Expected: the boundary-file assertions pass; complete-bounds and map-behavior assertions remain red until Task 3.

- [ ] **Step 5: Commit the boundary generator and asset**

```powershell
git add scripts/fetch-antique-boundary.mjs public/data/antique-boundary.geojson tests/municipal-gis-map.test.mjs
git commit -m "feat: add exact Antique map boundary"
```

---

### Task 3: Implement Complete Antique Bounds and Automatic Map Detail

**Files:**
- Modify: `app/_components/antique-gis-map.tsx`
- Test: `tests/municipal-gis-map.test.mjs`

**Interfaces:**
- Consumes: `/data/antique-boundary.geojson`, OpenStreetMap raster tiles, Overpass area relation `1506746`, and `OperationalLayerVisibility`
- Produces: `AntiqueGisMap` with automatic tile detail, exact boundary outline, province reset, facility markers, and unchanged operational visibility behavior

- [ ] **Step 1: Replace the mainland-only constants and query**

Use these constants and query:

```ts
const ANTIQUE_RELATION_ID = 1506746;
const ANTIQUE_BOUNDS: LatLngBoundsExpression = [
  [10.2712376, 121.1450673],
  [12.2794760, 122.3323830],
];
const ANTIQUE_CENTER: [number, number] = [11.2753568, 121.7387252];
const OSM_TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const ANTIQUE_BOUNDARY_URL = '/data/antique-boundary.geojson';

const PUBLIC_STRUCTURE_OVERPASS_QUERY = `
[out:json][timeout:35];
rel(${ANTIQUE_RELATION_ID});
map_to_area->.antique;
(
  nwr(area.antique)["amenity"~"school|college|university|hospital|fire_station|police|clinic|townhall|community_centre|place_of_worship|marketplace|social_facility|library|kindergarten"];
  nwr(area.antique)["office"="government"];
  nwr(area.antique)["emergency"="assembly_point"];
  nwr(area.antique)["social_facility"="shelter"];
);
out center tags;
`;
```

Remove `antiqueBoundary`, `antiquePoint`, and `antiqueMunicipalities`. OpenStreetMap supplies municipality/place labels automatically, so incomplete hard-coded municipality labels are not replaced.

- [ ] **Step 2: Add exact-boundary loading with a full-extent fallback**

Add:

```ts
async function loadAntiqueBoundary(
  leaflet: typeof import('leaflet'),
  map: LeafletMap,
  isActive: () => boolean,
) {
  try {
    const response = await fetch(ANTIQUE_BOUNDARY_URL);
    if (!response.ok) throw new Error(`Boundary HTTP ${response.status}`);
    const boundary = await response.json() as GeoJSON.FeatureCollection;
    if (!isActive()) return;

    leaflet.geoJSON(boundary, {
      style: {
        color: alabPalette.incident,
        weight: 2,
        opacity: 0.72,
        fillOpacity: 0,
      },
    })
      .bindPopup('<strong>Province of Antique</strong><br/>Operational fire response coverage')
      .addTo(map);
  } catch {
    if (!isActive()) return;
    leaflet.rectangle(ANTIQUE_BOUNDS, {
      color: alabPalette.incident,
      weight: 1.5,
      opacity: 0.45,
      fillOpacity: 0,
    }).addTo(map);
  }
}
```

Import the GeoJSON namespace type with `import type * as GeoJSON from 'geojson';` and remove the old polygon-specific imports.

- [ ] **Step 3: Replace the misleading shelter control with an Antique reset control**

Add:

```ts
function addAntiqueResetControl(leaflet: typeof import('leaflet'), map: LeafletMap) {
  const AntiqueResetControl = leaflet.Control.extend({
    options: { position: 'topright' },
    onAdd: () => {
      const wrapper = leaflet.DomUtil.create('div', 'leaflet-control-antique-reset leaflet-bar');
      const button = leaflet.DomUtil.create('button', '', wrapper);
      button.type = 'button';
      button.title = 'Show all Antique';
      button.setAttribute('aria-label', 'Show all Antique');
      button.innerHTML = '<i class="fa-solid fa-map" aria-hidden="true"></i>';

      leaflet.DomEvent.disableClickPropagation(wrapper);
      leaflet.DomEvent.on(button, 'click', () => {
        map.fitBounds(ANTIQUE_BOUNDS, { padding: [24, 24], animate: true });
      });
      return wrapper;
    },
  });

  new AntiqueResetControl().addTo(map);
}
```

Delete `addNearbySheltersControl` and call `addAntiqueResetControl(leaflet, map)` during initialization.

- [ ] **Step 4: Make map initialization cover all Antique and load detail automatically**

Use these map/tile options and remove the hard-coded municipality/capital marker blocks:

```ts
const map = leaflet.map(containerRef.current, {
  center: ANTIQUE_CENTER,
  zoom: 7.5,
  minZoom: 7,
  maxZoom: 19,
  maxBounds: ANTIQUE_BOUNDS,
  maxBoundsViscosity: 1,
  zoomControl: false,
  preferCanvas: true,
});

leaflet.tileLayer(OSM_TILE_URL, {
  maxZoom: 19,
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
}).addTo(map);

leaflet.control.zoom({ position: 'topright' }).addTo(map);
addAntiqueResetControl(leaflet, map);
leaflet.control.scale({ position: 'bottomleft', imperial: false, maxWidth: 120 }).addTo(map);
void loadAntiqueBoundary(leaflet, map, () => isMounted);
```

Keep the final `map.fitBounds(ANTIQUE_BOUNDS, { padding: [24, 24], animate: false })`. Leaflet automatically requests new OpenStreetMap detail tiles on pan and zoom; no municipality event handler is added.

- [ ] **Step 5: Expand and declutter automatic facility markers**

Change the detail threshold and evacuation coloring:

```ts
function updatePublicStructureVisibility(map: LeafletMap, layer: LayerGroup) {
  const shouldShow = map.getZoom() >= 12;
  if (shouldShow && !map.hasLayer(layer)) layer.addTo(map);
  if (!shouldShow && map.hasLayer(layer)) map.removeLayer(layer);
}

function publicStructureColor(category: string) {
  if (['school', 'college', 'university', 'kindergarten', 'library'].includes(category)) {
    return alabPalette.station;
  }
  if (['hospital', 'clinic'].includes(category)) return alabPalette.incident;
  if (['fire station', 'police', 'government', 'townhall'].includes(category)) return '#b45309';
  if (['assembly point', 'shelter', 'community centre', 'social facility'].includes(category)) return '#15803d';
  return alabPalette.water;
}
```

Add `Evacuation areas` to the map legend with the same green color.

- [ ] **Step 6: Run focused tests and verify green**

```powershell
node --test tests/municipal-gis-map.test.mjs
```

Expected: all focused GIS tests pass.

- [ ] **Step 7: Commit the map behavior**

```powershell
git add app/_components/antique-gis-map.tsx tests/municipal-gis-map.test.mjs
git commit -m "feat: cover all Antique with automatic map detail"
```

---

### Task 4: Polish Map-Only Controls and Mobile Readability

**Files:**
- Modify: `tests/municipal-gis-map.test.mjs`
- Modify: `app/municipal-bfp/gis-map/page.tsx`

**Interfaces:**
- Consumes: `.leaflet-control-antique-reset` and existing map/legend class names
- Produces: desktop-safe reset styling and compact mobile map overlays without changing surrounding dashboard layout

- [ ] **Step 1: Add failing map-style assertions**

Add:

```js
test("municipal GIS map keeps reset and legend controls usable on mobile", () => {
  const pagePath = join(root, "app", "municipal-bfp", "gis-map", "page.tsx");
  const page = readFileSync(pagePath, "utf8");

  assert.match(page, /leaflet-control-antique-reset/);
  assert.match(page, /@media \(max-width: 768px\)[\s\S]*mbfp-gis-legend/);
  assert.match(page, /@media \(max-width: 768px\)[\s\S]*leaflet-control-antique-reset/);
});
```

- [ ] **Step 2: Run the focused test and verify red**

```powershell
node --test tests/municipal-gis-map.test.mjs
```

Expected: FAIL because the reset-control styles do not exist.

- [ ] **Step 3: Replace obsolete shelter-control CSS and add responsive map-only styling**

Replace `.leaflet-control-nearby-shelters` rules with:

```css
.leaflet-control-antique-reset { border: none !important; margin-top: 0.45rem !important; box-shadow: 0 5px 16px rgba(31,41,55,0.16); }
.leaflet-control-antique-reset button { width: 2rem; height: 2rem; display: grid; place-items: center; border: 0; background: rgba(255,255,255,0.96); color: #1f2937; cursor: pointer; }
.leaflet-control-antique-reset button:hover { color: #D00F09; background: #fff7f7; }

@media (max-width: 768px) {
  .leaflet-control-antique-reset button { width: 2.25rem; height: 2.25rem; }
  .mbfp-gis-legend { max-width: calc(100% - 5.5rem); padding: 0.45rem 0.55rem; gap: 0.2rem; font-size: 0.58rem; }
  .mbfp-antique-map-title { max-width: calc(100% - 7.5rem); }
}
```

Leave desktop page grids, cards, statistics, and side panel declarations unchanged.

- [ ] **Step 4: Run focused tests and verify green**

```powershell
node --test tests/municipal-gis-map.test.mjs
```

Expected: all focused GIS tests pass.

- [ ] **Step 5: Commit the map-only presentation change**

```powershell
git add app/municipal-bfp/gis-map/page.tsx tests/municipal-gis-map.test.mjs
git commit -m "style: refine Antique Leaflet map controls"
```

---

### Task 5: Verify the Integrated GIS Map

**Files:**
- Review: `app/_components/antique-gis-map.tsx`
- Review: `app/municipal-bfp/gis-map/page.tsx`
- Review: `public/data/antique-boundary.geojson`
- Review: `scripts/fetch-antique-boundary.mjs`
- Review: `tests/municipal-gis-map.test.mjs`

**Interfaces:**
- Consumes: completed map implementation
- Produces: fresh test/build evidence and a map-only final diff

- [ ] **Step 1: Run the focused GIS tests**

```powershell
node --test tests/municipal-gis-map.test.mjs
```

Expected: all tests pass with zero failures.

- [ ] **Step 2: Run lint and the production build**

```powershell
npm run lint
npm run build
```

Expected: both commands exit 0. Record existing unrelated lint warnings separately if they remain.

- [ ] **Step 3: Verify local and remote map resources**

```powershell
curl.exe -sS -o NUL -w "GIS HTTP %{http_code}`n" "http://127.0.0.1:3000/municipal-bfp/gis-map"
curl.exe -sS -o NUL -w "OSM HTTP %{http_code}`n" "https://a.tile.openstreetmap.org/8/214/120.png"
curl.exe -sS -o NUL -w "Boundary HTTP %{http_code}`n" "http://127.0.0.1:3000/data/antique-boundary.geojson"
```

Expected: each line reports HTTP 200 while the local development server is running.

- [ ] **Step 4: Inspect desktop and mobile map rendering**

Open `/municipal-bfp/gis-map` at `1440x900` and `390x844`. Confirm the whole Antique extent includes Caluya, tiles are colored normally, zooming reveals building footprints automatically, controls do not overlap, and the surrounding desktop dashboard layout is unchanged.

- [ ] **Step 5: Inspect repository scope**

```powershell
git diff --check
git status --short
git diff --stat 8dbbd6f..HEAD
```

Expected: no whitespace errors and only map-specific implementation, tests, boundary data/script, specification, and plan files differ from the last deployed Leaflet commit.
