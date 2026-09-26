import assert from "node:assert/strict";
import test from "node:test";

test("resident situation choices follow the selected fire type", async () => {
  const { situationForFireType } = await import("../lib/fire-reports/fire-type-situation.ts");
  assert.deepEqual(situationForFireType("HOUSE_BUILDING"), { density: true, route: "INTERIOR_ALLEY_ESKINITA" });
  assert.deepEqual(situationForFireType("GRASS"), { density: false, route: "DEAD_END_OR_BLOCKED" });
  assert.deepEqual(situationForFireType("FOREST"), { density: false, route: "DEAD_END_OR_BLOCKED" });
  assert.deepEqual(situationForFireType("VEHICLE"), { density: true, route: "NARROW_STREET" });
  assert.deepEqual(situationForFireType("OTHER"), { density: true, route: null });
  assert.deepEqual(situationForFireType(null), { density: false, route: null });
});

test("changing fire type drops answers that no longer apply", async () => {
  const { filterSituationForFireType } = await import("../lib/fire-reports/fire-type-situation.ts");
  assert.deepEqual(filterSituationForFireType("OTHER", "PACKED_MAGKAKADIKIT", "INTERIOR_ALLEY_ESKINITA"), {
    density: "PACKED_MAGKAKADIKIT", route: null,
  });
  assert.deepEqual(filterSituationForFireType("GRASS", "PACKED_MAGKAKADIKIT", "NARROW_STREET"), {
    density: null, route: null,
  });
});
