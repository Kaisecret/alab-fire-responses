import { NextRequest, NextResponse } from "next/server";

import { RESIDENT_SESSION_COOKIE, verifyResidentSession } from "../../../../../lib/auth/session";
import { findResidentReport, updateResidentReportTacticalDetails } from "../../../../../lib/fire-reports/service";
import { validateTacticalDetailsUpdate } from "../../../../../lib/fire-reports/validation";
import { getFireReportPhotoUrl } from "../../../../../lib/supabase/server-storage";

export const runtime = "nodejs";

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const session = verifyResidentSession(request.cookies.get(RESIDENT_SESSION_COOKIE)?.value);
  if (!session) return NextResponse.json({ error: "Resident sign-in is required." }, { status: 401 });
  const { id } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Invalid report." }, { status: 400 });
  try {
    const report = await findResidentReport(session.userId, id);
    if (!report) return NextResponse.json({ error: "Report not found." }, { status: 404 });
    const photos = await Promise.all(report.photos.map(async (photo) => ({ url: await getFireReportPhotoUrl(photo.storage_key) })));
    return NextResponse.json({ report: { ...report, photos } });
  } catch (error) {
    console.error("Resident report detail failed", error);
    return NextResponse.json({ error: "Unable to load this report." }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const session = verifyResidentSession(request.cookies.get(RESIDENT_SESSION_COOKIE)?.value);
  if (!session) return NextResponse.json({ error: "Resident sign-in is required." }, { status: 401 });
  const { id } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Invalid report." }, { status: 400 });

  try {
    const body = await request.json();
    const updates = validateTacticalDetailsUpdate(body);
    const updated = await updateResidentReportTacticalDetails(session.userId, id, updates);
    return NextResponse.json({ report: updated });
  } catch (error) {
    console.error("Resident report tactical update failed", error);
    const message = error instanceof Error ? error.message : "Unable to update report details.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
