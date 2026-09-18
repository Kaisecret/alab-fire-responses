import { NextRequest, NextResponse } from "next/server";

import { getManagementActor, isProvincialAuthorizationResponse } from "../../../../../lib/provincial-bfp/auth";
import { parseReportFilters } from "../../../../../lib/provincial-bfp/management/filters";
import {
  buildProvincialReportExport,
  type ProvincialReportDataset,
  type ProvincialReportFormat,
} from "../../../../../lib/provincial-bfp/management/report-exports";
import { getDatabase } from "../../../../../lib/db";

export const runtime = "nodejs";

const DATASETS = new Set<ProvincialReportDataset>([
  "INCIDENT_REGISTER",
  "PROVINCIAL_SUMMARY",
  "MUNICIPALITY_BREAKDOWN",
]);
const FORMATS = new Set<ProvincialReportFormat>(["PDF", "XLSX", "CSV"]);

/** An official provincial report, in the format the officer asked for. */
export async function GET(request: NextRequest) {
  const actor = await getManagementActor(request);
  if (isProvincialAuthorizationResponse(actor)) return actor;

  const params = request.nextUrl.searchParams;
  const dataset = (params.get("dataset") ?? "PROVINCIAL_SUMMARY").toUpperCase() as ProvincialReportDataset;
  const format = (params.get("format") ?? "PDF").toUpperCase() as ProvincialReportFormat;

  if (!DATASETS.has(dataset)) {
    return NextResponse.json({ error: "Choose a register, a provincial summary, or a municipality breakdown." }, { status: 400 });
  }
  if (!FORMATS.has(format)) {
    return NextResponse.json({ error: "Choose PDF, Excel or CSV." }, { status: 400 });
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
    if (message.startsWith("INVALID_")) {
      return NextResponse.json({ error: "Those filters are not valid." }, { status: 400 });
    }
    console.error("Provincial report export failed", error);
    return NextResponse.json({ error: "That report could not be generated. Please try again." }, { status: 500 });
  }
}
