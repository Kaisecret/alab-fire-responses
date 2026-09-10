import "server-only";

import { listManagedStations } from "./stations";
import { listManagedPersonnel } from "./personnel";
import { listManagedResidents } from "./residents";
import { listManagedApplications } from "./applications";
import { getDatabase } from "../../db";
import { assertManagementActor } from "./scope";
import type {
  ManagementActor,
  ManagementFilters,
  ReportFilters,
  ManagementPage,
} from "./types";
import { listProvincialReports } from "./reports";
import { getProvincialReportSummary } from "./report-summaries";

const MAX_EXPORT_ROWS = 10000;

export function escapeCsvValue(val: unknown): string {
  if (val === null || val === undefined) return "";
  let str = String(val);

  // Neutralize formula injection
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }

  // Wrap in quotes if it has commas, quotes, or newlines
  if (/[",\n\r]/.test(str)) {
    str = `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}

function buildCsv(headers: string[], rows: (string | number | null | undefined)[][]): string {
  const headerLine = headers.map(escapeCsvValue).join(",");
  const dataLines = rows.map((row) => row.map(escapeCsvValue).join(","));
  return [headerLine, ...dataLines].join("\r\n");
}

export async function exportManagementDataset(
  actor: ManagementActor,
  dataset: "STATIONS" | "PERSONNEL" | "RESIDENTS" | "APPLICATIONS" | "FIRE_REPORTS" | "REPORT_SUMMARY",
  filters: ManagementFilters | ReportFilters,
): Promise<{ csvContent: string; fileName: string }> {
  assertManagementActor(actor);

  const db = getDatabase();
  const timestampStr = new Date().toISOString().slice(0, 10);

  let csvContent = "";
  let fileName = "";
  let exportedRowCount = 0;

  async function allRows<T>(list: (actor: ManagementActor, filters: ManagementFilters) => Promise<ManagementPage<T>>) {
    const rows: T[] = [];
    let page = 1;
    while (true) {
      const result = await list(actor, { ...filters, page, pageSize: 100 });
      if (result.total > MAX_EXPORT_ROWS || rows.length + result.items.length > MAX_EXPORT_ROWS) {
        throw new Error("ROW_LIMIT_EXCEEDED: Dataset exceeds 10,000 rows. Please narrow your filters.");
      }
      rows.push(...result.items);
      if (rows.length >= result.total || result.items.length === 0) break;
      page++;
    }
    exportedRowCount = rows.length;
    return rows;
  }

  switch (dataset) {
    case "STATIONS": {
      fileName = `antique-bfp-stations-${timestampStr}.csv`;
      const rows = await allRows(listManagedStations);
      csvContent = buildCsv(["Station Name", "Municipality", "Status", "Latitude", "Longitude", "Created At"],
        rows.map(r => [r.stationName, r.municipalityName, r.status, r.latitude, r.longitude, r.createdAt]));
      break;
    }
    case "PERSONNEL": {
      fileName = `antique-bfp-personnel-${timestampStr}.csv`;
      const rows = await allRows(listManagedPersonnel);
      csvContent = buildCsv(["Officer Name", "Official Email", "Rank / Position", "Municipality", "Station", "Role", "Account Status", "Created At"],
        rows.map(r => [r.displayName, r.email, r.rankOrPosition, r.municipalityName ?? "Unassigned", r.stationName ?? "Unassigned", r.assignmentRole, r.accountStatus, r.createdAt]));
      break;
    }
    case "RESIDENTS": {
      fileName = `antique-residents-metadata-${timestampStr}.csv`;
      const rows = await allRows(listManagedResidents);
      // Registration metadata only: never include contact details, addresses, or evidence.
      csvContent = buildCsv(["First Name", "Last Name", "Municipality", "Account Status", "Verification Status", "Registered Date"],
        rows.map(r => [r.firstName, r.lastName, r.municipalityName ?? "Unassigned", r.accountStatus, r.latestApplicationStatus, r.createdAt]));
      break;
    }
    case "APPLICATIONS": {
      fileName = `antique-resident-applications-${timestampStr}.csv`;
      const rows = await allRows(listManagedApplications);
      csvContent = buildCsv(["Application Ref", "First Name", "Last Name", "Municipality", "Submission #", "Status", "Submitted At", "Reviewed At"],
        rows.map(r => [r.reference, r.firstName, r.lastName, r.municipalityName, r.submissionNumber, r.status, r.submittedAt, r.reviewedAt]));
      break;
    }

    case "FIRE_REPORTS": {
      fileName = `antique-fire-reports-${timestampStr}.csv`;
      const reportFilters = filters as ReportFilters;
      const res = await listProvincialReports(actor, {
        ...reportFilters,
        page: 1,
        pageSize: 100,
      });

      if (res.total > MAX_EXPORT_ROWS) {
        throw new Error("ROW_LIMIT_EXCEEDED: Dataset exceeds 10,000 rows. Please narrow your date or municipality filters.");
      }

      for (let page = 2; page <= Math.ceil(res.total / 100); page++) {
        const next = await listProvincialReports(actor, { ...reportFilters, page, pageSize: 100 });
        if (next.total > MAX_EXPORT_ROWS || res.items.length + next.items.length > MAX_EXPORT_ROWS) {
          throw new Error("ROW_LIMIT_EXCEEDED: Dataset exceeds 10,000 rows. Please narrow your filters.");
        }
        res.items.push(...next.items);
      }
      exportedRowCount = res.items.length;
      const headers = ["Reference", "Municipality", "Barangay", "Source", "Fire Type", "Severity", "Status", "Submitted At", "Response Start", "Resolved At"];
      const rows = res.items.map((r) => [
        r.referenceNumber,
        r.municipalityName,
        r.barangay,
        r.reportSource,
        r.fireType,
        r.severity,
        r.status,
        r.submittedAt,
        r.responseStartedAt ?? "",
        r.resolvedAt ?? "",
      ]);
      csvContent = buildCsv(headers, rows);
      break;
    }

    case "REPORT_SUMMARY": {
      fileName = `antique-incident-summary-${timestampStr}.csv`;
      const reportFilters = filters as ReportFilters;
      const summary = await getProvincialReportSummary(actor, reportFilters);

      exportedRowCount = summary.byMunicipality.length;
      const headers = ["Municipality", "Total Intake", "Confirmed Fires", "Administrative Outcomes", "Resolved"];
      const rows = summary.byMunicipality.map((m) => [
        m.municipalityName,
        m.total,
        m.confirmed,
        m.falseReport,
        m.resolved,
      ]);
      csvContent = buildCsv(headers, rows);
      break;
    }

    default:
      throw new Error(`UNSUPPORTED_DATASET: ${dataset}`);
  }

  // Audit export in provincial_management_events
  await db.query(
    `insert into provincial_management_events
      (actor_user_id, action, target_type, target_id, reason, metadata)
     values ($1, 'EXPORT_DATASET', 'EXPORT', $2, 'Official CSV export', $3::jsonb)`,
    [
      actor.userId,
      dataset,
      JSON.stringify({
        fileName,
        exportedRowCount,
        filters,
      }),
    ],
  );

  return { csvContent, fileName };
}
