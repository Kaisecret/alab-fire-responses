import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const source = (path) => readFileSync(join(root, path), "utf8");

test("provincial routes require the signed provincial identity", () => {
  const paths = [
    "app/api/provincial-bfp/incidents/route.ts",
    "app/api/provincial-bfp/incidents/[id]/route.ts",
    "app/api/provincial-bfp/assistance-requests/route.ts",
  ];
  for (const path of paths) {
    assert.equal(existsSync(join(root, path)), true, path + " is missing");
    assert.match(source(path), /requireProvincialBfp/);
  }
});

test("provincial read model joins observer and assistance lifecycle data", () => {
  const service = source("lib/intermunicipality/provincial.ts");
  assert.match(service, /incident_municipal_observers/);
  assert.match(service, /intermunicipal_assistance_requests/);
  assert.match(service, /listProvincialCoordinationIncidents/);
  assert.match(service, /getProvincialCoordinationIncident/);
  assert.match(service, /listProvincialAssistanceRequests/);
});

test("provincial coordination APIs are read-only", () => {
  const combined = [
    "app/api/provincial-bfp/incidents/route.ts",
    "app/api/provincial-bfp/incidents/[id]/route.ts",
    "app/api/provincial-bfp/assistance-requests/route.ts",
  ].map(source).join("\n");
  assert.match(combined, /export async function GET/);
  assert.doesNotMatch(combined, /export async function (POST|PATCH|DELETE)/);
});

test("provincial pages use live five-second feeds and no sample incidents", () => {
  const incidentHook = source("app/_components/use-provincial-incident-feed.ts");
  const assistanceHook = source("app/_components/use-provincial-assistance-feed.ts");
  const incidentsPage = source("app/provincial-bfp/incidents/page.tsx");
  const assistancePage = source("app/provincial-bfp/assistance-requests/page.tsx");
  const dashboard = source("app/_components/provincial-bfp-dashboard.tsx");
  assert.match(incidentHook, /REFRESH_INTERVAL_MS = 5_000/);
  assert.match(assistanceHook, /REFRESH_INTERVAL_MS = 5_000/);
  assert.match(incidentHook, /visibilitychange/);
  assert.match(assistanceHook, /visibilitychange/);
  assert.match(incidentsPage, /useProvincialIncidentFeed/);
  assert.match(incidentsPage, /searchParams\.get\("incident"\)/);
  assert.match(assistancePage, /useProvincialAssistanceFeed/);
  assert.match(dashboard, /useProvincialIncidentFeed/);
  assert.match(dashboard, /useProvincialAssistanceFeed/);
  assert.doesNotMatch(incidentsPage, /const initialIncidents/);
  assert.doesNotMatch(assistancePage, /AID-2026-003/);
});
