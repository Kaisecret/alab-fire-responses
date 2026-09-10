import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const source = (path) => readFileSync(join(root, path), "utf8");

test("station management service exposes list, get, create, and update functions", () => {
  const service = source("lib/provincial-bfp/management/stations.ts");
  assert.match(service, /export async function listManagedStations/);
  assert.match(service, /export async function getManagedStation/);
  assert.match(service, /export async function createManagedStation/);
  assert.match(service, /export async function updateManagedStation/);
});

test("station management validates Antique province and blocks deactivation with active assignments or dispatches", () => {
  const service = source("lib/provincial-bfp/management/stations.ts");
  assert.match(service, /assertAntiqueMunicipality/);
  assert.match(service, /assertManagementTarget/);
  assert.match(service, /CANNOT_DEACTIVATE_STATION_WITH_ASSIGNED_PERSONNEL/);
  assert.match(service, /CANNOT_DEACTIVATE_STATION_WITH_ACTIVE_DISPATCHES/);
  assert.match(service, /provincial_management_events/);
  assert.match(service, /provincial_management_operations/);
});

test("station API routes enforce provincial authentication and methods", () => {
  const listRoute = source("app/api/provincial-bfp/stations/route.ts");
  const detailRoute = source("app/api/provincial-bfp/stations/[stationId]/route.ts");

  assert.match(listRoute, /getManagementActor/);
  assert.match(listRoute, /export async function GET/);
  assert.match(listRoute, /export async function POST/);

  assert.match(detailRoute, /getManagementActor/);
  assert.match(detailRoute, /export async function GET/);
  assert.match(detailRoute, /export async function PATCH/);
});

test("firetrucks-stations page renders provincial station directory without sample fleet", () => {
  const page = source("app/provincial-bfp/firetrucks-stations/page.tsx");
  assert.match(page, /ProvincialStationDirectory/);
  assert.doesNotMatch(page, /provincialFleet/);
});
