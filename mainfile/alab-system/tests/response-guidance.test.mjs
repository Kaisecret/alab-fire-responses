import assert from "node:assert/strict";
import test from "node:test";

import { buildResponseGuidance } from "../lib/fire-reports/response-guidance.ts";

const house = (overrides = {}) => ({ level: "HIGH", fireType: "HOUSE_BUILDING", ...overrides });
const keys = (actions) => actions.map((action) => action.key);
const find = (actions, key) => actions.find((action) => action.key === key);

test("the initial response follows the Level of Danger", () => {
  assert.match(buildResponseGuidance(house({ level: "CRITICAL" }))[0].title, /every available truck/i);
  assert.match(buildResponseGuidance(house({ level: "CRITICAL" }))[0].detail, /2nd alarm/);
  assert.match(buildResponseGuidance(house({ level: "HIGH" }))[0].title, /all available trucks/i);
  assert.match(buildResponseGuidance(house({ level: "MODERATE" }))[0].title, /1 fire truck/i);
  assert.match(buildResponseGuidance(house({ level: "LOW" }))[0].title, /1 crew/i);
  for (const level of ["CRITICAL", "HIGH", "MODERATE", "LOW"]) {
    const [initial] = buildResponseGuidance(house({ level }));
    assert.equal(initial.key, "initial");
    assert.equal(initial.reason, `Level of Danger: ${level}`);
  }
});

test("an unassessed report still gets a size-up response", () => {
  const [initial] = buildResponseGuidance(house({ level: null }));
  assert.equal(initial.key, "initial");
  assert.equal(initial.reason, "Level of Danger: not assessed");
});

test("closely built light-material houses call for exposure protection and two early hose lines", () => {
  const actions = buildResponseGuidance(house({ houseDensity: "PACKED_MAGKAKADIKIT", structureMaterial: null }));
  assert.deepEqual(keys(actions), ["initial", "exposure", "fast-spread", "coordinate"]);
  assert.equal(find(actions, "exposure").reason, "Houses are close together");
  // The danger score assumes light materials when packed houses have no
  // reported material; the officer is told it is an assumption.
  assert.match(find(actions, "fast-spread").reason, /assumed/i);
});

test("reported light materials are named as reported, not assumed", () => {
  const actions = buildResponseGuidance(house({ structureMaterial: "LIGHT_MATERIALS" }));
  assert.equal(find(actions, "fast-spread").reason, "Light materials reported (kahoy / kawayan / nipa)");
});

test("commercial storage warns about what is inside", () => {
  const actions = buildResponseGuidance(house({ structureMaterial: "COMMERCIAL_STORAGE" }));
  assert.ok(find(actions, "stored-hazard"));
  assert.equal(find(actions, "fast-spread"), undefined);
});

test("strong wind names the downwind side from the wind direction", () => {
  const action = find(buildResponseGuidance(house({ windSpeedKmh: 30, windDirectionDeg: 90 })), "wind");
  assert.match(action.detail, /from the east toward the west/);
  assert.equal(action.reason, "Wind 30 km/h");
  assert.match(find(buildResponseGuidance(house({ windSpeedKmh: "41" })), "wind").detail, /downwind/);
  assert.equal(find(buildResponseGuidance(house({ windSpeedKmh: 24 })), "wind"), undefined);
});

test("hot, dry weather calls for crew rotation at the scoring threshold only", () => {
  assert.ok(find(buildResponseGuidance(house({ temperatureC: 33, humidity: 55 })), "heat"));
  assert.equal(find(buildResponseGuidance(house({ temperatureC: 32.9, humidity: 55 })), "heat"), undefined);
  assert.equal(find(buildResponseGuidance(house({ temperatureC: 34, humidity: 56 })), "heat"), undefined);
});

test("road access changes where the truck goes", () => {
  assert.match(find(buildResponseGuidance(house({ routeAccessibility: "INTERIOR_ALLEY_ESKINITA" })), "access").title, /cannot enter/i);
  assert.match(find(buildResponseGuidance(house({ routeAccessibility: "DEAD_END_OR_BLOCKED" })), "access").title, /drive out/i);
  assert.match(find(buildResponseGuidance(house({ routeAccessibility: "NARROW_STREET" })), "access").title, /clear the street/i);
  assert.equal(find(buildResponseGuidance(house({ routeAccessibility: "WIDE_ROAD" })), "access"), undefined);
  const offRoad = find(buildResponseGuidance({ level: "HIGH", fireType: "GRASS", routeAccessibility: "INTERIOR_ALLEY_ESKINITA" }), "access");
  assert.match(offRoad.title, /far from the road/i);
});

test("a grass fire near mapped buildings calls for a firebreak", () => {
  const near = buildResponseGuidance({ level: "HIGH", fireType: "GRASS", factors: ["Nearest mapped building 40 m away (occupancy unverified)"] });
  assert.equal(find(near, "firebreak").reason, "Nearest mapped building 40 m away");
  assert.ok(find(near, "vegetation"));
  const far = buildResponseGuidance({ level: "LOW", fireType: "FOREST", factors: ["Nearest mapped building distance unavailable"] });
  assert.equal(find(far, "firebreak"), undefined);
  assert.ok(find(far, "vegetation"));
});

test("vehicle and rubbish fires get their own safety step", () => {
  assert.match(find(buildResponseGuidance({ level: "MODERATE", fireType: "VEHICLE" }), "vehicle").title, /15 m/);
  assert.match(find(buildResponseGuidance({ level: "LOW", fireType: "OTHER" }), "rubbish").title, /breathing protection/i);
});

test("material and exposure steps follow the reported fire types", () => {
  const grass = buildResponseGuidance({ level: "HIGH", fireType: "GRASS", houseDensity: "PACKED_MAGKAKADIKIT", structureMaterial: "LIGHT_MATERIALS" });
  assert.equal(find(grass, "exposure"), undefined);
  assert.equal(find(grass, "fast-spread"), undefined);
  const vehicle = buildResponseGuidance({ level: "HIGH", fireType: "VEHICLE", houseDensity: "PACKED_MAGKAKADIKIT" });
  assert.ok(find(vehicle, "exposure"));
  assert.equal(find(vehicle, "fast-spread"), undefined);
});

test("a mixed report combines each fire type's steps under one initial response", () => {
  const actions = buildResponseGuidance({
    level: "CRITICAL", fireType: "HOUSE_BUILDING", fireTypes: ["HOUSE_BUILDING", "GRASS"],
    houseDensity: "PACKED_MAGKAKADIKIT", structureMaterial: "LIGHT_MATERIALS",
  });
  assert.equal(actions.filter((action) => action.key === "initial").length, 1);
  assert.ok(find(actions, "exposure"));
  assert.ok(find(actions, "vegetation"));
});

test("coordination with the barangay and reporter is always the last step", () => {
  for (const input of [house(), { level: "LOW", fireType: "OTHER" }, { level: null, fireType: "GRASS" }]) {
    const actions = buildResponseGuidance(input);
    assert.equal(actions.at(-1).key, "coordinate");
  }
});
