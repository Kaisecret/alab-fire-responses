import { NextResponse } from "next/server";
import type Sharp from "sharp";

import { compareResidentFaces } from "../../../../../lib/resident-applications/face-match";
import { evidenceSha256, readBoundIdVerification, signFaceVerification } from "../../../../../lib/resident-applications/face-verification-token.mjs";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_IMAGE_BYTES = 6 * 1024 * 1024;
const MAX_DIMENSION = 5000;
const MAX_PIXELS = 12_000_000;
const WINDOW_MS = 10 * 60 * 1000;
const MAX_CHECKS = 12;
const MAX_ADDRESSES = 1000;
const recentChecks = new Map<string, { startedAt: number; count: number }>();
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

// A bounded per-instance limit, like ID checking. Deployment infrastructure
// can additionally enforce a shared rate limit across function instances.
function allowCheck(request: Request, now = Date.now()) {
  // Vercel overwrites these forwarded addresses to prevent client spoofing.
  const address = (request.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")?.trim() || "local").slice(0, 128);
  for (const [key, value] of recentChecks) if (now - value.startedAt >= WINDOW_MS) recentChecks.delete(key);
  const current = recentChecks.get(address);
  if (current) {
    if (current.count >= MAX_CHECKS) return false;
    current.count++;
    return true;
  }
  // Do not evict live limits when the map is full: reject new addresses.
  if (recentChecks.size >= MAX_ADDRESSES) return false;
  recentChecks.set(address, { startedAt: now, count: 1 });
  return true;
}

function fail(code: string, message: string, status: number) {
  return NextResponse.json({ verified: false, code, message }, { status });
}

function signatureMatches(bytes: Buffer, type: string) {
  if (type === "image/jpeg") return bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (type === "image/png") return bytes.length > 8 && bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  return type === "image/webp" && bytes.length > 12 && bytes.subarray(0, 4).toString("ascii") === "RIFF" && bytes.subarray(8, 12).toString("ascii") === "WEBP";
}

async function imageBytes(form: FormData, key: string, sharp: typeof Sharp) {
  if (form.getAll(key).length !== 1) throw new Error("INVALID_IMAGE");
  const file = form.get(key);
  if (!(file instanceof File) || file.size < 1 || file.size > MAX_IMAGE_BYTES || !ALLOWED_TYPES.has(file.type)) throw new Error("INVALID_IMAGE");
  const bytes = Buffer.from(await file.arrayBuffer());
  if (!signatureMatches(bytes, file.type)) throw new Error("INVALID_IMAGE");
  const decoder = sharp(bytes, { failOn: "error", limitInputPixels: MAX_PIXELS });
  const metadata = await decoder.metadata();
  const expectedFormat = file.type === "image/jpeg" ? "jpeg" : file.type === "image/png" ? "png" : "webp";
  if (metadata.format !== expectedFormat || !metadata.width || !metadata.height
      || metadata.width > MAX_DIMENSION || metadata.height > MAX_DIMENSION
      || metadata.width * metadata.height > MAX_PIXELS || (metadata.pages ?? 1) !== 1) throw new Error("INVALID_IMAGE");
  // Metadata can be readable even when the pixel stream is truncated.
  await decoder.resize({ width: 32, height: 32, fit: "inside", withoutEnlargement: true }).raw().toBuffer();
  return bytes;
}

export async function POST(request: Request) {
  const secret = process.env.AUTH_SECRET ?? "";
  if (secret.length < 32) return fail("SERVICE_UNAVAILABLE", "Selfie checking is not available right now. Please try again shortly.", 503);

  let form: FormData;
  try { form = await request.formData(); } catch {
    return fail("INVALID_REQUEST", "Upload your ID and retake your selfie, then try again.", 400);
  }
  const token = form.get("idVerificationToken");
  const idProof = form.getAll("idVerificationToken").length === 1 && typeof token === "string"
    ? readBoundIdVerification(token, secret) : null;
  if (!idProof) return fail("ID_NOT_VERIFIED", "Verify both sides of your ID before confirming your selfie.", 400);
  if (!allowCheck(request)) return fail("TOO_MANY_CHECKS", "Too many selfie checks. Please wait a few minutes and try again.", 429);

  let sharp: typeof Sharp;
  try { sharp = (await import("sharp")).default; } catch {
    return fail("SERVICE_UNAVAILABLE", "Selfie checking is not available right now. Please try again shortly.", 503);
  }
  let front: Buffer; let back: Buffer; let selfie: Buffer;
  try {
    front = await imageBytes(form, "frontId", sharp);
    back = await imageBytes(form, "backId", sharp);
    selfie = await imageBytes(form, "selfie", sharp);
  } catch {
    return fail("INVALID_IMAGE", "Use clear JPG, PNG or WebP photos up to 6 MB and 5000 pixels per side. Upload your ID or retake your selfie again.", 400);
  }
  const sha256 = evidenceSha256(front);
  const backSha256 = evidenceSha256(back);
  if (idProof.sha256 !== sha256 || idProof.backSha256 !== backSha256) return fail("ID_NOT_VERIFIED", "Your ID photos changed. Verify both sides of your ID again before confirming your selfie.", 400);

  try {
    const outcome = await compareResidentFaces(front, selfie);
    if (!outcome.ok) return fail(outcome.code, outcome.message, /^(FACE_)?SERVICE_(UNAVAILABLE|BUSY)$/.test(outcome.code) ? 503 : 422);
    // The signer rejects non-finite, out-of-range or below-threshold results.
    const faceToken = signFaceVerification({ sha256, backSha256, selfieSha256: evidenceSha256(selfie), name: idProof.name, score: outcome.score, threshold: outcome.threshold }, secret);
    return NextResponse.json({ verified: true, token: faceToken });
  } catch {
    return fail("SERVICE_UNAVAILABLE", "Selfie checking is not available right now. Please try again shortly.", 503);
  }
}
