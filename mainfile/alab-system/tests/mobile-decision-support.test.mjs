import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { buildMobileDecisionSupport } from "../lib/municipal-bfp/mobile-decision-support-text.ts";
import { reportDescription } from "../lib/fire-reports/description.ts";

const fire = {
  latitude: 10.7398, longitude: 121.9496, fireType: "HOUSE_BUILDING", fireTypes: ["HOUSE_BUILDING"],
  structureMaterial: "LIGHT_MATERIALS", houseDensity: "PACKED_MAGKAKADIKIT", routeAccessibility: "INTERIOR_ALLEY_ESKINITA",
  windSpeed: 30, windDirection: 90, temperature: 31, humidity: 60, level: "HIGH", factors: [],
};
const sanJose = { id: "sj-main", stationName: "San Jose Fire Station · Head: FSINSP Montana", latitude: 10.7431, longitude: 121.9394, activePersonnelCount: 4 };
const sanAngel = { id: "sj-angel", stationName: "San Angel Fire Sub-Station", latitude: 10.7388, longitude: 121.9503, activePersonnelCount: 2 };

test("the responder's app gets a short scene summary and the first steps", () => {
  const support = buildMobileDecisionSupport(fire, [sanJose], "sj-main");
  assert.deepEqual(support.scene, ["Wood / nipa house", "Houses close together", "Narrow alley: truck may not enter", "Strong wind 30 km/h"]);
  assert.ok(support.actions.length > 0 && support.actions.length <= 4, "kept short for a phone");
  assert.ok(support.actions.some((action) => /fast spread/i.test(action)), "a wood house warns of fast spread");
});

test("a town with two or more stations names the nearest one", () => {
  const fromMain = buildMobileDecisionSupport(fire, [sanJose, sanAngel], "sj-main");
  assert.deepEqual(fromMain.recommendedStation, { name: "San Angel Fire Sub-Station", distance: "150 m", isYourStation: false });
  const fromAngel = buildMobileDecisionSupport(fire, [sanJose, sanAngel], "sj-angel");
  assert.equal(fromAngel.recommendedStation?.isYourStation, true);
  // One station has no choice to make, and a crew from another town is not choosing among these.
  assert.equal(buildMobileDecisionSupport(fire, [sanJose], "sj-main").recommendedStation, null);
  assert.equal(buildMobileDecisionSupport(fire, [sanJose, sanAngel], "hamtic-main").recommendedStation, null);
});

test("an empty or placeholder description is not shown anywhere", () => {
  assert.equal(reportDescription("No description provided."), null);
  assert.equal(reportDescription("  "), null);
  assert.equal(reportDescription("Caller says the kitchen caught fire."), "Caller says the kitchen caught fire.");
  const detail = readFileSync("app/_components/municipal-incident-detail.tsx", "utf8");
  assert.doesNotMatch(detail, /Situation Report &amp; Description/);
  const service = readFileSync("lib/fire-reports/service.ts", "utf8");
  assert.doesNotMatch(service, /"No description provided\."/);
  const route = readFileSync("app/api/mobile-bfp/dispatches/route.ts", "utf8");
  assert.match(route, /listMobileDispatchAssignments\(session\.userId\)\.then\(addMobileDecisionSupport\)/);
});
