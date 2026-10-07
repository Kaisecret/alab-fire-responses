import { NextRequest, NextResponse } from "next/server";

import { RESIDENT_SESSION_COOKIE, verifyResidentSession } from "../../../../../lib/auth/session";
import { getDatabase } from "../../../../../lib/db";
import { findOwnOpenReportNear } from "../../../../../lib/fire-reports/duplicates";
import { validateFireReportInput } from "../../../../../lib/fire-reports/validation";

export const runtime = "nodejs";

/**
 * The resident's own open report within 50 m, so the report form can open it
 * instead of sending the same fire twice. When the resident now also sees a
 * fire type the incident does not list, the form submits instead, and the
 * submission adds that type to the incident.
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
    const found = await findOwnOpenReportNear(getDatabase(), session.userId, input.latitude, input.longitude, input.fireTypes);
    const report = found && input.fireTypes.every((type) => found.incidentFireTypes.includes(type))
      ? { id: found.id, referenceNumber: found.referenceNumber }
      : null;
    return NextResponse.json({ report }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Own open report lookup failed", error);
    return NextResponse.json({ report: null }, { headers: { "Cache-Control": "no-store" } });
  }
}
