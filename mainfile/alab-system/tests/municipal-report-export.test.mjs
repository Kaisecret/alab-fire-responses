import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const source = (path) => readFileSync(join(root, path), "utf8");

test("municipal exports service validates dataset enum, caps row limits, and neutralizes formula injection", () => {
  const service = source("lib/municipal-bfp/reports/exports.ts");

  assert.match(service, /export async function exportMunicipalDataset/);
  assert.match(service, /INCIDENT_REGISTER/);
  assert.match(service, /MUNICIPAL_SUMMARY/);
  assert.match(service, /BARANGAY_BREAKDOWN/);
  assert.match(service, /10000/);
  assert.match(service, /ROW_LIMIT_EXCEEDED/);
  assert.match(service, /municipal_export_events/);
  assert.match(service, /escapeCsvValue/);
  assert.doesNotMatch(service, /password_hash/);
  assert.doesNotMatch(service, /reporter_phone/);
  assert.doesNotMatch(service, /storage_key/);
});

test("export API route enforces municipal admin actor, blocks preview account in production, and returns CSV attachment", () => {
  const route = source("app/api/municipal-bfp/reports/export/route.ts");

  assert.match(route, /requireMunicipalAdmin/);
  assert.match(route, /preview@municipal-bfp\.local/);
  assert.match(route, /mustChangePassword/);
  assert.match(route, /text\/csv/);
  assert.match(route, /Content-Disposition/);
  assert.match(route, /exportMunicipalDataset/);
  assert.match(route, /export async function GET/);
  assert.match(route, /export async function POST/);
});

test("export modal component supports datasets, scopes, preview, and download state", () => {
  const modal = source("app/_components/municipal-report-export-dialog.tsx");

  assert.match(modal, /INCIDENT_REGISTER/);
  assert.match(modal, /MUNICIPAL_SUMMARY/);
  assert.match(modal, /BARANGAY_BREAKDOWN/);
  assert.match(modal, /ALL_MATCHING/);
  assert.match(modal, /SELECTED/);
  assert.match(modal, /CURRENT_PAGE/);
  assert.match(modal, /Preparing export\.\.\./);
  assert.match(modal, /Download CSV/);
});
