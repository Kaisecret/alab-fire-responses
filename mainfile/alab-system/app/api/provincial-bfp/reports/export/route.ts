import { NextRequest, NextResponse } from "next/server";

import { getManagementActor, isProvincialAuthorizationResponse } from "../../../../../lib/provincial-bfp/auth";
import { parseReportFilters } from "../../../../../lib/provincial-bfp/management/filters";
import {
  buildProvincialReportExport,
  type ProvincialReportDataset,
  type ProvincialReportFormat,
  type ProvincialReportScope,
} from "../../../../../lib/provincial-bfp/management/report-exports";
import { getDatabase } from "../../../../../lib/db";

export const runtime = "nodejs";

const DATASETS = new Set<ProvincialReportDataset>([
  "INCIDENT_REGISTER",
  "PROVINCIAL_SUMMARY",
  "MUNICIPALITY_BREAKDOWN",
  "INCIDENT_DOSSIER",
]);
const FORMATS = new Set<ProvincialReportFormat>(["PDF", "XLSX", "CSV"]);
const SCOPES = new Set<ProvincialReportScope>(["ALL_MATCHING", "SELECTED", "CURRENT_PAGE"]);

/** An official provincial report, in the format the officer asked for. */
async function buildReport(
  request: NextRequest,
  params: URLSearchParams | Record<string, unknown>,
  datasetInput: unknown,
  formatInput: unknown,
  scopeInput: unknown,
  selectedIdsInput: unknown,
  reportIdInput: unknown,
) {
  const actor = await getManagementActor(request);
  if (isProvincialAuthorizationResponse(actor)) return actor;

  const dataset = String(datasetInput ?? "PROVINCIAL_SUMMARY").toUpperCase() as ProvincialReportDataset;
  const format = String(formatInput ?? "PDF").toUpperCase() as ProvincialReportFormat;
  const scope = String(scopeInput ?? "ALL_MATCHING").toUpperCase() as ProvincialReportScope;

  if (!DATASETS.has(dataset)) {
    return NextResponse.json({ error: "Choose a register, a provincial summary, a municipality breakdown, or one incident dossier." }, { status: 400 });
  }
  if (!FORMATS.has(format)) {
    return NextResponse.json({ error: "Choose PDF, Excel or CSV." }, { status: 400 });
  }
  if (!SCOPES.has(scope)) {
    return NextResponse.json({ error: "Choose all matching records, the ticked records, or the current page." }, { status: 400 });
  }

  let selectedIds: string[] | undefined;
  if (Array.isArray(selectedIdsInput)) {
    selectedIds = selectedIdsInput.map(String).filter(Boolean);
  } else if (typeof selectedIdsInput === "string" && selectedIdsInput.trim()) {
    selectedIds = selectedIdsInput.split(",").map((id) => id.trim()).filter(Boolean);
  }

  try {
    const filters = parseReportFilters(params);

    // Named for the letterhead, so a single-municipality report says whose it is.
    let municipalityName: string | null = null;
    if (filters.municipalityId) {
      const found = await getDatabase().query<{ name: string }>(
        `select name from public.municipalities where id = $1`,
        [filters.municipalityId],
      );
      municipalityName = found.rows[0]?.name ?? null;
    }

    const report = await buildProvincialReportExport({
      actor,
      filters,
      dataset,
      format,
      preparedBy: "Provincial BFP",
      municipalityName,
      scope,
      selectedIds,
      reportId: typeof reportIdInput === "string" ? reportIdInput : undefined,
    });

    const body = typeof report.body === "string" ? report.body : new Uint8Array(report.body);
    return new Response(body, {
      status: 200,
      headers: {
        "Content-Type": report.contentType,
        "Content-Disposition": `attachment; filename="${report.fileName}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "ROW_LIMIT_EXCEEDED") {
      return NextResponse.json(
        { error: "That range covers more than 10,000 records. Narrow the dates or choose one municipality." },
        { status: 400 },
      );
    }
    if (message === "INVALID_SELECTION") {
      return NextResponse.json(
        { error: "That record could not be matched. Refresh the list and try again." },
        { status: 400 },
      );
    }
    if (message === "INVALID_FORMAT") {
      return NextResponse.json({ error: "An incident dossier is available as PDF only." }, { status: 400 });
    }
    if (message === "INVALID_SCOPE") {
      return NextResponse.json({ error: "A summary or breakdown always covers every matching record." }, { status: 400 });
    }
    if (message.startsWith("INVALID_")) {
      return NextResponse.json({ error: "Those filters are not valid." }, { status: 400 });
    }
    console.error("Provincial report export failed", error);
    return NextResponse.json({ error: "That report could not be generated. Please try again." }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  return buildReport(
    request,
    params,
    params.get("dataset"),
    params.get("format"),
    params.get("scope"),
    params.get("selectedIds"),
    params.get("reportId"),
  );
}

/** A long list of ticked record IDs does not fit a query string. */
export async function POST(request: NextRequest) {
  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON request body." }, { status: 400 });
  }
  const filters = (body.filters as Record<string, unknown>) ?? {};
  return buildReport(request, filters, body.dataset, body.format, body.scope, body.selectedIds, body.reportId);
}
