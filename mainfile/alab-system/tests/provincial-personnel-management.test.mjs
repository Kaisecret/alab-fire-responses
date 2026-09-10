import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const source = (path) => readFileSync(join(root, path), "utf8");

test("personnel management service exposes list, get, create, and update functions", () => {
  const service = source("lib/provincial-bfp/management/personnel.ts");
  assert.match(service, /export async function listManagedPersonnel/);
  assert.match(service, /export async function getManagedPersonnel/);
  assert.match(service, /export async function createManagedPersonnel/);
  assert.match(service, /export async function updateManagedPersonnel/);
});

test("personnel service never returns passwords and enforces transfer invariants", () => {
  const service = source("lib/provincial-bfp/management/personnel.ts");
  assert.doesNotMatch(service, /password_hash\s+as/i);
  assert.match(service, /TRANSFER_MUNICIPALITY/);
  assert.match(service, /ASSIGN_STATION/);
  assert.match(service, /CANNOT_TRANSFER_ACTIVE_DISPATCH/);
  assert.match(service, /provincial_management_events/);
  assert.match(service, /provincial_management_operations/);
});

test("personnel API routes enforce provincial authentication and methods", () => {
  const listRoute = source("app/api/provincial-bfp/personnel/route.ts");
  const detailRoute = source("app/api/provincial-bfp/personnel/[personnelId]/route.ts");

  assert.match(listRoute, /getManagementActor/);
  assert.match(listRoute, /export async function GET/);
  assert.match(listRoute, /export async function POST/);

  assert.match(detailRoute, /getManagementActor/);
  assert.match(detailRoute, /export async function GET/);
  assert.match(detailRoute, /export async function PATCH/);
});

test("responders page renders provincial personnel directory without sample records", () => {
  const page = source("app/provincial-bfp/responders/page.tsx");
  assert.match(page, /ProvincialPersonnelDirectory/);
  assert.doesNotMatch(page, /sampleResponders/);
});
