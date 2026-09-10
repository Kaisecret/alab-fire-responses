import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const source = (path) => readFileSync(join(root, path), "utf8");

test("overview service exposes listManagedMunicipalities, getManagementSummary, and getManagedMunicipality", () => {
  const service = source("lib/provincial-bfp/management/overview.ts");
  assert.match(service, /export async function listManagedMunicipalities/);
  assert.match(service, /export async function getManagementSummary/);
  assert.match(service, /export async function getManagedMunicipality/);
});

test("overview service enforces Antique province scope and distinct counts", () => {
  const service = source("lib/provincial-bfp/management/overview.ts");
  assert.match(service, /province\s*=\s*'Antique'/i);
  assert.match(service, /count\(distinct\s+s\.id\)/i);
  assert.match(service, /count\(distinct\s+p\.user_id\)/i);
  assert.match(service, /count\(distinct\s+rp\.id\)/i);
  assert.match(service, /count\(distinct\s+rv\.id\)/i);
  assert.match(service, /count\(distinct\s+fr\.id\)/i);
  assert.match(service, /left\s+join/i);
});

test("management summary route validates provincial identity and returns headers", () => {
  const route = source("app/api/provincial-bfp/management-summary/route.ts");
  assert.match(route, /getManagementActor/);
  assert.match(route, /getManagementSummary/);
  assert.match(route, /Cache-Control/i);
  assert.match(route, /no-store/i);
});

test("municipalities routes support listing and single-municipality retrieval", () => {
  const listRoute = source("app/api/provincial-bfp/municipalities/route.ts");
  const detailRoute = source("app/api/provincial-bfp/municipalities/[municipalityId]/route.ts");
  assert.match(listRoute, /listManagedMunicipalities/);
  assert.match(listRoute, /parseManagementFilters/);
  assert.match(detailRoute, /getManagedMunicipality/);
});

test("provincial municipal-status page and dashboard consume real management summary data", () => {
  const page = source("app/provincial-bfp/municipal-status/page.tsx");
  const dashboard = source("app/_components/provincial-bfp-dashboard.tsx");
  assert.match(page, /api\/provincial-bfp\/municipalities/);
  assert.doesNotMatch(page, /sampleMunicipalities/);
  assert.match(dashboard, /api\/provincial-bfp\/management-summary/);
  assert.doesNotMatch(dashboard, /sampleMunicipalSummary/);
});
