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
  assert.match(component, /onClick=\{\(\) => void \(localDispatchUnderway \? openDispatch\(\) : acknowledgeAndRespond\(\)\)\}/);
  assert.doesNotMatch(component, /disabled=\{sending \|\| isResponding\}/);
});

test("resident emergency profile cards keep a twelve-pixel gap at every breakpoint", () => {
  const component = readFileSync(join(process.cwd(), "app", "_components", "municipal-incident-detail.tsx"), "utf8");
  const twelvePixelProfileGrids = component.match(
    /\.mbfp-profile-grid\s*\{[^}]*gap:\s*12px;/g,
  ) ?? [];

  assert.equal(twelvePixelProfileGrids.length, 2);
});

test("Acknowledge & Respond dispatches a lone station in one click and keeps the picker otherwise", () => {
  const component = readFileSync(join(process.cwd(), "app", "_components", "municipal-incident-detail.tsx"), "utf8");
  assert.match(component, /from "\.\/municipal-dispatch-choice"/);
  assert.match(component, /const acknowledgeAndRespond = async \(\) =>/);
  // The one-click path names its station; selectAllStations would sweep in
  // any station staffed after the list was loaded.
  assert.match(component, /dispatchStation: \(stationId\) => postDispatch\(\[stationId\], false\)/);
  // A double click must not start a second request.
  assert.match(component, /if \(respondingRef\.current\) return;/);
  // A refused or unloadable dispatch falls back to the picker with its reason.
  assert.match(component, /setDispatchError\(outcome\.kind === "FAILED" \? outcome\.message : ""\)/);
  // Opening an incident on its own still only shows the picker.
  assert.match(component, /const opener = window\.setTimeout\(\(\) => void openDispatch\(\), 0\);/);
  assert.match(component, /<span>Responding…<\/span>/);
});
