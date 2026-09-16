import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";
import PDFDocument from "pdfkit";

import {
  formatMinutes,
  formatPhilippineDateTime,
  getFireTypeLabel,
  getSeverityLabel,
  getStatusLabel,
} from "./formatters";
import type {
  MunicipalBarangaySummary,
  MunicipalReportDetail,
  MunicipalReportRow,
  MunicipalReportSummary,
} from "./types";

/** Official BFP document palette. Kept in one place so every section matches. */
const COLORS = {
  brand: "#D00F09",
  brandDark: "#991B1B",
  ink: "#0F172A",
  body: "#1E293B",
  muted: "#64748B",
  line: "#CBD5E1",
  hairline: "#E2E8F0",
  panel: "#F8FAFC",
  white: "#FFFFFF",
} as const;

const PAGE = {
  size: "A4" as const,
  margin: 22,
  width: 595.28,
  height: 841.89,
};

const CONTENT_WIDTH = PAGE.width - PAGE.margin * 2;

/** Status colours mirror the on-screen badges so print and screen agree. */
function statusColors(status: string): { fill: string; text: string } {
  switch (status) {
    case "CONFIRMED":
    case "VERIFIED":
      return { fill: "#DC2626", text: COLORS.white };
    case "RESPONDING":
    case "FIRETRUCK_DISPATCHED":
      return { fill: "#EA580C", text: COLORS.white };
    case "RESPONDER_ARRIVED":
    case "UNDER_CONTROL":
      return { fill: "#2563EB", text: COLORS.white };
    case "RESOLVED":
    case "CLOSED":
      return { fill: "#059669", text: COLORS.white };
    case "SUBMITTED":
    case "PENDING_VERIFICATION":
    case "UNDER_VERIFICATION":
      return { fill: "#FEF3C7", text: "#92400E" };
    default:
      return { fill: "#F1F5F9", text: "#475569" };
  }
}

function severityColors(severity: string): { fill: string; text: string } {
  switch (severity) {
    case "CRITICAL":
      return { fill: "#FEE2E2", text: "#991B1B" };
    case "HIGH":
      return { fill: "#FFEDD5", text: "#C2410C" };
    case "MODERATE":
      return { fill: "#FEF3C7", text: "#B45309" };
    case "LOW":
      return { fill: "#DCFCE7", text: "#15803D" };
    default:
      return { fill: "#F1F5F9", text: "#475569" };
  }
}

export type MunicipalPdfKind =
  | "INCIDENT_REGISTER"
  | "MUNICIPAL_SUMMARY"
  | "BARANGAY_BREAKDOWN"
  | "INCIDENT_DOSSIER";

export interface MunicipalPdfContext {
  kind: MunicipalPdfKind;
  municipalityName: string;
  preparedBy: string;
  periodLabel: string;
  filterLabel: string;
  rows: MunicipalReportRow[];
  summary: MunicipalReportSummary | null;
  /** Populated only for the INCIDENT_DOSSIER kind. */
  detail?: MunicipalReportDetail | null;
}

type Doc = PDFKit.PDFDocument;

interface Column {
  label: string;
  width: number;
  align?: "left" | "right";
}

interface Emblems {
  bfp: Buffer | null;
  alab: Buffer | null;
}

/**
 * Emblems are optional: a missing or unreadable file must never fail an
 * official export, so the letterhead falls back to a drawn monogram instead.
 */
async function loadEmblem(fileName: string): Promise<Buffer | null> {
  try {
    return await readFile(path.join(process.cwd(), "public", "images", fileName));
  } catch {
    return null;
  }
}

async function loadEmblems(): Promise<Emblems> {
  const [bfp, alab] = await Promise.all([
    loadEmblem("bfp logo.png"),
    loadEmblem("logo alab.png"),
  ]);
  return { bfp, alab };
}

/** Letterhead geometry. The masthead runs from the top margin to its rule. */
const LETTERHEAD_HEIGHT = 84;
const CREED = ["PREVENT", "PREPARE", "RESPOND", "RECOVER", "TOGETHER"];

function fittedText(doc: Doc, text: string, x: number, y: number, width: number, size: number, font = "Helvetica-Bold", color: string = COLORS.ink) {
  doc.font(font).fontSize(size);
  while (doc.widthOfString(text) > width && size > 5) doc.fontSize(size -= 0.25);
  doc.fillColor(color).text(text, x, y, { width, align: "center", lineBreak: false });
}

