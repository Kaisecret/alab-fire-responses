import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const read = (path) => fs.readFileSync(path, "utf8");

test("municipal registry opens a full-screen editable details dialog", () => {
  const source = read("app/_components/municipal-water-sources.tsx");
  assert.match(source, /api\/municipal-bfp\/water-sources/);
  assert.match(source, /method:\s*["']POST["']/);
  assert.match(source, /Add fire hydrant or water source/);
  assert.match(source, /waterSource=/);
  assert.match(source, /source\.latitude\.toFixed\(7\)/);
  assert.match(source, /aria-modal=["']true["']/);
  assert.match(source, /step="0\.0000001"/);
  assert.match(source, />Retry</);
  assert.match(source, /selectedSource/);
  assert.match(source, /method:\s*["']PATCH["']/);
  assert.match(source, /Edit location, type\/color, and quantity/);
  assert.match(source, /createPortal/);
  assert.match(source, /document\.body/);
  assert.match(source, /edit-water-type-color/);
  assert.match(source, /typeColor:\s*editForm\.typeColor/);
  assert.match(source, /View on map/);
  assert.doesNotMatch(source, /<Link className="water-registry__card"/);
  assert.match(source, /dialogRef/);
  assert.match(source, /openerRef/);
  assert.match(source, /event\.key === "Escape"/);
  assert.match(source, /setAttribute\("inert"/);
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
  assert.match(source, /selectedSource/);
  assert.match(source, /method:\s*["']PATCH["']/);
  assert.match(source, /Edit coordinates/);
  assert.match(source, /View on map/);
  assert.match(source, /dialogRef/);
  assert.match(source, /openerRef/);
  assert.match(source, /event\.key === "Escape"/);
  assert.match(source, /setAttribute\("inert"/);
});

test("provincial water source route renders the grouped registry instead of sample data", () => {
  const page = read("app/provincial-bfp/water-sources/page.tsx");
  assert.match(page, /ProvincialWaterSources/);
  assert.doesNotMatch(page, /WS-ANT-001/);
});
