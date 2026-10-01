import { NextRequest, NextResponse } from "next/server";

import { RESIDENT_SESSION_COOKIE, verifyResidentSession } from "../../../../lib/auth/session";
import { getDatabase } from "../../../../lib/db";
import { findOwnOpenReportNear } from "../../../../lib/fire-reports/duplicates";
import { attachFireReportPhoto, createResidentFireReport, listResidentReports } from "../../../../lib/fire-reports/service";
import { watermarkTime } from "../../../../lib/media/watermark";
import { submissionAuditFromHeaders } from "../../../../lib/fire-reports/submission-audit";
import { validateFireReportInput, validateFireReportPhoto } from "../../../../lib/fire-reports/validation";
import { deleteFireReportPhoto, uploadFireReportPhoto } from "../../../../lib/supabase/server-storage";
import {
  checkResidentSosRateLimit,
  recordSuccessfulSosReportMemory,
  SOS_RATE_LIMIT_ERROR_EN,
} from "../../../../lib/fire-reports/rate-limiter";

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

function knownValidation(message: string) {
  return /required|Select|valid|photo|too long|LOCALITY/i.test(message);
}

export async function POST(request: NextRequest) {
  const session = sessionFor(request);
  if (!session) return NextResponse.json({ error: "Resident sign-in is required." }, { status: 401 });

  const submissionAudit = submissionAuditFromHeaders(request.headers);

  let form: FormData;
  let input: ReturnType<typeof validateFireReportInput>;
  try {
    form = await request.formData();
    input = validateFireReportInput({
      fireType: form.get("fireType"), latitude: form.get("latitude"), longitude: form.get("longitude"),
      locationAccuracy: form.get("locationAccuracy"), municipality: form.get("municipality"), barangay: form.get("barangay"),
      landmark: form.get("landmark"), description: form.get("description"),
      structureMaterial: form.get("structureMaterial"), houseDensity: form.get("houseDensity"),
      routeAccessibility: form.get("routeAccessibility"),
      weatherTemperature: form.get("weatherTemperature"), weatherHumidity: form.get("weatherHumidity"),
      weatherWindSpeed: form.get("weatherWindSpeed"), weatherWindDirection: form.get("weatherWindDirection"),
      weatherWindCondition: form.get("weatherWindCondition"),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to submit the fire report.";
    if (!knownValidation(message)) console.error("Resident fire report submission failed", error);
    return NextResponse.json({ error: knownValidation(message) ? message : "Unable to submit the fire report." }, { status: knownValidation(message) ? 400 : 500 });
  }

  // Reporting the same place again opens the resident's open report instead
  // of a second alarm, even inside the cooldown.
  try {
    const ownReport = await findOwnOpenReportNear(getDatabase(), session.userId, input.latitude, input.longitude);
    if (ownReport) return NextResponse.json({ report: ownReport, existing: true });
  } catch (error) {
    console.warn("Own report lookup failed; continuing with a new report", error);
  }

  // One successful report per account every 5 minutes.
  const rateLimit = await checkResidentSosRateLimit(session.userId, submissionAudit.ipAddress);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        error: rateLimit.message || SOS_RATE_LIMIT_ERROR_EN,
        retryAfter: rateLimit.retryAfterSeconds,
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(rateLimit.retryAfterSeconds),
        },
      }
    );
  }

  try {
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
    const report = await createResidentFireReport(session.userId, input, submissionAudit);
    if (report.existing) {
      return NextResponse.json({ report: { id: report.id, referenceNumber: report.referenceNumber }, existing: true });
    }
    recordSuccessfulSosReportMemory(session.userId);
    if (submissionAudit.ipAddress) {
      recordSuccessfulSosReportMemory(`ip:${submissionAudit.ipAddress}`);
    }
    let photoWarning: string | undefined;

    if (validPhotos.length > 0) {
      const watermark = { label: "Fire report evidence", detail: `${report.referenceNumber} · ${watermarkTime(new Date())}` };
      const uploadResults = await Promise.allSettled(
        validPhotos.map(async (photo) => {
          let storageKey: string | null = null;
          try {
            const uploadedPhoto = await uploadFireReportPhoto(report.id, photo, watermark);
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
    if (!knownValidation(message)) console.error("Resident fire report submission failed", error);
    return NextResponse.json({ error: knownValidation(message) ? message : "Unable to submit the fire report." }, { status: knownValidation(message) ? 400 : 500 });
  }
}
