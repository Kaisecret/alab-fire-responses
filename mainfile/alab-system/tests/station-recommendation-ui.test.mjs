import assert from "node:assert/strict";
import test from "node:test";
import * as jsxRuntime from "react/jsx-runtime";
import { renderToStaticMarkup } from "react-dom/server";
import * as nearestStation from "../lib/municipal-bfp/nearest-station.ts";
import { respondFromButton } from "../app/_components/municipal-dispatch-choice.ts";
import { buildResponseGuidance } from "../lib/fire-reports/response-guidance.ts";
import { describeResidentOrigin } from "../lib/fire-reports/resident-origin.ts";
import { loadServerModule } from "./helpers/load-server-module.mjs";

const stations = [
  { id: "main", stationName: "San Jose Fire Station", latitude: 10.7431, longitude: 121.9394, activePersonnelCount: 5, serviceableTruckCount: 3 },
  { id: "angel", stationName: "San Angel Fire Sub-Station", latitude: 10.7388, longitude: 121.9503, activePersonnelCount: 2, serviceableTruckCount: 1 },
  { id: "dalipe", stationName: "Dalipe Fire Sub-Station", latitude: 10.756, longitude: 121.9355, activePersonnelCount: 3, serviceableTruckCount: 2 },
];

function render(level, candidates = stations) {
  const { MunicipalStationRecommendation } = loadServerModule("app/_components/municipal-station-recommendation.tsx", {
    "react/jsx-runtime": jsxRuntime,
    "../../lib/municipal-bfp/nearest-station": nearestStation,
  });
  const ranked = nearestStation.rankStationsForIncident({ latitude: 10.7395, longitude: 121.9495, calculatedSeverity: level }, candidates);
  return renderToStaticMarkup(jsxRuntime.jsx(MunicipalStationRecommendation, { level, stations: ranked }));
}

test("critical danger shows the six serviceable trucks across San Jose's three staffed stations", () => {
  const html = render("CRITICAL");
  assert.match(html, /CRITICAL danger/);
  assert.match(html, /6 trucks from 3 stations/);
  for (const station of stations) assert.ok(html.includes(station.stationName));
  assert.equal((html.match(/class="mbfp-nearest-badge"/g) ?? []).length, 3);
  assert.match(html, /Recommend 3 trucks/);
  assert.match(html, /Recommend 2 trucks/);
  assert.match(html, /Recommend 1 truck/);
});

test("moderate danger shows only the nearest station's single-truck recommendation", () => {
  const html = render("MODERATE");
  assert.match(html, /1 truck from 1 station/);
  assert.equal((html.match(/class="mbfp-nearest-badge"/g) ?? []).length, 1);
});

test("a one-station town sees its truck recommendation follow the danger level", () => {
  const hamtic = [{ id: "hamtic", stationName: "Hamtic Fire Station", latitude: 10.7, longitude: 121.98, activePersonnelCount: 1, serviceableTruckCount: 2 }];
  assert.match(render("HIGH", hamtic), /HIGH danger · 2 trucks from 1 station/);
  assert.match(render("CRITICAL", hamtic), /Recommend 2 trucks/);
  assert.match(render("MODERATE", hamtic), /MODERATE danger · 1 truck from 1 station/);
  assert.match(render("LOW", hamtic), /LOW danger · Crew verification/);
});

test("low danger describes crew verification rather than a zero-truck dispatch", () => {
  const html = render("LOW");
  assert.match(html, /Crew verification/);
  assert.doesNotMatch(html, /0 trucks from|Recommend 0/);
});

test("unknown inventory is shown as unknown instead of a fabricated truck total", () => {
  const html = render("HIGH", stations.map((station) => ({ ...station, serviceableTruckCount: null })));
  assert.match(html, /Confirm truck inventory/);
  assert.match(html, /Truck inventory unknown/);
  assert.doesNotMatch(html, /NaN|undefined|trucks from/);
});

