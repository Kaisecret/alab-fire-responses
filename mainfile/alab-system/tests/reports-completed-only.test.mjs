import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { loadServerModule } from "./helpers/load-server-module.mjs";
import { parseReportFilters, reportWhere } from "../lib/provincial-bfp/management/filters.ts";

const municipal = loadServerModule("lib/municipal-bfp/reports/filters.ts", {});
const HAMTIC = "22222222-2222-4222-8222-222222222222";
const COMPLETED = "fr.status in ('RESOLVED', 'CLOSED')";

test("provincial Reports page asks for completed incidents; other provincial lists do not", () => {
  const reports = parseReportFilters(new URLSearchParams("completedOnly=true"));
  assert.equal(reports.completedOnly, true);
  assert.ok(reportWhere(reports).clauses.includes(COMPLETED));

  // JSON export bodies send a real boolean.
  assert.equal(parseReportFilters({ completedOnly: true }).completedOnly, true);

  // The All Municipal Reports directory uses the same endpoint without the flag.
  const directory = parseReportFilters(new URLSearchParams("status=RESPONDING"));
  assert.equal(directory.completedOnly, undefined);
  assert.ok(!reportWhere(directory).clauses.includes(COMPLETED));
  assert.equal(parseReportFilters(new URLSearchParams("completedOnly=false")).completedOnly, undefined);
});

test("municipal Reports filters always limit to completed incidents", () => {
  assert.throws(() => municipal.parseMunicipalReportFilters(new URLSearchParams("status=RESPONDING")), /INVALID_REPORT_STATUS/);
  assert.throws(() => municipal.parseMunicipalReportFilters(new URLSearchParams("status=UNDER_VERIFICATION")), /INVALID_REPORT_STATUS/);
  assert.equal(municipal.parseMunicipalReportFilters(new URLSearchParams("status=CLOSED")).status, "CLOSED");

  const where = municipal.municipalReportWhere(HAMTIC, { page: 1, pageSize: 25 });
  assert.ok(where.clauses.includes(COMPLETED));
});

test("the completed-only clauses return only RESOLVED and CLOSED rows in Postgres", async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      create table municipalities(id uuid primary key, name text, province text);
      create table barangays(id uuid primary key, municipality_id uuid, name text);
      create table intermunicipal_assistance_requests(id uuid primary key, fire_report_id uuid, recipient_municipality_id uuid,
        status text, is_provincial_command boolean);
      create table fire_reports(id uuid primary key, municipality_id uuid, barangay_id uuid, reference_number text, status text,
        report_source text, fire_type text, calculated_severity text, description text, address_label text, submitted_at timestamptz);
      insert into municipalities values ('${HAMTIC}', 'Hamtic', 'Antique');
      insert into fire_reports(id, municipality_id, reference_number, status, submitted_at) values
        ('a0000000-0000-4000-8000-000000000001', '${HAMTIC}', 'DONE-RESOLVED', 'RESOLVED', now()),
        ('a0000000-0000-4000-8000-000000000002', '${HAMTIC}', 'DONE-CLOSED', 'CLOSED', now()),
        ('a0000000-0000-4000-8000-000000000003', '${HAMTIC}', 'ACTIVE-RESPONDING', 'RESPONDING', now()),
        ('a0000000-0000-4000-8000-000000000004', '${HAMTIC}', 'NEW-VERIFYING', 'UNDER_VERIFICATION', now()),
        ('a0000000-0000-4000-8000-000000000005', '${HAMTIC}', 'DUP', 'DUPLICATE', now());
    `);
    const run = async ({ clauses, values }) => (await db.query(
      `select fr.reference_number as ref
         from fire_reports fr
         join municipalities m on m.id = fr.municipality_id
         left join barangays b on b.id = fr.barangay_id
        where ${clauses.join(" and ")}
        order by ref`, values)).rows.map((row) => row.ref);

    assert.deepEqual(await run(municipal.municipalReportWhere(HAMTIC, { page: 1, pageSize: 25 })), ["DONE-CLOSED", "DONE-RESOLVED"]);
    assert.deepEqual(await run(municipal.municipalReportWhere(HAMTIC, { page: 1, pageSize: 25, status: "RESOLVED" })), ["DONE-RESOLVED"]);
    assert.deepEqual(await run(reportWhere(parseReportFilters(new URLSearchParams("completedOnly=true")))), ["DONE-CLOSED", "DONE-RESOLVED"]);
    assert.equal((await run(reportWhere(parseReportFilters(new URLSearchParams())))).length, 5, "directory still lists every status");
  } finally {
    await db.close();
  }
});

test("both Reports pages offer only completed statuses and the provincial page sends the flag", () => {
  const consoleSource = readFileSync("app/_components/provincial-report-console.tsx", "utf8");
  const directorySource = readFileSync("app/_components/municipal-report-directory.tsx", "utf8");
  assert.match(consoleSource, /new URLSearchParams\(\{ completedOnly: "true" \}\)/);
  assert.match(consoleSource, /completedOnly: true,/);
  for (const source of [consoleSource, directorySource]) {
    assert.match(source, /<option value="">All Completed<\/option>/);
    assert.doesNotMatch(source, /<option value="RESPONDING">/);
    assert.doesNotMatch(source, /<option value="UNDER_VERIFICATION">/);
  }
});
