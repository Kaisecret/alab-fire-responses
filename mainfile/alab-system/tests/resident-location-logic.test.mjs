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

test("super accurately resolves and normalizes Antique barangays and municipalities", () => {
  // Hamtic with Purok 2 in neighbourhood
  assert.deepEqual(resolvePhilippineAddress({
    road: "Anini-y–Tobias Fornier Road",
    neighbourhood: "Purok 2",
    village: "Mapatag",
    town: "Hamtic",
    state: "Antique",
  }, "Anini-y–Tobias Fornier Road, Purok 2, Mapatag, Hamtic, Antique, Western Visayas, 5715, Philippines"), {
    barangay: "Mapatag",
    municipality: "Hamtic",
    isAntique: true,
  });

  // San Jose with "Maybato North" and "San Jose"
  assert.deepEqual(resolvePhilippineAddress({
    road: "Villavert Street",
    village: "Maybato North",
    town: "San Jose",
  }, "Villavert Street, Maybato North, San Jose, Antique"), {
    barangay: "Maybato Norte",
    municipality: "San Jose de Buenavista",
    isAntique: true,
  });

  // Sibalom with Unicode Roman numeral "District Ⅱ"
  assert.deepEqual(resolvePhilippineAddress({
    quarter: "District Ⅱ",
    town: "Sibalom",
    state: "Antique",
  }, "District Ⅱ, Sibalom, Antique"), {
    barangay: "District II",
    municipality: "Sibalom",
    isAntique: true,
  });

  // Hamtic with hyphen variation "Villavert Jimenez"
  assert.deepEqual(resolvePhilippineAddress({
    village: "Villavert Jimenez",
    municipality: "Municipality of Hamtic",
    state: "Antique",
  }), {
    barangay: "Villavert-Jimenez",
    municipality: "Hamtic",
    isAntique: true,
  });

  // Tobias Fornier with alias "Dao"
  assert.deepEqual(resolvePhilippineAddress({
    village: "Poblacion Norte",
    town: "Dao",
    state: "Antique",
  }), {
    barangay: "Poblacion Norte",
    municipality: "Tobias Fornier",
    isAntique: true,
  });
});

