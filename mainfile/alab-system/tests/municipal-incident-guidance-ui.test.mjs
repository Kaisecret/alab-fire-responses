import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const component = () => readFileSync(join(process.cwd(), "app", "_components", "municipal-incident-detail.tsx"), "utf8");

test("the incident detail shows advisory BFP actions right after the Level of Danger", () => {
  const source = component();
  assert.match(source, /import \{ buildResponseGuidance \} from "\.\.\/\.\.\/lib\/fire-reports\/response-guidance";/);
  assert.match(source, /<span>Recommended BFP Actions<\/span>/);
  assert.match(source, /Advisory\. The officer in charge decides\./);
  const danger = source.indexOf('aria-labelledby="mbfp-severity-heading"');
  const guidance = source.indexOf('aria-labelledby="mbfp-guidance-heading"');
  const profile = source.indexOf('aria-labelledby="mbfp-resident-heading"');
  assert.ok(danger > 0 && danger < guidance && guidance < profile);
});

test("both card columns use the same 16px gap and the cell grids use 12px", () => {
  const source = component();
  assert.match(source, /\{\/\* Left Column: Data & Photos \*\/\}\s*<div className="mbfp-intel-column">/);
  assert.match(source, /\.mbfp-intel-column,\s*\.mbfp-map-card-wrapper \{[^}]*gap: 16px;/);
  assert.match(source, /\.mbfp-tactical-metrics-grid \{[^}]*gap: 12px;/);
});

test("a municipality with several stations sees the nearest one recommended and pre-ticked", () => {
  const source = component();
  assert.match(source, /import \{ formatStationDistance, rankStationsForIncident \} from "\.\.\/\.\.\/lib\/municipal-bfp\/nearest-station";/);
  // The ranking block sits inside Recommended BFP Actions.
  const guidance = source.indexOf('aria-labelledby="mbfp-guidance-heading"');
  const nearest = source.indexOf("Nearest station to the fire");
  const profile = source.indexOf('aria-labelledby="mbfp-resident-heading"');
  assert.ok(guidance > 0 && guidance < nearest && nearest < profile);
  assert.match(source, /Straight-line distance from the report location/);
  // The picker lists stations nearest first and ticks the recommended one;
  // ticking never dispatches on its own.
  assert.match(source, /const pickerStations = rankStationsForIncident\(incident, dispatchStations\) \?\? dispatchStations;/);
  assert.match(source, /setSelectedStationIds\(recommendedStationIds\(stations\)\)/);
});
