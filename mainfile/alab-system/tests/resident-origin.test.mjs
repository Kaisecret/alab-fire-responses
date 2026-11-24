import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { describeResidentOrigin } from "../lib/fire-reports/resident-origin.ts";

test("a verified resident reporting in another town shows both towns", () => {
  assert.equal(describeResidentOrigin("San Jose", "Hamtic", true), "Verified resident from San Jose · reported in Hamtic");
});

test("a verified resident reporting in their own town shows only the home town", () => {
  assert.equal(describeResidentOrigin("Hamtic", "Hamtic", true), "Verified resident from Hamtic");
  assert.equal(describeResidentOrigin(" hamtic ", "Hamtic", true), "Verified resident from hamtic");
});

test("an unverified resident is not called verified", () => {
  assert.equal(describeResidentOrigin("Sibalom", "Hamtic", false), "Resident from Sibalom · reported in Hamtic");
  assert.equal(describeResidentOrigin("Sibalom", "Hamtic", null), "Resident from Sibalom · reported in Hamtic");
});

test("no registered town: verified residents still show the check, phone callers show nothing", () => {
  assert.equal(describeResidentOrigin(null, "Hamtic", true), "Verified resident");
  assert.equal(describeResidentOrigin("  ", "Hamtic", true), "Verified resident");
  assert.equal(describeResidentOrigin(null, "Hamtic", null), null);
});

test("no reported town falls back to the home town only", () => {
  assert.equal(describeResidentOrigin("San Jose", null, true), "Verified resident from San Jose");
});

test("the incident detail reads the home town and verification from the database, not hardcoded", () => {
  const route = readFileSync(new URL("../app/api/municipal-bfp/incidents/[id]/route.ts", import.meta.url), "utf8");
  const detail = readFileSync(new URL("../app/_components/municipal-incident-detail.tsx", import.meta.url), "utf8");
  // All three ORIGIN queries (primary, preview, fallback) carry both fields.
  assert.equal(route.match(/ram\.name as "residentMunicipality", rv\.status = 'VERIFIED' as "residentVerified"/g)?.length, 3);
  assert.equal(route.match(/left join municipalities ram on ram\.id = ra\.municipality_id/g)?.length, 3);
  assert.match(detail, /describeResidentOrigin\(incident\.residentMunicipality, incident\.municipality, incident\.residentVerified\)/);
  assert.doesNotMatch(detail, /from San Jose/);
});
