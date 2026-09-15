import "server-only";

import { getDatabase } from "../../db";
import type { MunicipalAdminIdentity } from "../auth";
import { formatPhilippineDateTime } from "./formatters";
import { buildMunicipalReportExcel } from "./excel";
import { buildMunicipalReportPdf } from "./pdf";
import { listMunicipalReports, getMunicipalReportDetail, getMunicipalReportSummary } from "./service";
import type {
  MunicipalExportOptions,
  MunicipalExportResult,
  MunicipalReportDetail,
  MunicipalReportFilters,
  MunicipalReportRow,
  MunicipalReportSummary,
} from "./types";

const MAX_EXPORT_ROWS = 10000;

export function escapeCsvValue(val: unknown): string {
  if (val === null || val === undefined) return "";
  let str = String(val);

  // Neutralize formula injection
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }

  // Wrap in quotes if it contains commas, quotes, or newlines
  if (/[",\n\r]/.test(str)) {
    str = `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}

export function buildCsv(
  headers: string[],
  rows: (string | number | null | undefined)[][],
): string {
  const headerLine = headers.map(escapeCsvValue).join(",");
  const dataLines = rows.map((row) => row.map(escapeCsvValue).join(","));
  return [headerLine, ...dataLines].join("\r\n");
}

/**
 * Excel reads a CSV as the local ANSI codepage unless the file opens with a
 * byte order mark, which mangles Philippine place and reporter names.
 */
const UTF8_BOM = "﻿";

export function withUtf8Bom(csv: string): string {
  return csv.startsWith(UTF8_BOM) ? csv : `${UTF8_BOM}${csv}`;
}

/** Restates the active filters for the PDF header, matching the print view. */
function describeFilters(filters: MunicipalReportFilters, scope: string): string {
  const parts: string[] = [];
  if (filters.barangayId) parts.push("Barangay filter applied");
  if (filters.status) parts.push(`Status: ${filters.status}`);
  if (filters.fireType) parts.push(`Fire type: ${filters.fireType}`);
  if (filters.severity) parts.push(`Severity: ${filters.severity}`);
  if (filters.reportSource) parts.push(`Source: ${filters.reportSource}`);
  if (filters.search) parts.push(`Search: ${filters.search}`);
  if (scope === "SELECTED") parts.push("Selected records only");
  if (scope === "CURRENT_PAGE") parts.push("Current page only");

  return parts.length > 0 ? parts.join("; ") : "All records within the reporting period";
}

function sanitizeForFilename(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function getTimestampSuffix(): string {
  return new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString()
    .replace(/[-:]/g, "").slice(0, 15) + "PHT";
}

export async function exportMunicipalDataset(
  actor: MunicipalAdminIdentity,
  filters: MunicipalReportFilters,
  options: MunicipalExportOptions,
): Promise<MunicipalExportResult> {
  // Authorization guards
  if (!actor || actor.role !== "MUNICIPAL_BFP" || actor.assignmentRole !== "MUNICIPAL_ADMIN") {
    throw new Error("UNAUTHORIZED: Municipal Administrator access is required.");
  }

  if (actor.mustChangePassword) {
    throw new Error("PASSWORD_CHANGE_REQUIRED: You must update your password before exporting official records.");
  }

  if (actor.accountStatus !== "ACTIVE" || !actor.municipalityId || actor.email === "preview@municipal-bfp.local" || actor.userId === "afbc9f03-312c-4208-a15c-05f87a3ad6fe") {
    throw new Error("UNAUTHORIZED: An active assigned account is required.");
  }
  if (!["CSV", "PDF", "XLSX"].includes(options.format)) {
    throw new Error("INVALID_FORMAT: Choose CSV, PDF or XLSX.");
  }
  if (!["ALL_MATCHING", "SELECTED", "CURRENT_PAGE"].includes(options.scope) ||
      (options.dataset !== "INCIDENT_REGISTER" && options.scope !== "ALL_MATCHING")) {
    throw new Error("INVALID_SCOPE: Aggregate reports require all matching records.");
  }
  if (options.scope === "SELECTED") {
    const ids = options.selectedIds;
    if (!ids?.length || ids.length > MAX_EXPORT_ROWS || new Set(ids).size !== ids.length ||
        ids.some(id => !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))) {
      throw new Error("INVALID_SELECTION: Select up to 10,000 unique report IDs.");
    }
  }
  const db = await getDatabase().connect();
  try {
  await db.query("BEGIN ISOLATION LEVEL REPEATABLE READ");
  const { dataset, scope, selectedIds } = options;
  const muniSlug = sanitizeForFilename(actor.municipalityName || "municipality");
  const timeSuffix = getTimestampSuffix();
  const dateRangeSlug =
    filters.from && filters.to
      ? `${filters.from}-to-${filters.to}`
      : filters.from
        ? `from-${filters.from}`
        : filters.to
          ? `to-${filters.to}`
          : "all-dates";

  let csvContent = "";
  let fileName = "";
  let rowCount = 0;

  // Retained so a PDF export can lay out the same records the CSV would list.
  let pdfRows: MunicipalReportRow[] = [];
  let pdfSummary: MunicipalReportSummary | null = null;
  let pdfDetail: MunicipalReportDetail | null = null;
  const fileExtension = options.format === "PDF" ? "pdf" : options.format === "XLSX" ? "xlsx" : "csv";

  switch (dataset) {
    case "INCIDENT_REGISTER": {
      fileName = `alab-${muniSlug}-incident-register-${dateRangeSlug}-${timeSuffix}.${fileExtension}`;
      let records: MunicipalReportRow[] = [];

      if (scope === "SELECTED") {
        if (!selectedIds || selectedIds.length === 0) {
          throw new Error("NO_SELECTION: No reports were selected for export.");
        }

        // Validate all selected IDs belong strictly to actor's municipality
        const checkRes = await db.query<{ id: string; municipality_id: string }>(
          `select id, municipality_id from fire_reports where id = any($1::uuid[])`,
          [selectedIds],
        );

        if (checkRes.rows.length !== selectedIds.length) {
          throw new Error("INVALID_SELECTION: Some selected reports were not found.");
        }

        const crossMuni = checkRes.rows.some((r) => r.municipality_id !== actor.municipalityId);
        if (crossMuni) {
          throw new Error("CROSS_MUNICIPALITY_FORBIDDEN: Cannot export records from other municipalities.");
        }

        // Fetch selected records with all computed fields
        const allRes = await listMunicipalReports(actor, {
          ...filters,
          page: 1,
          pageSize: 100,
        }, db);

        // If selection is large, fetch directly matching IDs
        const selectedSet = new Set(selectedIds);
        const matched = allRes.items.filter((r) => selectedSet.has(r.id));
        let page = 2;
        const totalPages = allRes.totalPages;

        while (matched.length < selectedIds.length && page <= totalPages) {
          const next = await listMunicipalReports(actor, {
            ...filters,
            page,
            pageSize: 100,
          }, db);
          matched.push(...next.items.filter((r) => selectedSet.has(r.id)));
          page++;
        }

        if (matched.length !== selectedIds.length) throw new Error("INVALID_SELECTION: Selected reports no longer match the filters. Refresh and select again.");
        records = matched;
      } else if (scope === "CURRENT_PAGE") {
        const pageRes = await listMunicipalReports(actor, filters, db);
        records = pageRes.items;
      } else {
        // ALL_MATCHING
        const firstPage = await listMunicipalReports(actor, {
          ...filters,
          page: 1,
          pageSize: 100,
        }, db);

        if (firstPage.total > MAX_EXPORT_ROWS) {
          throw new Error("ROW_LIMIT_EXCEEDED: Dataset exceeds 10,000 rows. Please narrow your date or barangay filters.");
        }

        records = [...firstPage.items];
        for (let p = 2; p <= firstPage.totalPages; p++) {
          const next = await listMunicipalReports(actor, {
            ...filters,
            page: p,
            pageSize: 100,
          }, db);
          if (records.length + next.items.length > MAX_EXPORT_ROWS) {
            throw new Error("ROW_LIMIT_EXCEEDED: Dataset exceeds 10,000 rows. Please narrow your filters.");
          }
          records.push(...next.items);
        }
      }

      rowCount = records.length;
      const headers = [
        "Reference Number",
        "Municipality",
        "Barangay",
        "Report Source",
        "Fire Type",
        "Calculated Severity",
        "Status",
        "Submitted At (PHT)",
        "Response Started At (PHT)",
        "Recorded Arrival At (PHT)",
        "Resolved At (PHT)",
        "Response Duration (mins)",
        "Arrival Duration (mins)",
        "Resolution Duration (mins)",
      ];

      const rows = records.map((r) => [
        r.referenceNumber,
        r.municipalityName,
        r.barangay,
        r.reportSource,
        r.fireType,
        r.severity,
        r.status,
        r.submittedAt ? formatPhilippineDateTime(r.submittedAt) : "",
        r.responseStartedAt ? formatPhilippineDateTime(r.responseStartedAt) : "",
        r.recordedArrivalAt ? formatPhilippineDateTime(r.recordedArrivalAt) : "",
        r.resolvedAt ? formatPhilippineDateTime(r.resolvedAt) : "",
        r.timeToResponseMinutes ?? "",
        r.timeToArrivalMinutes ?? "",
        r.timeToResolutionMinutes ?? "",
      ]);

      csvContent = withUtf8Bom(buildCsv(headers, rows));
      pdfRows = records;
      if (options.format === "PDF") {
        pdfSummary = await getMunicipalReportSummary(actor, filters, db);
      }
      break;
    }

    case "MUNICIPAL_SUMMARY": {
      fileName = `alab-${muniSlug}-incident-summary-${dateRangeSlug}-${timeSuffix}.${fileExtension}`;
      const summary = await getMunicipalReportSummary(actor, filters, db);
      pdfSummary = summary;
      rowCount = 1;

      const summaryHeaders = [
        "Municipality",
        "Period Basis",
        "Date From",
        "Date To",
        "Total Intake",
        "Confirmed Incidents",
        "Resolved Incidents",
        "Unresolved Confirmed Incidents",
        "Administrative Outcomes",
        "Pending Intake",
        "Avg Time to Response (mins)",
        "Response Records Sample Count",
        "Avg Time to Arrival (mins)",
        "Arrival Records Sample Count",
        "Avg Time to Resolution (mins)",
        "Resolution Records Sample Count",
      ];

      const summaryRow = [
        actor.municipalityName,
        "Reported during (submitted_at)",
        summary.dateBoundaries.from ?? "Beginning of records",
        summary.dateBoundaries.to ?? "Latest recorded",
        summary.totalReports,
        summary.confirmedIncidents,
        summary.resolvedIncidents,
        summary.unresolvedConfirmedIncidents,
        summary.administrativeOutcomes,
        summary.pendingIntake,
        summary.timingMetrics.avgResponseMinutes ?? "",
        summary.timingMetrics.responseRecordsCount,
        summary.timingMetrics.avgArrivalMinutes ?? "",
        summary.timingMetrics.arrivalRecordsCount,
        summary.timingMetrics.avgResolutionMinutes ?? "",
        summary.timingMetrics.resolutionRecordsCount,
      ];

      /*
       * Each breakdown keeps the same three columns, so the whole file stays a
       * single valid CSV table instead of several tables stacked behind
       * separator rows that spreadsheets cannot parse.
       */
      const breakdownRows: (string | number)[][] = [];
      const addBreakdown = (section: string, counts: Record<string, number>) => {
        for (const [label, count] of Object.entries(counts)) {
          breakdownRows.push([section, label, count]);
        }
      };

      addBreakdown("Status", summary.byStatus);
      addBreakdown("Fire Type", summary.byFireType);
      addBreakdown("Severity", summary.bySeverity);
      addBreakdown("Report Source", summary.bySource);

      csvContent = withUtf8Bom(
        [
          buildCsv(summaryHeaders, [summaryRow]),
          "",
          buildCsv(["Breakdown", "Category", "Count"], breakdownRows),
        ].join("\r\n"),
      );
      break;
    }

    case "BARANGAY_BREAKDOWN": {
      fileName = `alab-${muniSlug}-barangay-breakdown-${dateRangeSlug}-${timeSuffix}.${fileExtension}`;
      const summary = await getMunicipalReportSummary(actor, filters, db);
      pdfSummary = summary;
      rowCount = summary.byBarangay.length;

      const headers = [
        "Barangay",
        "Total Reports",
        "Confirmed Incidents",
        "Resolved Incidents",
        "Administrative Outcomes",
        "Avg Time to Arrival (mins)",
        "Arrival Records Sample Count",
      ];

      const rows = summary.byBarangay.map((b) => [
        b.barangayName,
        b.total,
        b.confirmed,
        b.resolved,
        b.falseReport,
        b.avgArrivalMinutes ?? "",
        b.arrivalCount,
      ]);

      csvContent = withUtf8Bom(buildCsv(headers, rows));
      break;
    }

    case "INCIDENT_DOSSIER": {
      // A single incident renders as a formatted dossier, which has no row shape.
      if (options.format !== "PDF") {
        throw new Error("INVALID_FORMAT: The incident dossier is available as PDF only.");
      }
      if (!options.reportId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(options.reportId)) {
        throw new Error("INVALID_SELECTION: A valid report ID is required for an incident dossier.");
      }

      const detail = await getMunicipalReportDetail(actor, options.reportId);
      if (!detail) {
        throw new Error("INVALID_SELECTION: That report was not found in your municipality.");
      }

      pdfDetail = detail;
      rowCount = 1;
      fileName = `alab-${muniSlug}-incident-${sanitizeForFilename(detail.referenceNumber)}-${timeSuffix}.pdf`;
      break;
    }

    default:
      throw new Error(`UNSUPPORTED_DATASET: ${dataset}`);
  }

  const xlsxContent =
    options.format === "XLSX"
      ? await buildMunicipalReportExcel({
          kind: dataset as Exclude<typeof dataset, "INCIDENT_DOSSIER">,
          municipalityName: actor.municipalityName || "Municipality",
          preparedBy: options.preparedBy || actor.displayName || "Authorized Officer",
          periodLabel:
            filters.from && filters.to
              ? `${filters.from} to ${filters.to}`
              : filters.from
                ? `From ${filters.from}`
                : filters.to
                  ? `Until ${filters.to}`
                  : "All recorded dates",
          filterLabel: describeFilters(filters, scope),
          rows: pdfRows,
          summary: pdfSummary ?? (await getMunicipalReportSummary(actor, filters, db)),
        })
      : undefined;

  const pdfContent =
    options.format === "PDF"
      ? await buildMunicipalReportPdf({
          kind: dataset,
          municipalityName: actor.municipalityName || "Municipality",
          preparedBy: options.preparedBy || actor.displayName || "Authorized Officer",
          periodLabel:
            filters.from && filters.to
              ? `${filters.from} to ${filters.to}`
              : filters.from
                ? `From ${filters.from}`
                : filters.to
                  ? `Until ${filters.to}`
                  : "All recorded dates",
          filterLabel: describeFilters(filters, scope),
          rows: pdfRows,
          summary: pdfSummary,
          detail: pdfDetail,
        })
      : undefined;

  // Audit export in municipal_export_events table
  await db.query(
      `insert into public.municipal_export_events
        (actor_user_id, municipality_id, dataset, format, row_count, file_name, filters)
       values ($1, $2, $3, $4, $5, $6, $7::jsonb)`,
      [
        actor.userId,
        actor.municipalityId,
        dataset,
        options.format,
        rowCount,
        fileName,
        JSON.stringify({ ...filters, scope, selectedIds: scope === "SELECTED" ? selectedIds : undefined }),
      ],
    );
  await db.query("COMMIT");

  return {
    csvContent,
    pdfContent,
    xlsxContent,
    fileName,
    rowCount,
  };
  } catch (error) {
    await db.query("ROLLBACK");
    throw error;
  } finally {
    db.release();
  }
}