function drawHeader(doc: Doc, context: MunicipalPdfContext, emblems: Emblems): void {
  const top = PAGE.margin;
  if (emblems.bfp) doc.image(emblems.bfp, PAGE.margin, top + 1, { fit: [68, 74], align: "center", valign: "center" });
  else fittedText(doc, "BFP", PAGE.margin, top + 22, 68, 20);
  const alabX = PAGE.margin + 77;
  if (emblems.alab) doc.image(emblems.alab, alabX, top + 10, { fit: [84, 58], align: "center", valign: "center" });
  else fittedText(doc, "ALAB", alabX, top + 25, 84, 22, "Helvetica-Bold", COLORS.brandDark);
  doc.save().strokeColor("#9CAFC4").lineWidth(0.7)
    .moveTo(PAGE.margin + 72, top + 6).lineTo(PAGE.margin + 72, top + 70).stroke().restore();

  const wordLeft = PAGE.margin + 172;
  const creedX = PAGE.width - PAGE.margin - 37;
  const wordWidth = creedX - 10 - wordLeft;
  fittedText(doc, "REPUBLIC OF THE PHILIPPINES", wordLeft, top + 4, wordWidth, 6.8, "Helvetica", "#294967");
  fittedText(doc, "DEPARTMENT OF THE INTERIOR AND LOCAL GOVERNMENT", wordLeft, top + 14, wordWidth, 6.5, "Helvetica", "#294967");
  fittedText(doc, "BUREAU OF FIRE PROTECTION", wordLeft, top + 30, wordWidth, 18.5, "Helvetica-Bold", COLORS.brandDark);
  fittedText(doc, `MUNICIPAL FIRE STATION \u2022 ${context.municipalityName.toUpperCase() || "MUNICIPAL"}, ANTIQUE`, wordLeft, top + 52, wordWidth, 10.5, "Helvetica-Bold", "#103E63");
  fittedText(doc, "ALAB Emergency Dispatch, Telemetry & Citizen Intake System", wordLeft, top + 68, wordWidth, 8, "Helvetica", "#103E63");
  doc.save().strokeColor("#9CAFC4").lineWidth(0.7)
    .moveTo(creedX - 4, top + 7).lineTo(creedX - 4, top + 72).stroke().restore();
  doc.font("Helvetica").fontSize(6.2).fillColor("#365775");
  CREED.forEach((word, i) => doc.text(word, creedX + 3, top + 10 + i * 12, { width: 37, lineBreak: false }));
  const ruleY = top + LETTERHEAD_HEIGHT;
  doc.save().strokeColor(COLORS.brand).lineWidth(2).moveTo(PAGE.margin, ruleY).lineTo(PAGE.width - PAGE.margin, ruleY).stroke()
    .strokeColor("#103E63").lineWidth(1).moveTo(PAGE.margin, ruleY + 4).lineTo(PAGE.width - PAGE.margin, ruleY + 4).stroke().restore();
  doc.fillColor("#294967").font("Times-Italic").fontSize(8.5)
    .text("Sa Bagong Pilipinas, Ligtas ang Buhay at Ari-arian", PAGE.margin, ruleY + 10, { width: CONTENT_WIDTH, align: "right", lineBreak: false });
}

/** First safe y for body content: below the letterhead rule and its tagline. */
const HEADER_BOTTOM = PAGE.margin + LETTERHEAD_HEIGHT + 20;

function documentTitle(kind: MunicipalPdfKind): string {
  switch (kind) {
    case "MUNICIPAL_SUMMARY":
      return "MUNICIPAL INCIDENT SUMMARY & PERFORMANCE REPORT";
    case "BARANGAY_BREAKDOWN":
      return "BARANGAY INCIDENT DISTRIBUTION REPORT";
    case "INCIDENT_DOSSIER":
      return "INCIDENT REPORT & CITIZEN INTAKE DOSSIER";
    case "INCIDENT_REGISTER":
    default:
      return "MUNICIPAL INCIDENT REGISTER & DISPATCH AUDIT LOG";
  }
}

function drawTitleBlock(doc: Doc, context: MunicipalPdfContext, recordCount: number): number {
  let y = HEADER_BOTTOM + 12;

  // The title is measured rather than assumed: a long one wraps to a second
  // line, which previously overlapped the municipality row beneath it.
  const titleWidth = CONTENT_WIDTH * 0.62;
  const title = documentTitle(context.kind);

  doc.font("Helvetica-Bold").fontSize(12);
  const titleHeight = doc.heightOfString(title, { width: titleWidth });

  doc.fillColor(COLORS.ink).text(title, PAGE.margin, y, { width: titleWidth });

  doc
    .fillColor(COLORS.muted)
    .font("Helvetica")
    .fontSize(7.5)
    .text(`Generated: ${formatPhilippineDateTime(new Date().toISOString())}`, PAGE.margin + CONTENT_WIDTH * 0.64, y + 1, {
      width: CONTENT_WIDTH * 0.36,
      align: "right",
    })
    .text(`Prepared by: ${context.preparedBy}`, PAGE.margin + CONTENT_WIDTH * 0.64, y + 11, {
      width: CONTENT_WIDTH * 0.36,
      align: "right",
    });

  // Clear whichever column is taller: the wrapped title or the two meta lines.
  y += Math.max(titleHeight, 22) + 6;

  doc
    .fillColor(COLORS.body)
    .font("Helvetica")
    .fontSize(8)
    .text(`Municipality: ${context.municipalityName}    •    Period: ${context.periodLabel}`, PAGE.margin, y, {
      width: CONTENT_WIDTH,
    });

  y += 11;

  const countLabel =
    context.kind === "BARANGAY_BREAKDOWN"
      ? `Barangays Listed: ${recordCount}`
      : `Records Included: ${recordCount}`;

  doc
    .fillColor(COLORS.muted)
    .fontSize(8)
    .text(`${countLabel}    •    Filters: ${context.filterLabel}`, PAGE.margin, y, { width: CONTENT_WIDTH });

  return y + 18;
}

