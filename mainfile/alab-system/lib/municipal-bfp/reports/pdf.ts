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
  MunicipalDispatchRecipient,
  MunicipalDispatchRecord,
  MunicipalReportDetail,
  MunicipalReportRow,
  MunicipalReportSummary,
  MunicipalTimelineEvent,
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
  margin: 40,
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
const SEAL_SIZE = 62;
const LETTERHEAD_HEIGHT = 72;
const CREED = ["PREVENT", "PREPARE", "RESPOND", "RECOVER", "TOGETHER"];
const CREED_WIDTH = 62;

function drawHeader(doc: Doc, context: MunicipalPdfContext, emblems: Emblems): void {
  const top = PAGE.margin;
  const sealY = top + (LETTERHEAD_HEIGHT - SEAL_SIZE) / 2;

  // Both seals sit at the left; the creed column is reserved at the right, and
  // the wording is centred in the space that remains between them.
  if (emblems.bfp) {
    doc.image(emblems.bfp, PAGE.margin, sealY, { fit: [SEAL_SIZE, SEAL_SIZE], align: "center", valign: "center" });
  } else {
    const r = SEAL_SIZE / 2;
    doc.save();
    doc.circle(PAGE.margin + r, sealY + r, r).lineWidth(1.5).strokeColor(COLORS.brandDark).stroke();
    doc.fillColor(COLORS.brandDark).font("Helvetica-Bold").fontSize(13)
      .text("BFP", PAGE.margin, sealY + r - 6, { width: SEAL_SIZE, align: "center" });
    doc.restore();
  }

  const alabX = PAGE.margin + SEAL_SIZE + 12;
  if (emblems.alab) {
    doc.image(emblems.alab, alabX, sealY + 4, { fit: [SEAL_SIZE + 24, SEAL_SIZE - 8], align: "center", valign: "center" });
  }

  // Thin divider between the emblem pair and the wording.
  const dividerX = alabX + SEAL_SIZE + 30;
  doc.save();
  doc.lineWidth(0.75).strokeColor(COLORS.hairline);
  doc.moveTo(dividerX, sealY + 4).lineTo(dividerX, sealY + SEAL_SIZE - 4).stroke();
  doc.restore();

  const wordLeft = dividerX + 10;
  const wordWidth = PAGE.width - PAGE.margin - CREED_WIDTH - 10 - wordLeft;

  doc
    .fillColor(COLORS.muted)
    .font("Helvetica")
    .fontSize(6.8)
    .text("REPUBLIC OF THE PHILIPPINES  •  DEPARTMENT OF THE INTERIOR AND LOCAL GOVERNMENT", wordLeft, top + 6, {
      width: wordWidth,
      align: "center",
      characterSpacing: 0.3,
    });

  doc
    .fillColor(COLORS.brandDark)
    .font("Helvetica-Bold")
    .fontSize(17)
    .text("BUREAU OF FIRE PROTECTION", wordLeft, top + 17, {
      width: wordWidth,
      align: "center",
      characterSpacing: 0.4,
    });

  doc
    .fillColor(COLORS.ink)
    .font("Helvetica-Bold")
    .fontSize(10.5)
    .text(
      `MUNICIPAL FIRE STATION  •  ${(context.municipalityName || "MUNICIPAL").toUpperCase()}, ANTIQUE`,
      wordLeft,
      top + 38,
      { width: wordWidth, align: "center" },
    );

  doc
    .fillColor("#2563EB")
    .font("Helvetica")
    .fontSize(8)
    .text("ALAB Emergency Dispatch, Telemetry & Citizen Intake System", wordLeft, top + 52, {
      width: wordWidth,
      align: "center",
    });

  // Creed column, one word per line, flush right.
  const creedX = PAGE.width - PAGE.margin - CREED_WIDTH;
  doc.fillColor(COLORS.muted).font("Helvetica").fontSize(7);
  CREED.forEach((word, i) => {
    doc.text(word, creedX, top + 4 + i * 10.5, { width: CREED_WIDTH, align: "right", characterSpacing: 0.3 });
  });

  // Tricolour rule: the Philippine flag's blue, red and gold.
  const ruleY = top + LETTERHEAD_HEIGHT;
  doc.save();
  doc.lineWidth(2.4).strokeColor("#1E3A8A");
  doc.moveTo(PAGE.margin, ruleY).lineTo(PAGE.width - PAGE.margin, ruleY).stroke();
  doc.lineWidth(1.4).strokeColor(COLORS.brand);
  doc.moveTo(PAGE.margin, ruleY + 3.2).lineTo(PAGE.width - PAGE.margin, ruleY + 3.2).stroke();
  doc.restore();

  doc
    .fillColor(COLORS.ink)
    .font("Helvetica-Oblique")
    .fontSize(7.5)
    .text(
      `Sa Bagong Pilipinas, Ligtas ang Buhay at Ari-arian`,
      PAGE.margin,
      ruleY + 8,
      { width: CONTENT_WIDTH, align: "right" },
    );
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
  doc
    .fillColor(COLORS.ink)
    .font("Helvetica-Bold")
    .fontSize(8.5)
    .text(text.toUpperCase(), PAGE.margin, y, { width: CONTENT_WIDTH, characterSpacing: 0.3 });
  return y + 13;
}

