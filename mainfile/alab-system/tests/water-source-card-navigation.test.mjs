import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (name) => readFileSync(`app/_components/${name}`, "utf8");

test("provincial card opens the focused map and retains a separate edit action", () => {
  const source = read("provincial-water-sources.tsx");
  assert.match(source, /<Link\s+className="water-card__main"[\s\S]*?href=\{`\/provincial-bfp\/gis-map\?[^`]*waterSource=\$\{source\.id\}`\}/);
  assert.match(source, /className="water-card__btn water-card__btn--edit"[\s\S]*?onClick=\{\(\) => openDetails\(source\)\}/);
});

test("municipal card opens the focused map and retains a separate edit action", () => {
  const source = read("municipal-water-sources.tsx");
  assert.match(source, /<Link className="water-registry__card-main" href=\{`\/municipal-bfp\/gis-map\?layer=water-sources&waterSource=\$\{source\.id\}`\}/);
  assert.match(source, /<button[^>]*className="water-registry__edit"[^>]*onClick=\{\(\) => openDetails\(source\)\}/);
});

test("direct water source map links fly to the source and open its card over the pin", () => {
  for (const name of ["provincial-gis-operations-map.tsx", "municipal-gis-operations-map.tsx"]) {
    const source = read(name);
    const draw = source.slice(source.indexOf("function drawWaterSources("), source.indexOf("function drawIncidents(", source.indexOf("function drawWaterSources(")));
    assert.match(draw, /if \(focusedSource && frameView\) onSelectSource\(focusedSource, group\)/);
    assert.match(source, /flyToWaterSource\(map, group\.point, group\.approximate\)/, "the camera flies instead of jumping");
    assert.match(source, /map\.on\("moveend"/, "the card waits for the flight to land");
    assert.match(source, /<WaterSourceMapPopup/);
    assert.doesNotMatch(source, /pbfp-gis-modal pbfp-water-modal|mbfp-gis-modal mbfp-water-modal/, "no full-screen water dialog is left");
  }
});