/** Metric tiles across the content width, matching the on-screen summary strip. */
function drawMetricTiles(
  doc: Doc,
  y: number,
  tiles: { label: string; value: string; accent: string; tint: string }[],
): number {
  const gap = 8;
  const tileWidth = (CONTENT_WIDTH - gap * (tiles.length - 1)) / tiles.length;
  const tileHeight = 38;

  tiles.forEach((tile, index) => {
    const x = PAGE.margin + index * (tileWidth + gap);
    doc.save();
    doc.roundedRect(x, y, tileWidth, tileHeight, 4).fillAndStroke(tile.tint, COLORS.hairline);
    doc.restore();

    doc
      .fillColor(tile.accent)
      .font("Helvetica-Bold")
      .fontSize(6.5)
      .text(tile.label.toUpperCase(), x + 8, y + 7, { width: tileWidth - 16, characterSpacing: 0.3 });

    doc
      .fillColor(tile.accent)
      .font("Helvetica-Bold")
      .fontSize(13)
      .text(tile.value, x + 8, y + 18, { width: tileWidth - 16, lineBreak: false });
  });

  return y + tileHeight + 16;
}

function drawSectionHeading(doc: Doc, y: number, text: string): number {
  const match = text.match(/^(\d+)\.\s*(.*)$/);
  doc.save().roundedRect(PAGE.margin, y, CONTENT_WIDTH, 24, 4).fill("#123F63");
  if (match) doc.rect(PAGE.margin, y, 29, 24).fill(COLORS.brandDark);
  doc.restore();
  if (match) doc.fillColor(COLORS.white).font("Helvetica-Bold").fontSize(16)
    .text(match[1], PAGE.margin, y + 4, { width: 29, align: "center", lineBreak: false });
  const left = PAGE.margin + (match ? 40 : 12);
  doc.font("Helvetica-Bold").fontSize(10).fillColor(COLORS.white)
    .text((match?.[2] ?? text).toUpperCase(), left, y + 8, { width: CONTENT_WIDTH - (left - PAGE.margin) - 8, lineBreak: false });
  return y + 30;
}

function drawTableHeader(doc: Doc, y: number, columns: Column[]): number {
  doc.save().rect(PAGE.margin, y, CONTENT_WIDTH, 24).fillAndStroke("#EAF0F5", COLORS.line).restore();
  let x = PAGE.margin;
  for (const column of columns) {
    doc.fillColor("#294967").font("Helvetica-Bold").fontSize(7.4)
      .text(column.label.toUpperCase(), x + 8, y + 8, { width: column.width - 16, align: column.align ?? "left", lineBreak: false });
    x += column.width;
  }
  return y + 24;
}

/** A pill badge drawn inline, sized to its own text. */
function drawBadge(doc: Doc, x: number, y: number, label: string, fill: string, text: string): void {
  doc.font("Helvetica-Bold").fontSize(6.5);
  const width = doc.widthOfString(label) + 10;

  doc.save();
  doc.roundedRect(x, y, width, 11, 2).fill(fill);
  doc.restore();

  doc.fillColor(text).font("Helvetica-Bold").fontSize(6.5).text(label, x, y + 3, {
    width,
    align: "center",
    lineBreak: false,
  });
}

function ensureSpace(
  doc: Doc,
  y: number,
  needed: number,
  context: MunicipalPdfContext,
  emblems: Emblems,
  columns: Column[] | null,
): number {
  const limit = PAGE.height - 92;
  if (y + needed <= limit) return y;

  doc.addPage();
  drawHeader(doc, context, emblems);
  let next = HEADER_BOTTOM + 14;
  if (columns) next = drawTableHeader(doc, next, columns);
  return next;
}

function drawRegisterTable(doc: Doc, startY: number, context: MunicipalPdfContext, emblems: Emblems): number {
  const columns: Column[] = [
    { label: "Reference", width: 84 },
    { label: "Reported At (PHT)", width: 88 },
    { label: "Reporter & Channel", width: 104 },
    { label: "Barangay / Landmark", width: 96 },
    { label: "Type & Danger Level", width: 76 },
    { label: "Status", width: 67 },
  ];

  let y = drawTableHeader(doc, startY, columns);

  for (const row of context.rows) {
    const rowHeight = 30;
    y = ensureSpace(doc, y, rowHeight, context, emblems, columns);

    doc.save();
    doc.rect(PAGE.margin, y, CONTENT_WIDTH, rowHeight).strokeColor(COLORS.hairline).lineWidth(0.5).stroke();
    doc.restore();

    let x = PAGE.margin;

    doc
      .fillColor(COLORS.ink)
      .font("Courier-Bold")
      .fontSize(7)
      .text(row.referenceNumber, x + 5, y + 6, { width: columns[0].width - 10 });
    x += columns[0].width;

    doc
      .fillColor(COLORS.body)
      .font("Helvetica")
      .fontSize(7)
      .text(formatPhilippineDateTime(row.submittedAt), x + 5, y + 6, { width: columns[1].width - 10 });
    x += columns[1].width;

    doc
      .fillColor(COLORS.ink)
      .font("Helvetica-Bold")
      .fontSize(7)
      .text(row.reporterName || "Anonymous Resident", x + 5, y + 5, {
        width: columns[2].width - 10,
        lineBreak: false,
        ellipsis: true,
      });
    doc
      .fillColor(COLORS.muted)
      .font("Helvetica")
      .fontSize(6.5)
      .text(row.reportSource === "ALAB_APP" ? "ALAB Mobile App" : "Emergency Call", x + 5, y + 15, {
        width: columns[2].width - 10,
        lineBreak: false,
      });
    x += columns[2].width;

    doc
      .fillColor(COLORS.ink)
      .font("Helvetica")
      .fontSize(7)
      .text(row.barangay, x + 5, y + 5, { width: columns[3].width - 10, lineBreak: false, ellipsis: true });
    if (row.nearestLandmark) {
      doc
        .fillColor(COLORS.brandDark)
        .fontSize(6.5)
        .text(`Near ${row.nearestLandmark}`, x + 5, y + 15, {
          width: columns[3].width - 10,
          lineBreak: false,
          ellipsis: true,
        });
    }
    x += columns[3].width;

    doc
      .fillColor(COLORS.body)
      .font("Helvetica")
      .fontSize(7)
      .text(getFireTypeLabel(row.fireType), x + 5, y + 5, { width: columns[4].width - 10, lineBreak: false });
    const severity = severityColors(row.severity);
    drawBadge(doc, x + 5, y + 15, getSeverityLabel(row.severity), severity.fill, severity.text);
    x += columns[4].width;

    const status = statusColors(row.status);
    drawBadge(doc, x + 5, y + 5, getStatusLabel(row.status), status.fill, status.text);
    if (row.timeToArrivalMinutes !== null) {
      doc
        .fillColor(COLORS.muted)
        .font("Helvetica")
        .fontSize(6)
        .text(`Arrival: ${formatMinutes(row.timeToArrivalMinutes)}`, x + 5, y + 19, {
          width: columns[5].width - 10,
          lineBreak: false,
        });
    }

    y += rowHeight;
  }

  return y;
}

