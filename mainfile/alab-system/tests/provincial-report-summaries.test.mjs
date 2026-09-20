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

test("provincial reports page replaces sample PDF rows with a live records console", () => {
  const page = source("app/provincial-bfp/reports/page.tsx");
  const console_ = source("app/_components/provincial-report-console.tsx");
  assert.doesNotMatch(page + console_, /REP-2026-07-PBF/);
  assert.doesNotMatch(page + console_, /Monthly Provincial Fire Incident Summary \(July 2026\)/);
  assert.match(page, /ProvincialReportConsole/);
  assert.match(console_, /api\/provincial-bfp\/report-summaries/);
  assert.match(console_, /api\/provincial-bfp\/incident-reports/);
});

test("provincial console lists dated records with the municipal report columns", () => {
  const console_ = source("app/_components/provincial-report-console.tsx");
  for (const column of ["Reference", "Municipality", "Fire Type", "Level of Danger", "Reported At (PHT)", "Status"]) {
    assert.ok(console_.includes(column), `missing register column: ${column}`);
  }
  assert.match(console_, /formatPhilippineDateTime/);
  // The register paginates rather than silently truncating the coverage window.
  assert.match(console_, /Per page:/);
  assert.match(console_, /Showing \{Math\.min\(total, \(page - 1\) \* pageSize \+ 1\)\}/);
});

test("provincial console offers the municipal period pills and filter set", () => {
  const console_ = source("app/_components/provincial-report-console.tsx");
  for (const label of ["This Month", "This Week", "Last Month", "This Year", "All Dates", "Custom"]) {
    assert.match(console_, new RegExp(label));
  }
  // Period pills are client-side sugar over the from/to the API actually takes.
  assert.match(console_, /resolvePeriodDates/);
  for (const filter of ["municipalityId", "status", "fireType", "severity", "reportSource", "search"]) {
    assert.match(console_, new RegExp(`${filter}:`));
  }
  assert.match(console_, /More filters/);
  assert.match(console_, /Clear filters/);
});

test("provincial console downloads the same official PDF and export dialog as a station", () => {
  const console_ = source("app/_components/provincial-report-console.tsx");
  const dialog = source("app/_components/provincial-report-export-dialog.tsx");
  assert.match(console_, /Download summary/);
  assert.match(console_, /Export data/);
  assert.match(console_, /Export selected records/);
  assert.match(console_, /format: "PDF"/);
  assert.match(console_, /api\/provincial-bfp\/reports\/export/);
  assert.match(dialog, /api\/provincial-bfp\/reports\/export/);
  for (const format of ["PDF", "XLSX", "CSV"]) assert.match(dialog, new RegExp(`"${format}"`));
  for (const dataset of ["INCIDENT_REGISTER", "PROVINCIAL_SUMMARY", "MUNICIPALITY_BREAKDOWN"]) {
    assert.match(dialog, new RegExp(dataset));
  }
});

test("provincial PDF reuses the municipal letterhead and honours the chosen scope", () => {
  const exports = source("lib/provincial-bfp/management/report-exports.ts");
  assert.match(exports, /buildMunicipalReportPdf/);
  assert.match(exports, /ROW_LIMIT_EXCEEDED/);
  // A stale tick must fail loudly instead of exporting a shorter register.
  assert.match(exports, /INVALID_SELECTION/);
  for (const scope of ["ALL_MATCHING", "SELECTED", "CURRENT_PAGE"]) {
    assert.match(exports, new RegExp(scope));
  }

  const route = source("app/api/provincial-bfp/reports/export/route.ts");
  assert.match(route, /getManagementActor/);
  assert.match(route, /parseReportFilters/);
  assert.match(route, /export async function GET/);
  // A long list of ticked IDs does not fit a query string.
  assert.match(route, /export async function POST/);
});
