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

test("resident report markup contains live weather card and 1-tap quick pills", () => {
  const content = read("app/_content/resident-report-fire-content.ts");

  assert.match(content, /data-live-weather-card/);
  assert.match(content, /data-weather-temp-display/);
  assert.match(content, /data-weather-wind-display/);
  assert.match(content, /data-quick-density="PACKED_MAGKAKADIKIT"/);
  assert.match(content, /data-quick-route="INTERIOR_ALLEY_ESKINITA"/);
  assert.match(content, /Dikit-dikit ang mga bahay/);
  assert.match(content, /Eskinita \/ Makipot na daan/);
});

test("resident report status contains AHP severity badge and Phase 2 tactical enrichment", () => {
  const status = read("app/_components/resident-report-status.tsx");

  assert.match(status, /severity-pill/);
  assert.match(status, /tactical-enrichment-card/);
  assert.match(status, /wind-hazard-banner/);
  assert.match(status, /updateTacticalDetail/);
  assert.match(status, /fetch\(`\/api\/resident\/fire-reports\/\$\{reportId\}`, \{/);
  assert.match(status, /method:\s*"PATCH"/);
});

test("municipal incident detail displays the AHP severity badge and tactical conflagration card", () => {
  const detail = read("app/_components/municipal-incident-detail.tsx");

  assert.match(detail, /mbfp-severity-hero-badge/);
  assert.match(detail, /mbfp-tactical-severity-card/);
  assert.match(detail, /House Density \(Agwat\)/);
  assert.match(detail, /DIKIT-DIKIT/);
  assert.match(detail, /Live Wind &amp; Weather/);
  assert.match(detail, /ESKINITA \/ LOOBAN/);
});
