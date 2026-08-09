import assert from "node:assert/strict";
import test from "node:test";
import {
  chooseBetterReading,
  classifyAccuracy,
  resolvePhilippineAddress,
} from "../app/resident/report-fire/location-logic.mts";

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
