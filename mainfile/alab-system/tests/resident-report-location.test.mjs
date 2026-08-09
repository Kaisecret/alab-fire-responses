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