function wrapLines(doc: Doc, value: string, width: number, size = 9, font = "Helvetica"): string[] {
  doc.font(font).fontSize(size);
  const lines: string[] = [];
  for (const paragraph of String(value).split("\n")) {
    let line = "";
    for (const word of paragraph.split(/\s+/)) {
      if (doc.widthOfString(line ? `${line} ${word}` : word) <= width) {
        line = line ? `${line} ${word}` : word;
      } else {
        if (line) lines.push(line);
        line = "";
        for (const char of word) {
          if (doc.widthOfString(line + char) > width && line) { lines.push(line); line = ""; }
          line += char;
        }
      }
    }
    lines.push(line);
  }
  return lines;
}

function drawSimpleTable(doc: Doc, startY: number, columns: Column[], rows: string[][], context: MunicipalPdfContext, emblems: Emblems): number {
  const total = columns.reduce((sum, col) => sum + col.width, 0);
  columns = columns.map(col => ({ ...col, width: col.width / total * CONTENT_WIDTH }));
  let y = drawTableHeader(doc, startY, columns);
  const lineHeight = 12;
  for (const row of rows) {
    const lines = row.map((cell, i) => wrapLines(doc, cell, columns[i].width - 16, 9, i === 0 ? "Helvetica-Bold" : "Helvetica"));
    while (lines.some(cell => cell.length)) {
      const height = Math.max(...lines.map(cell => cell.length)) * lineHeight + 16;
      // Keep ordinary rows together, but split an exceptionally long row into
      // labelled continuation pages instead of truncating operational notes.
      const maxHeight = PAGE.height - 92 - HEADER_BOTTOM - 44;
      y = ensureSpace(doc, y, Math.min(height, maxHeight), context, emblems, columns);
      const capacity = Math.max(1, Math.floor((PAGE.height - 92 - y - 16) / lineHeight));
      const count = Math.min(Math.max(...lines.map(cell => cell.length)), capacity);
      const rowHeight = count * lineHeight + 16;
      let x = PAGE.margin;
      for (let i = 0; i < columns.length; i++) {
        doc.save().rect(x, y, columns[i].width, rowHeight).lineWidth(0.5).strokeColor(COLORS.line).stroke().restore();
        doc.font(i === 0 ? "Helvetica-Bold" : "Helvetica").fontSize(9).fillColor(COLORS.ink);
        lines[i].splice(0, count).forEach((line, index) => doc.text(line, x + 8, y + 8 + index * lineHeight, { width: columns[i].width - 16, lineBreak: false, align: columns[i].align ?? "left" }));
        x += columns[i].width;
      }
      y += rowHeight;
    }
  }
  return y;
}

function drawSignatureBlock(doc: Doc, y: number, context: MunicipalPdfContext, notice: string, emblems: Emblems): void {
  const nameLines = wrapLines(doc, context.preparedBy, 190, 9, "Helvetica-Bold");
  const noticeLines = wrapLines(doc, notice, CONTENT_WIDTH - 220, 8.5);
  const needed = Math.max(74, 48 + nameLines.length * 12, 24 + noticeLines.length * 11);
  y = ensureSpace(doc, y + 12, needed, context, emblems, null);
  const blockY = Math.max(y, Math.min(668, PAGE.height - 92 - needed));
  doc.save().lineWidth(0.6).strokeColor(COLORS.line).moveTo(PAGE.margin, blockY).lineTo(PAGE.width - PAGE.margin, blockY).stroke().restore();
  doc.fillColor("#365775").font("Helvetica").fontSize(8.5);
  noticeLines.forEach((line, i) => doc.text(line, PAGE.margin, blockY + 15 + i * 11, { lineBreak: false }));
  const signatureX = PAGE.width - PAGE.margin - 190;
  const lineY = blockY + 33;
  doc.save().lineWidth(0.9).strokeColor(COLORS.ink).moveTo(signatureX, lineY).lineTo(signatureX + 190, lineY).stroke().restore();
  doc.fillColor(COLORS.ink).font("Helvetica-Bold").fontSize(9);
  nameLines.forEach((line, i) => doc.text(line, signatureX, lineY + 7 + i * 12, { width: 190, align: "center", lineBreak: false }));
  doc.fillColor("#365775").font("Helvetica").fontSize(7)
    .text("AUTHORIZED OFFICER SIGNATURE", signatureX, lineY + 10 + nameLines.length * 12, { width: 190, align: "center", lineBreak: false });
}

