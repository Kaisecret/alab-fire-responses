import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { loadServerModule } from "./helpers/load-server-module.mjs";

function withStorage(saved) {
  const store = new Map(saved === undefined ? [] : [["alab:municipal-map-off", saved]]);
  globalThis.window = { localStorage: { getItem: (key) => store.get(key) ?? null, setItem: (key, value) => store.set(key, value) } };
  return store;
}

const visibility = () => loadServerModule("app/_components/map-visibility.tsx", { "react/jsx-runtime": { jsx: () => null } });

test("map on/off choices survive a reload and ignore broken storage", () => {
  const { readMapOff, writeMapOff } = visibility();
  withStorage("not json");
  assert.deepEqual(readMapOff(), { trucks: [], stations: [], water: [] });

  const store = withStorage(undefined);
  writeMapOff({ water: ["w1"] });
  writeMapOff({ trucks: ["t1"], stations: ["s1"] });
  assert.deepEqual(JSON.parse(store.get("alab:municipal-map-off")), { trucks: ["t1"], stations: ["s1"], water: ["w1"] });
  assert.deepEqual(readMapOff().water, ["w1"]);
  delete globalThis.window;
});

test("municipal cards carry the switch and the municipal map drops what was switched off", () => {
  for (const card of ["municipal-fire-trucks.tsx", "municipal-water-sources.tsx"]) {
    assert.match(readFileSync(`app/_components/${card}`, "utf8"), /<MapSwitch /);
  }
  const map = readFileSync("app/_components/municipal-gis-operations-map.tsx", "utf8");
  assert.match(map, /readMapOff\(\)\.stations/);
  assert.match(map, /readMapOff\(\)\.water/);
  assert.equal(readFileSync("app/_components/provincial-gis-operations-map.tsx", "utf8").includes("readMapOff"), false);
});
