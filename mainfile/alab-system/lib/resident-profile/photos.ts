import "server-only";

import { createClient } from "@supabase/supabase-js";

const bucket = "resident-profile-photos";
const maxPhotoBytes = 3 * 1024 * 1024;

function storageClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("PROFILE_PHOTO_STORAGE_FAILED");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function missingObject(error: { statusCode?: string | number; message?: string }) {
  return String(error.statusCode) === "404" || /^(object|bucket) not found\.?$/i.test(error.message ?? "");
}

async function photoBytes(file: File) {
  if (file.size < 1 || file.size > maxPhotoBytes || !["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    throw new Error("INVALID_PROFILE_PHOTO");
  }
  // Decode the bytes, rather than trusting a file extension or MIME type.
  const sharp = (await import("sharp")).default;
  try {
    const image = sharp(Buffer.from(await file.arrayBuffer()), { failOn: "error", limitInputPixels: 25_000_000 });
    const metadata = await image.metadata();
    if (!metadata.width || !metadata.height || !["jpeg", "png", "webp"].includes(metadata.format ?? "")) {
      throw new Error("Unreadable image");
    }
    // Normalize orientation and remove EXIF/location metadata in the saved copy.
    return await image.rotate().resize({ width: 1024, height: 1024, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 85 }).toBuffer();
  } catch {
    throw new Error("INVALID_PROFILE_PHOTO");
  }
}

export async function uploadResidentProfilePhoto(userId: string, file: File) {
  const bytes = await photoBytes(file);
  const client = storageClient();
  const options = { public: false, fileSizeLimit: maxPhotoBytes, allowedMimeTypes: ["image/jpeg"] };
  const { error: bucketError } = await client.storage.createBucket(bucket, options);
  if (bucketError) {
    if (!/already exists|duplicate/i.test(bucketError.message)) throw new Error("PROFILE_PHOTO_STORAGE_FAILED");
    const { error } = await client.storage.updateBucket(bucket, options);
    if (error) throw new Error("PROFILE_PHOTO_STORAGE_FAILED");
  }
  const { error } = await client.storage.from(bucket).upload(`${userId}/profile`, bytes, {
    contentType: "image/jpeg", cacheControl: "0", upsert: true,
  });
  if (error) throw new Error("PROFILE_PHOTO_STORAGE_FAILED");
}

export async function createResidentProfilePhotoUrl(userId: string) {
  const { data, error } = await storageClient().storage.from(bucket).createSignedUrl(`${userId}/profile`, 3600);
  if (error) {
    if (missingObject(error)) return null;
    throw new Error("PROFILE_PHOTO_STORAGE_FAILED");
  }
  if (!data?.signedUrl) throw new Error("PROFILE_PHOTO_STORAGE_FAILED");
  return `${data.signedUrl}&v=${Date.now()}`;
}

export async function deleteResidentProfilePhoto(userId: string) {
  const { error } = await storageClient().storage.from(bucket).remove([`${userId}/profile`]);
  if (error && !missingObject(error)) throw new Error("PROFILE_PHOTO_STORAGE_FAILED");
}
