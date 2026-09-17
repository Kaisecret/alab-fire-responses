import "server-only";

import ExcelJS from "exceljs";

import {
  formatPhilippineDateTime,
  getFireTypeLabel,
  getSeverityLabel,
  getStatusLabel,
} from "../../municipal-bfp/reports/formatters";

/*
 * The provincial workbook borrows the municipal palette on purpose. A station
 * roster opened next to an incident register should look like it came from the
 * same bureau, so the bands, badges and letterhead are the same ones the
 * municipal exports use.
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
  ACTIVE: { bg: "FFDCFCE7", fg: "FF15803D" },
  PENDING: { bg: "FFFEF3C7", fg: "FF92400E" },
  PENDING_REVIEW: { bg: "FFFEF3C7", fg: "FF92400E" },
  CHANGES_REQUESTED: { bg: "FFFFEDD5", fg: "FFC2410C" },
  NO_APPLICATION: { bg: "FFF1F5F9", fg: "FF475569" },
  SUSPENDED: { bg: "FFFEE2E2", fg: "FF991B1B" },
  INACTIVE: { bg: "FFF1F5F9", fg: "FF475569" },
  REJECTED: { bg: "FFFEE2E2", fg: "FF991B1B" },
};

/** Labels for the account and application states the provincial console owns. */
const PROVINCIAL_STATUS_LABEL: Record<string, string> = {
  ACTIVE: "Active",
  INACTIVE: "Inactive",
  SUSPENDED: "Suspended",
  PENDING: "Pending",
  PENDING_REVIEW: "Pending Review",
  CHANGES_REQUESTED: "Changes Requested",
  NO_APPLICATION: "No Application",
};

function provincialStatusLabel(code: string): string {
  return PROVINCIAL_STATUS_LABEL[code] ?? getStatusLabel(code);
}

export type ProvincialExcelDataset =
  | "STATIONS"
  | "PERSONNEL"
  | "RESIDENTS"
  | "APPLICATIONS"
  | "FIRE_REPORTS"
  | "REPORT_SUMMARY";

/** How a single column is written: its heading, its width and its treatment. */
export interface ProvincialColumnSpec {
  header: string;
  width: number;
  numeric?: boolean;
  /** Reference numbers and codes, set in a monospace face so they line up. */
  mono?: boolean;
  /** Tint the cell like a badge, using the raw enumeration value in the row. */
  badge?: "STATUS" | "SEVERITY";
}

export interface ProvincialExcelContext {
  dataset: ProvincialExcelDataset;
  columns: ProvincialColumnSpec[];
  /** Display values, already formatted. Badge columns carry the raw code. */
  rows: (string | number | null | undefined)[][];
  filterLabel: string;
  rowCountLabel: string;
}

const SHEET_TITLE: Record<ProvincialExcelDataset, string> = {
  STATIONS: "PROVINCIAL FIRE STATION DIRECTORY",
  PERSONNEL: "PROVINCIAL FIRE PERSONNEL ROSTER",
  RESIDENTS: "RESIDENT REGISTRATION METADATA",
  APPLICATIONS: "RESIDENT VERIFICATION APPLICATIONS",
  FIRE_REPORTS: "PROVINCIAL INCIDENT REGISTER",
  REPORT_SUMMARY: "PROVINCIAL INCIDENT SUMMARY BY MUNICIPALITY",
};

const SHEET_NAME: Record<ProvincialExcelDataset, string> = {
  STATIONS: "Stations",
  PERSONNEL: "Personnel",
  RESIDENTS: "Residents",
  APPLICATIONS: "Applications",
  FIRE_REPORTS: "Incident Register",
  REPORT_SUMMARY: "Summary",
};

/**
 * Letterhead rows above the table: the bureau line, the document title and
 * the provenance of the extract. Returns the row index the table starts on.
 */
