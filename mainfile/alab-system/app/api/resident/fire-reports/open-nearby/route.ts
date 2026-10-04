import { NextRequest, NextResponse } from "next/server";

import { RESIDENT_SESSION_COOKIE, verifyResidentSession } from "../../../../../lib/auth/session";
import { getDatabase } from "../../../../../lib/db";
import { findOwnOpenReportNear } from "../../../../../lib/fire-reports/duplicates";
import { validateFireReportInput } from "../../../../../lib/fire-reports/validation";

export const runtime = "nodejs";

/**
 * The resident's own open report with the same fire types within 100 m, so the report form
 * can open it instead of sending the same fire twice.
 */
export async function GET(request: NextRequest) {
  const session = verifyResidentSession(request.cookies.get(RESIDENT_SESSION_COOKIE)?.value);
  if (!session) return NextResponse.json({ error: "Resident sign-in is required." }, { status: 401 });
  let input: ReturnType<typeof validateFireReportInput>;
  try {
    input = validateFireReportInput({
      latitude: request.nextUrl.searchParams.get("latitude"),
      longitude: request.nextUrl.searchParams.get("longitude"),
      fireTypes: request.nextUrl.searchParams.getAll("fireTypes"),
      municipality: request.nextUrl.searchParams.get("municipality"),
      barangay: request.nextUrl.searchParams.get("barangay"),
    });
  } catch {
    return NextResponse.json({ error: "A valid location and fire type are required." }, { status: 400 });
  }
  try {
    const report = await findOwnOpenReportNear(getDatabase(), session.userId, input.latitude, input.longitude, input.fireTypes);
    return NextResponse.json({ report }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Own open report lookup failed", error);
    return NextResponse.json({ report: null }, { headers: { "Cache-Control": "no-store" } });
  }
}
