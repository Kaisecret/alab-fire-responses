import "server-only";
import { createClient } from "@supabase/supabase-js";

import { watermarkImage, watermarkTime } from "../media/watermark";

const bucket = "fire-report-photos";

function storageClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("SUPABASE_SECRET_KEY is required for private incident photo storage.");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function safeName(name: string) {
  const extension = name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  return extension.length <= 5 ? extension : "jpg";
}

export type PhotoWatermark = { label: string; detail?: string };

/**
 * Stores a photo with the ALAB watermark drawn in, which is the copy everyone
 * views. The untouched original is kept beside it under `original/` for
 * investigation. When the photo cannot be processed, the original is stored
 * as the viewable copy so evidence is never lost.
 */
async function storeWatermarkedPhoto(folder: string, file: File, watermark: PhotoWatermark, failureMessage: string) {
  const photoId = crypto.randomUUID();
  const originalBytes = Buffer.from(await file.arrayBuffer());
  const client = storageClient();
  let viewable: { data: Buffer; mimeType: string; extension: string } | null = null;
  try {
    viewable = await watermarkImage(originalBytes, watermark);
  } catch (error) {
    console.error("Photo watermark unavailable; storing the original as the viewable copy", error);
  }

  if (!viewable) {
    const storageKey = `${folder}/${photoId}.${safeName(file.name)}`;
    const { error } = await client.storage.from(bucket).upload(storageKey, originalBytes, { contentType: file.type, upsert: false });
    if (error) throw new Error(failureMessage);
    return { storageKey, originalFileName: file.name.slice(0, 255), mimeType: file.type, fileSizeBytes: file.size };
  }

  const storageKey = `${folder}/${photoId}.${viewable.extension}`;
  const originalKey = `${folder}/original/${photoId}`;
  const [shown, kept] = await Promise.all([
    client.storage.from(bucket).upload(storageKey, viewable.data, { contentType: viewable.mimeType, upsert: false }),
    client.storage.from(bucket).upload(originalKey, originalBytes, { contentType: file.type, upsert: false }),
  ]);
  if (shown.error) {
    if (!kept.error) await client.storage.from(bucket).remove([originalKey]).catch(() => undefined);
    throw new Error(failureMessage);
  }
  if (kept.error) console.error("Original photo could not be kept beside the watermarked copy", { storageKey });
  return { storageKey, originalFileName: file.name.slice(0, 255), mimeType: viewable.mimeType, fileSizeBytes: viewable.data.length };
}

/** Where the untouched original of a watermarked photo is kept. */
export function originalPhotoKey(storageKey: string) {
  const slash = storageKey.lastIndexOf("/");
  const name = storageKey.slice(slash + 1).replace(/\.[^.]+$/, "");
  return `${storageKey.slice(0, slash)}/original/${name}`;
}

export async function uploadFireReportPhoto(reportId: string, file: File, watermark: PhotoWatermark = { label: "Fire report evidence" }) {
  return storeWatermarkedPhoto(reportId, file, watermark, "Unable to securely upload the incident photo.");
}

/**
 * Photographs attached to a backup request. They live in the same private
 * bucket as incident evidence, under their own prefix.
 */
export async function uploadBackupRequestPhoto(backupRequestId: string, file: File) {
  return storeWatermarkedPhoto(
    `backup-requests/${backupRequestId}`,
    file,
    { label: "Backup request", detail: watermarkTime(new Date()) },
    "Unable to securely upload the backup request photo.",
  );
}

export async function deleteFireReportPhoto(storageKey: string) {
  await storageClient().storage.from(bucket).remove([storageKey, originalPhotoKey(storageKey)]);
}

export async function getFireReportPhotoUrl(storageKey: string) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return null;
    const timeoutPromise = new Promise<{ data: null; error: Error }>((resolve) =>
      setTimeout(() => resolve({ data: null, error: new Error("Storage timeout") }), 3000)
    );
    const signPromise = storageClient().storage.from(bucket).createSignedUrl(storageKey, 60 * 10);
    const { data, error } = await Promise.race([signPromise, timeoutPromise]);
    if (error) return null;
    return data?.signedUrl ?? null;
  } catch (err) {
    console.warn("Unable to create fire report photo signed URL:", err);
    return null;
  }
}

