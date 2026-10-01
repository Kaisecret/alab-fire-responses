import type Sharp from "sharp";

import { watermarkOverlaySvg } from "./watermark-svg.mjs";

// sharp is loaded lazily so a missing native binary becomes a caught error
// instead of crashing the route module (see resident-applications/evidence).
let sharpModule: typeof Sharp | null = null;
async function loadSharp(): Promise<typeof Sharp> {
  if (!sharpModule) sharpModule = (await import("sharp")).default;
  return sharpModule;
}

export type WatermarkOptions = {
  /** What the photo is for, e.g. "Fire report evidence". */
  label: string;
  /** Reference and time shown in the corner tag. */
  detail?: string;
  /** Longest side of the stored copy, in pixels. */
  maxSize?: number;
  format?: "jpeg" | "webp";
};

export type WatermarkedImage = { data: Buffer; mimeType: string; extension: string };

/** "Oct 2, 2026 · 2:31 PM" in Philippine time. */
export function watermarkTime(date: Date) {
  const day = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Manila", month: "short", day: "numeric", year: "numeric" }).format(date);
  const time = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Manila", hour: "numeric", minute: "2-digit" }).format(date);
  return `${day} · ${time}`.replace(/\s+/g, " ");
}

/**
 * Returns a copy of the image, upright and with the ALAB watermark drawn in.
 * Throws when the bytes are not a readable image.
 */
export async function watermarkImage(input: Buffer, { label, detail = "", maxSize = 2048, format = "jpeg" }: WatermarkOptions): Promise<WatermarkedImage> {
  const sharp = await loadSharp();
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
