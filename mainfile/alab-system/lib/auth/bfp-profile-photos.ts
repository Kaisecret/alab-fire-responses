import "server-only";

import { createClient } from "@supabase/supabase-js";

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

function isImageSignature(photo: Buffer, type: string) {
  if (type === "image/jpeg") return photo.length >= 3 && photo[0] === 0xff && photo[1] === 0xd8 && photo[2] === 0xff;
  if (type === "image/png") return photo.length >= 8 && photo.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  return photo.length >= 12 && photo.subarray(0, 4).toString("ascii") === "RIFF" && photo.subarray(8, 12).toString("ascii") === "WEBP";
}

async function verifiedPhoto(file: File) {
  if (!acceptedImageTypes.has(file.type) || file.size < 1 || file.size > maxPhotoBytes) {
    throw new Error("INVALID_PROFILE_PHOTO");
  }

  const input = Buffer.from(await file.arrayBuffer());
  if (!isImageSignature(input, file.type)) throw new Error("INVALID_PROFILE_PHOTO");
  return input;
}

export async function uploadBfpProfilePhoto(userId: string, file: File) {
  const photo = await verifiedPhoto(file);
  const storageKey = `${userId}/profile`;
  const { error } = await (await profilePhotoStorage()).storage.from(bucket).upload(storageKey, photo, {
    contentType: file.type,
    cacheControl: "private, max-age=60",
    upsert: true,
  });
  if (error) throw new Error("PROFILE_PHOTO_UPLOAD_FAILED");
  return storageKey;
}

export async function createBfpProfilePhotoUrl(userId: string) {
  try {
    const storageKey = `${userId}/profile`;
    const { data, error } = await storageClient().storage.from(bucket).createSignedUrl(storageKey, 60 * 60 * 24 * 7);
    return error || !data ? null : `${data.signedUrl}&v=${Date.now()}`;
  } catch {
    return null;
  }
}
