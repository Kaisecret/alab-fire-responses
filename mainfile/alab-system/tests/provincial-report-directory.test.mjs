import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const source = (path) => readFileSync(join(root, path), "utf8");

test("provincial report directory service exports list and get report functions", () => {
  const service = source("lib/provincial-bfp/management/reports.ts");
  assert.match(service, /export async function listProvincialReports/);
  assert.match(service, /export async function getProvincialReport/);
});

test("provincial report directory strictly isolates Antique province and protects sensitive fields", () => {
  const service = source("lib/provincial-bfp/management/reports.ts");
  assert.match(service, /assertManagementActor/);
  assert.match(service, /m\.province\s*=\s*'Antique'/);
  assert.match(service, /reportSource/);
  assert.match(service, /fire_report_photos/);
  assert.doesNotMatch(service, /password_hash/);
  assert.doesNotMatch(service, /storage_key as "storageKey"/);
});

test("provincial incident report API routes enforce authentication and parameters", () => {
  const listRoute = source("app/api/provincial-bfp/incident-reports/route.ts");
  const detailRoute = source("app/api/provincial-bfp/incident-reports/[reportId]/route.ts");

  assert.match(listRoute, /getManagementActor/);
  assert.match(listRoute, /parseReportFilters/);
  assert.match(listRoute, /export async function GET/);

  assert.match(detailRoute, /getManagementActor/);
  assert.match(detailRoute, /getProvincialReport/);
  assert.match(detailRoute, /export async function GET/);
});

test("provincial incident reports page renders directory and detail components with retry/refresh", () => {
  const page = source("app/provincial-bfp/incident-reports/page.tsx");
  const directory = source("app/_components/provincial-report-directory.tsx");
  const detail = source("app/_components/provincial-report-detail.tsx");

  assert.match(page, /ProvincialReportDirectory/);
  assert.match(directory, /api\/provincial-bfp\/incident-reports/);
  assert.match(directory, /ProvincialReportDetail/);
  assert.match(detail, /Photos/);
  assert.match(detail, /Dispatches/);
});
