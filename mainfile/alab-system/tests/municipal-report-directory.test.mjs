import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const source = (path) => readFileSync(join(root, path), "utf8");

test("municipal report directory service exports list and detail query functions", () => {
  const service = source("lib/municipal-bfp/reports/service.ts");
  assert.match(service, /export async function listMunicipalReports/);
  assert.match(service, /export async function getMunicipalReportDetail/);
  assert.match(service, /export async function getMunicipalReportSummary/);
});

test("municipal report directory strictly isolates municipality and protects sensitive fields", () => {
  const service = source("lib/municipal-bfp/reports/service.ts");
  const filters = source("lib/municipal-bfp/reports/filters.ts");

  assert.match(filters, /fr\.municipality_id\s*=\s*\$1/);
  assert.match(service, /actor\.municipalityId/);
  assert.match(service, /reportSource/);
  assert.match(service, /fire_report_photos/);
  assert.doesNotMatch(service, /password_hash/);
  assert.doesNotMatch(service, /reporter_phone_snapshot/);
  assert.doesNotMatch(service, /storage_key as "storageKey"/);
});

test("municipal report filters handle Philippine calendar days and status categories", () => {
  const filters = source("lib/municipal-bfp/reports/filters.ts");

  assert.match(filters, /Asia\/Manila/);
  assert.match(filters, /export function dateBoundarySql/);
  assert.match(filters, /CONFIRMED_STATUSES/);
  assert.match(filters, /RESOLVED_STATUSES/);
  assert.match(filters, /ADMINISTRATIVE_STATUSES/);
  assert.match(filters, /export function resolvePeriodDates/);
});

test("municipal incident report API routes enforce authentication and parameters", () => {
  const listRoute = source("app/api/municipal-bfp/reports/route.ts");
  const detailRoute = source("app/api/municipal-bfp/reports/[id]/route.ts");

  assert.match(listRoute, /requireMunicipalAdmin/);
  assert.match(listRoute, /parseMunicipalReportFilters/);
  assert.match(listRoute, /listMunicipalReports/);
  assert.match(listRoute, /getMunicipalReportSummary/);
  assert.match(listRoute, /export async function GET/);

  assert.match(detailRoute, /requireMunicipalAdmin/);
  assert.match(detailRoute, /getMunicipalReportDetail/);
  assert.match(detailRoute, /export async function GET/);
});

test("municipal incident reports page renders directory, detail, and print views", () => {
  const page = source("app/municipal-bfp/incident-reports/page.tsx");
  const directory = source("app/_components/municipal-report-directory.tsx");
  const detail = source("app/_components/municipal-report-detail.tsx");
  const printPage = source("app/municipal-bfp/incident-reports/print/page.tsx");

  assert.match(page, /MunicipalReportDirectory/);
  assert.match(directory, /api\/municipal-bfp\/reports/);
  assert.match(directory, /MunicipalReportDetail/);
  assert.match(directory, /MunicipalReportExportDialog/);
  assert.match(directory, /Download summary/);
  assert.match(directory, /Export data/);

  assert.match(detail, /Operational Timeline/);
  assert.match(detail, /Response Started/);
  assert.match(detail, /Recorded Arrival/);

  assert.match(printPage, /MUNICIPAL INCIDENT SUMMARY & PERFORMANCE REPORT/);
  assert.match(printPage, /INCIDENT REPORT/);
  // Exports download a generated PDF; no view may open the browser print dialog.
  assert.doesNotMatch(printPage, /window\.print/);
  assert.doesNotMatch(directory, /window\.print/);
  assert.doesNotMatch(detail, /window\.print/);
});
