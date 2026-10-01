import { NextRequest, NextResponse } from "next/server";

import { RESIDENT_SESSION_COOKIE, verifyResidentSession } from "../../../../../lib/auth/session";
import { getDatabase } from "../../../../../lib/db";
import { findOwnOpenReportNear } from "../../../../../lib/fire-reports/duplicates";

export const runtime = "nodejs";

/**
 * The resident's own open report within 50 m of a place, so the report form
 * can open it instead of sending the same fire twice.
 */
export async function GET(request: NextRequest) {
  const session = verifyResidentSession(request.cookies.get(RESIDENT_SESSION_COOKIE)?.value);
  if (!session) return NextResponse.json({ error: "Resident sign-in is required." }, { status: 401 });
  const latitude = Number(request.nextUrl.searchParams.get("latitude"));
  const longitude = Number(request.nextUrl.searchParams.get("longitude"));
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
    return NextResponse.json({ error: "A valid location is required." }, { status: 400 });
  }
  try {
    const report = await findOwnOpenReportNear(getDatabase(), session.userId, latitude, longitude);
    return NextResponse.json({ report }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Own open report lookup failed", error);
    return NextResponse.json({ report: null }, { headers: { "Cache-Control": "no-store" } });
  }
}
