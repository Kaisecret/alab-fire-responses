import assert from "node:assert/strict";
import test from "node:test";

const now = new Date("2026-10-07T13:30:00Z"); // 9:30 PM in Antique
const sanJose = "11111111-1111-4111-8111-111111111111";
const sibalom = "22222222-2222-4222-8222-222222222222";
const fundaDalipe = "33333333-3333-4333-8333-333333333333";
const r1 = "aaaaaaa1-0000-4000-8000-000000000000";
const r3 = "aaaaaaa3-0000-4000-8000-000000000000";

async function fixture() {
  const { PGlite } = await import("@electric-sql/pglite");
  const db = new PGlite();
  await db.exec(`
    create table municipalities (id uuid primary key, name text, province text);
    create table barangays (id uuid primary key, municipality_id uuid, name text);
    create table fire_reports (
      id uuid primary key, municipality_id uuid, barangay_id uuid, status text, duplicate_of_report_id uuid,
      submitted_at timestamptz, calculated_severity text, severity_factors jsonb, fire_type text, fire_types text[],
      report_source text default 'ALAB_APP', location_accuracy_meters numeric
    );
    create table fire_report_status_history (fire_report_id uuid, next_status text, created_at timestamptz);
    create table fire_report_photos (fire_report_id uuid, storage_key text);
    create table intermunicipal_assistance_requests (
      id uuid primary key default gen_random_uuid(), fire_report_id uuid, recipient_municipality_id uuid,
      status text, requested_at timestamptz, responded_at timestamptz
    );
    create table incident_backup_requests (
      id uuid primary key default gen_random_uuid(), fire_report_id uuid, municipality_id uuid,
      created_at timestamptz, forwarded_at timestamptz
    );
    create table incident_alarm_levels (fire_report_id uuid, alarm_level int, declared_at timestamptz);
  `);
  await db.query("insert into municipalities values ($1, 'San Jose de Buenavista', 'Antique'), ($2, 'Sibalom', 'Antique')", [sanJose, sibalom]);
  await db.query("insert into barangays values ($1, $2, 'Funda-Dalipe')", [fundaDalipe, sanJose]);
  const report = (id, municipality, status, submittedAt, extra = {}) => db.query(
    `insert into fire_reports (id, municipality_id, barangay_id, status, duplicate_of_report_id, submitted_at,
       calculated_severity, severity_factors, fire_type, fire_types, report_source, location_accuracy_meters)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
    [id, municipality, extra.barangay ?? null, status, extra.duplicateOf ?? null, submittedAt,
      extra.severity ?? null, JSON.stringify(extra.factors ?? []), extra.fireType ?? "HOUSE_BUILDING",
      extra.fireTypes ?? null, extra.source ?? "ALAB_APP", extra.accuracy ?? null],
  );
  const minutesAfter = (iso, minutes) => new Date(new Date(iso).getTime() + minutes * 60000).toISOString();
  const history = async (id, start, steps) => {
    for (const [status, minutes] of steps) {
      await db.query("insert into fire_report_status_history values ($1, $2, $3)", [id, status, minutesAfter(start, minutes)]);
    }
  };

  // Monday Oct 5, 10:00 AM Manila: high-danger house + grass fire, fully resolved.
  const r1At = "2026-10-05T02:00:00Z";
  await report(r1, sanJose, "RESOLVED", r1At, {
    barangay: fundaDalipe, severity: "HIGH", fireTypes: ["HOUSE_BUILDING", "GRASS"], accuracy: 20,
    factors: ["Dikit-dikit na kabahayan (High conflagration risk)", "Makipot na kalsada (1-lane passage)"],
  });
  await history(r1, r1At, [["PENDING_VERIFICATION", 0], ["VERIFIED", 2], ["FIRETRUCK_DISPATCHED", 4], ["RESPONDER_ARRIVED", 12], ["UNDER_CONTROL", 30], ["RESOLVED", 60]]);
  await db.query("insert into fire_report_photos values ($1, 'photo.jpg')", [r1]);
  // A second resident's report of the same fire.
  await report("aaaaaaa2-0000-4000-8000-000000000000", sanJose, "DUPLICATE", "2026-10-05T02:03:00Z", { duplicateOf: r1, severity: "HIGH" });
  // A phone-call vehicle fire still being responded to in Sibalom.
  const r3At = "2026-10-06T05:00:00Z";
  await report(r3, sibalom, "RESPONDING", r3At, { severity: "MODERATE", fireType: "VEHICLE", source: "PHONE_CALL" });
  await history(r3, r3At, [["VERIFIED", 3], ["RESPONDING", 5], ["RESPONDER_ARRIVED", 20]]);
  // A false report, one in the previous week, and one outside both windows.
  await report("aaaaaaa4-0000-4000-8000-000000000000", sibalom, "FALSE_REPORT", "2026-10-06T08:00:00Z");
  await report("aaaaaaa5-0000-4000-8000-000000000000", sanJose, "RESOLVED", "2026-09-28T03:00:00Z", { severity: "LOW" });
  await report("aaaaaaa6-0000-4000-8000-000000000000", sanJose, "RESOLVED", "2026-08-01T03:00:00Z", { severity: "CRITICAL" });

  await db.query("insert into intermunicipal_assistance_requests (fire_report_id, recipient_municipality_id, status, requested_at, responded_at) values ($1, $2, 'ACCEPTED', $3, $4)",
    [r1, sibalom, minutesAfter(r1At, 10), minutesAfter(r1At, 13)]);
  await db.query("insert into incident_backup_requests (fire_report_id, municipality_id, created_at, forwarded_at) values ($1, $2, $3, $3)", [r3, sibalom, minutesAfter(r3At, 25)]);
  await db.query("insert into incident_alarm_levels values ($1, 2, $2)", [r1, minutesAfter(r1At, 15)]);
  return db;
}

test("provincial analytics summarize only recorded incidents in the period", async () => {
  const { getProvincialAnalytics } = await import("../lib/provincial-bfp/analytics.ts");
  const db = await fixture();
  try {
    const analytics = await getProvincialAnalytics({ range: "7d", municipalityId: null }, now, db);
    const { headline } = analytics;
    assert.equal(headline.incidents, 2, "duplicates and false reports are not incidents");
    assert.equal(headline.previousIncidents, 1);
    assert.equal(headline.activeNow, 1);
    assert.equal(headline.medianArrivalMinutes, 16, "12 and 20 minutes from report to arrival");
    assert.equal(headline.highDangerShare, 0.5);
    assert.equal(headline.falseReports, 1);
    assert.equal(headline.uniqueReports, 3);
    assert.equal(headline.duplicatesMerged, 1);

    assert.deepEqual(analytics.responseStages.map((stage) => stage.medianMinutes), [2.5, 2, 11.5, 18, 30]);
    assert.equal(analytics.trend.length, 7);
    assert.equal(analytics.trend.find((day) => day.bucket === "2026-10-05").highDanger, 1);
    assert.deepEqual(analytics.heatmap.find((cell) => cell.day === 1), { day: 1, hour: 10, incidents: 1 }, "Monday 10 AM Manila");

    assert.deepEqual(analytics.municipalities.map((row) => [row.name, row.incidents, row.medianArrivalMinutes, row.activeNow, row.assistanceAsked]), [
      ["San Jose de Buenavista", 1, 12, 0, 1],
      ["Sibalom", 1, 20, 1, 1],
    ]);
    assert.deepEqual(analytics.barangays, [{ barangay: "Funda-Dalipe", municipality: "San Jose de Buenavista", incidents: 1 }]);

    assert.deepEqual(analytics.danger.levels.map((level) => level.incidents), [0, 1, 1, 0]);
    assert.deepEqual(analytics.danger.conditions.map((condition) => [condition.key, condition.share]), [["HOUSE_DENSITY", 1], ["ROUTE_ACCESS", 1]]);
    assert.deepEqual(analytics.fireTypes.topCombination, { types: ["GRASS", "HOUSE_BUILDING"], incidents: 1 });
    assert.equal(analytics.fireTypes.counts.find((row) => row.type === "VEHICLE").incidents, 1);

    assert.equal(analytics.reporting.app, 1);
    assert.equal(analytics.reporting.phone, 1);
    assert.equal(analytics.reporting.reportsPerIncident, 1.3);
    assert.equal(analytics.reporting.photoShare, 1);
    assert.equal(analytics.reporting.preciseGpsShare, 1);

    assert.equal(analytics.coordination.assistanceRequests, 1);
    assert.equal(analytics.coordination.accepted, 1);
    assert.equal(analytics.coordination.medianResponseMinutes, 3);
    assert.deepEqual(analytics.coordination.topHelpers, [{ name: "Sibalom", responses: 1 }]);
    assert.equal(analytics.coordination.backupCalls, 1);
    assert.deepEqual(analytics.allMunicipalities.map((row) => row.name), ["San Jose de Buenavista", "Sibalom"]);
    assert.deepEqual(analytics.coordination.alarms, [{ level: 2, declared: 1 }, { level: 3, declared: 0 }, { level: 4, declared: 0 }]);
  } finally {
    await db.close();
  }
});

test("the municipality filter narrows every section", async () => {
  const { getProvincialAnalytics, parseAnalyticsFilters } = await import("../lib/provincial-bfp/analytics.ts");
  const db = await fixture();
  try {
    const analytics = await getProvincialAnalytics({ range: "7d", municipalityId: sibalom }, now, db);
    assert.equal(analytics.headline.incidents, 1);
    assert.equal(analytics.headline.highDangerShare, 0);
    assert.deepEqual(analytics.municipalities.map((row) => row.name), ["Sibalom"]);
    assert.equal(analytics.coordination.assistanceRequests, 0, "San Jose's request is filtered out");
    assert.equal(analytics.coordination.backupCalls, 1);

    assert.deepEqual(parseAnalyticsFilters(new URLSearchParams("")), { range: "30d", municipalityId: null });
    assert.throws(() => parseAnalyticsFilters(new URLSearchParams("range=all")), /INVALID_ANALYTICS_RANGE/);
    assert.throws(() => parseAnalyticsFilters(new URLSearchParams("municipalityId=1;drop")), /INVALID_MUNICIPALITY/);
  } finally {
    await db.close();
  }
});

test("the analytics API requires a provincial sign-in outside local previews", async () => {
  const { readFileSync } = await import("node:fs");
  const route = readFileSync(new URL("../app/api/provincial-bfp/analytics/route.ts", import.meta.url), "utf8");
  assert.match(route, /if \(!isLocalUiPreviewEnabled\(\)\) \{\s*const actor = await getManagementActor\(request\);\s*if \(isProvincialAuthorizationResponse\(actor\)\) return actor;/);
  assert.match(route, /"Cache-Control": "private, no-store"/);
  const page = readFileSync(new URL("../app/provincial-bfp/analytics/page.tsx", import.meta.url), "utf8");
  assert.match(page, /ProvincialAnalyticsPage/);
  assert.doesNotMatch(readFileSync(new URL("../app/_components/provincial-analytics.tsx", import.meta.url), "utf8"), /97\.4%|Causes of Fire/i,
    "no made-up numbers: every figure comes from the API");
});
