import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const residentLayout = readFileSync(join(root, "app", "resident", "layout.tsx"), "utf8");

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
  assert.match(content, /data-location-result/);
  assert.match(content, /data-location-place/);
  assert.match(content, /data-location-coordinates/);
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

test("resident location renders the address above a stable map surface", () => {
  const content = readFileSync(join(root, "app", "_content", "resident-report-fire-content.ts"), "utf8");
  const cardStart = content.indexOf('<div class="location-box" data-location-card');
  const mapStart = content.indexOf('data-location-map-surface', cardStart);
  const detailsStart = content.indexOf('class="location-details"', cardStart);

  assert.ok(cardStart >= 0, "location card hook is present");
  assert.ok(mapStart > cardStart, "location map surface is inside the card");
  assert.ok(detailsStart < mapStart, "location details render before the map");
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

test("resident location shows the place and coordinates after detection", () => {
  const page = readFileSync(join(root, "app", "resident", "report-fire", "page.tsx"), "utf8");

  assert.match(page, /data-location-coordinates/);
  assert.match(page, /Fire report location/);
  assert.match(page, /showLocationSummary/);
  assert.match(page, /Barangay/);
  assert.match(page, /Latitude/);
  assert.match(page, /Longitude/);
  assert.doesNotMatch(page, /Accurate within about/);
  assert.doesNotMatch(page, /Location detected on the map/);
  assert.doesNotMatch(page, /GPS position selected/);
  assert.doesNotMatch(page, /Best accuracy/);
});

test("resident location updates visible labels without replacing the whole card", () => {
  const page = readFileSync(join(root, "app", "resident", "report-fire", "page.tsx"), "utf8");

  assert.ok(
    page.includes("querySelector<HTMLElement>('[data-location-place] [data-location-barangay]')"),
    "barangay UI updates must target the inner label, not the card storage attribute",
  );
  assert.ok(
    page.includes("querySelector<HTMLElement>('[data-location-place] [data-location-municipality]')"),
    "municipality UI updates must target the inner label, not the card storage attribute",
  );
  assert.ok(
    page.includes("querySelector<HTMLElement>('.accuracy[data-location-accuracy]')"),
    "accuracy UI updates must target the inner label, not the card storage attribute",
  );
  assert.ok(
    !page.includes("querySelector<HTMLElement>('[data-location-barangay]')"),
    "generic barangay selector matches the outer card and can replace the map markup",
  );
  assert.ok(
    !page.includes("querySelector<HTMLElement>('[data-location-municipality]')"),
    "generic municipality selector matches the outer card and can replace the map markup",
  );
  assert.ok(
    !page.includes("querySelector<HTMLElement>('[data-location-accuracy]')"),
    "generic accuracy selector matches the outer card and can replace the map markup",
  );
});

test("resident location keeps the place summary visible above the street map", () => {
  const page = readFileSync(join(root, "app", "resident", "report-fire", "page.tsx"), "utf8");
  const content = readFileSync(join(root, "app", "_content", "resident-report-fire-content.ts"), "utf8");

  assert.match(page, /showLocationSummary\(reading/);
  assert.match(page, /showLocationSummary\([\s\S]*reading[\s\S]*barangayLabel\(resolved\.barangay\)[\s\S]*resolved\.municipality/);
  assert.doesNotMatch(page, /address\.hidden = true;/);
  assert.match(content, /Barangay checking/);
  assert.match(content, /Municipality checking/);
  assert.match(content, /OpenStreetMap street map/);
});

test("resident location card cannot collapse on mobile", () => {
  const content = readFileSync(join(root, "app", "_content", "resident-report-fire-content.ts"), "utf8");

  assert.match(content, /@media \(max-width: 950px\)[\s\S]*\.location-box\[data-location-card\][\s\S]*min-height:\s*26rem/);
  assert.match(content, /@media \(max-width: 950px\)[\s\S]*\.location-box\[data-location-card\]\s+\.location-details[\s\S]*display:\s*flex/);
  assert.match(content, /@media \(max-width: 950px\)[\s\S]*\.map-preview\[data-location-map-surface\][\s\S]*display:\s*block/);
});

test("resident mobile nav stays above the map and reserves its bottom space", () => {
  const content = readFileSync(join(root, "app", "_content", "resident-report-fire-content.ts"), "utf8");

  assert.match(
    content,
    /@media \(max-width: 950px\)[\s\S]*\.report-page-root \{[\s\S]*padding-bottom:\s*calc\(6rem \+ env\(safe-area-inset-bottom\)\)/,
  );
  assert.match(
    content,
    /\.map-preview\[data-location-map-surface\]\s*\{[\s\S]*?z-index:\s*0;/,
  );
  assert.match(
    residentLayout,
    /@media \(max-width: 950px\)[\s\S]*\.rl-mobile-nav\s*\{[\s\S]*?position:\s*fixed;[\s\S]*?bottom:\s*0;[\s\S]*?z-index:\s*100;/,
  );
});

test("resident report refresh keeps styles and map overlay outside Leaflet-owned DOM", () => {
  const page = readFileSync(join(root, "app", "resident", "report-fire", "page.tsx"), "utf8");
  const content = readFileSync(join(root, "app", "_content", "resident-report-fire-content.ts"), "utf8");
  const mapSurfaceStart = content.indexOf('data-location-map-surface');
  const mapStart = content.indexOf('data-location-map aria-label', mapSurfaceStart);
  const mapClose = content.indexOf('</div>', mapStart);
  const overlayStart = content.indexOf('data-location-map-overlay', mapSurfaceStart);

  assert.match(page, /<style>\{reportFireStyles\}<\/style>/);
  assert.doesNotMatch(page, /'<style>' \+ reportFireStyles \+ '<\/style>'/);
  assert.ok(mapSurfaceStart >= 0, "location map surface is present");
  assert.ok(mapStart > mapSurfaceStart, "Leaflet map target is inside the map surface");
  assert.ok(overlayStart > mapClose, "location overlay must be a sibling outside the Leaflet map target");
});

test("resident fire report renders a focused responsive emergency form", () => {
  const content = readFileSync(join(root, "app", "_content", "resident-report-fire-content.ts"), "utf8");

  assert.match(content, /report-form-shell/);
  assert.match(content, /data-report-reason/);
  assert.match(content, /Electrical malfunction/);
  assert.match(content, /Cooking accident/);
  assert.match(content, /Open flame or cigarette/);
  assert.match(content, /Unknown \/ Other/);
  assert.match(content, /@media \(max-width: 950px\)[\s\S]*\.report-form-shell/);
  assert.doesNotMatch(content, /class="left-col"/);
  assert.doesNotMatch(content, /class="right-col"/);
});

test("resident report keeps a normal mobile fire nav item and editable auto-filled landmark", () => {
  const page = readFileSync(join(root, "app", "resident", "report-fire", "page.tsx"), "utf8");
  const content = readFileSync(join(root, "app", "_content", "resident-report-fire-content.ts"), "utf8");

  assert.match(residentLayout, /href="\/resident\/report-fire" className=\{`rl-mn-item/);
  assert.doesNotMatch(residentLayout, /className="rl-mn-fab"/);
  assert.doesNotMatch(content, /data-location-adjust/);
  assert.match(content, /data-landmark-input/);
  assert.match(page, /\[data-landmark-input\]/);
  assert.match(page, /landmarkInput\.value = nameValue/);
  assert.match(page, /landmarkInput\?\.addEventListener\('input'/);
});
