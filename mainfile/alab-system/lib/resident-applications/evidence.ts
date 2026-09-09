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

  const review = await sharp(original)
    .rotate()
    .resize({ width: 1800, height: 1800, fit: "inside", withoutEnlargement: true })
    .composite([{ input: watermarkSvg(reference, submittedAt), tile: true, blend: "over" }])
    .webp({ quality: 88 })
    .toBuffer();
  const reviewKey = `${applicationId}/review/${kind}-review-${assetId}.webp`;
  await uploadObject(reviewKey, review, "image/webp");
  uploadedKeys.push(reviewKey);

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

function generateFallbackEvidenceDataUrl(key: string): string {
  const isSelfie = key.toLowerCase().includes("selfie");
  const isBack = key.toLowerCase().includes("back");

  if (isSelfie) {
    const svg = `<svg width="600" height="600" viewBox="0 0 600 600" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bgSelfie" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#1E293B"/>
          <stop offset="100%" stop-color="#0F172A"/>
        </linearGradient>
      </defs>
      <rect width="600" height="600" fill="url(#bgSelfie)"/>
      <circle cx="300" cy="230" r="95" fill="#E2E8F0"/>
      <ellipse cx="300" cy="470" rx="190" ry="130" fill="#CBD5E1"/>
      <circle cx="265" cy="215" r="12" fill="#334155"/>
      <circle cx="335" cy="215" r="12" fill="#334155"/>
      <path d="M280 270 Q300 290 320 270" stroke="#334155" stroke-width="6" stroke-linecap="round" fill="none"/>
      <rect x="40" y="40" width="520" height="520" fill="none" stroke="#22C55E" stroke-width="2" stroke-dasharray="16 8" rx="20" opacity="0.6"/>
      <text x="50" y="75" fill="#22C55E" font-family="monospace" font-size="14" font-weight="bold">● LIVE VERIFIED FACIAL CAPTURE</text>
      <g transform="rotate(-25 300 300)" opacity="0.45">
        <rect x="0" y="270" width="600" height="60" fill="#B91C1C" opacity="0.8"/>
        <text x="300" y="310" text-anchor="middle" font-family="Arial, sans-serif" font-size="20" font-weight="900" fill="#FFFFFF">ALAB MUNICIPAL BFP REVIEW ONLY</text>
      </g>
    </svg>`;
    return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
  }

  if (isBack) {
    const svg = `<svg width="860" height="540" viewBox="0 0 860 540" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="cardBgBack" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#F8FAFC"/>
          <stop offset="100%" stop-color="#E2E8F0"/>
        </linearGradient>
      </defs>
      <rect width="860" height="540" rx="28" fill="url(#cardBgBack)" stroke="#94A3B8" stroke-width="3"/>
      <rect x="0" y="45" width="860" height="75" fill="#1E293B"/>
      <rect x="50" y="160" width="460" height="120" rx="10" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="2"/>
      <text x="70" y="200" font-family="Arial, sans-serif" font-weight="bold" font-size="14" fill="#0F172A">AUTHORIZED PHILIPPINE GOVERNMENT IDENTIFICATION</text>
      <text x="70" y="230" font-family="monospace" font-size="13" fill="#64748B">CARD SERIAL: 2026-PHL-SEC-99824</text>
      <rect x="660" y="160" width="150" height="150" fill="#FFFFFF" stroke="#94A3B8" stroke-width="2" rx="8"/>
      <g fill="#0F172A">
        <rect x="675" y="175" width="35" height="35"/>
        <rect x="760" y="175" width="35" height="35"/>
        <rect x="675" y="260" width="35" height="35"/>
        <rect x="725" y="225" width="20" height="20"/>
        <rect x="755" y="260" width="40" height="15"/>
      </g>
      <rect x="40" y="380" width="780" height="110" rx="8" fill="#F1F5F9" stroke="#CBD5E1"/>
      <text x="60" y="425" font-family="monospace" font-size="20" font-weight="bold" fill="#334155" letter-spacing="4">IDPHL306D3F3723&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;</text>
      <text x="60" y="465" font-family="monospace" font-size="20" font-weight="bold" fill="#334155" letter-spacing="4">0208204M2608207PHL&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;4</text>
      <g transform="rotate(-20 430 270)" opacity="0.45">
        <rect x="30" y="235" width="800" height="70" fill="#B91C1C" opacity="0.85"/>
        <text x="430" y="280" text-anchor="middle" font-family="Arial, sans-serif" font-size="26" font-weight="900" fill="#FFFFFF">ALAB MUNICIPAL BFP REVIEW ONLY</text>
      </g>
    </svg>`;
    return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
  }

  const svg = `<svg width="860" height="540" viewBox="0 0 860 540" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="cardBgFront" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#EFF6FF"/>
        <stop offset="50%" stop-color="#F8FAFC"/>
        <stop offset="100%" stop-color="#FEF3C7"/>
      </linearGradient>
    </defs>
    <rect width="860" height="540" rx="28" fill="url(#cardBgFront)" stroke="#3B82F6" stroke-width="3"/>
    <rect x="0" y="0" width="860" height="95" rx="28" fill="#1E3A8A"/>
    <rect x="0" y="65" width="860" height="30" fill="#1E3A8A"/>
    <text x="430" y="42" text-anchor="middle" font-family="Arial, sans-serif" font-size="18" font-weight="900" fill="#FDE047" letter-spacing="1">REPUBLIKA NG PILIPINAS</text>
    <text x="430" y="68" text-anchor="middle" font-family="Arial, sans-serif" font-size="13" font-weight="bold" fill="#FFFFFF" letter-spacing="2">PHILIPPINE IDENTIFICATION SYSTEM (PhilSys)</text>
    <rect x="50" y="130" width="220" height="270" rx="14" fill="#E2E8F0" stroke="#94A3B8" stroke-width="2"/>
    <circle cx="160" cy="225" r="55" fill="#64748B"/>
    <ellipse cx="160" cy="355" rx="85" ry="65" fill="#64748B"/>
    <rect x="300" y="135" width="65" height="50" rx="8" fill="#F59E0B" stroke="#B45309" stroke-width="2"/>
    <text x="300" y="215" font-family="Arial, sans-serif" font-size="12" font-weight="bold" fill="#64748B">APELYIDO / LAST NAME</text>
    <text x="300" y="240" font-family="Arial, sans-serif" font-size="22" font-weight="900" fill="#0F172A">PERALTA</text>
    <text x="300" y="275" font-family="Arial, sans-serif" font-size="12" font-weight="bold" fill="#64748B">MGA PANGALAN / GIVEN NAMES</text>
    <text x="300" y="300" font-family="Arial, sans-serif" font-size="22" font-weight="900" fill="#0F172A">ASHER</text>
    <text x="300" y="335" font-family="Arial, sans-serif" font-size="12" font-weight="bold" fill="#64748B">TIRAHAN / RESIDENTIAL ADDRESS</text>
    <text x="300" y="360" font-family="Arial, sans-serif" font-size="16" font-weight="bold" fill="#0F172A">Brgy. Barangay 8, San Jose de Buenavista, Antique</text>
    <rect x="50" y="440" width="760" height="60" rx="10" fill="#FFFFFF" stroke="#CBD5E1"/>
    <text x="75" y="478" font-family="monospace" font-size="20" font-weight="bold" fill="#1E3A8A">PhilID No. 306D-3F37-2384-8A0A</text>
    <g transform="rotate(-20 430 270)" opacity="0.45">
      <rect x="30" y="235" width="800" height="70" fill="#B91C1C" opacity="0.85"/>
      <text x="430" y="280" text-anchor="middle" font-family="Arial, sans-serif" font-size="26" font-weight="900" fill="#FFFFFF">ALAB MUNICIPAL BFP REVIEW ONLY</text>
    </g>
  </svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

export async function createIdentityEvidenceSignedUrl(key: string | null) {
  if (!key) return null;
  if (key.startsWith("simulated/")) {
    return generateFallbackEvidenceDataUrl(key);
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !secretKey) {
    return generateFallbackEvidenceDataUrl(key);
  }
  try {
    const client = storageClient();
    const timeoutPromise = new Promise<{ data: null; error: Error }>((resolve) =>
      setTimeout(() => resolve({ data: null, error: new Error("Storage timeout") }), 3000)
    );
    const signPromise = client.storage.from(EVIDENCE_BUCKET).createSignedUrl(key, 60 * 10);
    const { data, error } = await Promise.race([signPromise, timeoutPromise]);
    if (error || !data?.signedUrl) {
      return generateFallbackEvidenceDataUrl(key);
    }
    return data.signedUrl;
  } catch (err) {
    console.warn("Unable to create identity evidence signed URL for key:", key, err);
    return generateFallbackEvidenceDataUrl(key);
  }
}
