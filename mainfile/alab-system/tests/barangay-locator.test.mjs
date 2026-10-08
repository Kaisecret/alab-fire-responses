import assert from "node:assert/strict";
import test from "node:test";

const { locateAntiqueBarangay, nearbyAntiqueBarangays, antiqueBarangayOutline } = await import("../lib/locations/barangay-locator.ts");
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

test("a pin near a barangay border also offers the barangay across it", () => {
  // Hamtic town proper: inside Caridad, about 70 m south of the Poblacion 2 line.
  assert.deepEqual(locateAntiqueBarangay(10.697961, 121.982), { municipality: "Hamtic", barangay: "Caridad" });
  const nearby = nearbyAntiqueBarangays(10.697961, 121.982, 150);
  assert.equal(nearby[0]?.barangay, "Poblacion 2");
  assert.equal(nearby[0]?.municipality, "Hamtic");
  assert.ok(nearby[0].meters > 0 && nearby[0].meters < 150, `${nearby[0].meters} m`);
  assert.ok(!nearby.some((choice) => choice.barangay === "Caridad"), "the containing barangay is not repeated");
  for (let i = 1; i < nearby.length; i++) assert.ok(nearby[i - 1].meters <= nearby[i].meters, "closest first");
});

test("a pin deep inside a barangay offers no border alternatives", () => {
  assert.deepEqual(nearbyAntiqueBarangays(10.7395836, 121.9498675, 25), []);
  assert.deepEqual(nearbyAntiqueBarangays(10.6969, 122.5644, 150), []); // Iloilo City
});

test("a barangay outline is its PSA polygon as [lat, lng] rings", () => {
  const outline = antiqueBarangayOutline("Hamtic", "Poblacion 2");
  assert.ok(outline && outline.length >= 1);
  const [lat, lng] = outline[0][0];
  assert.ok(lat > 10.69 && lat < 10.71 && lng > 121.97 && lng < 121.99, `${lat}, ${lng}`);
  assert.equal(antiqueBarangayOutline("Hamtic", "Not a barangay"), null);
});