/** Page numbers are stamped last so the total count is known. */
function stampPageNumbers(doc: Doc): void {
  const range = doc.bufferedPageRange();
  for (let i = 0; i < range.count; i++) {
    doc.switchToPage(range.start + i);
    // Absolute footer drawing must not trigger PDFKit's automatic text flow
    // below the page margin (which used to create a footer-only extra page).
    const previousBottom = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;
    doc.fillColor("#6B8297").font("Times-Italic").fontSize(10)
      .text("Kasama sa bawat hamon, para sa ligtas na bukas.", PAGE.margin, PAGE.height - 67, { width: CONTENT_WIDTH, lineBreak: false });
    const bandY = PAGE.height - 34;
    doc.save().rect(0, bandY, PAGE.width, 34).fill("#123F63");
    doc.moveTo(PAGE.width - 177, bandY).lineTo(PAGE.width, bandY).lineTo(PAGE.width, PAGE.height).lineTo(PAGE.width - 195, PAGE.height).closePath().fill(COLORS.brandDark);
    doc.restore();
    doc.fillColor(COLORS.white).font("Helvetica").fontSize(7)
      .text("BUREAU OF FIRE PROTECTION  |  DILG", PAGE.margin, bandY + 12, { lineBreak: false })
      .text("SAVE LIVES AND PROPERTIES", PAGE.width - 177, bandY + 12, { width: 164, align: "center", lineBreak: false });
    doc.fillColor("#6B8297").fontSize(7)
      .text(`ALAB \u2022 Page ${i + 1} of ${range.count}`, PAGE.margin, PAGE.height - 49, { width: CONTENT_WIDTH, align: "right", lineBreak: false });
    doc.page.margins.bottom = previousBottom;
  }
}

function renderRegister(doc: Doc, context: MunicipalPdfContext, emblems: Emblems): void {
  let y = drawTitleBlock(doc, context, context.rows.length);

  const summary = context.summary;
  const confirmed = summary
    ? summary.confirmedIncidents
    : context.rows.filter((r) => ["CONFIRMED", "RESPONDING", "FIRETRUCK_DISPATCHED", "RESOLVED"].includes(r.status)).length;
  const resolved = summary
    ? summary.resolvedIncidents
    : context.rows.filter((r) => ["RESOLVED", "CLOSED"].includes(r.status)).length;

  y = drawMetricTiles(doc, y, [
    { label: "Total Records", value: String(context.rows.length), accent: COLORS.ink, tint: COLORS.panel },
    { label: "Confirmed", value: String(confirmed), accent: COLORS.brandDark, tint: "#FEF2F2" },
    { label: "Resolved", value: String(resolved), accent: "#15803D", tint: "#F0FDF4" },
    {
      label: "Avg Arrival",
      value: summary ? formatMinutes(summary.timingMetrics.avgArrivalMinutes) : "Not recorded",
      accent: "#1D4ED8",
      tint: "#EFF6FF",
    },
  ]);

  y = drawRegisterTable(doc, y, context, emblems);

  drawSignatureBlock(
    doc,
    y,
    context,
    "Register Notice: This document contains authorized BFP incident register data extracted for municipal administrative and response benchmarking purposes.",
    emblems,
  );
}

