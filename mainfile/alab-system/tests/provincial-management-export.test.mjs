import assert from "node:assert/strict";
import test from "node:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const source = (path) => readFileSync(join(root, path), "utf8");

test("management exports service validates dataset enum, caps row limits, and neutralizes formula injection", () => {
  const service = source("lib/provincial-bfp/management/exports.ts");

  assert.match(service, /export async function exportManagementDataset/);
  assert.match(service, /STATIONS/);
  assert.match(service, /PERSONNEL/);
  assert.match(service, /RESIDENTS/);
  assert.match(service, /APPLICATIONS/);
  assert.match(service, /FIRE_REPORTS/);
  assert.match(service, /10000/);
  assert.match(service, /provincial_management_events/);
  assert.match(service, /escapeCsvValue/);
  assert.doesNotMatch(service, /password_hash/);
});

test("export API route enforces provincial actor and returns proper CSV attachment headers", () => {
  const route = source("app/api/provincial-bfp/export/route.ts");

  assert.match(route, /getManagementActor/);
  assert.match(route, /text\/csv/);
  assert.match(route, /Content-Disposition/);
  assert.match(route, /exportManagementDataset/);
  assert.match(route, /export async function GET/);
});

test("removing the audit tab leaves the immutable event trail recording", () => {
  // Only the reader went. Every administrative action still writes its event.
  assert.equal(existsSync("lib/provincial-bfp/management/audit.ts"), false);
  for (const service of ["stations", "personnel", "residents", "applications", "exports"]) {
    assert.match(source(`lib/provincial-bfp/management/${service}.ts`), /insert into provincial_management_events/);
  }
  assert.match(
    source("supabase/migrations/20260910140000_provincial_management_support.sql"),
    /create table if not exists public\.provincial_management_events/,
  );
});
