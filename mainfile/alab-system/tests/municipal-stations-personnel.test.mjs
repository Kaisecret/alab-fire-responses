import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const source = (path) => readFileSync(join(root, path), "utf8");

test("municipal station service keeps station, account, and assignment writes scoped and atomic", () => {
  const path = "lib/municipal-bfp/stations.ts";
  assert.equal(existsSync(join(root, path)), true, `${path} is missing`);
  const service = source(path);

  assert.match(service, /export async function listMunicipalStations/);
  assert.match(service, /export async function createMunicipalStation/);
  assert.match(service, /export async function provisionMunicipalPersonnel/);
  assert.match(service, /withTransaction/);
  assert.match(service, /municipality_id = \$1/);
  assert.match(service, /status = 'ACTIVE'/);
  assert.match(service, /'MUNICIPAL_STAFF'/);
  assert.match(service, /insert into bfp_station_assignments/i);
  assert.match(service, /ACCOUNT_ISSUED/);
  assert.match(service, /STATION_ASSIGNED/);
  assert.doesNotMatch(service, /JSON\.stringify\([^)]*temporaryPassword/);
});

test("municipal station and personnel APIs require a session-owned Municipal Admin scope", () => {
  const paths = [
    "app/api/municipal-bfp/stations/route.ts",
    "app/api/municipal-bfp/stations/[stationId]/route.ts",
    "app/api/municipal-bfp/personnel/route.ts",
    "app/api/municipal-bfp/personnel/[personnelId]/route.ts",
  ];
  for (const path of paths) assert.equal(existsSync(join(root, path)), true, `${path} is missing`);
  const combined = paths.map(source).join("\n");

  assert.match(combined, /requireMunicipalAdmin/);
  assert.match(combined, /identity\.municipalityId/);
  assert.match(combined, /runtime = "nodejs"/);
  assert.doesNotMatch(combined, /body\.municipalityId/);
  assert.match(combined, /409/);
  assert.match(combined, /temporaryPassword/);
});

test("municipal website exposes station setup before personnel account issuance", () => {
  const layout = source("app/_components/municipal-bfp-layout.tsx");
  const responders = source("app/municipal-bfp/responders/page.tsx");
  const stationPage = "app/municipal-bfp/stations/page.tsx";
  const stationManager = "app/_components/municipal-stations-manager.tsx";
  const personnelManager = "app/_components/municipal-personnel-manager.tsx";
  for (const path of [stationPage, stationManager, personnelManager]) assert.equal(existsSync(join(root, path)), true, `${path} is missing`);
  assert.match(layout, /href: '\/municipal-bfp\/stations'/);
  assert.match(responders, /MunicipalPersonnelManager/);
  assert.match(source(stationManager), /\/api\/municipal-bfp\/stations/);
  const personnel = source(personnelManager);
  assert.match(personnel, /\/api\/municipal-bfp\/personnel/);
  assert.match(personnel, /<select/);
  assert.match(personnel, /stations\.length === 0/);
  assert.match(personnel, /temporaryPassword/);
});