function drawTableHeader(doc: Doc, y: number, columns: Column[]): number {
  const headerHeight = 18;

  doc.save();
  doc.rect(PAGE.margin, y, CONTENT_WIDTH, headerHeight).fillAndStroke(COLORS.panel, COLORS.line);
  doc.restore();

  let x = PAGE.margin;
  for (const column of columns) {
    doc
      .fillColor("#334155")
      .font("Helvetica-Bold")
      .fontSize(6.5)
      .text(column.label.toUpperCase(), x + 5, y + 6, {
        width: column.width - 10,
        align: column.align ?? "left",
        lineBreak: false,
      });
    x += column.width;
  }

  return y + headerHeight;
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
  const limit = PAGE.height - PAGE.margin - 40;
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
    { label: "Type & Severity", width: 76 },
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

function drawSimpleTable(
  doc: Doc,
  startY: number,
  columns: Column[],
  rows: string[][],
  context: MunicipalPdfContext,
  emblems: Emblems,
): number {
  let y = drawTableHeader(doc, startY, columns);

  for (const row of rows) {
    const rowHeight = 17;
    y = ensureSpace(doc, y, rowHeight, context, emblems, columns);

    doc.save();
    doc.rect(PAGE.margin, y, CONTENT_WIDTH, rowHeight).strokeColor(COLORS.hairline).lineWidth(0.5).stroke();
    doc.restore();

    let x = PAGE.margin;
    row.forEach((cell, index) => {
      const column = columns[index];
      doc
        .fillColor(index === 0 ? COLORS.ink : COLORS.body)
        .font(index === 0 ? "Helvetica-Bold" : "Helvetica")
        .fontSize(7)
        .text(cell, x + 5, y + 5, {
          width: column.width - 10,
          align: column.align ?? "left",
          lineBreak: false,
          ellipsis: true,
        });
      x += column.width;
    });

    y += rowHeight;
  }

  return y;
}

function drawSignatureBlock(doc: Doc, y: number, context: MunicipalPdfContext, notice: string): void {
  const blockY = Math.min(y + 24, PAGE.height - PAGE.margin - 74);

  doc.save();
  doc.lineWidth(0.5).strokeColor(COLORS.line);
  doc.moveTo(PAGE.margin, blockY).lineTo(PAGE.width - PAGE.margin, blockY).stroke();
  doc.restore();

  doc
    .fillColor(COLORS.muted)
    .font("Helvetica")
    .fontSize(7)
    .text(notice, PAGE.margin, blockY + 10, { width: CONTENT_WIDTH * 0.58 });

  const signatureWidth = 190;
  const signatureX = PAGE.width - PAGE.margin - signatureWidth;
  const lineY = blockY + 44;

  doc.save();
  doc.lineWidth(1).strokeColor(COLORS.ink);
  doc.moveTo(signatureX, lineY).lineTo(signatureX + signatureWidth, lineY).stroke();
  doc.restore();

  doc
    .fillColor(COLORS.ink)
    .font("Helvetica-Bold")
    .fontSize(8)
    .text(context.preparedBy, signatureX, lineY + 5, { width: signatureWidth, align: "center" });

  doc
    .fillColor(COLORS.muted)
    .font("Helvetica")
    .fontSize(6.5)
    .text("AUTHORIZED OFFICER SIGNATURE", signatureX, lineY + 16, {
      width: signatureWidth,
      align: "center",
      characterSpacing: 0.3,
    });
}

/** Page numbers are stamped last so the total count is known. */
function stampPageNumbers(doc: Doc): void {
  const range = doc.bufferedPageRange();
  for (let i = 0; i < range.count; i += 1) {
    doc.switchToPage(range.start + i);
    doc
      .fillColor(COLORS.muted)
      .font("Helvetica")
      .fontSize(6.5)
      .text(
        `Page ${i + 1} of ${range.count}  •  Generated by the ALAB Emergency System`,
        PAGE.margin,
        PAGE.height - PAGE.margin + 6,
        { width: CONTENT_WIDTH, align: "center", lineBreak: false },
      );
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
  y = drawSectionHeading(doc, y, "3. Fire Type & Severity Distribution");

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
      { label: "Calculated Severity", width: 161 },
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
  );
}

/** Label/value pairs for the intake panel, laid out in two columns. */
function drawFieldGrid(
  doc: Doc,
  y: number,
  fields: { label: string; value: string; span?: boolean; accent?: string }[],
): number {
  const gap = 12;
  const colWidth = (CONTENT_WIDTH - 24 - gap) / 2;
  let cursorY = y;
  let column = 0;
  let rowHeight = 0;

  for (const field of fields) {
    const width = field.span ? CONTENT_WIDTH - 24 : colWidth;
    if (field.span && column === 1) {
      cursorY += rowHeight + 8;
      column = 0;
      rowHeight = 0;
    }

    const x = PAGE.margin + 12 + (column === 1 ? colWidth + gap : 0);

    doc
      .fillColor(COLORS.muted)
      .font("Helvetica-Bold")
      .fontSize(6.2)
      .text(field.label.toUpperCase(), x, cursorY, { width, characterSpacing: 0.3 });

    doc
      .fillColor(field.accent ?? COLORS.ink)
      .font("Helvetica-Bold")
      .fontSize(8)
      .text(field.value, x, cursorY + 9, { width });

    const used = 9 + doc.heightOfString(field.value, { width, lineGap: 0 });
    rowHeight = Math.max(rowHeight, used);

    if (field.span) {
      cursorY += rowHeight + 8;
      column = 0;
      rowHeight = 0;
    } else if (column === 1) {
      cursorY += rowHeight + 8;
      column = 0;
      rowHeight = 0;
    } else {
      column = 1;
    }
  }

  if (column === 1) cursorY += rowHeight + 8;
  return cursorY;
}

function renderDossier(doc: Doc, context: MunicipalPdfContext, emblems: Emblems): void {
  const report = context.detail;
  if (!report) return;

  let y = HEADER_BOTTOM + 12;

  // Reference banner with the incident's current standing.
  doc.save();
  doc.roundedRect(PAGE.margin, y, CONTENT_WIDTH, 44, 5).fillAndStroke(COLORS.panel, COLORS.hairline);
  doc.rect(PAGE.margin, y, 4, 44).fill(COLORS.brand);
  doc.restore();

  doc
    .fillColor(COLORS.brand)
    .font("Courier-Bold")
    .fontSize(11)
    .text(`REFERENCE #${report.referenceNumber}`, PAGE.margin + 14, y + 9, { width: CONTENT_WIDTH * 0.55 });

  const status = statusColors(report.status);
  const severity = severityColors(report.severity);
  drawBadge(doc, PAGE.margin + 14, y + 25, getStatusLabel(report.status), status.fill, status.text);
  doc.font("Helvetica-Bold").fontSize(6.5);
  const statusWidth = doc.widthOfString(getStatusLabel(report.status)) + 10;
  drawBadge(doc, PAGE.margin + 14 + statusWidth + 5, y + 25, getSeverityLabel(report.severity), severity.fill, severity.text);

  doc
    .fillColor(COLORS.muted)
    .font("Helvetica")
    .fontSize(7)
    .text(`Reported: ${formatPhilippineDateTime(report.submittedAt)}`, PAGE.margin + CONTENT_WIDTH * 0.58, y + 11, {
      width: CONTENT_WIDTH * 0.42 - 14,
      align: "right",
    })
    .text(`Station Jurisdiction: ${context.municipalityName} Fire Station`, PAGE.margin + CONTENT_WIDTH * 0.58, y + 23, {
      width: CONTENT_WIDTH * 0.42 - 14,
      align: "right",
    });

  y += 56;

  y = drawSectionHeading(doc, y, "1. Reporting Citizen & Intake Telemetry");

  const panelTop = y;
  const fieldsStart = y + 10;
  const fieldsEnd = drawFieldGrid(doc, fieldsStart, [
    { label: "Reporter Full Name", value: report.reporterName || "Anonymous Resident / App Intake" },
    { label: "Contact Phone Number", value: report.reporterPhone || "Protected — held on file" },
    {
      label: "Intake Channel & Transmission",
      value:
        report.reportSource === "ALAB_APP"
          ? "ALAB Resident Emergency Mobile App (Encrypted GPS Stream)"
          : "Direct Emergency Phone Dispatch Call",
    },
    { label: "Barangay & Recorded Jurisdiction", value: `Brgy. ${report.barangay}, ${context.municipalityName}` },
    {
      label: "Nearest Landmark / Fire Access Route",
      value: report.nearestLandmark || report.addressLabel || "No landmark tag provided during intake",
      span: true,
      accent: COLORS.brandDark,
    },
    {
      label: "Geolocation Coordinates & Verification Accuracy",
      value: [
        report.latitude && report.longitude
          ? `Lat ${Number(report.latitude).toFixed(6)}°, Lon ${Number(report.longitude).toFixed(6)}°`
          : "Recorded via barangay geocode boundary",
        report.locationAccuracyMeters ? `GPS accuracy ±${report.locationAccuracyMeters} m` : null,
        report.locationMethod ? `Method: ${report.locationMethod}` : null,
      ]
        .filter(Boolean)
        .join("  •  "),
      span: true,
    },
    {
      label: "Citizen Eyewitness Narrative & Intake Remarks",
      value: report.description ? `"${report.description}"` : "No description provided.",
      span: true,
    },
  ]);

  doc.save();
  doc
    .roundedRect(PAGE.margin, panelTop, CONTENT_WIDTH, fieldsEnd - panelTop + 6, 5)
    .strokeColor("#FECACA")
    .lineWidth(1)
    .stroke();
  doc.restore();

  y = fieldsEnd + 18;

  // Milestones. Section numbers are computed so a hidden block leaves no gap.
  let sectionNumber = 2;
  y = ensureSpace(doc, y, 80, context, emblems, null);
  y = drawSectionHeading(doc, y, `${sectionNumber}. Operational Response Benchmarks & Incident Milestones`);
  sectionNumber += 1;

  y = drawMetricTiles(doc, y, [
    {
      label: "Alert Received",
      value: report.submittedAt ? formatPhilippineDateTime(report.submittedAt) : "Not recorded",
      accent: COLORS.ink,
      tint: COLORS.panel,
    },
    {
      label: "Response Started",
      value: report.responseStartedAt ? formatPhilippineDateTime(report.responseStartedAt) : "Not recorded",
      accent: "#C2410C",
      tint: "#FFF7ED",
    },
    {
      label: "Recorded Arrival",
      value: report.recordedArrivalAt ? formatPhilippineDateTime(report.recordedArrivalAt) : "Not recorded",
      accent: "#1D4ED8",
      tint: "#EFF6FF",
    },
    {
      label: "Incident Resolved",
      value: report.resolvedAt ? formatPhilippineDateTime(report.resolvedAt) : "In progress",
      accent: "#15803D",
      tint: "#F0FDF4",
    },
  ]);

  doc
    .fillColor(COLORS.muted)
    .font("Helvetica")
    .fontSize(7)
    .text(
      `Elapsed to response: ${formatMinutes(report.timeToResponseMinutes)}    •    Elapsed to arrival: ${formatMinutes(report.timeToArrivalMinutes)}    •    Total duration: ${formatMinutes(report.timeToResolutionMinutes)}`,
      PAGE.margin,
      y - 8,
      { width: CONTENT_WIDTH },
    );

  y += 14;

  if (report.dispatches && report.dispatches.length > 0) {
    y = ensureSpace(doc, y, 70, context, emblems, null);
    y = drawSectionHeading(doc, y, `${sectionNumber}. Dispatched Fire Stations & Personnel`);
    sectionNumber += 1;

    y = drawSimpleTable(
      doc,
      y,
      [
        { label: "Station", width: 130 },
        { label: "Dispatch Status", width: 95 },
        { label: "Dispatched At (PHT)", width: 120 },
        { label: "Responding Crew", width: 170 },
      ],
      report.dispatches.map((d: MunicipalDispatchRecord) => [
        d.stationName,
        getStatusLabel(d.status),
        formatPhilippineDateTime(d.dispatchedAt),
        d.recipients && d.recipients.length > 0
          ? d.recipients
              .map((r: MunicipalDispatchRecipient) => `${r.name} (${r.onSceneAt ? "On Scene" : getStatusLabel(r.status)})`)
              .join(", ")
          : "Station Unit Team",
      ]),
      context,
      emblems,
    );
    y += 14;
  }

  if (report.timeline && report.timeline.length > 0) {
    y = ensureSpace(doc, y, 70, context, emblems, null);
    y = drawSectionHeading(doc, y, `${sectionNumber}. Chronological Operational Timeline`);

    y = drawSimpleTable(
      doc,
      y,
      [
        { label: "Timestamp (PHT)", width: 150 },
        { label: "Operational Stage", width: 150 },
        { label: "Event Notes & Status", width: 215 },
      ],
      report.timeline.map((event: MunicipalTimelineEvent) => [
        formatPhilippineDateTime(event.timestamp),
        getStatusLabel(event.stage),
        event.notes || `Operational transition to ${getStatusLabel(event.stage)}`,
      ]),
      context,
      emblems,
    );
  }

  drawSignatureBlock(
    doc,
    y,
    context,
    "Certification: This official report document is generated from audited intake records and operational milestones captured by the ALAB Emergency System.",
  );
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
