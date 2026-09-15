import "server-only";

import ExcelJS from "exceljs";

import {
  formatPhilippineDateTime,
  getFireTypeLabel,
  getSeverityLabel,
  getStatusLabel,
} from "./formatters";
import type {
  MunicipalReportRow,
  MunicipalReportSummary,
} from "./types";

/*
 * Workbook palette. ARGB, because that is what ExcelJS fills take. The tints
 * match the badge colours used by the PDF and the on-screen table, so the same
 * incident reads the same way in every export.
 */
const FILL = {
  brand: "FF991B1B",
  brandSoft: "FFFEF2F2",
  header: "FF0F172A",
  band: "FFF8FAFC",
  border: "FFE2E8F0",
  white: "FFFFFFFF",
} as const;

const SEVERITY_FILL: Record<string, { bg: string; fg: string }> = {
  CRITICAL: { bg: "FFFEE2E2", fg: "FF991B1B" },
  HIGH: { bg: "FFFFEDD5", fg: "FFC2410C" },
  MODERATE: { bg: "FFFEF3C7", fg: "FFB45309" },
  LOW: { bg: "FFDCFCE7", fg: "FF15803D" },
};

const STATUS_FILL: Record<string, { bg: string; fg: string }> = {
  CONFIRMED: { bg: "FFDC2626", fg: "FFFFFFFF" },
  VERIFIED: { bg: "FFDC2626", fg: "FFFFFFFF" },
  RESPONDING: { bg: "FFEA580C", fg: "FFFFFFFF" },
  FIRETRUCK_DISPATCHED: { bg: "FFEA580C", fg: "FFFFFFFF" },
  RESPONDER_ARRIVED: { bg: "FF2563EB", fg: "FFFFFFFF" },
  UNDER_CONTROL: { bg: "FF2563EB", fg: "FFFFFFFF" },
  RESOLVED: { bg: "FF059669", fg: "FFFFFFFF" },
  CLOSED: { bg: "FF059669", fg: "FFFFFFFF" },
  SUBMITTED: { bg: "FFFEF3C7", fg: "FF92400E" },
  PENDING_VERIFICATION: { bg: "FFFEF3C7", fg: "FF92400E" },
  UNDER_VERIFICATION: { bg: "FFFEF3C7", fg: "FF92400E" },
};

export type MunicipalExcelKind =
  | "INCIDENT_REGISTER"
  | "MUNICIPAL_SUMMARY"
  | "BARANGAY_BREAKDOWN";

export interface MunicipalExcelContext {
  kind: MunicipalExcelKind;
  municipalityName: string;
  preparedBy: string;
  periodLabel: string;
  filterLabel: string;
  rows: MunicipalReportRow[];
  summary: MunicipalReportSummary | null;
}

type Sheet = ExcelJS.Worksheet;

interface ColumnSpec {
  header: string;
  width: number;
  numeric?: boolean;
}

function sheetTitle(kind: MunicipalExcelKind): string {
  switch (kind) {
    case "MUNICIPAL_SUMMARY":
      return "MUNICIPAL INCIDENT SUMMARY & PERFORMANCE REPORT";
    case "BARANGAY_BREAKDOWN":
      return "BARANGAY INCIDENT DISTRIBUTION REPORT";
    case "INCIDENT_REGISTER":
    default:
      return "MUNICIPAL INCIDENT REGISTER & DISPATCH AUDIT LOG";
  }
}

/**
 * Letterhead rows above the table: the bureau line, the document title and the
 * provenance of the extract. Returns the row index the table starts on.
 */
