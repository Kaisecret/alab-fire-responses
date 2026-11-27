import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { loadServerModule } from "./helpers/load-server-module.mjs";

function withStorage(saved) {
  const store = new Map(saved === undefined ? [] : [["alab:water-sources-under-maintenance", saved]]);
  globalThis.window = { localStorage: { getItem: (key) => store.get(key) ?? null, setItem: (key, value) => store.set(key, value) } };
  return store;
}

test("water source maintenance list survives a reload and ignores broken storage", () => {
  const { readWaterSourcesUnderMaintenance, writeWaterSourcesUnderMaintenance } = loadServerModule("app/_lib/water-source-maintenance.ts", {});
  withStorage("not json");
  assert.deepEqual(readWaterSourcesUnderMaintenance(), []);
  withStorage(JSON.stringify(["w1", 7]));
  assert.deepEqual(readWaterSourcesUnderMaintenance(), ["w1"]);
  const store = withStorage(undefined);
  writeWaterSourcesUnderMaintenance(["w2"]);
  assert.equal(store.get("alab:water-sources-under-maintenance"), '["w2"]');
  delete globalThis.window;
});

test("municipal cards show Ready / Under maintenance and the municipal map drops sources under maintenance", () => {
  const water = readFileSync("app/_components/municipal-water-sources.tsx", "utf8");
  assert.match(water, /Under maintenance/);
  assert.doesNotMatch(water, /MapSwitch/);
  assert.match(readFileSync("app/_components/fire-truck-details-dialog.tsx", "utf8"), /Under maintenance/);
  assert.match(readFileSync("app/_components/municipal-fire-trucks.tsx", "utf8"), /onReadinessChange=/);
  assert.match(readFileSync("app/_components/municipal-gis-operations-map.tsx", "utf8"), /readWaterSourcesUnderMaintenance\(\)/);
});
