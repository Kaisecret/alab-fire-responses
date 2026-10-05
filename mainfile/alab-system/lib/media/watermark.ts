import type Sharp from "sharp";

import { renderWatermark, watermarkTime as formatWatermarkTime } from "./watermark-render.mjs";

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
export function watermarkTime(date: Date): string {
  return formatWatermarkTime(date);
}

/**
 * Returns a copy of the image, upright and with the ALAB watermark drawn in.
 * Throws when the bytes are not a readable image.
 */
export async function watermarkImage(input: Buffer, options: WatermarkOptions): Promise<WatermarkedImage> {
  return renderWatermark(await loadSharp(), input, options);
}
