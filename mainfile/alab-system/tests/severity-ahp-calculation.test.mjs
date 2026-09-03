import assert from "node:assert/strict";
import test from "node:test";

test("AHP Multi-Criteria decision weights sum to 1.0", async () => {
  const { AHP_WEIGHTS } = await import("../lib/fire-reports/severity.ts");
  const sum = Object.values(AHP_WEIGHTS).reduce((acc, w) => acc + w, 0);
  assert.equal(Math.round(sum * 100) / 100, 1.0);
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
