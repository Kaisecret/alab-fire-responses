import { createHash } from "node:crypto";

import { NextResponse } from "next/server";

import { checkIdWithGemini } from "../../../../../lib/resident-applications/gemini-id-check";
import { signIdVerification } from "../../../../../lib/resident-applications/id-verification-token.mjs";

export const runtime = "nodejs";
// A scan can wait on a busy model and a fallback; allow up to a minute.
export const maxDuration = 60;

const MAX_IMAGE_BYTES = 6 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const WINDOW_MS = 10 * 60 * 1000;
const MAX_CHECKS_PER_WINDOW = 12;

// Each check calls a paid model, so one address gets a handful per window.
const recentChecks = new Map<string, number[]>();

function allowCheck(key: string, now = Date.now()) {
  const recent = (recentChecks.get(key) ?? []).filter((time) => now - time < WINDOW_MS);
  if (recent.length >= MAX_CHECKS_PER_WINDOW) {
    recentChecks.set(key, recent);
    return false;
  }
  recent.push(now);
  recentChecks.set(key, recent);
  return true;
}

function clientAddress(request: Request) {
  return request.headers.get("cf-connecting-ip")?.trim()
    || request.headers.get("x-real-ip")?.trim()
    || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || "local";
}

function looksLikeImage(bytes: Buffer, type: string) {
  if (type === "image/jpeg") return bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (type === "image/png") return bytes.length > 8 && bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  if (type === "image/webp") return bytes.length > 12 && bytes.subarray(0, 4).toString("ascii") === "RIFF" && bytes.subarray(8, 12).toString("ascii") === "WEBP";
  return false;
}

// Mean brightness (0-255) of the image, or null when it cannot be measured.
// A dim photo is refused here before the model is asked to read it.
const MIN_MEAN_BRIGHTNESS = 45;
async function meanBrightness(bytes: Buffer) {
  try {
    const sharp = (await import("sharp")).default;
    const stats = await sharp(bytes).greyscale().stats();
    return stats.channels[0]?.mean ?? null;
  } catch {
    return null;
  }
}

function clean(value: FormDataEntryValue | null, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

/**
 * Scans the front of a resident's ID as soon as it is uploaded. A pass returns
 * a signed token bound to this exact image and name; registration refuses to
 * save anything without it.
 */
export async function POST(request: Request) {
  const secret = process.env.AUTH_SECRET ?? "";
  if (secret.length < 32 || !process.env.GEMINI_API_KEY) {
    return NextResponse.json({ verified: false, code: "SERVICE_UNAVAILABLE", message: "ID checking is not available right now." }, { status: 503 });
  }
  if (!allowCheck(clientAddress(request))) {
    return NextResponse.json({ verified: false, code: "TOO_MANY_CHECKS", message: "Too many ID checks. Please wait a few minutes and try again." }, { status: 429 });
  }

  let form: FormData;
  try { form = await request.formData(); } catch {
    return NextResponse.json({ verified: false, code: "INVALID_REQUEST", message: "Upload your ID again." }, { status: 400 });
  }
  const firstName = clean(form.get("firstName"), 50);
  const lastName = clean(form.get("lastName"), 50);
  const file = form.get("frontId");
  if (!firstName || !lastName) {
    return NextResponse.json({ verified: false, code: "NAME_REQUIRED", message: "Enter your first and last name before uploading your ID." }, { status: 400 });
  }
  if (!(file instanceof File) || file.size < 1 || file.size > MAX_IMAGE_BYTES || !ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json({ verified: false, code: "INVALID_FILE", message: "Upload a JPG, PNG or WebP photo of your ID, up to 5 MB." }, { status: 400 });
  }
  const bytes = Buffer.from(await file.arrayBuffer());
  if (!looksLikeImage(bytes, file.type)) {
    return NextResponse.json({ verified: false, code: "INVALID_FILE", message: "This file is not a readable image. Upload a photo of your ID." }, { status: 400 });
  }

  const brightness = await meanBrightness(bytes);
  if (brightness !== null && brightness < MIN_MEAN_BRIGHTNESS) {
    return NextResponse.json({ verified: false, code: "UNREADABLE", message: "Your ID photo is too dark. Retake it in good light and upload again." }, { status: 422 });
  }

  const outcome = await checkIdWithGemini({ image: bytes, mimeType: file.type, firstName, lastName });
  if (!outcome.ok) {
    return NextResponse.json(
      { verified: false, code: outcome.code, message: outcome.message, detectedName: outcome.detectedName ?? null },
      { status: outcome.code === "SERVICE_UNAVAILABLE" ? 503 : 422 },
    );
  }
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  return NextResponse.json({
    verified: true,
    token: signIdVerification({ sha256, firstName, lastName, documentType: outcome.documentType }, secret),
    detectedName: outcome.detectedName,
    documentType: outcome.documentType,
  });
}
