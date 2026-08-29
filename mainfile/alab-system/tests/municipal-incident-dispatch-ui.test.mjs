import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

test("municipal incident response opens a station-team dispatch sheet", () => {
  const component = readFileSync(join(process.cwd(), "app", "_components", "municipal-incident-detail.tsx"), "utf8");
  assert.match(component, /openDispatch/);
  assert.match(component, /selectAllStations/);
  assert.match(component, /activePersonnelCount/);
  assert.match(component, /Select station teams/);
  assert.match(component, /Dispatch to all staffed stations/);
  assert.match(component, /stationIds/);
  assert.match(component, /mbfp-dispatch-modal/);
});

test("an active response keeps its green status control available for inspection", () => {
  const component = readFileSync(join(process.cwd(), "app", "_components", "municipal-incident-detail.tsx"), "utf8");
  assert.match(component, /VIEW DISPATCH STATUS/);
  assert.match(component, /onClick=\{\(\) => void openDispatch\(\)\}/);
  assert.doesNotMatch(component, /disabled=\{sending \|\| isResponding\}/);
});
