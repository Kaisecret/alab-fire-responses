import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const appRoot = process.cwd();

const MUNICIPALITIES = [
  "Anini-y", "Barbaza", "Belison", "Bugasong", "Caluya", "Culasi", "Tobias Fornier", "Hamtic", "Laua-an",
  "Libertad", "Pandan", "Patnongon", "San Jose de Buenavista", "San Remigio", "Sebaste", "Sibalom", "Tibiao", "Valderrama",
];

test("every Antique municipality has its BFP hotline from the provincial poster", async () => {
  const { BFP_HOTLINES, hotlineForMunicipality, formatHotline, hotlineHref, PROVINCIAL_FIRE_MARSHAL } = await import("../lib/bfp-hotlines.ts");
  assert.equal(BFP_HOTLINES.length, 21, "18 stations, 2 San Jose sub-stations and the Provincial Fire Marshal");
  for (const hotline of BFP_HOTLINES) assert.match(hotline.phone, /^09\d{9}$/, `${hotline.name} is an 11-digit mobile number`);
  assert.equal(new Set(BFP_HOTLINES.map((hotline) => hotline.phone)).size, BFP_HOTLINES.length, "no number is repeated");
  for (const municipality of MUNICIPALITIES) {
    assert.ok(hotlineForMunicipality(municipality), `${municipality} has a station`);
  }
  assert.equal(hotlineForMunicipality("Hamtic").phone, "09185209634");
  assert.equal(hotlineForMunicipality("anini-y").phone, "09568515306");
  assert.equal(hotlineForMunicipality("San Jose").name, "San Jose Fire Station (Central)");
  assert.equal(hotlineForMunicipality("Not provided"), null);
  assert.equal(PROVINCIAL_FIRE_MARSHAL.phone, "09177144004");
  assert.equal(formatHotline("09185209634"), "0918 520 9634");
  assert.equal(hotlineHref("09185209634"), "tel:+639185209634");
});

test("offline residents can call their own station, 911, or any BFP Antique number", () => {
  const componentPath = join(appRoot, "app", "_components", "resident-offline-emergency.tsx");
  const layoutPath = join(appRoot, "app", "resident", "layout.tsx");
  assert.ok(existsSync(componentPath));

  const component = readFileSync(componentPath, "utf8");
  assert.match(readFileSync(layoutPath, "utf8"), /ResidentOfflineEmergency/);
  assert.match(component, /window\.addEventListener\("offline"/);
  assert.match(component, /window\.addEventListener\("online"/);
  assert.match(component, /href="tel:911"/);
  assert.match(component, /hotlineForMunicipality\(homeMunicipality\)/, "their registered municipality's station comes first");
  assert.match(component, /alab_resident_home_municipality/, "the municipality is remembered for when there is no signal");
  assert.match(component, /BFP_HOTLINES\.filter/, "the full list is searchable");
  assert.doesNotMatch(component, /09109975737/, "the old placeholder number is gone");
  assert.match(component, /offlineSlideUp/);

  const page = readFileSync(join(appRoot, "app", "resident", "report-fire", "page.tsx"), "utf8");
  assert.match(page, /OPEN_BFP_HOTLINES/, "the report form opens the hotlines when a send fails");
  assert.match(readFileSync(join(appRoot, "app", "_content", "resident-report-fire-content.ts"), "utf8"), /data-call-bfp/);
});
