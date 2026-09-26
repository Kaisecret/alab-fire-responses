import assert from "node:assert/strict";
import test from "node:test";

test("nearest mapped building distance returns a numeric meter distance", async () => {
  const { findNearestBuildingDistance } = await import("../lib/fire-reports/nearest-building-distance.ts");
  let sql = "";
  const client = { query: async (query, params) => {
    sql = query;
    assert.deepEqual(params, [10.7431, 121.9272]);
    return { rows: [{ distanceMeters: "48.25" }] };
  } };
  assert.equal(await findNearestBuildingDistance(client, 10.7431, 121.9272), 48.25);
  assert.match(sql, /gis\.building_footprints/);
  assert.match(sql, /ST_DWithin/);
});

test("nearest mapped building distance remains unknown when query fails or coordinates are invalid", async () => {
  const { findNearestBuildingDistance } = await import("../lib/fire-reports/nearest-building-distance.ts");
  const failed = { query: async () => { throw new Error("unavailable"); } };
  assert.equal(await findNearestBuildingDistance(failed, 10.7431, 121.9272), null);
  assert.equal(await findNearestBuildingDistance(failed, Number.NaN, 121.9272), null);
});
