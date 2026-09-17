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
import {
  buildProvincialExcel,
  formatPhilippineDateTime,
  getFireTypeLabel,
  type ProvincialColumnSpec,
} from "./excel";

const MAX_EXPORT_ROWS = 10000;

export type ExportFormat = "XLSX" | "CSV";

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

/**
 * Excel guesses the encoding of a bare CSV and mangles accented barangay names
 * on a Philippine locale. The byte-order mark settles it on UTF-8.
 */
function withUtf8Bom(csv: string): string {
  return `﻿${csv}`;
}

/** Describes the filter set in the words the console uses, for the letterhead. */
function describeFilters(filters: ManagementFilters | ReportFilters): string {
  const reportFilters = filters as ReportFilters;
  const parts: string[] = [];

  if (filters.municipalityId) parts.push("Single municipality");
  if (filters.status && filters.status !== "ALL") parts.push(`Status ${filters.status}`);
  if (reportFilters.reportSource) parts.push(`Source ${reportFilters.reportSource === "ALAB_APP" ? "ALAB Mobile App" : "Emergency Call"}`);
  if (reportFilters.fireType) parts.push(`Fire type ${getFireTypeLabel(reportFilters.fireType)}`);
  if (reportFilters.severity) parts.push(`Level of danger ${reportFilters.severity}`);
  if (filters.from) parts.push(`From ${filters.from.slice(0, 10)}`);
  if (filters.to) parts.push(`To ${filters.to.slice(0, 10)}`);
  if (filters.search) parts.push(`Search "${filters.search}"`);

  return parts.length ? parts.join("  •  ") : "None — full provincial extract";
}

/** Timestamps read as Philippine local time, the way the console shows them. */
function localTime(value: string | null | undefined): string {
  return value ? formatPhilippineDateTime(value) : "Not recorded";
}

