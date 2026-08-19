import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();

test("municipal mobile navigation exposes an accessible drawer trigger and close paths", () => {
  const layoutPath = join(root, "app", "_components", "municipal-bfp-layout.tsx");
  const layout = readFileSync(layoutPath, "utf8");

  assert.match(layout, /isMobileNavOpen/);
  assert.match(layout, /aria-controls="mbfp-sidebar"/);
  assert.match(layout, /aria-expanded=\{isMobileNavOpen\}/);
  assert.match(layout, /mbfp-sidebar-close/);
  assert.match(layout, /mbfp-sidebar-backdrop/);
  assert.match(layout, /setIsMobileNavOpen\(false\)/);
});

test("municipal mobile navigation moves the drawer off canvas and expands content", () => {
  const layoutPath = join(root, "app", "_components", "municipal-bfp-layout.tsx");
  const layout = readFileSync(layoutPath, "utf8");

  assert.match(layout, /\.mbfp-sidebar\s*\{[\s\S]*transform:\s*translateX\(-100%\)/);
  assert.match(layout, /\.mbfp-sidebar\.mobile-open\s*\{[\s\S]*transform:\s*translateX\(0\)/);
  assert.match(layout, /\.mbfp-sidebar-backdrop\.visible\s*\{[\s\S]*display:\s*block/);
  assert.match(layout, /@media \(max-width: 768px\)[\s\S]*\.mbfp-main-area\s*\{[\s\S]*margin-left:\s*0[\s\S]*width:\s*100%/);
});

test("municipal dashboard mobile rules prevent cramped cards and page overflow", () => {
  const dashboardPath = join(root, "app", "_components", "municipal-bfp-dashboard.tsx");
  const dashboard = readFileSync(dashboardPath, "utf8");

  const mobileRules = dashboard.match(/@media \(max-width: 768px\)[\s\S]*?\n  \}/)?.[0] ?? "";
  assert.match(mobileRules, /\.mbfp-stats-row[\s\S]*grid-template-columns:\s*repeat\(2/);
  assert.match(mobileRules, /\.mbfp-quick-actions[\s\S]*grid-template-columns:\s*1fr/);
  assert.match(mobileRules, /\.mbfp-card-body[\s\S]*overflow-x:\s*auto/);
  assert.match(mobileRules, /\.mbfp-emergency-item[\s\S]*flex-direction:\s*column/);
});

test("municipal incident feed refreshes every five seconds only while the tab is visible", () => {
  const feedPath = join(root, "app", "_components", "use-municipal-incident-feed.ts");
  const feed = readFileSync(feedPath, "utf8");

  assert.match(feed, /REFRESH_INTERVAL_MS\s*=\s*5_000/);
  assert.match(feed, /document\.visibilityState\s*===\s*["']visible["']/);
  assert.match(feed, /document\.addEventListener\(["']visibilitychange["']/);
  assert.match(feed, /document\.removeEventListener\(["']visibilitychange["']/);
  assert.match(feed, /fetch\(["']\/api\/municipal-bfp\/incidents["'],\s*\{\s*cache:\s*["']no-store["']\s*\}\s*\)/);
});

test("municipal active incidents uses the shared live feed instead of a local twelve-second interval", () => {
  const pagePath = join(root, "app", "municipal-bfp", "active-incidents", "page.tsx");
  const page = readFileSync(pagePath, "utf8");

  assert.match(page, /useMunicipalIncidentFeed/);
  assert.doesNotMatch(page, /12000/);
  assert.match(page, /Live · checked/);
});

test("municipal dashboard renders its incident queue from the authenticated live feed", () => {
  const dashboardPath = join(root, "app", "_components", "municipal-bfp-dashboard.tsx");
  const dashboard = readFileSync(dashboardPath, "utf8");

  assert.match(dashboard, /useMunicipalIncidentFeed/);
  assert.doesNotMatch(dashboard, /const incidentData\s*=/);
  assert.match(dashboard, /incidents\.slice\(0, 5\)/);
  assert.match(dashboard, /Live · checked/);
});