test("opening San Jose's station picker preselects all critical recommendations and only the nearest moderate team", async () => {
  const states = [];
  let cursor = 0, posts = 0;
  const react = {
    useState: (initial) => {
      const i = cursor++;
      if (!(i in states)) states[i] = typeof initial === "function" ? initial() : initial;
      return [states[i], (value) => { states[i] = typeof value === "function" ? value(states[i]) : value; }];
    },
    useEffect() {}, useCallback: (fn) => fn, useRef: (initial) => ({ current: initial }),
  };
  const { MunicipalIncidentDetail } = loadServerModule("app/_components/municipal-incident-detail.tsx", {
    react, "react/jsx-runtime": jsxRuntime, "react-dom": { createPortal: (node) => node },
    "../../lib/auth/municipal-tab-fetch": { municipalTabFetch: async (_url, options) => {
      if (options?.method === "POST") posts++;
      return Response.json({ stations });
    } },
    "./bfp-data-loader": {}, "./municipal-incident-map": {},
    "../../lib/fire-reports/validation": { canMunicipalResolveReport: () => false },
    "../../lib/fire-reports/types": { fireReportStatusLabels: {} },
    "../../lib/municipal-bfp/alarm-alert.mjs": { shouldShowMutualAidBoard: () => false, shouldShowStationAssignment: () => true },
    "./intermunicipality-coordination-panel": {}, "./incident-mutual-aid-board": {},
    "./municipal-dispatch-choice": { respondFromButton },
    "../../lib/fire-reports/response-guidance": { buildResponseGuidance },
    "../../lib/fire-reports/resident-origin": { describeResidentOrigin },
    "../../lib/municipal-bfp/nearest-station": nearestStation,
    "./municipal-station-recommendation": {},
  });
  // Seed a loaded incident; effects and child components are irrelevant to
  // the click flow, which uses the real dispatch-choice and ranking helpers.
  states[0] = true;
  states[1] = {
    id: "incident", status: "SUBMITTED", reportSource: "ALAB_APP", accessScope: "ORIGIN",
    latitude: 10.7395, longitude: 121.9495, calculatedSeverity: "CRITICAL",
    fireType: "HOUSE_BUILDING", submittedAt: "2026-10-10T00:00:00Z", photos: [], history: [], previousReports: [],
    residentName: "Reporter", phone: "", description: "Fire", referenceNumber: "ALAB-TEST", municipality: "San Jose de Buenavista",
  };
  const nodes = (tree) => !tree || typeof tree !== "object" ? [] : Array.isArray(tree)
    ? tree.flatMap(nodes) : [tree, ...nodes(tree.props?.children)];
  const renderDetail = () => { cursor = 0; return MunicipalIncidentDetail({ incidentId: "incident" }); };
  const oldDocument = global.document;
  global.document = { body: {} };
  try {
    for (const [level, expected] of [["CRITICAL", ["angel", "main", "dalipe"]], ["MODERATE", ["angel"]]]) {
      states[1].calculatedSeverity = level;
      states[6] = false;
      const button = nodes(renderDetail()).find((node) => node.type === "button"
        && nodes(node).some((child) => child.props?.children === "ACKNOWLEDGE & RESPOND"));
      assert.ok(button, "the loaded incident must offer the response button");
      button.props.onClick();
      await new Promise((resolve) => setImmediate(resolve));
      const picker = nodes(renderDetail()).filter((node) => node.type === "button" && /mbfp-dispatch-station\s/.test(node.props.className ?? ""));
      assert.deepEqual(picker.filter((node) => node.props["aria-pressed"]).map((node) => node.key), expected);
    }
    assert.equal(posts, 0, "preselecting teams must never dispatch them");
  } finally {
    global.document = oldDocument;
  }
});

test("stations with no serviceable truck stay visible but are not recommended", () => {
  const html = render("CRITICAL", stations.map((s) => ({ ...s, serviceableTruckCount: 0 })));
  assert.match(html, /No staffed station has a serviceable truck/);
  assert.doesNotMatch(html, /class="mbfp-nearest-badge"/);
});
