import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");

const weather = { windSpeedKph: 20, temperatureC: 32, relativeHumidity: 60 };
const density = {
  status: "INSUFFICIENT_DATA", confidence: "UNAVAILABLE", buildingCount: 0, minimumGapMeters: null,
  source: null, assessedAt: new Date("2026-10-02T00:00:00Z"), evidence: [],
};

/** A client whose only query is the nearest-building lookup, counted. */
function distanceClient(meters) {
  const client = { calls: 0, async query() { client.calls += 1; return { rows: meters == null ? [] : [{ distanceMeters: meters }] }; } };
  return client;
}

test("each selected fire type is scored with its own model and the highest sets the level", async () => {
  const { assessMultiTypeDanger } = await import("../lib/fire-reports/danger-assessment.ts");
  const { calculateFireSeverity } = await import("../lib/fire-reports/severity.ts");
  const input = { structureMaterial: "MIXED_SEMI_CONCRETE", houseDensity: "MODERATE_SPACING", routeAccessibility: "NARROW_STREET", ...weather };

  const house = calculateFireSeverity({ ...input, fireType: "HOUSE_BUILDING", houseDensity: "MODERATE_SPACING" });
  const grass = calculateFireSeverity({ ...input, fireType: "GRASS", nearestBuildingDistanceMeters: 30 });
  assert.ok(grass.score > house.score, `grass ${grass.score} should beat house ${house.score} here`);

  const client = distanceClient(30);
  const mixed = await assessMultiTypeDanger(client, input, ["HOUSE_BUILDING", "GRASS"], density, 10.74, 121.94);
  assert.equal(mixed.primaryFireType, "GRASS", "the most dangerous type becomes the main fire type");
  assert.equal(mixed.assessment.score, grass.score, "no averaging: the highest score is kept");
  assert.equal(mixed.assessment.level, grass.level);
  assert.match(mixed.assessment.factors[0], /Grass fire sets the level \(highest of House\/Building \+ Grass\)/);
  assert.ok(mixed.assessment.factors.some((factor) => factor === `Also burning: House/Building fire (${house.level}, ${house.score}/100)`));
  assert.equal(client.calls, 1, "the nearest building is looked up once");
});

test("a single fire type scores exactly as before", async () => {
  const { assessMultiTypeDanger, assessReportDanger } = await import("../lib/fire-reports/danger-assessment.ts");
  const input = { structureMaterial: "LIGHT_MATERIALS", houseDensity: "PACKED_MAGKAKADIKIT", routeAccessibility: "INTERIOR_ALLEY_ESKINITA", ...weather };
  const single = await assessReportDanger(distanceClient(null), { ...input, fireType: "HOUSE_BUILDING" }, density, 10.74, 121.94);
  const viaMulti = await assessMultiTypeDanger(distanceClient(null), input, ["HOUSE_BUILDING"], density, 10.74, 121.94);
  assert.equal(viaMulti.primaryFireType, "HOUSE_BUILDING");
  assert.deepEqual(viaMulti.assessment, single.assessment);
});

test("a tie keeps the resident's first pick", async () => {
  const { assessMultiTypeDanger } = await import("../lib/fire-reports/danger-assessment.ts");
  const calm = { windSpeedKph: 5, temperatureC: 26, relativeHumidity: 90 };
  // Vehicle and rubbish fires on a wide road with spaced houses are both rule-based LOW/MODERATE.
  const first = await assessMultiTypeDanger(distanceClient(null), { routeAccessibility: "WIDE_ROAD", ...calm }, ["VEHICLE", "OTHER"], density, 10.74, 121.94);
  const flipped = await assessMultiTypeDanger(distanceClient(null), { routeAccessibility: "WIDE_ROAD", ...calm }, ["OTHER", "VEHICLE"], density, 10.74, 121.94);
  assert.equal(first.primaryFireType, "VEHICLE", "vehicle (MODERATE) beats rubbish (LOW)");
  assert.equal(flipped.primaryFireType, "VEHICLE");
  const tie = await assessMultiTypeDanger(distanceClient(null), { ...calm }, ["GRASS", "FOREST"], density, 10.74, 121.94);
  assert.equal(tie.primaryFireType, "GRASS", "grass and forest use the same model, so the first pick stays");
});

