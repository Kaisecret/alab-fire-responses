import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (path) => readFileSync(join(root, ...path.split("/")), "utf8");

test("validateFireReportInput parses optional environmental and tactical fields safely", async () => {
  const { validateFireReportInput } = await import("../lib/fire-reports/validation.ts");

  const parsed = validateFireReportInput({
    fireType: "HOUSE_BUILDING",
    latitude: "10.7431",
    longitude: "121.9272",
    municipality: "San Jose",
    barangay: "Barangay 1",
    houseDensity: "PACKED_MAGKAKADIKIT",
    routeAccessibility: "INTERIOR_ALLEY_ESKINITA",
    weatherWindSpeed: "30.5",
    weatherTemperature: "32.0",
    weatherHumidity: "60",
    weatherWindCondition: "STRONG_WIND",
  });

  assert.equal(parsed.houseDensity, "PACKED_MAGKAKADIKIT");
  assert.equal(parsed.routeAccessibility, "INTERIOR_ALLEY_ESKINITA");
  assert.equal(parsed.weatherWindSpeed, 30.5);
  assert.equal(parsed.weatherTemperature, 32.0);
  assert.equal(parsed.weatherWindCondition, "STRONG_WIND");
});

test("validateTacticalDetailsUpdate safely captures post-alert enrichment updates", async () => {
  const { validateTacticalDetailsUpdate } = await import("../lib/fire-reports/validation.ts");

  const update = validateTacticalDetailsUpdate({
    structureMaterial: "LIGHT_MATERIALS",
    houseDensity: "PACKED_MAGKAKADIKIT",
    routeAccessibility: "INTERIOR_ALLEY_ESKINITA",
  });

  assert.equal(update.structureMaterial, "LIGHT_MATERIALS");
  assert.equal(update.houseDensity, "PACKED_MAGKAKADIKIT");
  assert.equal(update.routeAccessibility, "INTERIOR_ALLEY_ESKINITA");
});

test("automatic dense evidence raises an omitted or understated resident density before severity scoring", async () => {
  const { prepareDensitySeverityContext } = await import("../lib/fire-reports/building-density.ts");
  const { calculateFireSeverity } = await import("../lib/fire-reports/severity.ts");
  const assessment = {
    status: "DENSE_CLUSTER_DETECTED",
    confidence: "HIGH",
    buildingCount: 3,
    minimumGapMeters: 1.4,
    source: "GOOGLE_OPEN_BUILDINGS_V3_2023_05",
    assessedAt: new Date("2026-09-04T00:00:00Z"),
    evidence: [],
  };

  const context = prepareDensitySeverityContext({
    fireType: "HOUSE_BUILDING",
    houseDensity: null,
    windSpeedKph: 8,
    temperatureC: 28,
    relativeHumidity: 80,
  }, assessment);

  assert.equal(context.reportedHouseDensity, null);
  assert.equal(context.effectiveHouseDensity, "PACKED_MAGKAKADIKIT");
  assert.equal(calculateFireSeverity(context.severityInput).level, "HIGH");
  assert.ok(context.densityFactors.some((factor) => factor.includes("Automatic map assessment")));
});

test("resident packed density remains packed when automatic footprint data is unavailable", async () => {
  const { prepareDensitySeverityContext } = await import("../lib/fire-reports/building-density.ts");
  const context = prepareDensitySeverityContext({ houseDensity: "PACKED_MAGKAKADIKIT" }, {
    status: "INSUFFICIENT_DATA",
    confidence: "UNAVAILABLE",
    buildingCount: 0,
    minimumGapMeters: null,
    source: null,
    assessedAt: new Date("2026-09-04T00:00:00Z"),
    evidence: [],
  });

  assert.equal(context.effectiveHouseDensity, "PACKED_MAGKAKADIKIT");
});

test("resident report markup contains 1-tap quick pills and hides weather from resident UI", () => {
  const content = read("app/_content/resident-report-fire-content.ts");

  assert.doesNotMatch(content, /data-live-weather-card/);
  assert.match(content, /data-photo-summary-preview/);
  assert.match(content, /hidden/);
  assert.match(content, /data-quick-density="PACKED_MAGKAKADIKIT"/);
  assert.match(content, /data-quick-route="INTERIOR_ALLEY_ESKINITA"/);
  assert.match(content, /Dikit-dikit ang mga bahay/);
  assert.match(content, /Eskinita \/ Makipot na daan/);
});

test("resident report status contains AHP severity badge and Phase 2 tactical enrichment", () => {
  const status = read("app/_components/resident-report-status.tsx");

  assert.match(status, /severity-pill/);
  assert.match(status, /tactical-enrichment-card/);
  assert.match(status, /updateTacticalDetail/);
  assert.match(status, /fetch\(`\/api\/resident\/fire-reports\/\$\{reportId\}`, \{/);
  assert.match(status, /method:\s*"PATCH"/);
});

test("municipal incident detail displays the AHP severity badge and localized incident site weather", () => {
  const detail = read("app/_components/municipal-incident-detail.tsx");

  assert.match(detail, /mbfp-severity-hero-badge/);
  assert.match(detail, /mbfp-tactical-severity-card/);
  assert.match(detail, /House Density \(Agwat\)/);
  assert.match(detail, /DIKIT-DIKIT/);
  assert.match(detail, /Weather at Incident Site/);
  assert.match(detail, /ESKINITA \/ LOOBAN/);
});

test("validateTacticalDetailsUpdate and validateFireReportInput normalize alias tactical values into canonical database enums", async () => {
  const { validateTacticalDetailsUpdate, validateFireReportInput } = await import("../lib/fire-reports/validation.ts");

  const normalizedUpdate = validateTacticalDetailsUpdate({
    structureMaterial: "CONCRETE_MIXED",
    houseDensity: "HIGH_DENSITY",
    routeAccessibility: "NARROW_ALLEY",
  });

  assert.equal(normalizedUpdate.structureMaterial, "MIXED_SEMI_CONCRETE");
  assert.equal(normalizedUpdate.houseDensity, "PACKED_MAGKAKADIKIT");
  assert.equal(normalizedUpdate.routeAccessibility, "INTERIOR_ALLEY_ESKINITA");

  const normalizedFromAliases = validateFireReportInput({
    fireType: "HOUSE_BUILDING",
    latitude: 10.74,
    longitude: 121.92,
    municipality: "San Jose",
    barangay: "Barangay 1",
    structureMaterial: "COMMERCIAL_STEEL",
    houseDensity: "ISOLATED",
    routeAccessibility: "WIDE_ROAD",
  });

  assert.equal(normalizedFromAliases.structureMaterial, "COMMERCIAL_STORAGE");
  assert.equal(normalizedFromAliases.houseDensity, "ISOLATED_FAR");
  assert.equal(normalizedFromAliases.routeAccessibility, "WIDE_ROAD");
});

test("resident report status contains canonical enums matching initial report submission without disappearing", () => {
  const status = read("app/_components/resident-report-status.tsx");

  assert.match(status, /PACKED_MAGKAKADIKIT/);
  assert.match(status, /INTERIOR_ALLEY_ESKINITA/);
  assert.match(status, /MIXED_SEMI_CONCRETE/);
  assert.match(status, /COMMERCIAL_STORAGE/);
  assert.match(status, /reported_house_density/);
});

