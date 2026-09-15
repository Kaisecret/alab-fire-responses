import { NextRequest, NextResponse } from "next/server";

import {
  requireMunicipalAdmin,
  isAuthorizationResponse,
} from "../../../../../lib/municipal-bfp/auth";
import { parseMunicipalReportFilters } from "../../../../../lib/municipal-bfp/reports/filters";
import { exportMunicipalDataset } from "../../../../../lib/municipal-bfp/reports/exports";
import type {
  MunicipalExportDataset,
  MunicipalExportFormat,
  MunicipalExportScope,
  MunicipalReportFilters,
} from "../../../../../lib/municipal-bfp/reports/types";

export const runtime = "nodejs";

const ALLOWED_DATASETS = new Set<MunicipalExportDataset>([
  "INCIDENT_REGISTER",
  "MUNICIPAL_SUMMARY",
  "BARANGAY_BREAKDOWN",
  "INCIDENT_DOSSIER",
]);

const ALLOWED_SCOPES = new Set<MunicipalExportScope>([
  "ALL_MATCHING",
  "SELECTED",
  "CURRENT_PAGE",
]);

const ALLOWED_FORMATS = new Set<MunicipalExportFormat>(["CSV", "PDF", "XLSX"]);

const XLSX_CONTENT_TYPE =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

async function handleExport(
  request: NextRequest,
  datasetInput: unknown,
  scopeInput: unknown,
  selectedIdsInput: unknown,
  filters: MunicipalReportFilters,
  formatInput: unknown,
  reportIdInput: unknown,
) {
  const admin = await requireMunicipalAdmin(request);
  if (isAuthorizationResponse(admin)) {
    return admin;
  }

  // Reject preview synthetic identity in production export operations
  if (
    admin.email === "preview@municipal-bfp.local" ||
    admin.userId === "afbc9f03-312c-4208-a15c-05f87a3ad6fe"
  ) {
    return NextResponse.json(
      {
        error:
          "Official exports cannot be generated with a preview identity. Please sign in with an assigned Municipal Administrator account.",
      },
      { status: 403 },
    );
  }

  // Reject required password update
  if (admin.mustChangePassword) {
    return NextResponse.json(
      {
        error:
          "You must update your temporary password before generating official exports.",
      },
      { status: 403 },
    );
  }

  // Reject inactive accounts
  if (admin.accountStatus !== "ACTIVE") {
    return NextResponse.json(
      { error: "Your account is not active." },
      { status: 403 },
    );
  }

  const dataset = String(datasetInput || "INCIDENT_REGISTER") as MunicipalExportDataset;
  if (!ALLOWED_DATASETS.has(dataset)) {
    return NextResponse.json({ error: "INVALID_DATASET: Choose an authorized dataset." }, { status: 400 });
  }

  const scope = String(scopeInput || "ALL_MATCHING") as MunicipalExportScope;
  if (!ALLOWED_SCOPES.has(scope)) {
    return NextResponse.json({ error: "INVALID_SCOPE: Choose an authorized scope." }, { status: 400 });
  }

  const format = String(formatInput || "CSV").toUpperCase() as MunicipalExportFormat;
  if (!ALLOWED_FORMATS.has(format)) {
    return NextResponse.json({ error: "INVALID_FORMAT: Choose CSV or PDF." }, { status: 400 });
  }

  let selectedIds: string[] | undefined;
  if (Array.isArray(selectedIdsInput)) {
    selectedIds = selectedIdsInput.map(String).filter(Boolean);
  } else if (typeof selectedIdsInput === "string" && selectedIdsInput.trim()) {
    selectedIds = selectedIdsInput
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }

  try {
    const result = await exportMunicipalDataset(admin, filters, {
      dataset,
      scope,
      format,
      selectedIds,
      reportId: typeof reportIdInput === "string" ? reportIdInput : undefined,
      preparedBy: admin.rankOrPosition
        ? `${admin.displayName} (${admin.rankOrPosition})`
        : admin.displayName,
    });

    const headers = {
      "Content-Disposition": `attachment; filename="${result.fileName}"`,
      "X-Export-Row-Count": String(result.rowCount),
      "Cache-Control": "private, no-cache, no-store, must-revalidate",
      Pragma: "no-cache",
      Expires: "0",
    };

    if (format === "PDF") {
      if (!result.pdfContent) {
        throw new Error("Export produced no PDF document.");
      }
      return new NextResponse(new Uint8Array(result.pdfContent), {
        status: 200,
        headers: { ...headers, "Content-Type": "application/pdf" },
      });
    }

    if (format === "XLSX") {
      if (!result.xlsxContent) {
        throw new Error("Export produced no Excel workbook.");
      }
      return new NextResponse(new Uint8Array(result.xlsxContent), {
        status: 200,
        headers: { ...headers, "Content-Type": XLSX_CONTENT_TYPE },
      });
    }

    return new NextResponse(result.csvContent, {
      status: 200,
      headers: { ...headers, "Content-Type": "text/csv; charset=utf-8" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Export failed.";
    const status =
      message.startsWith("ROW_LIMIT_EXCEEDED") ||
      message.startsWith("NO_SELECTION") ||
      message.startsWith("INVALID_")
        ? 400
        : message.startsWith("UNAUTHORIZED") || message.startsWith("CROSS_MUNICIPALITY_FORBIDDEN")
          ? 403
          : 500;

    if (status === 500) console.error("Municipal export failed", error);
    return NextResponse.json({ error: status === 500 ? "This export could not be generated. Please try again." : message }, { status });
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  let filters: MunicipalReportFilters;
  try {
    filters = parseMunicipalReportFilters(searchParams);
  } catch (parseError) {
    const message = parseError instanceof Error ? parseError.message : "Invalid filter parameters.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const datasetInput = searchParams.get("dataset");
  const scopeInput = searchParams.get("scope");
  const selectedIdsInput = searchParams.get("selectedIds");
  const formatInput = searchParams.get("format");
  const reportIdInput = searchParams.get("reportId");

  return handleExport(request, datasetInput, scopeInput, selectedIdsInput, filters, formatInput, reportIdInput);
}

export async function POST(request: NextRequest) {
  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON request body." }, { status: 400 });
  }

  let filters: MunicipalReportFilters;
  try {
    const filterInput = (body.filters as Record<string, unknown>) || {};
    filters = parseMunicipalReportFilters(filterInput);
  } catch (parseError) {
    const message = parseError instanceof Error ? parseError.message : "Invalid filter parameters.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  return handleExport(
    request,
    body.dataset,
    body.scope,
    body.selectedIds,
    filters,
    body.format,
    body.reportId,
  );
}
