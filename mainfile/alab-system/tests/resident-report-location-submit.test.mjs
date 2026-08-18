import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();

test("normalizes a detected San Jose location to the official Antique municipality", async () => {
  const validation = await import("../lib/fire-reports/validation.ts");

  assert.equal(
    validation.normalizeDetectedMunicipality("San Jose"),
    "San Jose de Buenavista",
  );
});

test("normalizes a reverse-geocoded barangay label to the official barangay name", async () => {
  const validation = await import("../lib/fire-reports/validation.ts");

  assert.equal(validation.normalizeDetectedBarangay("Brgy. Mapatag"), "Mapatag");
});

test("normalizes the San Jose GPS label Maybato North to the official barangay spelling", async () => {
  const validation = await import("../lib/fire-reports/validation.ts");

  assert.equal(validation.normalizeDetectedBarangay("Maybato North"), "Maybato Norte");
});

test("keeps a municipality report routable when the GPS barangay is not in the official list", async () => {
  const validation = await import("../lib/fire-reports/validation.ts");

  assert.deepEqual(
    validation.resolveDetectedBarangay([
      { id: "official-map", name: "Mapatag" },
      { id: "official-maybato", name: "Maybato Norte" },
    ], "Unmapped GPS Barangay"),
    {
      barangayId: null,
      barangayName: "Unmapped GPS Barangay",
      needsVerification: true,
    },
  );
});

test("resident report submission waits for automatic location detection instead of failing immediately", () => {
  const page = readFileSync(join(root, "app", "resident", "report-fire", "page.tsx"), "utf8");

  assert.match(page, /resident-report:request-location/);
  assert.match(page, /DETECTING LOCATION/);
  assert.match(page, /detail\.resolve/);
});

test("a cancelled earlier GPS lookup cannot settle the newer report submission request", () => {
  const page = readFileSync(join(root, "app", "resident", "report-fire", "page.tsx"), "utf8");

  assert.match(page, /Map<number, Set<\(valid: boolean\) => void>>/);
  assert.match(page, /const run = detectLocation\(\);/);
  assert.match(page, /settleLocationRequests\(run, await resolveReading/);
});

test("a failed automatic location verification gives the resident a visible submit error", () => {
  const page = readFileSync(join(root, "app", "resident", "report-fire", "page.tsx"), "utf8");

  assert.match(page, /We could not verify your current location\. Turn on precise location, then try again\./);
});

test("resident report submission uses the full-screen fire loader while detecting and sending", () => {
  const page = readFileSync(join(root, "app", "resident", "report-fire", "page.tsx"), "utf8");

  assert.match(page, /ResidentFireLoader/);
  assert.match(page, /resident-report:submission-state/);
  assert.match(page, /Sending your fire alert/);
});

test("report persistence uses the normalized detected municipality rather than the resident address", () => {
  const service = readFileSync(join(root, "lib", "fire-reports", "service.ts"), "utf8");

  assert.match(service, /normalizeDetectedMunicipality\(input\.municipality\)/);
  assert.doesNotMatch(service, /resident_addresses/);
});

test("report persistence compares normalized barangay labels instead of requiring an exact reverse-geocoder label", () => {
  const service = readFileSync(join(root, "lib", "fire-reports", "service.ts"), "utf8");

  assert.match(service, /normalizeDetectedBarangay\(input\.barangay\)/);
});
