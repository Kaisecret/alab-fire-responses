import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();

test("resident fire report requests browser location and updates the scoped location card", () => {
  const page = readFileSync(join(root, "app", "resident", "report-fire", "page.tsx"), "utf8");
  const content = readFileSync(join(root, "app", "_content", "resident-report-fire-content.ts"), "utf8");

  assert.match(page, /navigator\.geolocation\.watchPosition/);
  assert.match(page, /useEffect/);
  assert.match(page, /PERMISSION_DENIED|LOCATION_NEEDED/);
  assert.match(content, /data-location-card/);
  assert.match(content, /data-location-refresh/);
  assert.match(content, /data-location-latitude/);
  assert.match(content, /data-location-longitude/);
  assert.match(content, /data-location-status/);
  assert.match(content, /data-location-text/);
  assert.match(content, /data-location-accuracy/);
  assert.match(content, /\/images\/fire logo\.webp/);
});

test("resident fire report keeps a retry path when location permission is unavailable", () => {
  const page = readFileSync(join(root, "app", "resident", "report-fire", "page.tsx"), "utf8");
  const content = readFileSync(join(root, "app", "_content", "resident-report-fire-content.ts"), "utf8");

  assert.match(content, /Try again|Detect my location/);
  assert.match(page, /PERMISSION_DENIED/);
  assert.match(page, /POSITION_UNAVAILABLE/);
  assert.match(page, /TIMEOUT/);
});

test("resident fire report resolves barangay and municipality beside a live locating map", () => {
  const page = readFileSync(join(root, "app", "resident", "report-fire", "page.tsx"), "utf8");
  const content = readFileSync(join(root, "app", "_content", "resident-report-fire-content.ts"), "utf8");
  const route = readFileSync(join(root, "app", "api", "geocode", "reverse", "route.ts"), "utf8");
  const logic = readFileSync(join(root, "app", "resident", "report-fire", "location-logic.ts"), "utf8");

  assert.match(page, /\/api\/geocode\/reverse/);
  assert.match(route, /nominatim\.openstreetmap\.org\/reverse/);
  assert.match(route, /Number/);
  assert.match(logic, /village|suburb|neighbourhood/);
  assert.match(logic, /municipality|city|town/);
  assert.match(page, /setView/);
  assert.match(page, /divIcon/);
  assert.match(content, /data-location-map/);
  assert.match(content, /data-location-barangay/);
  assert.match(content, /data-location-municipality/);
  assert.match(content, /data-location-map-overlay/);
  assert.match(content, /location-map-pulse|location-pulse/);
});

test("resident location refines GPS readings before confirmation", () => {
  const page = readFileSync(join(root, "app", "resident", "report-fire", "page.tsx"), "utf8");

  assert.match(page, /navigator\.geolocation\.watchPosition/);
  assert.match(page, /navigator\.geolocation\.clearWatch/);
  assert.match(page, /chooseBetterReading/);
  assert.match(page, /isWithinAntiqueBounds/);
  assert.match(page, /REFINEMENT_WINDOW_MS/);
  assert.doesNotMatch(page, /getCurrentPosition/);
});

test("resident location exposes stable map and correction states", () => {
  const page = readFileSync(join(root, "app", "resident", "report-fire", "page.tsx"), "utf8");
  const content = readFileSync(join(root, "app", "_content", "resident-report-fire-content.ts"), "utf8");

  assert.match(page, /ResizeObserver/);
  assert.match(page, /leaflet\.circle/);
  assert.match(page, /leaflet\.control\.zoom/);
  assert.match(page, /dragend/);
  assert.match(page, /OUTSIDE ANTIQUE|outside-antique/);
  assert.match(content, /is-improving/);
  assert.match(content, /is-approximate/);
  assert.match(content, /is-outside/);
  assert.match(content, /data-location-map-panel/);
});

test("resident location renders a stable map-first surface", () => {
  const content = readFileSync(join(root, "app", "_content", "resident-report-fire-content.ts"), "utf8");
  const cardStart = content.indexOf('data-location-card');
  const mapStart = content.indexOf('data-location-map-surface', cardStart);
  const detailsStart = content.indexOf('class="location-details"', cardStart);

  assert.ok(cardStart >= 0, "location card hook is present");
  assert.ok(mapStart > cardStart, "location map surface is inside the card");
  assert.ok(mapStart < detailsStart, "the map renders before location details");
  assert.match(content, /\.map-preview\[data-location-map-surface\][\s\S]*height:\s*11rem/);
});

test("resident location derives the nearest landmark from the detected point", () => {
  const page = readFileSync(join(root, "app", "resident", "report-fire", "page.tsx"), "utf8");
  const content = readFileSync(join(root, "app", "_content", "resident-report-fire-content.ts"), "utf8");

  assert.match(page, /resolveNearestLandmark/);
  assert.match(content, /data-nearest-landmark/);
  assert.match(content, /data-landmark-name/);
  assert.match(content, /data-landmark-status/);
  assert.doesNotMatch(content, /San Jose Public Market/);
});
