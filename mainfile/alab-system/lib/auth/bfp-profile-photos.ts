import "server-only";

import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

const bucket = "bfp-profile-photos";
const maxPhotoBytes = 2 * 1024 * 1024;
const acceptedImageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const allowedMimeTypes = ["image/jpeg", "image/png", "image/webp"];

function storageClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("SUPABASE_SECRET_KEY is required for private BFP profile photos.");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function profilePhotoStorage() {
  const client = storageClient();
  const { error } = await client.storage.createBucket(bucket, {
    public: false,
    fileSizeLimit: maxPhotoBytes,
    allowedMimeTypes,
  });
  if (error && !/already exists|duplicate|exists/i.test(error.message)) {
    throw new Error("PROFILE_PHOTO_UPLOAD_FAILED");
  }
  return client;
}

async function normalizedPhoto(file: File) {
  if (!acceptedImageTypes.has(file.type) || file.size < 1 || file.size > maxPhotoBytes) {
    throw new Error("INVALID_PROFILE_PHOTO");
  }

  const input = Buffer.from(await file.arrayBuffer());
  try {
    const metadata = await sharp(input, { failOn: "error" }).metadata();
    if (!metadata.width || !metadata.height) throw new Error("missing dimensions");
  } catch {
    throw new Error("INVALID_PROFILE_PHOTO");
  }

  return sharp(input)
    .rotate()
    .resize(512, 512, { fit: "cover", position: "attention", withoutEnlargement: false })
    .webp({ quality: 88 })
    .toBuffer();
}

export async function uploadBfpProfilePhoto(userId: string, file: File) {
  const photo = await normalizedPhoto(file);
  const storageKey = `${userId}/profile.webp`;
  const { error } = await (await profilePhotoStorage()).storage.from(bucket).upload(storageKey, photo, {
    contentType: "image/webp",
    cacheControl: "private, max-age=60",
    upsert: true,
  });
  if (error) throw new Error("PROFILE_PHOTO_UPLOAD_FAILED");
  return storageKey;
}

export async function createBfpProfilePhotoUrl(userId: string) {
  const storageKey = `${userId}/profile.webp`;
  const { data, error } = await storageClient().storage.from(bucket).createSignedUrl(storageKey, 60 * 60 * 24 * 7);
  return error || !data ? null : `${data.signedUrl}&v=${Date.now()}`;
}
