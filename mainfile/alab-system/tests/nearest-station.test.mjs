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

test("a municipality with no station gets no ranking", () => {
  assert.equal(rankStationsForIncident(fire, []), null);
});

// Most towns have one station, such as Hamtic with two serviceable trucks.
const hamtic = { id: "hamtic", stationName: "Hamtic Fire Station", latitude: 10.7, longitude: 121.98, activePersonnelCount: 1, serviceableTruckCount: 2 };

test("a one-station town gets its truck recommendation by danger level", () => {
  for (const [calculatedSeverity, trucks] of [["LOW", 0], ["MODERATE", 1], ["HIGH", 2], ["CRITICAL", 2], [null, 1]]) {
    const ranked = rankStationsForIncident({ ...fire, calculatedSeverity }, [hamtic]);
    assert.deepEqual(ranked.map((s) => [s.id, s.recommended, s.recommendedTruckCount]), [["hamtic", true, trucks]], String(calculatedSeverity));
  }
});

test("a one-station town needs no distance to be recommended, but still needs a crew", () => {
  const unlocated = rankStationsForIncident({ latitude: Number.NaN, longitude: 121.9, calculatedSeverity: "HIGH" }, [hamtic]);
  assert.deepEqual([unlocated[0].recommended, unlocated[0].recommendedTruckCount], [true, 2]);
  const unstaffed = rankStationsForIncident({ ...fire, calculatedSeverity: "HIGH" }, [{ ...hamtic, activePersonnelCount: 0 }]);
  assert.deepEqual([unstaffed[0].recommended, unstaffed[0].recommendedTruckCount], [false, 0]);
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

// San Jose's inventory has three serviceable trucks at the main station,
// one at San Angel, and two at Dalipe. The fourth main-station truck is FOR_BER.
const stockedStations = [
  { ...sanJose, serviceableTruckCount: 3 },
  { ...sanAngel, serviceableTruckCount: 1 },
  { ...dalipe, activePersonnelCount: 3, serviceableTruckCount: 2 },
];

test("moderate danger recommends one truck from the nearest staffed station", () => {
  const ranked = rankStationsForIncident({ ...fire, calculatedSeverity: "MODERATE" }, stockedStations);
  assert.deepEqual(ranked.filter((s) => s.recommended).map((s) => [s.id, s.recommendedTruckCount]), [["angel", 1]]);
});

test("high danger recommends all serviceable trucks at the nearest staffed station", () => {
  const ranked = rankStationsForIncident({ ...sanJose, calculatedSeverity: "HIGH" }, stockedStations);
  assert.deepEqual(ranked.filter((s) => s.recommended).map((s) => [s.id, s.recommendedTruckCount]), [["main", 3]]);
});

test("critical danger recommends trucks from all three San Jose stations", () => {
  const ranked = rankStationsForIncident({ ...fire, calculatedSeverity: "CRITICAL" }, stockedStations);
  assert.deepEqual(ranked.filter((s) => s.recommended).map((s) => [s.id, s.recommendedTruckCount]),
    [["angel", 1], ["main", 3], ["dalipe", 2]]);
});

test("critical danger excludes stations without personnel or serviceable trucks", () => {
  const ranked = rankStationsForIncident({ ...fire, calculatedSeverity: "CRITICAL" }, [
    { ...stockedStations[0], activePersonnelCount: 0 },
    { ...stockedStations[1], serviceableTruckCount: 0 },
    stockedStations[2],
  ]);
  assert.deepEqual(ranked.filter((s) => s.recommended).map((s) => s.id), ["dalipe"]);
  assert.equal(ranked.find((s) => s.id === "angel").recommendedTruckCount, 0);
});

test("moderate and high danger skip a closer station with no serviceable truck", () => {
  for (const calculatedSeverity of ["MODERATE", "HIGH"]) {
    const ranked = rankStationsForIncident({ ...fire, calculatedSeverity }, [
      stockedStations[0], { ...stockedStations[1], serviceableTruckCount: 0 }, stockedStations[2],
    ]);
    assert.deepEqual(ranked.filter((s) => s.recommended).map((s) => [s.id, s.recommendedTruckCount]),
      [["main", calculatedSeverity === "HIGH" ? 3 : 1]]);
  }
});

test("low danger recommends crew verification even when the nearest station has no truck", () => {
  const ranked = rankStationsForIncident({ ...fire, calculatedSeverity: "LOW" }, [
    stockedStations[0], { ...stockedStations[1], serviceableTruckCount: 0 }, stockedStations[2],
  ]);
  assert.deepEqual(ranked.filter((s) => s.recommended).map((s) => [s.id, s.recommendedTruckCount]), [["angel", 0]]);
});

test("missing inventory never invents a recommended truck count", () => {
  const ranked = rankStationsForIncident({ ...fire, calculatedSeverity: "HIGH" }, [sanJose, sanAngel]);
  assert.equal(ranked.find((s) => s.recommended).recommendedTruckCount, null);
});

test("critical danger does not need distance to recommend all stocked staffed stations", () => {
  const ranked = rankStationsForIncident({ latitude: Number.NaN, longitude: 121.9, calculatedSeverity: "CRITICAL" }, stockedStations);
  assert.equal(ranked.filter((s) => s.recommended).length, 3);
  assert.ok(ranked.every((s) => s.distanceMeters === null));
});
