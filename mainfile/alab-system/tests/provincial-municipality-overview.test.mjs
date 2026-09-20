import assert from "node:assert/strict";
import test from "node:test";

let overview = {};
try {
  overview = await import("../lib/provincial-bfp/municipality-overview.mjs");
} catch {
  // The first TDD run intentionally exercises the missing behavior module.
}

const municipalities = [
  { id: "a", name: "Anini-y", activeIncidentCount: 0 },
  { id: "b", name: "Hamtic", activeIncidentCount: 9 },
  { id: "c", name: "San Jose de Buenavista", activeIncidentCount: 0 },
  { id: "d", name: "Sibalom", activeIncidentCount: 2 },
];

test("municipality readiness filters combine normalized search and operational status", () => {
  assert.equal(typeof overview.filterMunicipalityReadiness, "function");
  assert.deepEqual(
    overview.filterMunicipalityReadiness(municipalities, "  AM  ", "RESPONDING").map(item => item.id),
    ["b"],
  );
  assert.deepEqual(
    overview.filterMunicipalityReadiness(municipalities, "", "READY").map(item => item.id),
    ["a", "c"],
  );
  assert.deepEqual(
    overview.filterMunicipalityReadiness(municipalities, "san jose", "ALL").map(item => item.id),
    ["c"],
  );
});

test("municipality pagination clamps stale pages and reports the visible range", () => {
  assert.equal(typeof overview.paginateMunicipalityReadiness, "function");
  assert.deepEqual(overview.paginateMunicipalityReadiness(municipalities, 9, 3), {
    items: [municipalities[3]],
    visiblePage: 2,
    totalPages: 2,
    rangeStart: 4,
    rangeEnd: 4,
  });
  assert.deepEqual(overview.paginateMunicipalityReadiness([], 1, 8), {
    items: [],
    visiblePage: 1,
    totalPages: 1,
    rangeStart: 0,
    rangeEnd: 0,
  });
});

test("municipality readiness totals separate responding and ready towns", () => {
  assert.equal(typeof overview.summarizeMunicipalityReadiness, "function");
  assert.deepEqual(overview.summarizeMunicipalityReadiness(municipalities), {
    total: 4,
    responding: 2,
    ready: 2,
  });
});
