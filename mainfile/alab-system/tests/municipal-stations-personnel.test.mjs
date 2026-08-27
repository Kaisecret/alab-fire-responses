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
