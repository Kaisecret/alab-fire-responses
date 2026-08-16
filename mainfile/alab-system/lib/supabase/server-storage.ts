import "server-only";
import { createClient } from "@supabase/supabase-js";

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

export async function uploadFireReportPhoto(reportId: string, file: File) {
  const storageKey = `${reportId}/${crypto.randomUUID()}.${safeName(file.name)}`;
  const { error } = await storageClient().storage.from(bucket).upload(storageKey, file, {
    contentType: file.type,
    upsert: false,
  });
  if (error) throw new Error("Unable to securely upload the incident photo.");
  return { storageKey, originalFileName: file.name.slice(0, 255), mimeType: file.type, fileSizeBytes: file.size };
}

export async function deleteFireReportPhoto(storageKey: string) {
  await storageClient().storage.from(bucket).remove([storageKey]);
}

export async function getFireReportPhotoUrl(storageKey: string) {
  const { data, error } = await storageClient().storage.from(bucket).createSignedUrl(storageKey, 60 * 10);
  if (error) return null;
  return data.signedUrl;
}
