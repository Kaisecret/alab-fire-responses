import "server-only";

import { createHash, randomUUID } from "node:crypto";

import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

const EVIDENCE_BUCKET = process.env.SUPABASE_RESIDENT_EVIDENCE_BUCKET || "resident-identity-evidence";
const MAX_IMAGE_BYTES = 6 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export type EvidenceAsset = {
  originalKey: string;
  reviewKey: string | null;
  sha256: string;
  mimeType: string;
  sizeBytes: number;
};

export type IdentityEvidence = {
  front: EvidenceAsset;
  back: EvidenceAsset | null;
  selfie: EvidenceAsset;
  uploadedKeys: string[];
};

function storageClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("SUPABASE_SECRET_KEY is required for protected resident identity evidence.");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function escapeXml(value: string) {
  return value.replace(/[<>&'\"]/g, (character) => ({
    "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", "\"": "&quot;",
  }[character] ?? character));
}

function watermarkSvg(reference: string, submittedAt: Date) {
  const date = new Intl.DateTimeFormat("en-PH", {
    timeZone: "Asia/Manila", year: "numeric", month: "short", day: "2-digit",
  }).format(submittedAt);
  const label = escapeXml(`ALAB MUNICIPAL BFP REVIEW ONLY • ${reference} • ${date}`);
  return Buffer.from(`<svg width="720" height="260" xmlns="http://www.w3.org/2000/svg">
    <g transform="rotate(-24 360 130)" opacity="0.3">
      <rect x="0" y="70" width="720" height="86" fill="#7f1d1d" opacity="0.22"/>
      <text x="360" y="122" text-anchor="middle" font-family="Arial, sans-serif" font-size="25" font-weight="700" fill="#ffffff" stroke="#7f1d1d" stroke-width="1.5">${label}</text>
    </g>
  </svg>`);
}

async function validatedImage(file: File, label: string) {
  if (!ALLOWED_IMAGE_TYPES.has(file.type) || file.size < 1 || file.size > MAX_IMAGE_BYTES) {
    throw new Error(`${label} must be a JPG, PNG, or WebP image no larger than 6 MB.`);
  }
  const bytes = Buffer.from(await file.arrayBuffer());
  try {
    const metadata = await sharp(bytes, { failOn: "error" }).metadata();
    if (!metadata.width || !metadata.height) throw new Error("missing dimensions");
  } catch {
    throw new Error(`${label} is not a readable image.`);
  }
  return bytes;
}

async function uploadObject(key: string, body: Buffer, contentType: string) {
  const { error } = await storageClient().storage.from(EVIDENCE_BUCKET).upload(key, body, {
    contentType,
    upsert: false,
  });
  if (error) throw new Error("Unable to securely store the resident identity evidence.");
}

async function processAsset(
  applicationId: string,
  kind: "front" | "back" | "selfie",
  file: File,
  reference: string,
  submittedAt: Date,
  uploadedKeys: string[],
): Promise<EvidenceAsset> {
  const original = await validatedImage(file, kind === "selfie" ? "Selfie" : `${kind === "front" ? "Front" : "Back"} ID`);
  const assetId = randomUUID();
  const originalKey = `${applicationId}/original/${kind}-${assetId}`;
  await uploadObject(originalKey, original, file.type);
  uploadedKeys.push(originalKey);

  let reviewKey: string | null = null;
  if (kind !== "selfie") {
    const review = await sharp(original)
      .rotate()
      .resize({ width: 1800, height: 1800, fit: "inside", withoutEnlargement: true })
      .composite([{ input: watermarkSvg(reference, submittedAt), tile: true, blend: "over" }])
      .webp({ quality: 88 })
      .toBuffer();
    reviewKey = `${applicationId}/review/${kind}-review-${assetId}.webp`;
    await uploadObject(reviewKey, review, "image/webp");
    uploadedKeys.push(reviewKey);
  }

  return {
    originalKey,
    reviewKey,
    sha256: createHash("sha256").update(original).digest("hex"),
    mimeType: file.type,
    sizeBytes: file.size,
  };
}

export async function uploadIdentityEvidence(input: {
  applicationId: string;
  reference: string;
  submittedAt: Date;
  front: File;
  back: File | null;
  selfie: File;
}): Promise<IdentityEvidence> {
  const uploadedKeys: string[] = [];
  try {
    const front = await processAsset(input.applicationId, "front", input.front, input.reference, input.submittedAt, uploadedKeys);
    const back = input.back
      ? await processAsset(input.applicationId, "back", input.back, input.reference, input.submittedAt, uploadedKeys)
      : null;
    const selfie = await processAsset(input.applicationId, "selfie", input.selfie, input.reference, input.submittedAt, uploadedKeys);
    return { front, back, selfie, uploadedKeys };
  } catch (error) {
    await removeIdentityEvidence(uploadedKeys);
    throw error;
  }
}

export async function removeIdentityEvidence(keys: string[]) {
  if (!keys.length) return;
  await storageClient().storage.from(EVIDENCE_BUCKET).remove(keys);
}

export async function createIdentityEvidenceSignedUrl(key: string | null) {
  if (!key) return null;
  const { data, error } = await storageClient().storage.from(EVIDENCE_BUCKET).createSignedUrl(key, 60 * 10);
  return error ? null : data.signedUrl;
}

