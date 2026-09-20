import "server-only";

import { buildMunicipalReportExcel } from "../../municipal-bfp/reports/excel";
import { formatPhilippineDateTime } from "../../municipal-bfp/reports/formatters";
import { buildMunicipalReportPdf } from "../../municipal-bfp/reports/pdf";
import type {
  MunicipalReportDetail,
  MunicipalReportRow,
  MunicipalReportSummary,
} from "../../municipal-bfp/reports/types";
import { getProvincialReport, listProvincialReports } from "./reports";
import { getProvincialReportSummary } from "./report-summaries";
import type { ManagementActor, ProvincialReportDetail, ProvincialReportRow, ReportFilters } from "./types";

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
  | "MUNICIPALITY_BREAKDOWN"
  | "INCIDENT_DOSSIER";

/** Which of the filtered records the register carries. Aggregates always cover all of them. */
export type ProvincialReportScope = "ALL_MATCHING" | "SELECTED" | "CURRENT_PAGE";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

function toReportDetail(detail: ProvincialReportDetail): MunicipalReportDetail {
  const minutesBetween = (from: string | null, to: string | null) => {
    if (!from || !to) return null;
    const value = (new Date(to).getTime() - new Date(from).getTime()) / 60000;
    return Number.isFinite(value) && value >= 0 ? Math.round(value) : null;
  };

  return {
    ...toReportRow(detail),
    recordedArrivalAt: detail.recordedArrivalAt,
    timeToArrivalMinutes: minutesBetween(detail.submittedAt, detail.recordedArrivalAt),
    reporterName: detail.reporterNameSnapshot,
    reporterPhone: detail.reporterPhoneSnapshot,
    nearestLandmark: detail.nearestLandmark,
    addressLabel: detail.addressLabel,
    locationMethod: detail.locationMethod,
    locationAccuracyMeters: detail.locationAccuracyMeters,
    description: detail.description,
    photos: detail.photos ?? [],
    timeline: (detail.timeline ?? []).map((event) => ({
      stage: event.stage,
      timestamp: event.timestamp,
      notes: event.notes,
    })),
    dispatches: (detail.dispatches ?? []).map((dispatch) => ({
      id: dispatch.id,
      status: dispatch.status,
      dispatchedAt: dispatch.dispatchedAt,
      completedAt: dispatch.completedAt ?? null,
      cancelledAt: dispatch.cancelledAt ?? null,
      stationName: dispatch.stationName ?? dispatch.stations?.[0]?.stationName ?? "Assigned Units",
      recipients: (dispatch.recipients ?? []).map((recipient) => ({
        userId: recipient.userId,
        name: recipient.name,
        status: recipient.status,
        assignedAt: recipient.assignedAt,
        acknowledgedAt: recipient.acknowledgedAt,
        enRouteAt: recipient.enRouteAt,
        onSceneAt: recipient.onSceneAt,
        completedAt: recipient.completedAt,
      })),
    })),
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
  /** Defaults to every filtered record; only the register honours the others. */
  scope?: ProvincialReportScope;
  /** Required by the SELECTED scope: the report rows the officer ticked. */
  selectedIds?: string[];
  /** Required by the INCIDENT_DOSSIER dataset: the single report to render. */
  reportId?: string;
}): Promise<ProvincialReportExport> {
  const scope: ProvincialReportScope = input.scope ?? "ALL_MATCHING";
  if (!["ALL_MATCHING", "SELECTED", "CURRENT_PAGE"].includes(scope)) {
    throw new Error("INVALID_SCOPE");
  }
  if (input.dataset !== "INCIDENT_REGISTER" && scope !== "ALL_MATCHING") {
    throw new Error("INVALID_SCOPE");
  }

  // One incident renders as a formatted dossier, which has no row or sheet shape.
  if (input.dataset === "INCIDENT_DOSSIER") {
    if (input.format !== "PDF") throw new Error("INVALID_FORMAT");
    if (!input.reportId || !UUID.test(input.reportId)) throw new Error("INVALID_SELECTION");

    const detail = await getProvincialReport(input.actor, input.reportId);
    if (!detail) throw new Error("INVALID_SELECTION");

    const pdf = await buildMunicipalReportPdf({
      kind: "INCIDENT_DOSSIER",
      // The dossier is one station's record, so the letterhead names that station.
      municipalityName: detail.municipalityName,
      preparedBy: input.preparedBy,
      periodLabel: formatPhilippineDateTime(detail.submittedAt),
      filterLabel: "Single incident record",
      rows: [],
      summary: null,
      detail: toReportDetail(detail),
    });

    const slug = detail.referenceNumber.toLowerCase().replace(/[^a-z0-9_-]/g, "-").replace(/-+/g, "-");
    return {
      fileName: `alab-provincial-incident-${slug}.pdf`,
      contentType: "application/pdf",
      body: pdf,
    };
  }
  if (scope === "SELECTED") {
    const ids = input.selectedIds;
    if (!ids?.length || ids.length > MAX_EXPORT_ROWS || new Set(ids).size !== ids.length || ids.some((id) => !UUID.test(id))) {
      throw new Error("INVALID_SELECTION");
    }
  }
  const scopeName = input.municipalityName?.trim()
    ? `${input.municipalityName.trim()}, Antique`
    : "Province of Antique";

  const summaryRaw = await getProvincialReportSummary(input.actor, input.filters);
  const summary = toReportSummary(summaryRaw);

  let rows: MunicipalReportRow[] = [];
  if (input.dataset === "INCIDENT_REGISTER") {
    if (scope === "CURRENT_PAGE") {
      // The officer is exporting exactly the page in front of them.
      const current = await listProvincialReports(input.actor, input.filters);
      rows = current.items.map(toReportRow);
    } else {
      const first = await listProvincialReports(input.actor, { ...input.filters, page: 1, pageSize: 100 });
      if (first.total > MAX_EXPORT_ROWS) {
        throw new Error("ROW_LIMIT_EXCEEDED");
      }
      const collected = [...first.items];
      for (let page = 2; page <= Math.ceil(first.total / 100); page += 1) {
        const next = await listProvincialReports(input.actor, { ...input.filters, page, pageSize: 100 });
        collected.push(...next.items);
      }

      if (scope === "SELECTED") {
        // A tick only survives while the record still matches the filters, so a
        // stale selection fails loudly instead of exporting a shorter register.
        const wanted = new Set(input.selectedIds);
        const matched = collected.filter((row) => wanted.has(row.id));
        if (matched.length !== wanted.size) throw new Error("INVALID_SELECTION");
        rows = matched.map(toReportRow);
      } else {
        rows = collected.map(toReportRow);
      }
    }
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
  const kind: "INCIDENT_REGISTER" | "MUNICIPAL_SUMMARY" | "BARANGAY_BREAKDOWN" =
    input.dataset === "INCIDENT_REGISTER"
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