function drawLetterhead(
  sheet: ExcelJS.Worksheet,
  context: ProvincialExcelContext,
  columnCount: number,
): number {
  const lastColumn = sheet.getColumn(columnCount).letter;

  sheet.mergeCells(`A1:${lastColumn}1`);
  const bureau = sheet.getCell("A1");
  bureau.value = "BUREAU OF FIRE PROTECTION  •  PROVINCE OF ANTIQUE";
  bureau.font = { bold: true, size: 14, color: { argb: FILL.white } };
  bureau.fill = { type: "pattern", pattern: "solid", fgColor: { argb: FILL.brand } };
  bureau.alignment = { vertical: "middle", horizontal: "center" };
  sheet.getRow(1).height = 26;

  sheet.mergeCells(`A2:${lastColumn}2`);
  const title = sheet.getCell("A2");
  title.value = SHEET_TITLE[context.dataset];
  title.font = { bold: true, size: 10, color: { argb: FILL.header } };
  title.fill = { type: "pattern", pattern: "solid", fgColor: { argb: FILL.brandSoft } };
  title.alignment = { vertical: "middle", horizontal: "center" };
  sheet.getRow(2).height = 20;

  sheet.mergeCells(`A3:${lastColumn}3`);
  const meta = sheet.getCell("A3");
  meta.value =
    `${context.rowCountLabel}    •    Generated: ` +
    formatPhilippineDateTime(new Date().toISOString());
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
function drawTableHeader(
  sheet: ExcelJS.Worksheet,
  columns: ProvincialColumnSpec[],
  headerRow: number,
): void {
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
      horizontal: column.numeric ? "right" : column.badge ? "center" : "left",
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

function tintCell(cell: ExcelJS.Cell, palette: { bg: string; fg: string } | undefined): void {
  if (!palette) return;
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: palette.bg } };
  cell.font = { size: 9, bold: true, color: { argb: palette.fg } };
  cell.alignment = { vertical: "middle", horizontal: "center" };
}

/**
 * Writes the data rows, then paints them: zebra banding, hairline rules,
 * monospaced references and badge tints on the status and danger columns.
 */
function drawBody(
  sheet: ExcelJS.Worksheet,
  context: ProvincialExcelContext,
  headerRow: number,
): void {
  const { columns, rows } = context;

  rows.forEach((values, offset) => {
    const row = sheet.getRow(headerRow + 1 + offset);
    row.height = 18;

    columns.forEach((column, index) => {
      const raw = values[index];
      const cell = row.getCell(index + 1);

      if (column.badge) {
        // The raw enumeration picks the tint; the reader sees the label.
        const code = String(raw ?? "");
        cell.value = column.badge === "SEVERITY" ? getSeverityLabel(code) : provincialStatusLabel(code);
      } else {
        cell.value = raw ?? "";
      }

      cell.alignment = {
        vertical: "middle",
        horizontal: column.numeric ? "right" : "left",
      };
      cell.font = column.mono
        ? { size: 9, bold: true, name: "Consolas", color: { argb: FILL.header } }
        : { size: 9, color: { argb: "FF1E293B" } };
      cell.border = { bottom: { style: "hair", color: { argb: FILL.border } } };

      if (column.badge) {
        const code = String(raw ?? "");
        tintCell(cell, column.badge === "SEVERITY" ? SEVERITY_FILL[code] : STATUS_FILL[code]);
      } else if (offset % 2 === 1) {
        // Zebra banding, skipped on badge cells so their tint survives.
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: FILL.band } };
      }
    });
  });

  if (rows.length === 0) {
    const lastColumn = sheet.getColumn(columns.length).letter;
    const emptyRow = headerRow + 1;
    sheet.mergeCells(`A${emptyRow}:${lastColumn}${emptyRow}`);
    const cell = sheet.getCell(`A${emptyRow}`);
    cell.value = "No records matched the filters used for this export.";
    cell.font = { size: 9, italic: true, color: { argb: "FF64748B" } };
    cell.alignment = { vertical: "middle", horizontal: "center" };
    sheet.getRow(emptyRow).height = 22;
  }
}

/**
 * Builds a styled workbook for one provincial dataset. Enumerations are
 * written as their display labels, so the sheet reads the way the console
 * does rather than the way the database stores it.
 */
export async function buildProvincialExcel(context: ProvincialExcelContext): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "ALAB Emergency Dispatch, Telemetry & Citizen Intake System";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet(SHEET_NAME[context.dataset], {
    pageSetup: {
      paperSize: 9,
      orientation: "landscape",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
    },
  });

  const headerRow = drawLetterhead(sheet, context, context.columns.length);
  drawTableHeader(sheet, context.columns, headerRow);
  drawBody(sheet, context, headerRow);

  return Buffer.from(await workbook.xlsx.writeBuffer());
}

export { getFireTypeLabel, getStatusLabel, getSeverityLabel, formatPhilippineDateTime };
