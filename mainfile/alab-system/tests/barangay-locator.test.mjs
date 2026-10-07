import assert from "node:assert/strict";
import test from "node:test";

const { locateAntiqueBarangay } = await import("../lib/locations/barangay-locator.ts");
const { ANTIQUE_BARANGAY_BOUNDARIES } = await import("../lib/locations/antique-barangay-boundaries.ts");
const { antiqueBarangays } = await import("../app/_content/antique-barangays.ts");

test("San Jose pins resolve to the barangay they are in, not OpenStreetMap's nearest point", () => {
  // St. Anthony's College main campus; OSM says "Maybato North".
  assert.deepEqual(locateAntiqueBarangay(10.7395836, 121.9498675), { municipality: "San Jose de Buenavista", barangay: "San Angel" });
  // Funda-Dalipe barangay hall and a report pin there; OSM says "Badiang".
  assert.deepEqual(locateAntiqueBarangay(10.7638242, 121.9384541), { municipality: "San Jose de Buenavista", barangay: "Funda-Dalipe" });
  assert.deepEqual(locateAntiqueBarangay(10.765721, 121.93032), { municipality: "San Jose de Buenavista", barangay: "Funda-Dalipe" });
  assert.equal(locateAntiqueBarangay(10.7666692, 121.9440687)?.barangay, "Badiang");
});

test("every official barangay has a boundary under its official name", () => {
  const located = new Set(ANTIQUE_BARANGAY_BOUNDARIES.map(([municipality, barangay]) => `${municipality}/${barangay}`));
  for (const [municipality, barangays] of Object.entries(antiqueBarangays)) {
    for (const barangay of barangays) assert.ok(located.has(`${municipality}/${barangay}`), `${municipality}/${barangay}`);
  }
  assert.equal(located.size, Object.values(antiqueBarangays).flat().length);
});

test("points outside Antique have no barangay", () => {
  assert.equal(locateAntiqueBarangay(10.6969, 122.5644), null); // Iloilo City
  assert.equal(locateAntiqueBarangay(Number.NaN, 121.94), null);
});
