import { NextRequest, NextResponse } from "next/server";

import {
  requireMunicipalAdmin,
  isAuthorizationResponse,
} from "../../../../../lib/municipal-bfp/auth";
import { getMunicipalReportDetail } from "../../../../../lib/municipal-bfp/reports/service";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const admin = await requireMunicipalAdmin(request);
  if (isAuthorizationResponse(admin)) {
    return admin;
  }

  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: "Report ID is required." }, { status: 400 });
  }

  try {
    const report = await getMunicipalReportDetail(admin, id);
    if (!report) {
      return NextResponse.json(
        { error: "Report not found or not in your municipality." },
        { status: 404 },
      );
    }

    return NextResponse.json({ report });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load report detail.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
