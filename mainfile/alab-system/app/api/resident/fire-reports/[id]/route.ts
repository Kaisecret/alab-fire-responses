import { NextRequest, NextResponse } from "next/server";

import { RESIDENT_SESSION_COOKIE, verifyResidentSession } from "../../../../../lib/auth/session";
import { findResidentReport, updateResidentReportTacticalDetails } from "../../../../../lib/fire-reports/service";
import { getSharedIncident } from "../../../../../lib/fire-reports/duplicates";
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
    const shared = await getSharedIncident(report.id, report.duplicate_of_report_id).catch(() => null);
    // Other residents are shown only as "Reporter N" with their photos.
    const incident = shared ? {
      primaryReference: shared.primaryReference,
      status: shared.status,
      stage: shared.stage,
      stationName: shared.stationName,
      acknowledgedAt: shared.acknowledgedAt,
      respondingAt: shared.respondingAt,
      reporterCount: shared.reporterCount,
      viewerIsPrimary: shared.viewerIsPrimary,
      history: shared.history,
      otherPhotos: (await Promise.all(shared.reports.flatMap((item, index) => item.isViewer ? [] : item.photoKeys.map(async (key) => ({
        url: await getFireReportPhotoUrl(key).catch(() => null),
        label: item.isPrimary ? "First report" : `Reporter ${index + 1}`,
        submittedAt: item.submittedAt,
      }))))).filter((photo) => photo.url),
    } : null;
    return NextResponse.json({ report: { ...report, photos, incident } });
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
