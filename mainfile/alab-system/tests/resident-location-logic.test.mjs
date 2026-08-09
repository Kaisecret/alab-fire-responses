import assert from "node:assert/strict";
import test from "node:test";
import {
  chooseBetterReading,
  classifyAccuracy,
  isWithinAntiqueBounds,
  resolveNearestLandmark,
  resolvePhilippineAddress,
} from "../app/resident/report-fire/location-logic.ts";

test("keeps the most accurate GPS reading", () => {
  const bacolod = {
    latitude: 10.6765,
    longitude: 122.9509,
    accuracy: 4200,
    timestamp: 1,
  };
  const hamtic = {
    latitude: 10.7023,
    longitude: 121.9828,
    accuracy: 28,
    timestamp: 2,
  };

  assert.deepEqual(chooseBetterReading(bacolod, hamtic), hamtic);
  assert.deepEqual(chooseBetterReading(hamtic, bacolod), hamtic);

  const falselyPreciseBacolod = { ...bacolod, accuracy: 20, timestamp: 3 };
  const credibleHamtic = { ...hamtic, accuracy: 45, timestamp: 4 };
  assert.equal(isWithinAntiqueBounds(falselyPreciseBacolod), false);
  assert.equal(isWithinAntiqueBounds(credibleHamtic), true);
  assert.deepEqual(chooseBetterReading(falselyPreciseBacolod, credibleHamtic), credibleHamtic);
});

test("classifies precise, approximate, and poor accuracy", () => {
  assert.equal(classifyAccuracy(50), "precise");
  assert.equal(classifyAccuracy(120), "approximate");
  assert.equal(classifyAccuracy(151), "poor");
});

test("prioritizes an explicit barangay and validates Antique", () => {
  assert.deepEqual(resolvePhilippineAddress({
    neighbourhood: "Macapina",
    quarter: "Barangay 6",
    city: "Bacolod",
    region: "Negros Island Region",
  }), {
    barangay: "Barangay 6",
    municipality: "Bacolod",
    isAntique: false,
  });

  assert.deepEqual(resolvePhilippineAddress({
    village: "Igbical",
    town: "Hamtic",
    state: "Antique",
    "ISO3166-2-lvl4": "PH-ANT",
  }), {
    barangay: "Igbical",
    municipality: "Hamtic",
    isAntique: true,
  });
});

test("selects the nearest mapped landmark from reverse-geocode data", () => {
  assert.equal(resolveNearestLandmark({
    name: "Hamtic Municipal Hall",
    address: { road: "Rizal Street" },
  }), "Hamtic Municipal Hall");

  assert.equal(resolveNearestLandmark({
    address: {
      amenity: "Hamtic Central School",
      road: "Tito Navarro Street",
    },
  }), "Hamtic Central School");

  assert.equal(resolveNearestLandmark({
    address: {
      road: "Tito Navarro Street",
      village: "Caridad",
    },
  }), "Tito Navarro Street");
});
