import { NextRequest, NextResponse } from "next/server";
import { getManagementActor, isProvincialAuthorizationResponse } from "../../../../lib/provincial-bfp/auth";
import { parseManagementFilters, parseReportFilters } from "../../../../lib/provincial-bfp/management/filters";
import { exportManagementDataset } from "../../../../lib/provincial-bfp/management/exports";

export const runtime = "nodejs";

const VALID_DATASETS = new Set([
  "STATIONS",
  "PERSONNEL",
  "RESIDENTS",
  "APPLICATIONS",
  "FIRE_REPORTS",
  "REPORT_SUMMARY",
]);

export async function GET(request: NextRequest) {
  const actor = await getManagementActor(request);
  if (isProvincialAuthorizationResponse(actor)) {
    return actor;
  }

  const datasetParam = request.nextUrl.searchParams.get("dataset")?.toUpperCase();
  if (!datasetParam || !VALID_DATASETS.has(datasetParam)) {
    return NextResponse.json(
      { error: "Invalid dataset. Allowed: STATIONS, PERSONNEL, RESIDENTS, APPLICATIONS, FIRE_REPORTS, REPORT_SUMMARY" },
      { status: 400 },
    );
  }

  try {
    const filters = (datasetParam === "FIRE_REPORTS" || datasetParam === "REPORT_SUMMARY" ? parseReportFilters : parseManagementFilters)(request.nextUrl.searchParams);
    const { csvContent, fileName } = await exportManagementDataset(
      actor,
      datasetParam as "STATIONS" | "PERSONNEL" | "RESIDENTS" | "APPLICATIONS" | "FIRE_REPORTS" | "REPORT_SUMMARY",
      filters,
    );

    return new Response(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Export failed";
    if (message.startsWith("ROW_LIMIT_EXCEEDED") || message.startsWith("INVALID_")) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    console.error("Provincial export failed:", error);
    return NextResponse.json({ error: "Export failed. Please try again." }, { status: 500 });
  }
}
