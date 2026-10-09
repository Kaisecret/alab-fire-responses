import assert from "node:assert/strict";
import test from "node:test";

import { rankNearbyMunicipalities } from "../lib/intermunicipality/proximity.ts";
import { chooseObserverMunicipalities } from "../lib/intermunicipality/observer-pairing.ts";

// Live station pins on 9 Oct 2026, measured from a Funda-Dalipe fire.
const stations = [
  { stationId: "belison", stationName: "Belison Fire Station", municipalityId: "m-belison", municipalityName: "Belison", latitude: 10.837663, longitude: 121.960073 },
  { stationId: "sibalom", stationName: "Sibalom Fire Station", municipalityId: "m-sibalom", municipalityName: "Sibalom", latitude: 10.7922, longitude: 122.0103 },
  { stationId: "hamtic", stationName: "Hamtic Fire Station", municipalityId: "m-hamtic", municipalityName: "Hamtic", latitude: 10.6969, longitude: 121.9803 },
  { stationId: "patnongon", stationName: "Patnongon Fire Station", municipalityId: "m-patnongon", municipalityName: "Patnongon", latitude: 10.914371, longitude: 121.99534 },
];
const fundaDalipe = { latitude: 10.765734, longitude: 121.930319, originMunicipalityId: "m-san-jose" };
const ranked = (from = stations) => rankNearbyMunicipalities(from, fundaDalipe, Infinity);

test("a San Jose fire is watched by Hamtic and Sibalom even when Belison is closer", () => {
  assert.deepEqual(ranked().slice(0, 2).map((c) => c.municipalityName), ["Belison", "Sibalom"]);

  const chosen = chooseObserverMunicipalities(ranked(), "San Jose de Buenavista", 2);

  assert.deepEqual(chosen.map((c) => c.municipalityName), ["Hamtic", "Sibalom"]);
  assert.ok(chosen.every((c) => c.distanceMeters > 0), "each pick keeps its measured distance");
});

test("a paired town with no eligible station is replaced by the nearest other town", () => {
  const withoutHamtic = stations.filter((s) => s.municipalityName !== "Hamtic");

  const chosen = chooseObserverMunicipalities(ranked(withoutHamtic), "San Jose de Buenavista", 2);

  assert.deepEqual(chosen.map((c) => c.municipalityName), ["Sibalom", "Belison"]);
});

test("a town without a pairing keeps the nearest towns", () => {
  const chosen = chooseObserverMunicipalities(ranked(), "Tibiao", 2);

  assert.deepEqual(chosen.map((c) => c.municipalityName), ["Belison", "Sibalom"]);
});
