import { NextRequest, NextResponse } from "next/server";

import {
  requireMunicipalAdmin,
  isAuthorizationResponse,
} from "../../../../lib/municipal-bfp/auth";
import { parseMunicipalReportFilters } from "../../../../lib/municipal-bfp/reports/filters";
import {
  listMunicipalReports,
  getMunicipalReportSummary,
} from "../../../../lib/municipal-bfp/reports/service";

export async function GET(request: NextRequest) {
  const admin = await requireMunicipalAdmin(request);
  if (isAuthorizationResponse(admin)) {
    return admin;
  }

  try {
    const filters = parseMunicipalReportFilters(request.nextUrl.searchParams);
    const includeSummary = request.nextUrl.searchParams.get("summary") === "true";

    const [reportsResult, summaryResult] = await Promise.all([
      listMunicipalReports(admin, filters),
      includeSummary ? getMunicipalReportSummary(admin, filters) : Promise.resolve(null),
    ]);

    return NextResponse.json({
      items: reportsResult.items,
      total: reportsResult.total,
      page: reportsResult.page,
      pageSize: reportsResult.pageSize,
      totalPages: reportsResult.totalPages,
      summary: summaryResult,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load reports.";
    const status =
      message.startsWith("INVALID_") || message.startsWith("ROW_LIMIT_") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