export async function exportManagementDataset(
  actor: ManagementActor,
  dataset: "STATIONS" | "PERSONNEL" | "RESIDENTS" | "APPLICATIONS" | "FIRE_REPORTS" | "REPORT_SUMMARY",
  filters: ManagementFilters | ReportFilters,
  format: ExportFormat = "XLSX",
): Promise<{ csvContent: string; xlsxContent: Buffer | null; fileName: string }> {
  assertManagementActor(actor);

  const db = getDatabase();
  const timestampStr = new Date().toISOString().slice(0, 10);

  let csvContent = "";
  let fileName = "";
  let exportedRowCount = 0;
  let columns: ProvincialColumnSpec[] = [];
  let sheetRows: (string | number | null | undefined)[][] = [];

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
      fileName = `antique-bfp-stations-${timestampStr}`;
      const rows = await allRows(listManagedStations);
      columns = [
        { header: "Station Name", width: 30, mono: true },
        { header: "Municipality", width: 20 },
        { header: "Station Type", width: 18 },
        { header: "Status", width: 14, badge: "STATUS" },
        { header: "Personnel", width: 12, numeric: true },
        { header: "Latitude", width: 14, numeric: true },
        { header: "Longitude", width: 14, numeric: true },
        { header: "Created (PHT)", width: 22 },
      ];
      sheetRows = rows.map(r => [r.stationName, r.municipalityName, r.stationType, r.status, r.personnelCount, r.latitude, r.longitude, localTime(r.createdAt)]);
      csvContent = buildCsv(["Station Name", "Municipality", "Status", "Latitude", "Longitude", "Created At"],
        rows.map(r => [r.stationName, r.municipalityName, r.status, r.latitude, r.longitude, r.createdAt]));
      break;
    }
    case "PERSONNEL": {
      fileName = `antique-bfp-personnel-${timestampStr}`;
      const rows = await allRows(listManagedPersonnel);
      columns = [
        { header: "Officer Name", width: 26 },
        { header: "Official Email", width: 30 },
        { header: "Rank / Position", width: 22 },
        { header: "Municipality", width: 20 },
        { header: "Station", width: 26 },
        { header: "Role", width: 20 },
        { header: "Account Status", width: 16, badge: "STATUS" },
        { header: "Created (PHT)", width: 22 },
      ];
      sheetRows = rows.map(r => [
        r.displayName,
        r.email,
        r.rankOrPosition ?? "Not recorded",
        r.municipalityName ?? "Unassigned",
        r.stationName ?? "Unassigned",
        r.assignmentRole === "MUNICIPAL_ADMIN" ? "Municipal Admin" : r.assignmentRole === "MUNICIPAL_STAFF" ? "Municipal Staff" : "Unassigned",
        r.accountStatus,
        localTime(r.createdAt),
      ]);
      csvContent = buildCsv(["Officer Name", "Official Email", "Rank / Position", "Municipality", "Station", "Role", "Account Status", "Created At"],
        rows.map(r => [r.displayName, r.email, r.rankOrPosition, r.municipalityName ?? "Unassigned", r.stationName ?? "Unassigned", r.assignmentRole, r.accountStatus, r.createdAt]));
      break;
    }
    case "RESIDENTS": {
      fileName = `antique-residents-metadata-${timestampStr}`;
      const rows = await allRows(listManagedResidents);
      // Registration metadata only: never include contact details, addresses, or evidence.
      columns = [
        { header: "First Name", width: 20 },
        { header: "Last Name", width: 20 },
        { header: "Municipality", width: 22 },
        { header: "Account Status", width: 18, badge: "STATUS" },
        { header: "Verification Status", width: 20, badge: "STATUS" },
        { header: "Registered (PHT)", width: 22 },
      ];
      sheetRows = rows.map(r => [r.firstName, r.lastName, r.municipalityName ?? "Unassigned", r.accountStatus, r.latestApplicationStatus, localTime(r.createdAt)]);
      csvContent = buildCsv(["First Name", "Last Name", "Municipality", "Account Status", "Verification Status", "Registered Date"],
        rows.map(r => [r.firstName, r.lastName, r.municipalityName ?? "Unassigned", r.accountStatus, r.latestApplicationStatus, r.createdAt]));
      break;
    }
    case "APPLICATIONS": {
      fileName = `antique-resident-applications-${timestampStr}`;
      const rows = await allRows(listManagedApplications);
      columns = [
        { header: "Application Ref", width: 26, mono: true },
        { header: "First Name", width: 18 },
        { header: "Last Name", width: 18 },
        { header: "Municipality", width: 22 },
        { header: "Submission #", width: 14, numeric: true },
        { header: "Status", width: 20, badge: "STATUS" },
        { header: "Submitted (PHT)", width: 22 },
        { header: "Reviewed (PHT)", width: 22 },
      ];
      sheetRows = rows.map(r => [r.reference, r.firstName, r.lastName, r.municipalityName, r.submissionNumber, r.status, localTime(r.submittedAt), localTime(r.reviewedAt)]);
      csvContent = buildCsv(["Application Ref", "First Name", "Last Name", "Municipality", "Submission #", "Status", "Submitted At", "Reviewed At"],
        rows.map(r => [r.reference, r.firstName, r.lastName, r.municipalityName, r.submissionNumber, r.status, r.submittedAt, r.reviewedAt]));
      break;
    }

    case "FIRE_REPORTS": {
      fileName = `antique-fire-reports-${timestampStr}`;
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
      columns = [
        { header: "Reference Number", width: 26, mono: true },
        { header: "Municipality", width: 18 },
        { header: "Barangay", width: 20 },
        { header: "Intake Channel", width: 18 },
        { header: "Fire Type", width: 18 },
        { header: "Level of Danger", width: 16, badge: "SEVERITY" },
        { header: "Status", width: 20, badge: "STATUS" },
        { header: "Submitted (PHT)", width: 22 },
        { header: "Response Started (PHT)", width: 22 },
        { header: "Resolved (PHT)", width: 22 },
      ];
      sheetRows = res.items.map((r) => [
        r.referenceNumber,
        r.municipalityName,
        r.barangay,
        r.reportSource === "ALAB_APP" ? "ALAB Mobile App" : "Emergency Call",
        getFireTypeLabel(r.fireType),
        r.severity,
        r.status,
        localTime(r.submittedAt),
        localTime(r.responseStartedAt),
        localTime(r.resolvedAt),
      ]);

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
      fileName = `antique-incident-summary-${timestampStr}`;
      const reportFilters = filters as ReportFilters;
      const summary = await getProvincialReportSummary(actor, reportFilters);

      exportedRowCount = summary.byMunicipality.length;
      columns = [
        { header: "Municipality", width: 28, mono: true },
        { header: "Total Intake", width: 16, numeric: true },
        { header: "Confirmed Fires", width: 18, numeric: true },
        { header: "Administrative Outcomes", width: 24, numeric: true },
        { header: "Resolved", width: 14, numeric: true },
      ];
      sheetRows = summary.byMunicipality.map((m) => [
        m.municipalityName,
        m.total,
        m.confirmed,
        m.falseReport,
        m.resolved,
      ]);

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

  const xlsxContent =
    format === "XLSX"
      ? await buildProvincialExcel({
          dataset,
          columns,
          rows: sheetRows,
          filterLabel: describeFilters(filters),
          rowCountLabel: `${exportedRowCount} record${exportedRowCount === 1 ? "" : "s"}`,
        })
      : null;

  csvContent = withUtf8Bom(csvContent);
  fileName = `${fileName}.${format === "XLSX" ? "xlsx" : "csv"}`;

  // Audit export in provincial_management_events
  await db.query(
    `insert into provincial_management_events
      (actor_user_id, action, target_type, target_id, reason, metadata)
     values ($1, 'EXPORT_DATASET', 'EXPORT', $2, 'Official records export', $3::jsonb)`,
    [
      actor.userId,
      dataset,
      JSON.stringify({
        fileName,
        format,
        exportedRowCount,
        filters,
      }),
    ],
  );

  return { csvContent, xlsxContent, fileName };
}
