import { watermarkOverlaySvg } from "./watermark-svg.mjs";

// The watermark drawing itself, in plain JavaScript so the deploy script that
// watermarks older photos can use it as well as the app. The caller passes in
// the sharp module it loaded.

/**
 * "Oct 2, 2026 · 2:31 PM" in Philippine time.
 * @param {Date} date
 * @returns {string}
 */
export function watermarkTime(date) {
  const day = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Manila", month: "short", day: "numeric", year: "numeric" }).format(date);
  const time = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Manila", hour: "numeric", minute: "2-digit" }).format(date);
  return `${day} · ${time}`.replace(/\s+/g, " ");
}

/**
 * Returns a copy of the image, upright and with the ALAB watermark drawn in.
 * Throws when the bytes are not a readable image.
 * @param {typeof import("sharp").default} sharp
 * @param {Buffer} input
 * @param {{ label: string; detail?: string; maxSize?: number; format?: "jpeg" | "webp" }} options
 * @returns {Promise<{ data: Buffer; mimeType: string; extension: string }>}
 */
export async function renderWatermark(sharp, input, { label, detail = "", maxSize = 2048, format = "jpeg" }) {
  // Decode once, upright and resized, so the overlay matches the pixels exactly.
  const base = await sharp(input, { failOn: "error" })
    .rotate()
    .resize({ width: maxSize, height: maxSize, fit: "inside", withoutEnlargement: true })
    .flatten({ background: "#ffffff" })
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width, height, channels } = base.info;
  const overlay = Buffer.from(watermarkOverlaySvg({ width, height, label, detail }));
  const pipeline = sharp(base.data, { raw: { width, height, channels } }).composite([{ input: overlay, top: 0, left: 0 }]);
  if (format === "webp") {
    return { data: await pipeline.webp({ quality: 88 }).toBuffer(), mimeType: "image/webp", extension: "webp" };
  }
  return { data: await pipeline.jpeg({ quality: 86, mozjpeg: true }).toBuffer(), mimeType: "image/jpeg", extension: "jpg" };
}
