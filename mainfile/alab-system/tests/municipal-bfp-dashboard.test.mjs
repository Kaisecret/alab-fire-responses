import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();

test("Municipal BFP dashboard API aggregates live incidents, verifications, stations, responders, and mutual aid", () => {
  const route = readFileSync(join(root, "app", "api", "municipal-bfp", "dashboard", "route.ts"), "utf8");
  assert.match(route, /bfpSessionCookieName\("MUNICIPAL_BFP"\)/);
  assert.match(route, /session\.role !== "MUNICIPAL_BFP"/);
  assert.match(route, /fire_reports/);
  assert.match(route, /resident_verifications/);
  assert.match(route, /municipal_bfp_stations/);
  assert.match(route, /bfp_station_assignments/);
  assert.match(route, /incident_dispatches/);
  assert.match(route, /municipalities/);
});

test("Municipal BFP dashboard component connects directly to real database state with zero hardcoded mock cards", () => {
  const dash = readFileSync(join(root, "app", "_components", "municipal-bfp-dashboard.tsx"), "utf8");
  // Ensure fake static cards and hardcoded numbers are eliminated
  assert.doesNotMatch(dash, /VR-2025-0152/);
  assert.doesNotMatch(dash, /VR-2025-0151/);
  assert.doesNotMatch(dash, /<span className="mbfp-stat-value">18<\/span>/);
  assert.doesNotMatch(dash, /<span className="mbfp-stat-value">5<\/span>/);
  assert.doesNotMatch(dash, /const resourceData = \[/);
  // Ensure live dashboard fetch and dynamic data mapping
  assert.match(dash, /\/api\/municipal-bfp\/dashboard/);
  assert.match(dash, /stats/);
  assert.match(dash, /recentIncidents/);
  assert.match(dash, /pendingVerifications/);
  assert.match(dash, /stations/);
  assert.match(dash, /mutualAid/);
});
