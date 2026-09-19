import "server-only";

import { buildMunicipalReportExcel } from "../../municipal-bfp/reports/excel";
import { buildMunicipalReportPdf } from "../../municipal-bfp/reports/pdf";
import type {
  MunicipalReportRow,
  MunicipalReportSummary,
} from "../../municipal-bfp/reports/types";
import { listProvincialReports } from "./reports";
import { getProvincialReportSummary } from "./report-summaries";
import type { ManagementActor, ProvincialReportRow, ReportFilters } from "./types";

/*
 * Provincial exports.
 *
 * The municipality's own register, summary and letterhead were already built
 * and are what a station recognises on paper, so the province borrows them
 * rather than growing a second set that would drift from the first. What
 * changes is the scope: the whole province, or one municipality within it,
 * chosen by the officer running the report.
 */

export type ProvincialReportFormat = "PDF" | "XLSX" | "CSV";

export type ProvincialReportDataset =
  | "INCIDENT_REGISTER"
  | "PROVINCIAL_SUMMARY"
  | "MUNICIPALITY_BREAKDOWN";

const MAX_EXPORT_ROWS = 10_000;

/** The municipal builders speak in rows of this shape, so the province does too. */
function toReportRow(row: ProvincialReportRow): MunicipalReportRow {
  const minutesBetween = (from: string | null, to: string | null) => {
    if (!from || !to) return null;
    const value = (new Date(to).getTime() - new Date(from).getTime()) / 60000;
    return Number.isFinite(value) && value >= 0 ? Math.round(value) : null;
  };

  return {
    id: row.id,
    recordRole: "OWNER",
    referenceNumber: row.referenceNumber,
    municipalityId: row.municipalityId,
    municipalityName: row.municipalityName,
    barangay: row.barangay,
    reportSource: row.reportSource,
    fireType: row.fireType,
    severity: (row.severity as MunicipalReportRow["severity"]) ?? "UNKNOWN",
    status: row.status,
    latitude: row.latitude,
    longitude: row.longitude,
    submittedAt: row.submittedAt,
    responseStartedAt: row.responseStartedAt,
    // The provincial register does not carry an arrival stamp of its own.
    recordedArrivalAt: null,
    resolvedAt: row.resolvedAt,
    latestDispatchSummary: row.latestDispatchSummary,
    timeToResponseMinutes: minutesBetween(row.submittedAt, row.responseStartedAt),
    timeToArrivalMinutes: null,
    timeToResolutionMinutes: minutesBetween(row.submittedAt, row.resolvedAt),
  };
}

/**
 * The provincial summary in the shape the municipal builders read.
 *
 * Their barangay breakdown becomes the province's municipality breakdown: both
 * answer "where within my jurisdiction", only the unit of jurisdiction differs.
 */
function toReportSummary(
  summary: Awaited<ReturnType<typeof getProvincialReportSummary>>,
): MunicipalReportSummary {
  const confirmed = summary.byMunicipality.reduce((total, row) => total + row.confirmed, 0);
  const resolved = summary.byMunicipality.reduce((total, row) => total + row.resolved, 0);
  const administrative = summary.byMunicipality.reduce((total, row) => total + row.falseReport, 0);

  return {
    totalReports: summary.totalReports,
    confirmedIncidents: confirmed,
    resolvedIncidents: resolved,
    unresolvedConfirmedIncidents: Math.max(0, confirmed - resolved),
    administrativeOutcomes: administrative,
    pendingIntake: Math.max(0, summary.totalReports - confirmed - administrative),
    byStatus: summary.byStatus,
    bySource: summary.bySource,
    byFireType: summary.byFireType,
    bySeverity: (summary as { bySeverity?: Record<string, number> }).bySeverity ?? {},
    timingMetrics: {
      avgResponseMinutes: summary.timingMetrics.avgResponseMinutes,
      avgArrivalMinutes: null,
      avgResolutionMinutes: summary.timingMetrics.avgResolutionMinutes ?? null,
      responseRecordsCount: (summary.timingMetrics as { responseRecordsCount?: number })?.responseRecordsCount ?? 0,
      arrivalRecordsCount: 0,
      resolutionRecordsCount: (summary.timingMetrics as { resolutionRecordsCount?: number })?.resolutionRecordsCount ?? 0,
    },
    byBarangay: summary.byMunicipality.map((row) => ({
      barangayId: row.municipalityId,
      barangayName: row.municipalityName,
      total: row.total,
      confirmed: row.confirmed,
      resolved: row.resolved,
      falseReport: row.falseReport,
      avgArrivalMinutes: null,
      arrivalCount: 0,
    })),
    dateBoundaries: {
      from: summary.period?.from ?? null,
      to: summary.period?.to ?? null,
    },
    generatedAt: new Date().toISOString(),
  };
}