function renderSummary(doc: Doc, context: MunicipalPdfContext, emblems: Emblems): void {
  const summary = context.summary;
  if (!summary) return;

  let y = drawTitleBlock(doc, context, summary.totalReports);

  y = drawMetricTiles(doc, y, [
    { label: "Total Intake", value: String(summary.totalReports), accent: COLORS.ink, tint: COLORS.panel },
    { label: "Confirmed", value: String(summary.confirmedIncidents), accent: COLORS.brandDark, tint: "#FEF2F2" },
    { label: "Resolved", value: String(summary.resolvedIncidents), accent: "#15803D", tint: "#F0FDF4" },
    {
      label: "Avg Arrival",
      value: formatMinutes(summary.timingMetrics.avgArrivalMinutes),
      accent: "#1D4ED8",
      tint: "#EFF6FF",
    },
  ]);

  y = drawSectionHeading(doc, y, "1. Operational Response Benchmarks");
  y = drawSimpleTable(
    doc,
    y,
    [
      { label: "Benchmark Metric", width: 150 },
      { label: "Observed Average", width: 110 },
      { label: "Sample Coverage", width: 125 },
      { label: "Measured From Intake Alert", width: 130 },
    ],
    [
      [
        "Time to Response Start",
        formatMinutes(summary.timingMetrics.avgResponseMinutes),
        `${summary.timingMetrics.responseRecordsCount} of ${summary.totalReports} incidents`,
        "First dispatch acknowledgement",
      ],
      [
        "Time to Recorded Arrival",
        formatMinutes(summary.timingMetrics.avgArrivalMinutes),
        `${summary.timingMetrics.arrivalRecordsCount} of ${summary.totalReports} incidents`,
        "Earliest verified on-scene stamp",
      ],
      [
        "Time to Resolution",
        formatMinutes(summary.timingMetrics.avgResolutionMinutes),
        `${summary.timingMetrics.resolutionRecordsCount} of ${summary.totalReports} incidents`,
        "Incident marked resolved or closed",
      ],
    ],
    context,
    emblems,
  );

  y += 14;
  y = ensureSpace(doc, y, 90, context, emblems, null);
  y = drawSectionHeading(doc, y, "2. Incident Classifications & Intake Outcomes");

  const statusRows = Object.entries(summary.byStatus).map(([status, count]) => [
    getStatusLabel(status),
    String(count),
    summary.totalReports > 0 ? `${Math.round((Number(count) / summary.totalReports) * 100)}%` : "0%",
  ]);

  y = drawSimpleTable(
    doc,
    y,
    [
      { label: "Status Category", width: 255 },
      { label: "Count", width: 130, align: "right" },
      { label: "Share", width: 130, align: "right" },
    ],
    statusRows,
    context,
    emblems,
  );

  y += 14;
  y = ensureSpace(doc, y, 90, context, emblems, null);
  y = drawSectionHeading(doc, y, "3. Fire Type & Danger Level Distribution");

  const fireTypes = ["HOUSE_BUILDING", "GRASS", "FOREST", "VEHICLE", "OTHER"];
  const severities = ["CRITICAL", "HIGH", "MODERATE", "LOW", "UNKNOWN"];
  const classificationRows = fireTypes.map((fireType, index) => [
    getFireTypeLabel(fireType),
    String(summary.byFireType[fireType] ?? 0),
    getSeverityLabel(severities[index]),
    String(summary.bySeverity[severities[index]] ?? 0),
  ]);

  y = drawSimpleTable(
    doc,
    y,
    [
      { label: "Fire Type", width: 160 },
      { label: "Count", width: 97, align: "right" },
      { label: "Level of Danger", width: 161 },
      { label: "Count", width: 97, align: "right" },
    ],
    classificationRows,
    context,
    emblems,
  );

  y += 14;
  y = ensureSpace(doc, y, 90, context, emblems, null);
  y = drawSectionHeading(doc, y, "4. Barangay Incident Distribution");
  y = drawBarangayTable(doc, y, summary.byBarangay, context, emblems);

  drawSignatureBlock(
    doc,
    y,
    context,
    "Data Definitions: Total intake represents all incident alerts submitted within the designated period. Confirmed incidents include verified, responding, dispatched, on scene, under control, resolved, and closed. Missing durations remain unrecorded and are not substituted with zero.",
    emblems,
  );
}

function drawBarangayTable(
  doc: Doc,
  y: number,
  barangays: MunicipalBarangaySummary[],
  context: MunicipalPdfContext,
  emblems: Emblems,
): number {
  return drawSimpleTable(
    doc,
    y,
    [
      { label: "Barangay", width: 135 },
      { label: "Total", width: 60, align: "right" },
      { label: "Confirmed", width: 70, align: "right" },
      { label: "Resolved", width: 65, align: "right" },
      { label: "Admin", width: 55, align: "right" },
      { label: "Avg Arrival", width: 76, align: "right" },
      { label: "Samples", width: 54, align: "right" },
    ],
    barangays.map((b) => [
      b.barangayName,
      String(b.total),
      String(b.confirmed),
      String(b.resolved),
      String(b.falseReport),
      formatMinutes(b.avgArrivalMinutes),
      String(b.arrivalCount),
    ]),
    context,
    emblems,
  );
}

function renderBarangayBreakdown(doc: Doc, context: MunicipalPdfContext, emblems: Emblems): void {
  const summary = context.summary;
  if (!summary) return;

  let y = drawTitleBlock(doc, context, summary.byBarangay.length);

  const totalIntake = summary.byBarangay.reduce((sum, b) => sum + b.total, 0);
  const withActivity = summary.byBarangay.filter((b) => b.total > 0).length;

  y = drawMetricTiles(doc, y, [
    { label: "Barangays Listed", value: String(summary.byBarangay.length), accent: COLORS.ink, tint: COLORS.panel },
    { label: "With Recorded Intake", value: String(withActivity), accent: COLORS.brandDark, tint: "#FEF2F2" },
    { label: "Total Intake", value: String(totalIntake), accent: "#15803D", tint: "#F0FDF4" },
    {
      label: "Avg Arrival",
      value: formatMinutes(summary.timingMetrics.avgArrivalMinutes),
      accent: "#1D4ED8",
      tint: "#EFF6FF",
    },
  ]);

  y = drawSectionHeading(doc, y, "Barangay Incident Distribution & Response Benchmarks");
  y = drawBarangayTable(doc, y, summary.byBarangay, context, emblems);

  drawSignatureBlock(
    doc,
    y,
    context,
    "Breakdown Notice: Barangay totals cover every barangay on record for this municipality, including those with no incidents during the reporting period.",
    emblems,
  );
}

type DossierField = { label: string; value: string; accent?: string };

