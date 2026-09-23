import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const read = (path) => fs.readFileSync(path, "utf8");

test("municipal registry loads real data, adds records, and deep-links cards to the map", () => {
  const source = read("app/_components/municipal-water-sources.tsx");
  assert.match(source, /api\/municipal-bfp\/water-sources/);
  assert.match(source, /method:\s*["']POST["']/);
  assert.match(source, /Add fire hydrant or water source/);
  assert.match(source, /waterSource=/);
  assert.match(source, /source\.latitude\.toFixed\(7\)/);
  assert.match(source, /aria-modal=["']true["']/);
  assert.match(source, /step="0\.0000001"/);
  assert.match(source, />Retry</);
});

test("municipal water source route renders the registry component instead of sample data", () => {
  const page = read("app/municipal-bfp/water-sources/page.tsx");
  assert.match(page, /MunicipalWaterSources/);
  assert.doesNotMatch(page, /San Jose Hydrant #01/);
});

test("provincial registry groups real records by municipality with a details panel", () => {
  const source = read("app/_components/provincial-water-sources.tsx");
  assert.match(source, /api\/provincial-bfp\/water-sources/);
  assert.match(source, /municipalities\.map/);
  assert.match(source, /selectedMunicipality/);
  assert.match(source, /148 records from the BFP locator chart/);
  assert.match(source, /aria-pressed=/);
  assert.match(source, /All municipalities/);
});

test("provincial water source route renders the grouped registry instead of sample data", () => {
  const page = read("app/provincial-bfp/water-sources/page.tsx");
  assert.match(page, /ProvincialWaterSources/);
  assert.doesNotMatch(page, /WS-ANT-001/);
});
