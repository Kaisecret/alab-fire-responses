import { NextRequest, NextResponse } from "next/server";

import { RESIDENT_SESSION_COOKIE, verifyResidentSession } from "../../../../lib/auth/session";
import { attachFireReportPhoto, createResidentFireReport, listResidentReports } from "../../../../lib/fire-reports/service";
import { submissionAuditFromHeaders } from "../../../../lib/fire-reports/submission-audit";
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
    const photosList = form.getAll("photos").filter((v): v is File => v instanceof File && v.size > 0);
    const singlePhoto = form.get("photo");
    const photoCandidates = photosList.length > 0 
      ? photosList 
      : (singlePhoto instanceof File && singlePhoto.size > 0 ? [singlePhoto] : []);

    const seenFiles = new Set<string>();
    const photos: File[] = [];
    for (const f of photoCandidates) {
      const key = `${f.name}:${f.size}`;
      if (!seenFiles.has(key) && photos.length < 3) {
        seenFiles.add(key);
        photos.push(f);
      }
    }

    const input = validateFireReportInput({
      fireType: form.get("fireType"), latitude: form.get("latitude"), longitude: form.get("longitude"),
      locationAccuracy: form.get("locationAccuracy"), municipality: form.get("municipality"), barangay: form.get("barangay"),
      landmark: form.get("landmark"), description: form.get("description"),
      structureMaterial: form.get("structureMaterial"), houseDensity: form.get("houseDensity"),
      routeAccessibility: form.get("routeAccessibility"),
      weatherTemperature: form.get("weatherTemperature"), weatherHumidity: form.get("weatherHumidity"),
      weatherWindSpeed: form.get("weatherWindSpeed"), weatherWindDirection: form.get("weatherWindDirection"),
      weatherWindCondition: form.get("weatherWindCondition"),
    });

    const validPhotos: File[] = [];
    for (const photo of photos) {
      try {
        validateFireReportPhoto(photo);
        validPhotos.push(photo);
      } catch (validationErr) {
        console.warn("Skipping invalid photo attachment:", validationErr);
      }
    }

    // Emergency routing is never dependent on optional photo storage.
    const submissionAudit = submissionAuditFromHeaders(request.headers);
    const report = await createResidentFireReport(session.userId, input, submissionAudit);
    let photoWarning: string | undefined;

    if (validPhotos.length > 0) {
      const uploadResults = await Promise.allSettled(
        validPhotos.map(async (photo) => {
          let storageKey: string | null = null;
          try {
            const uploadedPhoto = await uploadFireReportPhoto(report.id, photo);
            storageKey = uploadedPhoto.storageKey;
            await attachFireReportPhoto(report.id, uploadedPhoto);
            return { ok: true };
          } catch (photoError) {
            if (storageKey) await deleteFireReportPhoto(storageKey).catch(() => undefined);
            console.error("Resident fire report photo attachment failed", { reportId: report.id, cause: photoError });
            return { ok: false };
          }
        })
      );

      const hadFailure = uploadResults.some((r) => r.status === "rejected" || (r.status === "fulfilled" && !r.value.ok));
      if (hadFailure) {
        photoWarning = "Your fire alert was sent, but some photos could not be uploaded.";
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
