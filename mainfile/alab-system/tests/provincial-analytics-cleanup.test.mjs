import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { fireTypeRows } from "../lib/provincial-bfp/fire-type-rows.ts";

const KNOWN = ["HOUSE_BUILDING", "GRASS", "OTHER", "VEHICLE", "FOREST"];
const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");

test("fire type card lists every type even when only one has incidents", () => {
  assert.deepEqual(fireTypeRows([{ type: "HOUSE_BUILDING", incidents: 7 }], KNOWN), [
    { type: "HOUSE_BUILDING", incidents: 7 },
    { type: "GRASS", incidents: 0 },
    { type: "OTHER", incidents: 0 },
    { type: "VEHICLE", incidents: 0 },
    { type: "FOREST", incidents: 0 },
  ]);
});

test("fire types rank by incidents and keep unknown types", () => {
  const rows = fireTypeRows([{ type: "GRASS", incidents: 2 }, { type: "VEHICLE", incidents: 5 }, { type: "BOAT", incidents: 1 }], KNOWN);
  assert.deepEqual(rows.map((row) => row.type), ["VEHICLE", "GRASS", "BOAT", "HOUSE_BUILDING", "OTHER", "FOREST"]);
  assert.equal(rows.length, 6);
});

test("no incidents still lists all types at zero", () => {
  assert.deepEqual(fireTypeRows([], KNOWN).map((row) => row.incidents), [0, 0, 0, 0, 0]);
});

test("provincial analytics no longer shows the Response time card or the Median arrival column", () => {
  const page = read("../app/_components/provincial-analytics.tsx");
  const charts = read("../app/_components/provincial-analytics-charts.tsx");
  const css = read("../app/_components/provincial-analytics.module.css");
  assert.doesNotMatch(page, /title="Response time"/);
  assert.doesNotMatch(page, /StageSteps/);
  assert.doesNotMatch(page, /Median arrival/);
  assert.doesNotMatch(charts, /StageSteps|Slowest:/);
  assert.doesNotMatch(css, /\.steps|\.slowNote|\.chipSlow/);
  assert.match(page, /fireTypeRows\(data\.fireTypes\.counts, Object\.keys\(FIRE_TYPES\)\)/);
});
