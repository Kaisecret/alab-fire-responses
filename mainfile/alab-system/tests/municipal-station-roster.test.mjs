import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const source = (path) => readFileSync(join(root, path), "utf8");

test("listStationResponders queries rich responder profile and operational duty fields", () => {
  const dispatch = source("lib/municipal-bfp/dispatch.ts");
  assert.match(dispatch, /export async function listStationResponders/);
  assert.match(dispatch, /profile\.rank_or_position as "rankOrPosition"/);
  assert.match(dispatch, /station\.station_name as "stationName"/);
  assert.match(dispatch, /station_assignment\.assigned_at as "assignedAt"/);
  assert.match(dispatch, /dev\.platform as "mobilePlatform"/);
  assert.match(dispatch, /disp\.status as "dispatchStatus"/);
  assert.match(dispatch, /dutyStatus: row\.dispatchStatus/);
});

test("station responders route resolves mobile app profile photos via createBfpProfilePhotoUrl", () => {
  const route = source("app/api/municipal-bfp/stations/[stationId]/responders/route.ts");
  assert.match(route, /createBfpProfilePhotoUrl/);
  assert.match(route, /listStationResponders/);
  assert.match(route, /profilePhotoUrl/);
});

test("municipal stations manager opens assigned responder cards on station click with crimson non-green styling", () => {
  const manager = source("app/_components/municipal-stations-manager.tsx");
  assert.match(manager, /className="mbfp-clickable-row"/);
  assert.match(manager, /openStationRoster\(station\)/);
  assert.match(manager, /View Personnel/);
  assert.match(manager, /params\.get\("stationId"\)/);
  assert.match(manager, /mbfp-roster-grid/);
  assert.match(manager, /mbfp-roster-card/);
  assert.match(manager, /mbfp-roster-card-top/);
  assert.match(manager, /mbfp-roster-avatar-img/);
  assert.match(manager, /mbfp-roster-avatar-fallback/);
  assert.match(manager, /mbfp-roster-detail/);
  assert.match(manager, /Rank \/ Position/);
  assert.match(manager, /Official Email/);
  assert.match(manager, /Station Assignment/);
  assert.match(manager, /Duty Status/);
  assert.match(manager, /Mobile App/);
  assert.match(manager, /\.mbfp-roster-card-top\s*\{[^}]*#B91C1C/);
  assert.doesNotMatch(manager, /\.mbfp-roster-card-top\s*\{[^}]*#00695C/);
  assert.doesNotMatch(manager, /\.mbfp-roster-card-top\s*\{[^}]*#26A69A/);
  assert.doesNotMatch(manager, /\.mbfp-roster-card-top\s*\{[^}]*#10B981/);
  assert.doesNotMatch(manager, /\.mbfp-roster-card-top\s*\{[^}]*#16A34A/);
  assert.match(manager, /mbfp-roster-skeleton/);
  assert.match(manager, /mbfpShimmer/);
});
