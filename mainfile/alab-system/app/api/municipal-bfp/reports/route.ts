import { NextRequest, NextResponse } from "next/server";

import {
  requireMunicipalAdmin,
  isAuthorizationResponse,
} from "../../../../lib/municipal-bfp/auth";
import { parseMunicipalReportFilters } from "../../../../lib/municipal-bfp/reports/filters";
import { getDatabase } from "../../../../lib/db";
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

    const client = await getDatabase().connect();
    let reportsResult;
    let summaryResult;
    try {
      await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
      reportsResult = await listMunicipalReports(admin, filters, client);
      summaryResult = includeSummary ? await getMunicipalReportSummary(admin, filters, client) : null;
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }

    return NextResponse.json({
      items: reportsResult.items,
      total: reportsResult.total,
      page: reportsResult.page,
      pageSize: reportsResult.pageSize,
      totalPages: reportsResult.totalPages,
      summary: summaryResult,
      updatedAt: new Date().toISOString(),
    }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load reports.";
    const status =
      message.startsWith("INVALID_") || message.startsWith("ROW_LIMIT_") ? 400 : 500;
    if (status === 500) console.error("Municipal reporting failed", error);
    return NextResponse.json({ error: status === 500 ? "Unable to load municipal reports. Please retry." : message }, { status });
  }
}
