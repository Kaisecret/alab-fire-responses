import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const source = (path) => readFileSync(join(process.cwd(), path), "utf8");

test("municipal barangays route returns both municipality name and barangay list", () => {
  const route = source("app/api/municipal-bfp/barangays/route.ts");
  assert.match(route, /municipality:\s*identity\.municipalityName/);
  assert.match(route, /barangays/);
});

test("phone call intake picks the barangay from the PSA boundary at the map pin", () => {
  const intake = source("app/_components/municipal-phone-call-incident-intake.tsx");
  // OpenStreetMap's reverse geocode names the wrong barangay in Antique towns.
  assert.match(intake, /\/api\/geocode\/barangay/);
  assert.doesNotMatch(intake, /\/api\/geocode\/reverse/);
  assert.match(intake, /setBarangayId/);
  // A slow answer for an old pin must not overwrite the answer for the new one.
  assert.match(intake, /lookupSequenceRef/);
  // Pins near a border offer the barangay across it, and the map shows the outline.
  assert.match(intake, /nearbyBarangays/);
  assert.match(intake, /L\.polygon/);
});

test("barangay route answers from PSA boundaries with border alternatives", () => {
  const route = source("app/api/geocode/barangay/route.ts");
  assert.match(route, /locateAntiqueBarangay/);
  assert.match(route, /nearbyAntiqueBarangays/);
  assert.doesNotMatch(route, /nominatim/i);
});

test("phone call intake provides a pre-dispatch confirmation summary modal with non-destructive back", () => {
  const intake = source("app/_components/municipal-phone-call-incident-intake.tsx");
  assert.match(intake, /Confirm & Dispatch/);
  assert.match(intake, /CONFIRMATION|showConfirmation|summary/i);
  assert.match(intake, /Dispatch Summary|Review Incident & Dispatch|Confirm Dispatch/i);
  assert.match(intake, /Back|Edit Details/i);
});
