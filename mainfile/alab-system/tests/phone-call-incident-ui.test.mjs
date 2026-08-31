import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path) => readFileSync(path, "utf8");

test("municipal incident views expose From Phone Caller without requiring a resident profile", () => {
  const queue = source("app/api/municipal-bfp/incidents/route.ts");
  const detail = source("app/api/municipal-bfp/incidents/[id]/route.ts");
  const queueUi = source("app/municipal-bfp/active-incidents/page.tsx");
  const detailUi = source("app/_components/municipal-incident-detail.tsx");
  const gisUi = source("app/_components/municipal-gis-incident-modal.tsx");

  assert.match(queue, /fr\.report_source as "reportSource"/);
  assert.match(detail, /left join resident_profiles/);
  assert.match(detail, /fr\.report_source as "reportSource"/);
  assert.match(queueUi, /From Phone Caller/);
  assert.match(detailUi, /From Phone Caller/);
  assert.match(gisUi, /From Phone Caller/);
});

test("phone call intake provides a draggable map pin and explicit responder selection", () => {
  const intake = source("app/_components/municipal-phone-call-incident-intake.tsx");
  assert.match(intake, /import\("leaflet"\)/);
  assert.match(intake, /draggable:\s*true/);
  assert.match(intake, /marker\.on\("dragend"/);
  assert.match(intake, /map\.on\("click"/);
  assert.match(intake, /zoomControl:\s*true/);
  assert.match(intake, /Caller name/);
  assert.match(intake, /Caller phone/);
  assert.match(intake, /From Phone Caller/);
  assert.match(intake, /\/api\/municipal-bfp\/stations\/\$\{stationId\}\/responders/);
  assert.match(intake, /Create & Dispatch/);
});

test("phone call intake submits only supported fire type values", () => {
  const intake = source("app/_components/municipal-phone-call-incident-intake.tsx");
  assert.match(intake, /"HOUSE_BUILDING"/);
  assert.match(intake, /"GRASS"/);
  assert.match(intake, /"FOREST"/);
  assert.match(intake, /"VEHICLE"/);
  assert.match(intake, /"OTHER"/);
});

test("phone call intake loads municipality-scoped barangays for an operational picker", () => {
  const intake = source("app/_components/municipal-phone-call-incident-intake.tsx");
  const barangaysRoute = source("app/api/municipal-bfp/barangays/route.ts");

  assert.match(intake, /fetch\("\/api\/municipal-bfp\/barangays"/);
  assert.match(intake, /<label>Barangay<select/);
  assert.doesNotMatch(intake, /Barangay ID/);
  assert.match(barangaysRoute, /requireMunicipalAdmin/);
  assert.match(barangaysRoute, /municipality_id = \$1/);
  assert.match(barangaysRoute, /\{ barangays \}/);
});

test("phone call intake supports keyboard coordinate placement and keeps it equivalent to map placement", () => {
  const intake = source("app/_components/municipal-phone-call-incident-intake.tsx");

  assert.match(intake, /Latitude/);
  assert.match(intake, /Longitude/);
  assert.match(intake, /Set precise coordinates/);
  assert.match(intake, /applyKeyboardPin/);
  assert.match(intake, /markerRef\.current\?\.setLatLng/);
  assert.match(intake, /setPinPlaced\(true\)/);
});

test("phone call intake contains focus and makes the background inert while it is open", () => {
  const intake = source("app/_components/municipal-phone-call-incident-intake.tsx");
  const incidents = source("app/municipal-bfp/active-incidents/page.tsx");

  assert.match(intake, /trapFocus/);
  assert.match(intake, /event\.key !== "Tab"/);
  assert.match(intake, /element\.inert = true/);
  assert.match(intake, /setAttribute\("aria-hidden", "true"\)/);
  assert.match(intake, /const openingElement = openingElementRef\.current/);
  assert.match(intake, /openingElement\?\.focus\(\)/);
  assert.match(incidents, /flex-wrap:\s*wrap/);
  assert.match(incidents, /@media \(max-width: 480px\)/);
});
