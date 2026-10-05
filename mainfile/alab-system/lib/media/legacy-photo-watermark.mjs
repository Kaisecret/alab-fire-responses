import { watermarkTime } from "./watermark-render.mjs";

// Fire report photos sent before the watermark existed (2 Oct 2026) were
// stored as sent. This gives each one the watermark a new report gets, keeps
// its untouched original under `original/` beside it, and points the photo
// record at the watermarked copy. A photo that already has an original kept
// beside it was watermarked when it arrived, so running this again is a no-op.

/**
 * Where the untouched original of a watermarked photo is kept.
 * @param {string} storageKey
 */
export function originalPhotoKey(storageKey) {
  const slash = storageKey.lastIndexOf("/");
  const name = storageKey.slice(slash + 1).replace(/\.[^.]+$/, "");
  return `${storageKey.slice(0, slash)}/original/${name}`;
}

/**
 * @param {{
 *   db: { query: (sql: string, params?: unknown[]) => Promise<{ rows: any[] }> };
 *   storage: {
 *     hasOriginal: (storageKey: string) => Promise<boolean>;
 *     download: (key: string) => Promise<Buffer>;
 *     upload: (key: string, data: Buffer, contentType: string) => Promise<void>;
 *     remove: (keys: string[]) => Promise<void>;
 *   };
 *   render: (input: Buffer, options: { label: string; detail: string }) => Promise<{ data: Buffer; mimeType: string; extension: string }>;
 *   newId?: () => string;
 *   log?: { log: (...args: unknown[]) => void; error: (...args: unknown[]) => void };
 * }} deps
 */
export async function watermarkLegacyPhotos({ db, storage, render, newId = () => crypto.randomUUID(), log = console }) {
  const { rows } = await db.query(`
    select photo.id, photo.storage_key as "storageKey", photo.mime_type as "mimeType",
           photo.uploaded_at as "uploadedAt", report.reference_number as "referenceNumber"
      from public.fire_report_photos photo
      join public.fire_reports report on report.id = photo.fire_report_id
     order by photo.uploaded_at, photo.id`);
  const summary = { checked: rows.length, watermarked: 0, failed: 0 };

  for (const photo of rows) {
    if (await storage.hasOriginal(photo.storageKey)) continue;
    const folder = photo.storageKey.slice(0, photo.storageKey.lastIndexOf("/"));
    let marked;
    try {
      const original = await storage.download(photo.storageKey);
      marked = await render(original, {
        label: "Fire report evidence",
        detail: `${photo.referenceNumber} · ${watermarkTime(new Date(photo.uploadedAt))}`,
      });
      const id = newId();
      const keptKey = `${folder}/original/${id}`;
      const shownKey = `${folder}/${id}.${marked.extension}`;
      try {
        await storage.upload(keptKey, original, photo.mimeType);
        await storage.upload(shownKey, marked.data, marked.mimeType);
        const updated = await db.query(
          `update public.fire_report_photos
              set storage_key = $1, mime_type = $2, file_size_bytes = $3
            where id = $4 and storage_key = $5
            returning id`,
          [shownKey, marked.mimeType, marked.data.length, photo.id, photo.storageKey],
        );
        if (updated.rows.length !== 1) throw new Error("photo record changed while it was being watermarked");
      } catch (error) {
        await storage.remove([keptKey, shownKey]).catch(() => undefined);
        throw error;
      }
    } catch (error) {
      summary.failed += 1;
      log.error(`Legacy photo ${photo.id} left as it was:`, error instanceof Error ? error.message : error);
      continue;
    }
    // The original is kept under original/, so the unmarked viewable copy goes.
    await storage.remove([photo.storageKey]).catch((error) => {
      log.error(`Legacy photo ${photo.id}: old copy ${photo.storageKey} could not be removed`, error);
    });
    summary.watermarked += 1;
  }
  return summary;
}