function escapeCsv(value: unknown): string {
  if (value === null || value === undefined) return "";
  let text = String(value);
  // A leading formula character would execute when the file is opened.
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  if (/[",\n\r]/.test(text)) text = `"${text.replace(/"/g, '""')}"`;
  return text;
}

function buildCsv(headers: string[], rows: (string | number | null)[][]): string {
  // The byte-order mark stops Excel guessing the encoding of accented names.
  return `﻿${[headers.map(escapeCsv).join(","), ...rows.map((row) => row.map(escapeCsv).join(","))].join("\r\n")}`;
}

export type ProvincialReportExport = {
  fileName: string;
  contentType: string;
  body: Buffer | string;
};

export async function buildProvincialReportExport(input: {
  actor: ManagementActor;
  filters: ReportFilters;
  dataset: ProvincialReportDataset;
  format: ProvincialReportFormat;
  preparedBy: string;
  /** Set when the officer narrowed the report to one municipality. */
  municipalityName?: string | null;
}): Promise<ProvincialReportExport> {
  const scopeName = input.municipalityName?.trim()
    ? `${input.municipalityName.trim()}, Antique`
    : "Province of Antique";

  const summaryRaw = await getProvincialReportSummary(input.actor, input.filters);
  const summary = toReportSummary(summaryRaw);

  let rows: MunicipalReportRow[] = [];
  if (input.dataset === "INCIDENT_REGISTER") {
    const first = await listProvincialReports(input.actor, { ...input.filters, page: 1, pageSize: 100 });
    if (first.total > MAX_EXPORT_ROWS) {
      throw new Error("ROW_LIMIT_EXCEEDED");
    }
    const collected = [...first.items];
    for (let page = 2; page <= Math.ceil(first.total / 100); page += 1) {
      const next = await listProvincialReports(input.actor, { ...input.filters, page, pageSize: 100 });
      collected.push(...next.items);
    }
    rows = collected.map(toReportRow);
  }

  const period = summary.dateBoundaries.from || summary.dateBoundaries.to
    ? `${summary.dateBoundaries.from?.slice(0, 10) ?? "Start"} to ${summary.dateBoundaries.to?.slice(0, 10) ?? "Present"}`
    : "All records";

  const describedFilters: string[] = [];
  if (input.municipalityName) describedFilters.push(`Municipality ${input.municipalityName}`);
  if (input.filters.reportSource) describedFilters.push(`Source ${input.filters.reportSource}`);
  if (input.filters.fireType) describedFilters.push(`Fire type ${input.filters.fireType}`);
  if (input.filters.status) describedFilters.push(`Status ${input.filters.status}`);
  const filterLabel = describedFilters.length ? describedFilters.join("  •  ") : "None";

  const stamp = new Date().toISOString().slice(0, 10);
  const slug = input.dataset === "INCIDENT_REGISTER"
    ? "incident-register"
    : input.dataset === "PROVINCIAL_SUMMARY"
      ? "provincial-summary"
      : "municipality-breakdown";
  const base = `antique-${slug}-${stamp}`;

  // The builders name their kinds in municipal terms; the province maps onto
  // them so one letterhead and one workbook layout serve both.
  const kind = input.dataset === "INCIDENT_REGISTER"
    ? "INCIDENT_REGISTER"
    : input.dataset === "PROVINCIAL_SUMMARY"
      ? "MUNICIPAL_SUMMARY"
      : "BARANGAY_BREAKDOWN";

  if (input.format === "PDF") {
    const pdf = await buildMunicipalReportPdf({
      kind,
      municipalityName: scopeName,
      preparedBy: input.preparedBy,
      periodLabel: period,
      filterLabel,
      rows,
      summary,
    });
    return {
      fileName: `${base}.pdf`,
      contentType: "application/pdf",
      body: pdf,
    };
  }

  if (input.format === "XLSX") {
    const workbook = await buildMunicipalReportExcel({
      kind,
      municipalityName: scopeName,
      preparedBy: input.preparedBy,
      periodLabel: period,
      filterLabel,
      rows,
      summary,
    });
    return {
      fileName: `${base}.xlsx`,
      contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      body: workbook,
    };
  }

  if (input.dataset === "INCIDENT_REGISTER") {
    return {
      fileName: `${base}.csv`,
      contentType: "text/csv; charset=utf-8",
      body: buildCsv(
        ["Reference", "Municipality", "Barangay", "Source", "Fire Type", "Level of Danger", "Status", "Submitted", "Response Started", "Resolved"],
        rows.map((row) => [
          row.referenceNumber, row.municipalityName, row.barangay, row.reportSource,
          row.fireType, row.severity, row.status, row.submittedAt,
          row.responseStartedAt, row.resolvedAt,
        ]),
      ),
    };
  }

  return {
    fileName: `${base}.csv`,
    contentType: "text/csv; charset=utf-8",
    body: buildCsv(
      ["Municipality", "Total Intake", "Confirmed Fires", "Administrative Outcomes", "Resolved"],
      summaryRaw.byMunicipality.map((row) => [
        row.municipalityName, row.total, row.confirmed, row.falseReport, row.resolved,
      ]),
    ),
  };
}
