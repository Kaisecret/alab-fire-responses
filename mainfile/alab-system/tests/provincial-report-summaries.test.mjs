import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const source = (path) => readFileSync(join(root, path), "utf8");

test("provincial report summaries service exports getProvincialReportSummary", () => {
  const service = source("lib/provincial-bfp/management/report-summaries.ts");
  assert.match(service, /export async function getProvincialReportSummary/);
});

test("provincial report summary isolates Antique, breaks down by status/source/municipality, and separates administrative outcomes", () => {
  const service = source("lib/provincial-bfp/management/report-summaries.ts");
  assert.match(service, /assertManagementActor/);
  assert.match(service, /m\.province\s*=\s*'Antique'/);
  assert.match(service, /byStatus/);
  assert.match(service, /bySource/);
  assert.match(service, /byMunicipality/);
  assert.match(service, /timingMetrics/);
  assert.match(source("lib/provincial-bfp/management/filters.ts"), /Asia\/Manila/);
});

test("report summaries API route enforces provincial actor and valid filters", () => {
  const route = source("app/api/provincial-bfp/report-summaries/route.ts");
  assert.match(route, /getManagementActor/);
  assert.match(route, /parseReportFilters/);
  assert.match(route, /getProvincialReportSummary/);
  assert.match(route, /export async function GET/);
});

test("provincial reports page replaces sample PDF rows with live on-demand generator", () => {
  const page = source("app/provincial-bfp/reports/page.tsx");
  assert.doesNotMatch(page, /REP-2026-07-PBF/);
  assert.doesNotMatch(page, /Monthly Provincial Fire Incident Summary \(July 2026\)/);
  assert.match(page, /api\/provincial-bfp\/report-summaries/);
  assert.match(page, /Generate Provincial Summary/);
  assert.match(page, /Print Summary/);
});
