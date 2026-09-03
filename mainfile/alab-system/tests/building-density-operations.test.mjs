import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

const antiquePolygon = {
  type: "Feature",
  id: "antique-1",
  properties: { confidence: 0.91 },
  geometry: { type: "Polygon", coordinates: [[[121.92, 10.74], [121.921, 10.74], [121.921, 10.741], [121.92, 10.741], [121.92, 10.74]]] },
};

test("building importer dry-run validates Antique features without database writes", async () => {
  const directory = mkdtempSync(join(tmpdir(), "alab-buildings-"));
  const file = join(directory, "fixture.geojson");
  writeFileSync(file, JSON.stringify({ type: "FeatureCollection", features: [
    antiquePolygon,
    { ...antiquePolygon, id: "outside", geometry: { type: "Polygon", coordinates: [[[125, 14], [125.1, 14], [125.1, 14.1], [125, 14.1], [125, 14]]] } },
    { type: "Feature", id: "broken", properties: {}, geometry: null },
  ] }));
  let writes = 0;
  try {
    const { importBuildingFootprints } = await import("../scripts/import-open-buildings.mjs");
    const summary = await importBuildingFootprints({ file, dryRun: true, writer: async () => { writes += 1; return "imported"; } });
    assert.deepEqual(summary, { imported: 1, updated: 0, skipped: 1, rejected: 1 });
    assert.equal(writes, 0);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("building importer normalizes polygons and delegates idempotent upsert outcomes", async () => {
  const directory = mkdtempSync(join(tmpdir(), "alab-buildings-"));
  const file = join(directory, "fixture.ndjson");
  writeFileSync(file, `${JSON.stringify(antiquePolygon)}\n${JSON.stringify({ ...antiquePolygon })}\n`);
  const seen = new Set();
  try {
    const { importBuildingFootprints } = await import("../scripts/import-open-buildings.mjs");
    const summary = await importBuildingFootprints({ file, writer: async (feature) => {
      assert.equal(feature.geometry.type, "MultiPolygon");
      const outcome = seen.has(feature.sourceFeatureId) ? "updated" : "imported";
      seen.add(feature.sourceFeatureId);
      return outcome;
    } });
    assert.deepEqual(summary, { imported: 1, updated: 0, skipped: 1, rejected: 0 });
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("density backfill selection only includes unassessed resident app reports", async () => {
  const { ELIGIBLE_REPORT_WHERE } = await import("../scripts/backfill-building-density.mjs");
  assert.match(ELIGIBLE_REPORT_WHERE, /report_source\s*=\s*'ALAB_APP'/i);
  assert.match(ELIGIBLE_REPORT_WHERE, /detected_building_density\s+is\s+null/i);
  assert.doesNotMatch(ELIGIBLE_REPORT_WHERE, /PHONE_CALL/i);
});