function dossierFields(doc: Doc, y: number, fields: DossierField[], context: MunicipalPdfContext, emblems: Emblems): number {
  const width = CONTENT_WIDTH / fields.length;
  const cells = fields.map(field => wrapLines(doc, field.value, width - 28, 10, "Helvetica-Bold"));
  while (cells.some(lines => lines.length)) {
    const requested = Math.max(...cells.map(lines => lines.length)) * 13 + 25;
    const maxHeight = PAGE.height - 92 - HEADER_BOTTOM - 14;
    y = ensureSpace(doc, y, Math.min(requested, maxHeight), context, emblems, null);
    const count = Math.min(Math.max(...cells.map(lines => lines.length)), Math.max(1, Math.floor((PAGE.height - 92 - y - 25) / 13)));
    const height = count * 13 + 25;
    fields.forEach((field, i) => {
      const x = PAGE.margin + i * width;
      doc.save().rect(x, y, width, height).lineWidth(0.6).strokeColor("#B8C8D9").stroke().restore();
      doc.fillColor("#365775").font("Helvetica-Bold").fontSize(7.8).text(field.label.toUpperCase(), x + 14, y + 8, { width: width - 28, lineBreak: false });
      doc.fillColor(field.accent ?? COLORS.ink).font("Helvetica-Bold").fontSize(10);
      cells[i].splice(0, count).forEach((line, index) => doc.text(line, x + 14, y + 21 + index * 13, { width: width - 28, lineBreak: false }));
    });
    y += height;
  }
  return y;
}

function renderDossier(doc: Doc, context: MunicipalPdfContext, emblems: Emblems): void {
  const report = context.detail;
  if (!report) return;
  let y = HEADER_BOTTOM + 11;
  const titleWidth = 206;
  doc.save().roundedRect(PAGE.margin, y, CONTENT_WIDTH, 68, 4).fill("#EEF2F6")
    .rect(PAGE.margin, y, titleWidth, 68).fill(COLORS.brandDark).restore();
  doc.fillColor(COLORS.white).font("Helvetica-Bold").fontSize(19)
    .text("INCIDENT REPORT", PAGE.margin + 17, y + 18, { width: titleWidth - 25, lineBreak: false });
  doc.font("Helvetica").fontSize(7).text("CITIZEN INTAKE AND DISPATCH RECORD", PAGE.margin + 17, y + 44, { width: titleWidth - 25, lineBreak: false });
  const referenceX = PAGE.margin + titleWidth + 13;
  const referenceWidth = 186;
  doc.font("Helvetica-Bold").fontSize(8).fillColor("#365775").text("REFERENCE NO.", referenceX, y + 10, { lineBreak: false });
  doc.font("Helvetica-Bold").fontSize(12).fillColor(COLORS.brandDark).text(`#${report.referenceNumber}`, referenceX, y + 24, { width: referenceWidth, lineBreak: false });
  const status = statusColors(report.status), severity = severityColors(report.severity);
  drawBadge(doc, referenceX, y + 47, getStatusLabel(report.status), status.fill, status.text);
  doc.font("Helvetica-Bold").fontSize(6.5);
  drawBadge(doc, referenceX + doc.widthOfString(getStatusLabel(report.status)) + 20, y + 47, getSeverityLabel(report.severity), severity.fill, severity.text);
  const metaX = referenceX + referenceWidth + 8;
  const metaWidth = PAGE.width - PAGE.margin - metaX - 8;
  doc.save().strokeColor("#A9BDD1").lineWidth(0.7).moveTo(metaX - 8, y + 9).lineTo(metaX - 8, y + 59).stroke().restore();
  doc.font("Helvetica-Bold").fontSize(6.8).fillColor("#365775").text("REPORTED (PHT)", metaX, y + 10, { width: metaWidth, lineBreak: false });
  doc.font("Helvetica").fontSize(7.5).text(formatPhilippineDateTime(report.submittedAt), metaX, y + 20, { width: metaWidth });
  doc.font("Helvetica-Bold").fontSize(6.8).text("STATION JURISDICTION", metaX, y + 42, { width: metaWidth, lineBreak: false });
  doc.font("Helvetica").fontSize(7.5).text(`${context.municipalityName} Fire Station`, metaX, y + 52, { width: metaWidth });
  y += 80;
  y = drawSectionHeading(doc, y, "1. Reporting citizen & intake telemetry");
  y = dossierFields(doc, y, [
    { label: "Reporter full name", value: report.reporterName || "Not recorded" },
    { label: "Contact phone number", value: report.reporterPhone || "Not recorded" },
  ], context, emblems);
  y = dossierFields(doc, y, [
    { label: "Intake channel", value: report.reportSource === "ALAB_APP" ? "ALAB Resident Emergency Mobile App" : "Emergency phone call" },
    { label: "Barangay & recorded jurisdiction", value: `Brgy. ${report.barangay}, ${context.municipalityName}` },
  ], context, emblems);
  y = dossierFields(doc, y, [{ label: "Nearest landmark / fire access route", value: report.nearestLandmark || report.addressLabel || "Not recorded", accent: COLORS.brandDark }], context, emblems);
  const coordinates = Number.isFinite(report.latitude) && Number.isFinite(report.longitude)
    ? `Lat ${report.latitude.toFixed(6)}\u00b0, Lon ${report.longitude.toFixed(6)}\u00b0` : "Coordinates not recorded";
  y = dossierFields(doc, y, [{
    label: "Geolocation coordinates & verification accuracy",
    value: [coordinates, report.locationAccuracyMeters != null ? `GPS accuracy \u00b1${report.locationAccuracyMeters} m` : null, report.locationMethod ? `Method: ${report.locationMethod}` : null].filter(Boolean).join("  \u2022  "),
  }], context, emblems);
  y = dossierFields(doc, y, [{ label: "Citizen eyewitness narrative & intake remarks", value: report.description || "No description provided." }], context, emblems);
  y = ensureSpace(doc, y + 13, 111, context, emblems, null);
  y = drawSectionHeading(doc, y, "2. Operational response benchmarks & incident milestones");
  const milestones = [
    { label: "ALERT RECEIVED", value: formatPhilippineDateTime(report.submittedAt), ink: "#123F63", fill: "#F0F4F8" },
    { label: "RESPONSE STARTED", value: report.responseStartedAt ? formatPhilippineDateTime(report.responseStartedAt) : "Not recorded", ink: "#BC3B11", fill: "#FFF4EC" },
    { label: "RECORDED ARRIVAL", value: report.recordedArrivalAt ? formatPhilippineDateTime(report.recordedArrivalAt) : "Not recorded", ink: "#1D4ED8", fill: "#EFF5FF" },
    { label: "INCIDENT RESOLVED", value: report.resolvedAt ? formatPhilippineDateTime(report.resolvedAt) : "In progress", ink: "#087843", fill: "#EFF9F3" },
  ];
  const tileWidth = (CONTENT_WIDTH - 18) / 4;
  milestones.forEach((tile, i) => {
    const x = PAGE.margin + i * (tileWidth + 6);
    doc.save().roundedRect(x, y, tileWidth, 59, 4).fillAndStroke(tile.fill, "#D7E2EC").restore();
    doc.fillColor(tile.ink).font("Helvetica-Bold").fontSize(7.2).text(tile.label, x + 10, y + 10, { width: tileWidth - 20, lineBreak: false });
    doc.fontSize(11.5).text(tile.value, x + 10, y + 26, { width: tileWidth - 20, lineGap: 1 });
  });
  y += 66;
  doc.font("Helvetica").fontSize(7.7).fillColor("#365775").text(
    `Elapsed to response: ${formatMinutes(report.timeToResponseMinutes)}   |   Elapsed to arrival: ${formatMinutes(report.timeToArrivalMinutes)}   |   Total duration: ${formatMinutes(report.timeToResolutionMinutes)}`,
    PAGE.margin, y, { width: CONTENT_WIDTH });
  y += 22;
  let section = 3;
  if (report.dispatches?.length) {
    y = ensureSpace(doc, y, 84, context, emblems, null);
    y = drawSectionHeading(doc, y, `${section++}. Dispatched fire stations & personnel`);
    y = drawSimpleTable(doc, y, [
      { label: "Station", width: 125 }, { label: "Dispatch status", width: 95 }, { label: "Dispatched (PHT)", width: 120 }, { label: "Responding crew", width: 175 },
    ], report.dispatches.map(d => [d.stationName, getStatusLabel(d.status), formatPhilippineDateTime(d.dispatchedAt), d.recipients?.map(r => `${r.name} (${r.onSceneAt ? "On scene" : getStatusLabel(r.status)})`).join(", ") || "Not recorded"]), context, emblems);
    y += 13;
  }
  y = ensureSpace(doc, y, 84, context, emblems, null);
  y = drawSectionHeading(doc, y, `${section}. Chronological operational timeline`);
  y = drawSimpleTable(doc, y, [
    { label: "Timestamp (PHT)", width: 150 }, { label: "Operational stage", width: 140 }, { label: "Event notes & status", width: 225 },
  ], report.timeline?.length ? report.timeline.map(event => [formatPhilippineDateTime(event.timestamp), getStatusLabel(event.stage), event.notes || "No additional notes recorded."]) : [["Not recorded", getStatusLabel(report.status), "No operational timeline events recorded."]], context, emblems);
  drawSignatureBlock(doc, y, context, "Certification: This report is generated from recorded citizen intake details and operational milestones captured by the ALAB Emergency System.", emblems);
}

