import assert from "node:assert/strict";
import test from "node:test";

import {
  distanceMeters,
  rankNearbyMunicipalities,
} from "../lib/intermunicipality/proximity.ts";

test("distanceMeters returns zero for identical coordinates", () => {
  assert.equal(distanceMeters(10.7, 122.0, 10.7, 122.0), 0);
});

test("ranking excludes the origin and returns one nearest station for each of two municipalities", () => {
  const stations = [
    { stationId: "h1", stationName: "Hamtic", municipalityId: "hamtic", municipalityName: "Hamtic", latitude: 10.70, longitude: 122.00 },
    { stationId: "s-far", stationName: "San Jose North", municipalityId: "san-jose", municipalityName: "San Jose", latitude: 10.80, longitude: 122.00 },
    { stationId: "s-near", stationName: "San Jose South", municipalityId: "san-jose", municipalityName: "San Jose", latitude: 10.71, longitude: 122.00 },
    { stationId: "t1", stationName: "Tobias Fornier", municipalityId: "tobias", municipalityName: "Tobias Fornier", latitude: 10.69, longitude: 122.00 },
    { stationId: "a1", stationName: "Anini-y", municipalityId: "anini-y", municipalityName: "Anini-y", latitude: 10.60, longitude: 122.00 },
  ];

  const ranked = rankNearbyMunicipalities(
    stations,
    { latitude: 10.70, longitude: 122.00, originMunicipalityId: "hamtic" },
    2,
  );

  assert.deepEqual(
    ranked.map((candidate) => [candidate.municipalityId, candidate.stationId]),
    [["san-jose", "s-near"], ["tobias", "t1"]],
  );
});

test("ranking is deterministic when two candidates have equal distance", () => {
  const ranked = rankNearbyMunicipalities(
    [
      { stationId: "b", stationName: "B Station", municipalityId: "municipality-b", municipalityName: "B", latitude: 10.71, longitude: 122.00 },
      { stationId: "a", stationName: "A Station", municipalityId: "municipality-a", municipalityName: "A", latitude: 10.69, longitude: 122.00 },
    ],
    { latitude: 10.70, longitude: 122.00, originMunicipalityId: "origin" },
    2,
  );
  assert.deepEqual(ranked.map((candidate) => candidate.municipalityId), [
    "municipality-a",
    "municipality-b",
  ]);
});
