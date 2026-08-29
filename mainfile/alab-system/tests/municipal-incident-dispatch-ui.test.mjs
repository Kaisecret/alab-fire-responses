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
