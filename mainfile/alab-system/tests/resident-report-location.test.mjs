import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();

test("resident fire report requests browser location and updates the scoped location card", () => {
  const page = readFileSync(join(root, "app", "resident", "report-fire", "page.tsx"), "utf8");
  const content = readFileSync(join(root, "app", "_content", "resident-report-fire-content.ts"), "utf8");

  assert.match(page, /navigator\.geolocation\.getCurrentPosition/);
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

  assert.match(page, /\/api\/geocode\/reverse/);
  assert.match(route, /nominatim\.openstreetmap\.org\/reverse/);
  assert.match(route, /Number/);
  assert.match(page, /village|suburb|neighbourhood/);
  assert.match(page, /municipality|city|town/);
  assert.match(page, /setView/);
  assert.match(page, /divIcon/);
  assert.match(content, /data-location-map/);
  assert.match(content, /data-location-barangay/);
  assert.match(content, /data-location-municipality/);
  assert.match(content, /data-location-map-overlay/);
  assert.match(content, /location-map-pulse|location-pulse/);
});
