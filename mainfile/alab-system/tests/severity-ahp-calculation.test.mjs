import assert from "node:assert/strict";
import test from "node:test";

test("AHP Multi-Criteria decision weights sum to 1.0", async () => {
  const { AHP_WEIGHTS, VEGETATION_AHP_WEIGHTS, STRUCTURAL_AHP_RESULT, VEGETATION_AHP_RESULT } = await import("../lib/fire-reports/severity.ts");
  const sum = Object.values(AHP_WEIGHTS).reduce((acc, w) => acc + w, 0);
  assert.equal(Math.round(sum * 100) / 100, 1.0);
  assert.ok(Math.abs(Object.values(VEGETATION_AHP_WEIGHTS).reduce((acc, w) => acc + w, 0) - 1) < 1e-10);
  assert.ok(STRUCTURAL_AHP_RESULT.cr <= 0.10);
  assert.ok(VEGETATION_AHP_RESULT.cr <= 0.10);
});

test("conflagration scenario: magkakadikit + light materials + strong wind produces CRITICAL severity", async () => {
  const { calculateFireSeverity } = await import("../lib/fire-reports/severity.ts");

  const assessment = calculateFireSeverity({
    fireType: "HOUSE_BUILDING",
    structureMaterial: "LIGHT_MATERIALS",
    houseDensity: "PACKED_MAGKAKADIKIT",
    routeAccessibility: "INTERIOR_ALLEY_ESKINITA",
    windSpeedKph: 35,
    windDirectionDeg: 90,
    temperatureC: 34,
    relativeHumidity: 50,
  });

  assert.equal(assessment.level, "CRITICAL");
  assert.ok(assessment.score >= 80, `Expected score >= 80, got ${assessment.score}`);
  assert.ok(assessment.factors.some((f) => f.includes("Dikit-dikit")), "Missing Dikit-dikit factor");
  assert.ok(assessment.factors.some((f) => f.includes("hangin")), "Missing wind factor");
  assert.ok(assessment.factors.some((f) => f.includes("Eskinita")), "Missing alley factor");
});

test("isolated standalone concrete house with calm winds produces LOW or MODERATE severity", async () => {
  const { calculateFireSeverity } = await import("../lib/fire-reports/severity.ts");

  const assessment = calculateFireSeverity({
    fireType: "HOUSE_BUILDING",
    structureMaterial: "CONCRETE",
    houseDensity: "ISOLATED_FAR",
    routeAccessibility: "WIDE_ROAD",
    windSpeedKph: 6,
    temperatureC: 27,
    relativeHumidity: 80,
  });

  assert.ok(assessment.level === "LOW" || assessment.level === "MODERATE");
  assert.ok(assessment.score < 40, `Expected score < 40, got ${assessment.score}`);
});

test("wind classification classifies wind speeds according to standard meteorological thresholds", async () => {
  const { classifyWindCondition } = await import("../lib/weather/service.ts");

  assert.equal(classifyWindCondition(5), "CALM");
  assert.equal(classifyWindCondition(18), "MODERATE");
  assert.equal(classifyWindCondition(32), "STRONG_WIND");
  assert.equal(classifyWindCondition(55), "GALE");
});

test("vegetation danger uses wind, weather, mapped-building distance and route", async () => {
  const { calculateFireSeverity } = await import("../lib/fire-reports/severity.ts");
  for (const fireType of ["GRASS", "FOREST"]) {
    const dangerous = calculateFireSeverity({
      fireType, windSpeedKph: 42, temperatureC: 35, relativeHumidity: 45,
      nearestBuildingDistanceMeters: 30, routeAccessibility: "INTERIOR_ALLEY_ESKINITA",
    });
    assert.ok(["HIGH", "CRITICAL"].includes(dangerous.level));
    assert.ok(dangerous.factors.some((factor) => factor.includes("mapped building")));
    assert.ok(dangerous.factors.some((factor) => factor.includes("off-road")));
    assert.ok(dangerous.factors.every((factor) => !factor.includes("Eskinita")));
    assert.deepEqual(Object.keys(dangerous.weights), ["wind", "weather", "distance", "route"]);

    const calm = calculateFireSeverity({
      fireType, windSpeedKph: 5, temperatureC: 27, relativeHumidity: 90,
      nearestBuildingDistanceMeters: 700, routeAccessibility: "WIDE_ROAD",
    });
    assert.equal(calm.level, "LOW");
  }
});

test("vegetation distance bands respect 50, 200 and 500 meter boundaries", async () => {
  const { calculateFireSeverity } = await import("../lib/fire-reports/severity.ts");
  const scoreAt = (distance) => calculateFireSeverity({ fireType: "GRASS", nearestBuildingDistanceMeters: distance }).score;
  assert.ok(scoreAt(49.99) > scoreAt(50));
  assert.ok(scoreAt(199.99) > scoreAt(200));
  assert.ok(scoreAt(499.99) > scoreAt(500));
});

test("vehicle fires are moderate unless packed houses or a narrow route raises them to high", async () => {
  const { calculateFireSeverity } = await import("../lib/fire-reports/severity.ts");
  assert.equal(calculateFireSeverity({ fireType: "VEHICLE" }).level, "MODERATE");
  assert.equal(calculateFireSeverity({ fireType: "VEHICLE", houseDensity: "PACKED_MAGKAKADIKIT" }).level, "HIGH");
  for (const routeAccessibility of ["NARROW_STREET", "INTERIOR_ALLEY_ESKINITA", "DEAD_END_OR_BLOCKED"]) {
    assert.equal(calculateFireSeverity({ fireType: "VEHICLE", routeAccessibility }).level, "HIGH");
  }
});

test("rubbish fires are low unless packed houses or wind of at least 25 km/h raises them", async () => {
  const { calculateFireSeverity } = await import("../lib/fire-reports/severity.ts");
  assert.equal(calculateFireSeverity({ fireType: "OTHER", windSpeedKph: 24.99 }).level, "LOW");
  assert.equal(calculateFireSeverity({ fireType: "OTHER", windSpeedKph: 25 }).level, "MODERATE");
  assert.equal(calculateFireSeverity({ fireType: "OTHER", houseDensity: "PACKED_MAGKAKADIKIT" }).level, "MODERATE");
});

test("missing fire type uses the structural model", async () => {
  const { calculateFireSeverity } = await import("../lib/fire-reports/severity.ts");
  const input = { houseDensity: "PACKED_MAGKAKADIKIT", windSpeedKph: 35, structureMaterial: "LIGHT_MATERIALS" };
  assert.deepEqual(calculateFireSeverity(input), calculateFireSeverity({ ...input, fireType: "HOUSE_BUILDING" }));
});
