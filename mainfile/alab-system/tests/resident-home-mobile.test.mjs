import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = await readFile(
  new URL("../app/_content/resident-home-content.ts", import.meta.url),
  "utf8",
);
const layoutSource = await readFile(
  new URL("../app/resident/layout.tsx", import.meta.url),
  "utf8",
);
const homePageSource = await readFile(
  new URL("../app/_components/resident-home-page.tsx", import.meta.url),
  "utf8",
);
const dashboardRouteSource = await readFile(
  new URL("../app/api/resident/dashboard/route.ts", import.meta.url),
  "utf8",
);

test("resident mobile home keeps animated content within the viewport", () => {
  assert.match(source, /\.dashboard-page-root\s*\{[\s\S]*?overflow-x:\s*clip;/);
  assert.match(source, /\.mobile-emergency-wrapper\s*\{[\s\S]*?overflow:\s*visible;/);
});

test("SOS area layers above the welcome card but below the shared mobile header", () => {
  assert.match(layoutSource, /@media \(max-width: 950px\)[\s\S]*?\.rl-mobile-header\s*\{[\s\S]*?position:\s*static;/);
  assert.match(source, /\.welcome-card\s*\{[\s\S]*?z-index:\s*0;/);
  assert.match(source, /\.mobile-emergency-wrapper\s*\{[\s\S]*?margin:\s*1\.5rem 0 0\.75rem;/);
  assert.match(source, /\.mobile-emergency-wrapper\s*\{[\s\S]*?z-index:\s*1;/);
  assert.match(source, /\.mobile-emergency-btn\s*\{[\s\S]*?z-index:\s*1;/);
});

test("resident mobile emergency button goes directly to the fire report form", () => {
  assert.match(
    source,
    /<a href="\/resident\/report-fire" class="mobile-emergency-btn" aria-label="Report a fire">/,
  );
});

test("mobile profile navigation keeps the same outlined icon when active", () => {
  assert.doesNotMatch(layoutSource, /function IconProfile[\s\S]*?if \(filled\)/);
  assert.match(
    layoutSource,
    /function IconProfile[\s\S]*?<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth=\{filled \? "2\.3" : "2"\}/,
  );
});

test("resident home personalizes the dashboard from the signed-in resident session", () => {
  assert.match(homePageSource, /fetch\("\/api\/resident\/dashboard"\)/);
  assert.match(source, /data-dashboard-name/);
  assert.match(source, /data-dashboard-municipality/);
  assert.match(source, /data-dashboard-barangay/);
  assert.match(source, /data-dashboard-count="submitted"/);
  assert.match(source, /data-dashboard-recent/);
});

test("resident dashboard uses the saved first name without the surname", () => {
  assert.match(dashboardRouteSource, /name:\s*resident\.first_name,/);
  assert.doesNotMatch(dashboardRouteSource, /name:\s*`\$\{resident\.first_name\}\s+\$\{resident\.last_name\}`/);
});

test("mobile header gives the fire logo a clear, balanced size", () => {
  assert.match(layoutSource, /\.rl-m-left img\s*\{[\s\S]*?height:\s*3\.6rem;/);
});

test("resident home uses the approved ALAB hover-red accent", () => {
  assert.match(source, /--primary-red-hover:\s*#DB1B0D;/i);
  assert.doesNotMatch(source, /#b8150c/i);
});
