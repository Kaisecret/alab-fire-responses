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

test("phone call intake reverse geocodes map pin to auto-select barangays", () => {
  const intake = source("app/_components/municipal-phone-call-incident-intake.tsx");
  assert.match(intake, /\/api\/geocode\/reverse/);
  assert.match(intake, /setBarangayId/);
  assert.match(intake, /Detected Barangay|Auto-detected|detectedBarangay/i);
});

test("phone call intake provides a pre-dispatch confirmation summary modal with non-destructive back", () => {
  const intake = source("app/_components/municipal-phone-call-incident-intake.tsx");
  assert.match(intake, /Confirm & Dispatch/);
  assert.match(intake, /CONFIRMATION|showConfirmation|summary/i);
  assert.match(intake, /Dispatch Summary|Review Incident & Dispatch|Confirm Dispatch/i);
  assert.match(intake, /Back|Edit Details/i);
});