test("residents can send up to 3 fire types and the server checks them", async () => {
  const { validateFireReportInput } = await import("../lib/fire-reports/validation.ts");
  const base = { fireType: "HOUSE_BUILDING", latitude: "10.74", longitude: "121.94", municipality: "San Jose de Buenavista", barangay: "Poblacion" };
  const one = validateFireReportInput(base);
  assert.deepEqual(one.fireTypes, ["HOUSE_BUILDING"], "older clients still send a single type");
  const two = validateFireReportInput({ ...base, fireTypes: ["HOUSE_BUILDING", "GRASS", "GRASS"] });
  assert.deepEqual(two.fireTypes, ["HOUSE_BUILDING", "GRASS"], "duplicates are dropped");
  assert.throws(() => validateFireReportInput({ ...base, fireTypes: ["HOUSE_BUILDING", "GRASS", "FOREST", "VEHICLE"] }), /up to 3/);
  assert.throws(() => validateFireReportInput({ ...base, fireTypes: ["HOUSE_BUILDING", "BOAT"] }), /Select what is burning/);
});

test("the quick details fit every selected type", async () => {
  const { situationForFireTypes, filterSituationForFireTypes } = await import("../lib/fire-reports/fire-type-situation.ts");
  assert.deepEqual(situationForFireTypes(["GRASS", "HOUSE_BUILDING"]), { density: true, route: "DEAD_END_OR_BLOCKED" });
  assert.deepEqual(situationForFireTypes(["OTHER", "VEHICLE"]), { density: true, route: "NARROW_STREET" });
  assert.deepEqual(filterSituationForFireTypes(["GRASS"], "PACKED_MAGKAKADIKIT", "DEAD_END_OR_BLOCKED"), { density: null, route: "DEAD_END_OR_BLOCKED" });
});

test("every selected type is stored and shown", () => {
  const service = read("../lib/fire-reports/service.ts");
  assert.match(service, /assessMultiTypeDanger\(/);
  assert.match(service, /fire_types/);
  assert.doesNotMatch(service, /assessReportDanger\(/, "both scoring paths use the multi-type assessment");
  assert.match(read("../app/api/resident/fire-reports/route.ts"), /fireTypes: form\.getAll\("fireTypes"\)/);
  const page = read("../app/resident/report-fire/page.tsx");
  assert.match(page, /form\.append\('fireTypes', kind\)/);
  assert.match(page, /MAX_FIRE_TYPES/);
  assert.match(read("../app/_content/resident-report-fire-content.ts"), /data-fire-type-note/);
  assert.match(read("../app/_components/resident-report-status.tsx"), /fireTypes\.map\(formatFireType\)\.join\(" \+ "\)/);
  assert.match(read("../app/_components/municipal-incident-detail.tsx"), /reportedFireTypes/);
  const migration = read("../supabase/migrations/20261002120000_add_fire_report_fire_types.sql");
  assert.match(migration, /add column if not exists fire_types text\[\]/);
  assert.match(read("../scripts/apply-command-migration.mjs"), /add_fire_report_fire_types/);
});

test("the fire_types column accepts 1 to 3 known types only", async () => {
  const { PGlite } = await import("@electric-sql/pglite");
  const db = new PGlite();
  try {
    await db.exec("create table public.fire_reports (id serial primary key, fire_type text not null);");
    const sql = read("../supabase/migrations/20261002120000_add_fire_report_fire_types.sql");
    await db.exec(sql);
    await db.exec(sql); // safe to run twice
    await db.query("insert into fire_reports (fire_type, fire_types) values ('GRASS', array['GRASS','HOUSE_BUILDING'])");
    await db.query("insert into fire_reports (fire_type) values ('VEHICLE')");
    await assert.rejects(() => db.query("insert into fire_reports (fire_type, fire_types) values ('GRASS', array['GRASS','BOAT'])"));
    await assert.rejects(() => db.query("insert into fire_reports (fire_type, fire_types) values ('GRASS', array['GRASS','FOREST','VEHICLE','OTHER'])"));
    await assert.rejects(() => db.query("insert into fire_reports (fire_type, fire_types) values ('GRASS', array[]::text[])"));
  } finally {
    await db.close();
  }
});
