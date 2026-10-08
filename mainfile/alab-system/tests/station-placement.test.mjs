import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const { stationInOwnMunicipality, keepStationsInOwnMunicipality } = await import("../lib/intermunicipality/station-placement.ts");
const { rankNearbyMunicipalities } = await import("../lib/intermunicipality/proximity.ts");

const source = (path) => readFileSync(join(process.cwd(), path), "utf8");

// Active stations as they stood on 8 Oct 2026, including the two misplaced ones.
const station = (stationId, municipalityName, latitude, longitude) => ({
  stationId, stationName: stationId, municipalityId: municipalityName, municipalityName, latitude, longitude,
});
const STATIONS = [
  station("anini-y-misplaced", "Anini-y", 10.7442, 121.9422), // saved in San Jose until 8 Oct
  station("belison", "Belison", 10.837663, 121.960073),
  station("hamtic", "Hamtic", 10.6969, 121.9803),
  station("hamtic-may-bato", "Hamtic", 10.7442, 121.9422), // Maybato is a San Jose barangay
  station("patnongon", "Patnongon", 10.914371, 121.99534),
  station("san-jose", "San Jose de Buenavista", 10.7431, 121.9394),
  station("sibalom", "Sibalom", 10.7922, 122.0103),
  station("tobias-fornier", "Tobias Fornier", 10.516262, 121.945127),
];

test("a station saved inside another town is not that town's station", () => {
  assert.equal(stationInOwnMunicipality({ latitude: 10.7442, longitude: 121.9422, municipalityName: "Hamtic" }), false);
  assert.equal(stationInOwnMunicipality({ latitude: 10.7442, longitude: 121.9422, municipalityName: "Anini-y" }), false);
  assert.equal(stationInOwnMunicipality({ latitude: 10.7442, longitude: 121.9422, municipalityName: "San Jose de Buenavista" }), true);
});

test("real stations sit in their own towns", () => {
  assert.equal(stationInOwnMunicipality({ latitude: 10.6969, longitude: 121.9803, municipalityName: "Hamtic" }), true);
  assert.equal(stationInOwnMunicipality({ latitude: 10.4309, longitude: 121.92714, municipalityName: "Anini-y" }), true);
  assert.equal(stationInOwnMunicipality({ latitude: 10.837663, longitude: 121.960073, municipalityName: "Belison" }), true);
  assert.equal(stationInOwnMunicipality({ latitude: 11.931066, longitude: 121.548008, municipalityName: "Caluya" }), true);
});

test("a station just over its town's simplified border still counts", () => {
  // San Jose's Bugarot, about 280 m from Hamtic's Piapi II boundary.
  assert.equal(stationInOwnMunicipality({ latitude: 10.749, longitude: 121.976, municipalityName: "Hamtic" }), true);
});

test("a San Jose fire calls on the towns whose own stations are nearest", () => {
  // Funda-Dalipe, north San Jose: the fire behind ALAB-20261008-1D9F8C.
  const fire = { latitude: 10.765727, longitude: 121.930322, originMunicipalityId: "San Jose de Buenavista" };
  const kept = keepStationsInOwnMunicipality(STATIONS);
  assert.ok(!kept.some((s) => s.stationId === "hamtic-may-bato" || s.stationId === "anini-y-misplaced"));
  const ranked = rankNearbyMunicipalities(kept, fire, 3);
  assert.deepEqual(ranked.map((candidate) => candidate.municipalityName), ["Belison", "Sibalom", "Hamtic"]);
  assert.ok(ranked[2].distanceMeters > 9000, "Hamtic is measured from its real station");
});

test("every place that ranks towns by station ignores misplaced stations", () => {
  assert.match(source("lib/intermunicipality/observers.ts"), /keepStationsInOwnMunicipality/);
  assert.match(source("lib/intermunicipality/barangay-alerts.ts"), /keepStationsInOwnMunicipality/);
  const escalation = source("lib/incidents/backup-escalation.ts");
  assert.match(escalation, /keepStationsInOwnMunicipality/);
  // An alarm used each town's oldest station, wherever the fire was.
  assert.doesNotMatch(escalation, /order by station\.created_at asc\s+limit 1/);
});

test("stations cannot be saved outside their own town", () => {
  assert.match(source("lib/municipal-bfp/stations.ts"), /assertStationInMunicipality/);
  assert.match(source("lib/provincial-bfp/management/stations.ts"), /assertStationInMunicipality/);
  assert.match(source("app/api/municipal-bfp/stations/route.ts"), /STATION_OUTSIDE_MUNICIPALITY/);
  assert.match(source("app/api/municipal-bfp/stations/[stationId]/route.ts"), /STATION_OUTSIDE_MUNICIPALITY/);
});
