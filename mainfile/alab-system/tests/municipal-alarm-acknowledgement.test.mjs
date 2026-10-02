import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");

const SAN_JOSE = "11111111-1111-4111-8111-111111111111";
const HAMTIC = "22222222-2222-4222-8222-222222222222";
const OFFICER = "33333333-3333-4333-8333-333333333333";
const REPORT = "44444444-4444-4444-8444-444444444444";

async function database() {
  const { PGlite } = await import("@electric-sql/pglite");
  const db = new PGlite();
  await db.exec(`
    create table public.users (id uuid primary key);
    create table public.municipalities (id uuid primary key, name text);
    create table public.barangays (id uuid primary key, name text);
    create table public.fire_reports (
      id uuid primary key, reference_number text, report_source text, caller_name text, reporter_name_snapshot text,
      fire_type text, status text, barangay_id uuid, nearest_landmark text, submitted_at timestamptz default now(),
      latitude numeric, longitude numeric, calculated_severity text, detected_building_density text,
      building_density_confidence text, building_density_building_count int, building_density_minimum_gap_meters numeric,
      municipality_id uuid
    );
  `);
  await db.exec(read("../supabase/migrations/20261002150000_add_municipal_report_acknowledgement.sql"));
  await db.query("insert into users values ($1)", [OFFICER]);
  await db.query("insert into municipalities values ($1, 'San Jose de Buenavista'), ($2, 'Hamtic')", [SAN_JOSE, HAMTIC]);
  await db.query(
    `insert into fire_reports (id, reference_number, report_source, fire_type, status, municipality_id, latitude, longitude)
     values ($1, 'ALAB-1', 'ALAB_APP', 'HOUSE_BUILDING', 'PENDING_VERIFICATION', $2, 10.7, 121.9)`,
    [REPORT, SAN_JOSE],
  );
  return { db, client: { query: (sql, params) => db.query(sql, params) } };
}

test("a station's acknowledgement is saved on the report, once, and only by its own station", async () => {
  const { acknowledgeMunicipalReport } = await import("../lib/fire-reports/municipal-acknowledgement.ts");
  const { db, client } = await database();
  try {
    assert.equal(await acknowledgeMunicipalReport(client, { reportId: REPORT, municipalityId: HAMTIC, userId: OFFICER }), null,
      "another municipality cannot acknowledge for the origin station");
    const first = await acknowledgeMunicipalReport(client, { reportId: REPORT, municipalityId: SAN_JOSE, userId: OFFICER, at: new Date("2026-10-02T06:00:00Z") });
    assert.equal(new Date(first.acknowledgedAt).toISOString(), "2026-10-02T06:00:00.000Z");
    const again = await acknowledgeMunicipalReport(client, { reportId: REPORT, municipalityId: SAN_JOSE, userId: OFFICER, at: new Date("2026-10-02T07:00:00Z") });
    assert.equal(new Date(again.acknowledgedAt).toISOString(), "2026-10-02T06:00:00.000Z", "the first acknowledgement is kept");
    const row = (await db.query("select municipal_acknowledged_by_user_id as by from fire_reports where id = $1", [REPORT])).rows[0];
    assert.equal(row.by, OFFICER);
  } finally {
    await db.close();
  }
});

test("the municipal queue tells every sign-in which reports the station already acknowledged", async () => {
  const access = read("../lib/intermunicipality/incident-access.ts");
  // The origin query and the fallback that actually serves origin reports both carry it.
  assert.ok((access.match(/fr\.municipal_acknowledged_at as "acknowledgedAt"/g) ?? []).length >= 2);
  const route = read("../app/api/municipal-bfp/incidents/route.ts");
  assert.match(route, /fr\.municipal_acknowledged_at as "acknowledgedAt"/);
});

test("the alarm stays quiet for reports the station acknowledged on any device", () => {
  const alarm = read("../app/_components/municipal-incident-alarm.tsx");
  assert.match(alarm, /!incident\.acknowledgedAt/);
  assert.match(alarm, /\/acknowledge`/, "acknowledging is saved on the server");
  const detail = read("../app/_components/municipal-incident-detail.tsx");
  assert.match(detail, /\/acknowledge`/, "opening the report counts as seeing it");
  assert.match(read("../scripts/apply-command-migration.mjs"), /add_municipal_report_acknowledgement/);
  assert.match(read("../app/api/municipal-bfp/incidents/[id]/acknowledge/route.ts"), /acknowledgeMunicipalReport\(/);
});
