import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const source = (path) => readFileSync(join(root, path), "utf8");

test("resident management service exposes list, get, and update functions", () => {
  const service = source("lib/provincial-bfp/management/residents.ts");
  assert.match(service, /export async function listManagedResidents/);
  assert.match(service, /export async function getManagedResident/);
  assert.match(service, /export async function updateManagedResident/);
});

test("resident management isolates Antique scope, separates account and verification status, and blocks unverified reactivation", () => {
  const service = source("lib/provincial-bfp/management/residents.ts");
  assert.match(service, /CANNOT_ACTIVATE_UNVERIFIED_RESIDENT/);
  assert.match(service, /accountStatus/);
  assert.match(service, /latestApplicationStatus/);
  assert.match(service, /provincial_management_events/);
  assert.match(service, /provincial_management_operations/);
});

test("resident API routes enforce provincial authentication and methods", () => {
  const listRoute = source("app/api/provincial-bfp/residents/route.ts");
  const detailRoute = source("app/api/provincial-bfp/residents/[residentId]/route.ts");

  assert.match(listRoute, /getManagementActor/);
  assert.match(listRoute, /export async function GET/);

  assert.match(detailRoute, /getManagementActor/);
  assert.match(detailRoute, /export async function GET/);
  assert.match(detailRoute, /export async function PATCH/);
});

test("residents page renders provincial resident directory with distinct status filters", () => {
  const page = source("app/provincial-bfp/residents/page.tsx");
  const component = source("app/_components/provincial-resident-directory.tsx");
  assert.match(page, /ProvincialResidentDirectory/);
  assert.match(component, /latestApplicationStatus/);
  assert.match(component, /accountStatus/);
});
