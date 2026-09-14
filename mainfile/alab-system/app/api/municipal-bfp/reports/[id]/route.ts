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

    return NextResponse.json({ report }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("Municipal report detail failed", error);
    return NextResponse.json({ error: "Unable to load report details. Please retry." }, { status: 500 });
  }
}