/**
 * Builds the official PDF as a vector document, so the text stays selectable and
 * searchable rather than being flattened into an image.
 */
export async function buildMunicipalReportPdf(context: MunicipalPdfContext): Promise<Buffer> {
  const emblems = await loadEmblems();

  const doc = new PDFDocument({
    size: PAGE.size,
    margin: PAGE.margin,
    bufferPages: true,
    info: {
      Title: documentTitle(context.kind),
      Author: `${context.preparedBy} — BFP ${context.municipalityName}`,
      Subject: `ALAB municipal incident records — ${context.periodLabel}`,
      Creator: "ALAB Emergency Dispatch, Telemetry & Citizen Intake System",
    },
  });

  const chunks: Buffer[] = [];
  doc.on("data", (chunk: Buffer) => chunks.push(chunk));
  const finished = new Promise<void>((resolve, reject) => {
    doc.on("end", () => resolve());
    doc.on("error", reject);
  });

  drawHeader(doc, context, emblems);

  if (context.kind === "INCIDENT_REGISTER") {
    renderRegister(doc, context, emblems);
  } else if (context.kind === "MUNICIPAL_SUMMARY") {
    renderSummary(doc, context, emblems);
  } else if (context.kind === "INCIDENT_DOSSIER") {
    renderDossier(doc, context, emblems);
  } else {
    renderBarangayBreakdown(doc, context, emblems);
  }

  stampPageNumbers(doc);
  doc.end();
  await finished;

  return Buffer.concat(chunks);
}
