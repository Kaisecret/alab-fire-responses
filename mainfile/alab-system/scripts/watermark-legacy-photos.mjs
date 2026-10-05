import nextEnv from "@next/env";
import pg from "pg";
import { createClient } from "@supabase/supabase-js";

import { watermarkLegacyPhotos } from "../lib/media/legacy-photo-watermark.mjs";
import { renderWatermark } from "../lib/media/watermark-render.mjs";

// Deploy step: gives fire report photos sent before the watermark existed the
// same watermark new photos get. It reruns on every production deploy but only
// touches photos that have no original kept beside them, so after the first
// run it does nothing. It never fails the build: evidence that cannot be
// processed is left exactly as it was and the reason is logged.

const bucket = "fire-report-photos";

if (process.env.VERCEL_ENV === "preview") {
  console.log("Skipping legacy photo watermark for Vercel preview deployment.");
  process.exit(0);
}

nextEnv.loadEnvConfig(process.cwd());
const databaseUrl = process.env.DATABASE_URL;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!databaseUrl || !supabaseUrl || !secretKey) {
  console.log("Legacy photo watermark skipped: storage credentials are not set.");
  process.exit(0);
}

function storageAdapter() {
  const files = createClient(supabaseUrl, secretKey, { auth: { persistSession: false, autoRefreshToken: false } }).storage.from(bucket);
  return {
    async hasOriginal(storageKey) {
      const slash = storageKey.lastIndexOf("/");
      const name = storageKey.slice(slash + 1).replace(/\.[^.]+$/, "");
      const { data, error } = await files.list(`${storageKey.slice(0, slash)}/original`, { search: name, limit: 100 });
      if (error) throw error;
      return (data ?? []).some((item) => item.name === name);
    },
    async download(key) {
      const { data, error } = await files.download(key);
      if (error || !data) throw error ?? new Error(`Unable to download ${key}`);
      return Buffer.from(await data.arrayBuffer());
    },
    async upload(key, data, contentType) {
      const { error } = await files.upload(key, data, { contentType, upsert: false });
      if (error) throw error;
    },
    async remove(keys) {
      const { error } = await files.remove(keys);
      if (error) throw error;
    },
  };
}

const client = new pg.Client({ connectionString: databaseUrl, connectionTimeoutMillis: 60_000, ssl: { rejectUnauthorized: false } });
try {
  const sharp = (await import("sharp")).default;
  await client.connect();
  const summary = await watermarkLegacyPhotos({
    db: client,
    storage: storageAdapter(),
    render: (input, options) => renderWatermark(sharp, input, options),
  });
  console.log(`Legacy photo watermark: ${JSON.stringify(summary)}`);
} catch (error) {
  console.error("Legacy photo watermark skipped:", error);
} finally {
  await client.end().catch(() => undefined);
}