function drawLetterhead(sheet: Sheet, context: MunicipalExcelContext, columnCount: number): number {
  const lastColumn = sheet.getColumn(columnCount).letter;

  sheet.mergeCells(`A1:${lastColumn}1`);
  const bureau = sheet.getCell("A1");
  bureau.value = `BUREAU OF FIRE PROTECTION  •  ${context.municipalityName.toUpperCase()}, ANTIQUE`;
  bureau.font = { bold: true, size: 14, color: { argb: FILL.white } };
  bureau.fill = { type: "pattern", pattern: "solid", fgColor: { argb: FILL.brand } };
  bureau.alignment = { vertical: "middle", horizontal: "center" };
  sheet.getRow(1).height = 26;

  sheet.mergeCells(`A2:${lastColumn}2`);
  const title = sheet.getCell("A2");
  title.value = sheetTitle(context.kind);
  title.font = { bold: true, size: 10, color: { argb: FILL.header } };
  title.fill = { type: "pattern", pattern: "solid", fgColor: { argb: FILL.brandSoft } };
  title.alignment = { vertical: "middle", horizontal: "center" };
  sheet.getRow(2).height = 20;

  sheet.mergeCells(`A3:${lastColumn}3`);
  const meta = sheet.getCell("A3");
  meta.value =
    `Period: ${context.periodLabel}    •    Prepared by: ${context.preparedBy}` +
    `    •    Generated: ${formatPhilippineDateTime(new Date().toISOString())}`;
  meta.font = { size: 9, color: { argb: "FF475569" } };
  meta.alignment = { vertical: "middle", horizontal: "center" };
  sheet.getRow(3).height = 16;

  sheet.mergeCells(`A4:${lastColumn}4`);
  const filters = sheet.getCell("A4");
  filters.value = `Filters: ${context.filterLabel}`;
  filters.font = { size: 9, italic: true, color: { argb: "FF64748B" } };
  filters.alignment = { vertical: "middle", horizontal: "center" };
  sheet.getRow(4).height = 16;

  return 6;
}

/** Applies the column widths and the dark header band. */
function drawTableHeader(sheet: Sheet, columns: ColumnSpec[], headerRow: number): void {
  columns.forEach((column, index) => {
    sheet.getColumn(index + 1).width = column.width;
  });

  const row = sheet.getRow(headerRow);
  columns.forEach((column, index) => {
    const cell = row.getCell(index + 1);
    cell.value = column.header;
    cell.font = { bold: true, size: 9, color: { argb: FILL.white } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: FILL.header } };
    cell.alignment = {
      vertical: "middle",
      horizontal: column.numeric ? "right" : "left",
      wrapText: true,
    };
    cell.border = { bottom: { style: "thin", color: { argb: FILL.brand } } };
  });
  row.height = 28;

  // Freeze everything above and including the header so it stays put on scroll.
  sheet.views = [{ state: "frozen", ySplit: headerRow }];
  sheet.autoFilter = {
    from: { row: headerRow, column: 1 },
    to: { row: headerRow, column: columns.length },
  };
}

function styleBody(
  sheet: Sheet,
  columns: ColumnSpec[],
  firstRow: number,
  lastRow: number,
): void {
  for (let r = firstRow; r <= lastRow; r += 1) {
    const row = sheet.getRow(r);
    row.height = 18;
    columns.forEach((column, index) => {
      const cell = row.getCell(index + 1);
      cell.font = cell.font?.bold ? cell.font : { size: 9, color: { argb: "FF1E293B" } };
      cell.alignment = {
        vertical: "middle",
        horizontal: column.numeric ? "right" : "left",
      };
      cell.border = { bottom: { style: "hair", color: { argb: FILL.border } } };
      // Zebra banding, applied only where a cell has no badge tint of its own.
      if ((r - firstRow) % 2 === 1 && !cell.fill) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: FILL.band } };
      }
    });
  }
}

function tintCell(cell: ExcelJS.Cell, palette: { bg: string; fg: string } | undefined): void {
  if (!palette) return;
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: palette.bg } };
  cell.font = { size: 9, bold: true, color: { argb: palette.fg } };
  cell.alignment = { vertical: "middle", horizontal: "center" };
}

