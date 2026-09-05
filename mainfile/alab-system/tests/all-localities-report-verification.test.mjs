import assert from "node:assert/strict";
import test from "node:test";
import { antiqueBarangays } from "../app/_content/antique-barangays.ts";
import { resolvePhilippineAddress } from "../app/resident/report-fire/location-logic.ts";
import {
  normalizeDetectedMunicipality,
  resolveDetectedBarangay,
  validateFireReportInput,
} from "../lib/fire-reports/validation.ts";

test("exhaustive locality verification: every single Antique barangay and municipality resolves and validates cleanly without error", () => {
  const municipalities = Object.keys(antiqueBarangays);
  assert.equal(municipalities.length, 18, "Must contain all 18 Antique municipalities");

  let totalTested = 0;
  const failures = [];

  for (const [municipality, barangayList] of Object.entries(antiqueBarangays)) {
    assert.ok(barangayList.length > 0, `${municipality} must have barangays`);

    // Verify municipality normalization works for this municipality
    assert.equal(
      normalizeDetectedMunicipality(municipality),
      municipality,
      `Direct municipality '${municipality}' must match PSGC canonical name`,
    );
    assert.equal(
      normalizeDetectedMunicipality(`Municipality of ${municipality}`),
      municipality,
      `Prefixed 'Municipality of ${municipality}' must normalize to canonical name`,
    );

    for (const barangay of barangayList) {
      totalTested += 1;

      try {
        // 1. Direct address resolution via village tag
        const directResolved = resolvePhilippineAddress({
          village: barangay,
          town: municipality,
          state: "Antique",
          "ISO3166-2-lvl4": "PH-ANT",
        });

        assert.equal(directResolved.isAntique, true, `Location in ${barangay}, ${municipality} must be in Antique`);
        assert.equal(directResolved.municipality, municipality, `Municipality must resolve to ${municipality}`);
        assert.equal(directResolved.barangay, barangay, `Barangay must resolve to ${barangay}`);

        // 2. Address resolution via quarter tag with "Municipality of" prefix
        const quarterResolved = resolvePhilippineAddress({
          quarter: barangay,
          municipality: `Municipality of ${municipality}`,
          county: "Antique",
        });

        assert.equal(quarterResolved.isAntique, true);
        assert.equal(quarterResolved.municipality, municipality);
        assert.equal(quarterResolved.barangay, barangay);

        // 3. Address resolution from OSM display_name string
        const displayResolved = resolvePhilippineAddress(
          { road: "Provincial Road", town: municipality, state: "Antique" },
          `Provincial Road, ${barangay}, ${municipality}, Antique, Philippines`,
        );

        assert.equal(displayResolved.isAntique, true);
        assert.equal(displayResolved.municipality, municipality);
        assert.equal(displayResolved.barangay, barangay);

        // 4. Fire report input validation test
        const validatedReport = validateFireReportInput({
          fireType: "HOUSE_BUILDING",
          latitude: 10.7431,
          longitude: 121.9272,
          locationAccuracy: 25,
          municipality,
          barangay,
          landmark: "Near Barangay Hall",
          description: `Fire reported in ${barangay}, ${municipality}`,
        });

        assert.equal(validatedReport.municipality, municipality);
        assert.equal(validatedReport.barangay, barangay);
        assert.equal(validatedReport.fireType, "HOUSE_BUILDING");

        // 5. Database official barangay match test
        const officialMatch = resolveDetectedBarangay(
          [{ id: `brgy-${totalTested}`, name: barangay }],
          barangay,
        );
        assert.equal(officialMatch.needsVerification, false, `Barangay '${barangay}' in ${municipality} must match official database locality`);
        assert.equal(officialMatch.barangayName, barangay);
      } catch (error) {
        failures.push({
          municipality,
          barangay,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  assert.equal(failures.length, 0, `All localities must succeed without errors. Failures: ${JSON.stringify(failures)}`);
  assert.equal(totalTested, 590, "Must test exactly all 590 official Antique barangays");
});
