import { NextRequest, NextResponse } from "next/server";

import { RESIDENT_SESSION_COOKIE, verifyResidentSession } from "../../../../lib/auth/session";
import { attachFireReportPhoto, createResidentFireReport, listResidentReports } from "../../../../lib/fire-reports/service";
import { validateFireReportInput, validateFireReportPhoto } from "../../../../lib/fire-reports/validation";
import { deleteFireReportPhoto, uploadFireReportPhoto } from "../../../../lib/supabase/server-storage";

export const runtime = "nodejs";

function sessionFor(request: NextRequest) {
  return verifyResidentSession(request.cookies.get(RESIDENT_SESSION_COOKIE)?.value);
}

export async function GET(request: NextRequest) {
  const session = sessionFor(request);
  if (!session) return NextResponse.json({ error: "Resident sign-in is required." }, { status: 401 });
  try {
    return NextResponse.json({ reports: await listResidentReports(session.userId) });
  } catch (error) {
    console.error("Resident report list failed", error);
    return NextResponse.json({ error: "Unable to load your reports." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = sessionFor(request);
  if (!session) return NextResponse.json({ error: "Resident sign-in is required." }, { status: 401 });
  try {
    const form = await request.formData();
    const photoValue = form.get("photo");
    const photo = photoValue instanceof File ? photoValue : null;
    const input = validateFireReportInput({
      fireType: form.get("fireType"), latitude: form.get("latitude"), longitude: form.get("longitude"),
      locationAccuracy: form.get("locationAccuracy"), municipality: form.get("municipality"), barangay: form.get("barangay"),
      landmark: form.get("landmark"), description: form.get("description"),
    });
    validateFireReportPhoto(photo);
    // Emergency routing is never dependent on optional photo storage.
    const report = await createResidentFireReport(session.userId, input);
    let photoWarning: string | undefined;

    if (photo) {
      let storageKey: string | null = null;
      try {
        const uploadedPhoto = await uploadFireReportPhoto(report.id, photo);
        storageKey = uploadedPhoto.storageKey;
        await attachFireReportPhoto(report.id, uploadedPhoto);
      } catch (photoError) {
        if (storageKey) await deleteFireReportPhoto(storageKey).catch(() => undefined);
        console.error("Resident fire report photo attachment failed", { reportId: report.id, cause: photoError });
        photoWarning = "Your fire alert was sent, but the photo could not be uploaded.";
      }
    }

    return NextResponse.json({ report, photoWarning }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to submit the fire report.";
    const knownValidation = /required|Select|valid|photo|too long|LOCALITY/i.test(message);
    if (!knownValidation) console.error("Resident fire report submission failed", error);
    return NextResponse.json({ error: knownValidation ? message : "Unable to submit the fire report." }, { status: knownValidation ? 400 : 500 });
  }
}