function buildRegisterSheet(sheet: Sheet, context: MunicipalExcelContext): void {
  const columns: ColumnSpec[] = [
    { header: "Reference Number", width: 24 },
    { header: "Municipality", width: 16 },
    { header: "Barangay", width: 18 },
    { header: "Reported By", width: 22 },
    { header: "Intake Channel", width: 18 },
    { header: "Fire Type", width: 16 },
    { header: "Severity", width: 12 },
    { header: "Status", width: 18 },
    { header: "Submitted At (PHT)", width: 22 },
    { header: "Response Started (PHT)", width: 22 },
    { header: "Recorded Arrival (PHT)", width: 22 },
    { header: "Resolved At (PHT)", width: 22 },
    { header: "Response (mins)", width: 15, numeric: true },
    { header: "Arrival (mins)", width: 14, numeric: true },
    { header: "Resolution (mins)", width: 16, numeric: true },
  ];

  const headerRow = drawLetterhead(sheet, context, columns.length);
  drawTableHeader(sheet, columns, headerRow);

  let r = headerRow + 1;
  for (const record of context.rows) {
    const row = sheet.getRow(r);
    row.values = [
      record.referenceNumber,
      record.municipalityName,
      record.barangay,
      record.reporterName || "Anonymous Resident",
      record.reportSource === "ALAB_APP" ? "ALAB Mobile App" : "Emergency Call",
      getFireTypeLabel(record.fireType),
      getSeverityLabel(record.severity),
      getStatusLabel(record.status),
      record.submittedAt ? formatPhilippineDateTime(record.submittedAt) : "",
      record.responseStartedAt ? formatPhilippineDateTime(record.responseStartedAt) : "",
      record.recordedArrivalAt ? formatPhilippineDateTime(record.recordedArrivalAt) : "",
      record.resolvedAt ? formatPhilippineDateTime(record.resolvedAt) : "",
      record.timeToResponseMinutes ?? "",
      record.timeToArrivalMinutes ?? "",
      record.timeToResolutionMinutes ?? "",
    ];
    r += 1;
  }

  const lastRow = r - 1;
  if (lastRow >= headerRow + 1) {
    styleBody(sheet, columns, headerRow + 1, lastRow);
    for (let i = headerRow + 1; i <= lastRow; i += 1) {
      const record = context.rows[i - headerRow - 1];
      sheet.getCell(i, 1).font = { size: 9, bold: true, name: "Consolas", color: { argb: FILL.header } };
      tintCell(sheet.getCell(i, 7), SEVERITY_FILL[record.severity]);
      tintCell(sheet.getCell(i, 8), STATUS_FILL[record.status]);
    }
  }
}

function buildSummarySheet(sheet: Sheet, context: MunicipalExcelContext): void {
  const summary = context.summary;
  if (!summary) return;

  const columns: ColumnSpec[] = [
    { header: "Metric", width: 38 },
    { header: "Value", width: 20, numeric: true },
    { header: "Sample Coverage", width: 26 },
  ];

  const headerRow = drawLetterhead(sheet, context, columns.length);
  drawTableHeader(sheet, columns, headerRow);

  const total = summary.totalReports;
  const entries: [string, string | number, string][] = [
    ["Total Reports Intake", total, "All reports submitted in period"],
    ["Confirmed Incidents", summary.confirmedIncidents, ""],
    ["Resolved Incidents", summary.resolvedIncidents, ""],
    ["Unresolved Confirmed Incidents", summary.unresolvedConfirmedIncidents, ""],
    ["Administrative Outcomes", summary.administrativeOutcomes, ""],
    ["Pending Intake", summary.pendingIntake, ""],
    [
      "Avg Time to Response (mins)",
      summary.timingMetrics.avgResponseMinutes ?? "Not recorded",
      `${summary.timingMetrics.responseRecordsCount} of ${total} incidents`,
    ],
    [
      "Avg Time to Arrival (mins)",
      summary.timingMetrics.avgArrivalMinutes ?? "Not recorded",
      `${summary.timingMetrics.arrivalRecordsCount} of ${total} incidents`,
    ],
    [
      "Avg Time to Resolution (mins)",
      summary.timingMetrics.avgResolutionMinutes ?? "Not recorded",
      `${summary.timingMetrics.resolutionRecordsCount} of ${total} incidents`,
    ],
  ];

  let r = headerRow + 1;
  for (const [metric, value, coverage] of entries) {
    sheet.getRow(r).values = [metric, value, coverage];
    r += 1;
  }
  styleBody(sheet, columns, headerRow + 1, r - 1);

  // Breakdown block, labelled rather than coded, under its own banner.
  r += 1;
  const bannerRow = r;
  sheet.mergeCells(`A${bannerRow}:C${bannerRow}`);
  const banner = sheet.getCell(`A${bannerRow}`);
  banner.value = "CLASSIFICATION BREAKDOWN";
  banner.font = { bold: true, size: 9, color: { argb: FILL.white } };
  banner.fill = { type: "pattern", pattern: "solid", fgColor: { argb: FILL.brand } };
  banner.alignment = { vertical: "middle", horizontal: "center" };
  sheet.getRow(bannerRow).height = 20;
  r += 1;

  const breakdownHeader = sheet.getRow(r);
  ["Breakdown", "Category", "Count"].forEach((label, index) => {
    const cell = breakdownHeader.getCell(index + 1);
    cell.value = label;
    cell.font = { bold: true, size: 9, color: { argb: FILL.white } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: FILL.header } };
    cell.alignment = { vertical: "middle", horizontal: index === 2 ? "right" : "left" };
  });
  breakdownHeader.height = 20;
  const breakdownFirst = r + 1;
  r += 1;

  const sections: [string, Record<string, number>, (key: string) => string][] = [
    ["Status", summary.byStatus, getStatusLabel],
    ["Fire Type", summary.byFireType, getFireTypeLabel],
    ["Severity", summary.bySeverity, getSeverityLabel],
    ["Report Source", summary.bySource, (key) => (key === "ALAB_APP" ? "ALAB Mobile App" : "Emergency Call")],
  ];

  for (const [section, counts, label] of sections) {
    for (const [key, count] of Object.entries(counts)) {
      sheet.getRow(r).values = [section, label(key), count];
      r += 1;
    }
  }

  styleBody(
    sheet,
    [{ header: "Breakdown", width: 38 }, { header: "Category", width: 20 }, { header: "Count", width: 26, numeric: true }],
    breakdownFirst,
    r - 1,
  );
}

