import assert from "node:assert/strict";
import test from "node:test";

import { loadServerModule } from "./helpers/load-server-module.mjs";

const proximity = loadServerModule("lib/intermunicipality/proximity.ts", {
  "./types": {},
});
const doctrine = loadServerModule("lib/incidents/alarm-doctrine.ts", {
  "../intermunicipality/proximity": proximity,
  "../intermunicipality/types": {},
});

/*
 * Antique geography, roughly to scale. Hamtic sits between San Jose to the
 * north and Tobias Fornier to the south, which is the case the doctrine has to
 * get right: the same municipality's fire calls a different neighbour
 * depending on which end of it is burning.
 */
const SAN_JOSE = { municipalityId: "m-sanjose", municipalityName: "San Jose de Buenavista" };
const TOBIAS = { municipalityId: "m-tobias", municipalityName: "Tobias Fornier" };
const SIBALOM = { municipalityId: "m-sibalom", municipalityName: "Sibalom" };
const CALUYA = { municipalityId: "m-caluya", municipalityName: "Caluya" };

const stations = [
  { stationId: "s-sanjose", ...SAN_JOSE, latitude: 10.7500, longitude: 121.9400 },
  { stationId: "s-tobias", ...TOBIAS, latitude: 10.5200, longitude: 121.9300 },
  { stationId: "s-sibalom", ...SIBALOM, latitude: 10.7920, longitude: 122.0100 },
  // Far north island municipality: only a whole-province call reaches it.
  { stationId: "s-caluya", ...CALUYA, latitude: 11.9400, longitude: 121.4700 },
];

// Northern Hamtic, close to the San Jose line.
const NEAR_SAN_JOSE = { latitude: 10.7200, longitude: 121.9500, originMunicipalityId: "m-hamtic" };
// Southern Hamtic, close to Tobias Fornier.
const NEAR_TOBIAS = { latitude: 10.5600, longitude: 121.9350, originMunicipalityId: "m-hamtic" };

test("the first alarm is the municipality's own and is never declared by hand", () => {
  assert.equal(doctrine.ALARM_DOCTRINE[1].declarable, false);
  assert.equal(doctrine.AUTOMATIC_ALARM_LEVEL, 1);

  const summoned = doctrine.resolveAlarmSummons({ level: 1, ...NEAR_SAN_JOSE, stations });
  assert.deepEqual(summoned, [], "a first alarm calls nobody outside the origin");

  assert.equal(doctrine.isDeclarableAlarmLevel(1), false);
  for (const level of [2, 3, 4]) {
    assert.equal(doctrine.isDeclarableAlarmLevel(level), true);
  }
});

test("the province's alarms stop at the fourth", () => {
  assert.equal(doctrine.MAX_ALARM_LEVEL, 4);
  // The fifth belongs to Region VI and is outside this system.
  assert.equal(doctrine.isDeclarableAlarmLevel(5), false);
  assert.equal(doctrine.ALARM_DOCTRINE[5], undefined);
  assert.deepEqual(
    doctrine.DECLARABLE_ALARM_LEVELS.map((entry) => entry.level),
    [2, 3, 4],
  );
});

test("a second alarm calls whoever is nearest the fire, not the nearest on the map", () => {
  const north = doctrine.resolveAlarmSummons({ level: 2, ...NEAR_SAN_JOSE, stations });
  assert.equal(north.length, 1);
  assert.equal(north[0].municipalityId, "m-sanjose");

  // The same municipality, burning at its southern end, calls the other side.
  const south = doctrine.resolveAlarmSummons({ level: 2, ...NEAR_TOBIAS, stations });
  assert.equal(south.length, 1);
  assert.equal(south[0].municipalityId, "m-tobias");
});

test("a third alarm calls everyone within the radius and no one beyond it", () => {
  const summoned = doctrine.resolveAlarmSummons({ level: 3, ...NEAR_SAN_JOSE, stations });
  const ids = summoned.map((entry) => entry.municipalityId);

  assert.ok(ids.includes("m-sanjose"), "the nearest is still called");
  assert.ok(ids.includes("m-sibalom"), "a municipality inside the radius is called");
  assert.ok(!ids.includes("m-caluya"), "an island far to the north is not");

  for (const entry of summoned) {
    assert.ok(
      entry.distanceMeters <= doctrine.NEARBY_RADIUS_METERS,
      `${entry.municipalityName} is inside the radius`,
    );
  }
});

test("a fourth alarm calls the whole province, however far", () => {
  const summoned = doctrine.resolveAlarmSummons({ level: 4, ...NEAR_SAN_JOSE, stations });
  const ids = summoned.map((entry) => entry.municipalityId).sort();

  assert.deepEqual(ids, ["m-caluya", "m-sanjose", "m-sibalom", "m-tobias"]);
});

test("raising an alarm calls only the municipalities the lower one missed", () => {
  // The second alarm already reached San Jose.
  const summoned = doctrine.resolveAlarmSummons({
    level: 3,
    ...NEAR_SAN_JOSE,
    stations,
    alreadySummonedMunicipalityIds: ["m-sanjose"],
  });
  const ids = summoned.map((entry) => entry.municipalityId);

  assert.ok(!ids.includes("m-sanjose"), "nobody is asked twice for the same fire");
  assert.ok(ids.includes("m-sibalom"), "the newly reached municipality is called");
});

test("the origin never summons itself", () => {
  const withOrigin = [
    ...stations,
    { stationId: "s-hamtic", municipalityId: "m-hamtic", municipalityName: "Hamtic", latitude: 10.7000, longitude: 121.9700 },
  ];
  const summoned = doctrine.resolveAlarmSummons({ level: 4, ...NEAR_SAN_JOSE, stations: withOrigin });

  assert.ok(
    !summoned.some((entry) => entry.municipalityId === "m-hamtic"),
    "the municipality that owns the fire is already responding",
  );
});

test("the summons are ordered nearest first", () => {
  const summoned = doctrine.resolveAlarmSummons({ level: 4, ...NEAR_SAN_JOSE, stations });
  const distances = summoned.map((entry) => entry.distanceMeters);
  const sorted = [...distances].sort((left, right) => left - right);

  assert.deepEqual(distances, sorted, "the closest help is listed first");
});

test("a municipality is represented by its nearest station", () => {
  const twoStations = [
    { stationId: "s-far", ...SAN_JOSE, latitude: 10.9000, longitude: 121.9400 },
    { stationId: "s-near", ...SAN_JOSE, latitude: 10.7300, longitude: 121.9450 },
  ];
  const summoned = doctrine.resolveAlarmSummons({ level: 2, ...NEAR_SAN_JOSE, stations: twoStations });

  assert.equal(summoned.length, 1, "one entry per municipality, not per station");
  assert.equal(summoned[0].stationId, "s-near", "the station that would actually roll");
});

test("a fire without usable coordinates is refused rather than guessed at", () => {
  assert.throws(
    () => doctrine.resolveAlarmSummons({
      level: 2,
      latitude: Number.NaN,
      longitude: 121.9,
      originMunicipalityId: "m-hamtic",
      stations,
    }),
    /INVALID_INCIDENT_COORDINATES/,
  );
});
