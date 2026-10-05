import assert from "node:assert/strict";
import test from "node:test";

import { formatStationDistance, rankStationsForIncident } from "../lib/municipal-bfp/nearest-station.ts";

// A fire in San Jose de Buenavista and its three stations.
const fire = { latitude: 10.7395, longitude: 121.9495 };
const sanJose = { id: "main", stationName: "San Jose Fire Station · Head: FSINSP Macario I Montaña Jr", latitude: 10.7431, longitude: 121.9394, activePersonnelCount: 5 };
const sanAngel = { id: "angel", stationName: "San Angel Fire Sub-Station", latitude: 10.7388, longitude: 121.9503, activePersonnelCount: 2 };
const dalipe = { id: "dalipe", stationName: "Dalipe Fire Sub-Station", latitude: 10.756, longitude: 121.9355, activePersonnelCount: 0 };

test("stations are ranked nearest first and the nearest staffed one is recommended", () => {
  const ranked = rankStationsForIncident(fire, [sanJose, dalipe, sanAngel]);
  assert.deepEqual(ranked.map((station) => station.id), ["angel", "main", "dalipe"]);
  assert.deepEqual(ranked.map((station) => station.recommended), [true, false, false]);
  assert.ok(ranked[0].distanceMeters < 200);
});

test("a nearer station with nobody on duty is skipped for the recommendation", () => {
  const ranked = rankStationsForIncident({ latitude: 10.7555, longitude: 121.936 }, [sanJose, dalipe, sanAngel]);
  assert.equal(ranked[0].id, "dalipe");
  assert.equal(ranked[0].recommended, false);
  assert.equal(ranked.find((station) => station.recommended).id, "main");
});

test("a municipality with one station gets no ranking", () => {
  assert.equal(rankStationsForIncident(fire, [sanJose]), null);
  assert.equal(rankStationsForIncident(fire, []), null);
});

test("no station is recommended when nobody is on duty anywhere", () => {
  const ranked = rankStationsForIncident(fire, [{ ...sanJose, activePersonnelCount: 0 }, dalipe]);
  assert.equal(ranked.some((station) => station.recommended), false);
});

test("a report without usable coordinates keeps the order and recommends nothing", () => {
  const ranked = rankStationsForIncident({ latitude: Number.NaN, longitude: 121.9 }, [sanJose, sanAngel]);
  assert.deepEqual(ranked.map((station) => station.id), ["main", "angel"]);
  assert.deepEqual(ranked.map((station) => station.distanceMeters), [null, null]);
  assert.equal(ranked.some((station) => station.recommended), false);
});

test("the station head is split from the stored name", () => {
  const ranked = rankStationsForIncident(fire, [sanJose, sanAngel]);
  const main = ranked.find((station) => station.id === "main");
  assert.equal(main.displayName, "San Jose Fire Station");
  assert.equal(main.head, "FSINSP Macario I Montaña Jr");
  assert.equal(ranked.find((station) => station.id === "angel").head, null);
});

test("distances read in metres under 1 km and kilometres above", () => {
  assert.equal(formatStationDistance(845.2), "850 m");
  assert.equal(formatStationDistance(2440), "2.4 km");
  assert.equal(formatStationDistance(null), "Distance unknown");
});
