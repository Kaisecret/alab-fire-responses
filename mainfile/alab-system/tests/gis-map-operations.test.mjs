import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const source = (path) => readFileSync(join(process.cwd(), path), "utf8");
const map = () => source("app/_components/municipal-gis-operations-map.tsx");

function stylesheetOf(component) {
  const start = component.indexOf("const styles = `");
  return component.slice(start, component.indexOf("`;", start));
}

test("every class the map names has a rule behind it", () => {
  const component = map();
  const styles = stylesheetOf(component);

  const used = new Set(
    [...component.matchAll(/className="(mbfp-ops-[a-z-]+)/g)].map((match) => match[1]),
  );
  const missing = [...used].filter(
    (name) => !new RegExp("\\." + name + "[\\s,{:.]").test(styles),
  );
  assert.deepEqual(missing, [], `these classes have no style rule: ${missing.join(", ")}`);
});

test("the map shows what there is to fight a fire with, not only where fires were", () => {
  const component = map();

  /*
   * A map of past incidents answers where fires have been. A commander also
   * needs to know which ground is far from every station, which is the thing
   * a map is best placed to show and the thing this one left out.
   */
  assert.match(component, /function drawStations/);
  assert.match(component, /STATION_COVERAGE_METERS/);
  assert.match(component, /\/api\/municipal-bfp\/stations/);
  // The rings are a reading aid, not a promise about response time.
  assert.match(component, /reading aid/);
});

test("the view can be narrowed to what is still burning", () => {
  const component = map();

  // Seven incidents fit on a screen; two hundred do not, and a resolved fire
  // from last year should not sit on top of one burning now.
  assert.match(component, /type MapView = "ALL" \| "ACTIVE" \| "HISTORY"/);
  assert.match(component, /view === "ACTIVE" \? cluster\.activeCount > 0/);
  assert.match(component, /view === "HISTORY" \? cluster\.activeCount === 0/);
  // Filtering to nothing is explained rather than left as an empty map.
  assert.match(component, /Nothing is burning right now/);
});

test("the legend stands whether or not an incident is open", () => {
  const component = map();

  // It used to appear only once building-density evidence had loaded, so the
  // marker colours meant nothing until something was clicked.
  assert.match(component, /aria-label="What the map symbols mean"/);
  assert.match(component, /key-active/);
  assert.match(component, /key-history/);
  assert.match(component, /key-station/);
});

test("the counts are drawn from the same feed as the pins", () => {
  const component = map();

  // Counting from a separate source is how a dashboard comes to disagree with
  // the map beside it.
  assert.match(component, /incidents\.filter\(\(incident\) => !TERMINAL_STATUSES\.has\(incident\.status\)\)/);
  assert.match(component, /const resolvedCount = incidents\.length - activeCount/);
  assert.match(component, /stations\.filter\(\(station\) => station\.status === "ACTIVE"\)/);
});

test("municipal water sources are a classified map layer with focused popups", () => {
  const component = map();

  assert.match(component, /\/api\/municipal-bfp\/water-sources/);
  assert.match(component, /function drawWaterSources/);
  assert.match(component, /showWaterSources/);
  assert.match(component, /useSearchParams/);
  assert.match(component, /waterSourceId/);
  assert.match(component, /source\.sourceKind === "FIRE_HYDRANT"/);
  assert.match(component, /Type \/ color/);
  assert.match(component, /key-water-source/);
});

test("water-source mode hides incident layers and opens source details in a map modal", () => {
  const component = map();

  assert.match(component, /type MapContentMode = "INCIDENTS" \| "WATER_SOURCES"/);
  assert.match(component, /Incident Map/);
  assert.match(component, /Water Source Map/);
  assert.match(component, /mapMode === "INCIDENTS"/);
  assert.match(component, /mapMode === "WATER_SOURCES"/);
  assert.match(component, /setSelectedWaterSource/);
  assert.match(component, /aria-labelledby="water-source-modal-title"/);
  assert.match(component, /Close water source details/);
  assert.match(component, /iconSize: \[52, 52\]/);
  assert.doesNotMatch(component, /\.bindPopup\(/);
});

test("water-source mode frames every municipal source when no card requested focus", () => {
  const component = map();

  assert.match(component, /if \(!waterSourceId && points\.length === 1\)/);
  assert.match(component, /else if \(!waterSourceId && points\.length > 1\)/);
  assert.match(component, /map\.fitBounds\(L\.latLngBounds\(points\)/);
});