function buildBarangaySheet(sheet: Sheet, context: MunicipalExcelContext): void {
  const summary = context.summary;
  if (!summary) return;

  const columns: ColumnSpec[] = [
    { header: "Barangay", width: 28 },
    { header: "Total Reports", width: 15, numeric: true },
    { header: "Confirmed", width: 13, numeric: true },
    { header: "Resolved", width: 12, numeric: true },
    { header: "Administrative Outcomes", width: 22, numeric: true },
    { header: "Avg Arrival (mins)", width: 18, numeric: true },
    { header: "Arrival Samples", width: 16, numeric: true },
  ];

  const headerRow = drawLetterhead(sheet, context, columns.length);
  drawTableHeader(sheet, columns, headerRow);

  let r = headerRow + 1;
  for (const barangay of summary.byBarangay) {
    sheet.getRow(r).values = [
      barangay.barangayName,
      barangay.total,
      barangay.confirmed,
      barangay.resolved,
      barangay.falseReport,
      barangay.avgArrivalMinutes ?? "Not recorded",
      barangay.arrivalCount,
    ];
    r += 1;
  }

  const lastRow = r - 1;
  if (lastRow >= headerRow + 1) {
    styleBody(sheet, columns, headerRow + 1, lastRow);
    for (let i = headerRow + 1; i <= lastRow; i += 1) {
      sheet.getCell(i, 1).font = { size: 9, bold: true, color: { argb: FILL.header } };
    }
  }
}

/**
 * Builds a styled workbook. Enumerations are written as their display labels,
 * so the sheet reads the way the report does rather than the way the database
 * stores it.
 */
export async function buildMunicipalReportExcel(context: MunicipalExcelContext): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "ALAB Emergency Dispatch, Telemetry & Citizen Intake System";
  workbook.created = new Date();

  const sheetName =
    context.kind === "MUNICIPAL_SUMMARY"
      ? "Summary"
      : context.kind === "BARANGAY_BREAKDOWN"
        ? "Barangay Breakdown"
        : "Incident Register";

  const sheet = workbook.addWorksheet(sheetName, {
    pageSetup: { paperSize: 9, orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  });

  if (context.kind === "INCIDENT_REGISTER") {
    buildRegisterSheet(sheet, context);
  } else if (context.kind === "MUNICIPAL_SUMMARY") {
    buildSummarySheet(sheet, context);
  } else {
    buildBarangaySheet(sheet, context);
  }

  return Buffer.from(await workbook.xlsx.writeBuffer());
}
