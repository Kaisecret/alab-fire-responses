"use client";

import { useEffect, useState } from "react";

const PHOTO_CACHE_NAME = "alab-incident-photos-v1";

/**
 * In-memory map of cache-key -> Blob URL for instant 0ms synchronous resolution
 * during re-renders, polling cycles, and tab sessions.
 */
const memoryUrlMap = new Map<string, string>();
const inFlightFetches = new Map<string, Promise<string>>();

/**
 * Extracts a stable cache key by stripping ephemeral query parameters
 * (such as Supabase storage signed tokens, expiration timestamps, etc.).
 *
 * e.g. "https://xyz.supabase.co/storage/v1/object/sign/incident-photos/abc.jpg?token=123"
 *   -> "https://xyz.supabase.co/storage/v1/object/sign/incident-photos/abc.jpg"
 */
export function getPhotoCacheKey(url: string): string {
  if (!url) return "";
  try {
    const parsed = new URL(url, typeof window !== "undefined" ? window.location.origin : "http://localhost");
    return `${parsed.origin}${parsed.pathname}`;
  } catch {
    return url.split("?")[0] || url;
  }
}

/**
 * Synchronously returns the cached local blob URL if already loaded in memory,
 * or falls back to the original URL.
 */
export function getCachedPhotoOrOriginal(url: string): string {
  if (!url) return url;
  const key = getPhotoCacheKey(url);
  return memoryUrlMap.get(key) || url;
}

/**
 * Checks if the photo is already cached in memory or persistent Cache Storage API,
 * and if not, fetches and caches it locally so subsequent refreshes never re-download.
 */
export async function getCachedPhotoUrl(photoUrl: string): Promise<string> {
  if (!photoUrl || typeof window === "undefined") return photoUrl;

  const cacheKey = getPhotoCacheKey(photoUrl);

  // 1. Instantaneous in-memory cache hit (0ms)
  if (memoryUrlMap.has(cacheKey)) {
    return memoryUrlMap.get(cacheKey)!;
  }


  // Deduplicate in-flight fetch for the same image
  if (inFlightFetches.has(cacheKey)) {
    return inFlightFetches.get(cacheKey)!;
  }

  const fetchPromise = (async () => {
    // 2. Check persistent browser Cache Storage API
    if ("caches" in window) {
      try {
        const cache = await window.caches.open(PHOTO_CACHE_NAME);
        const match = await cache.match(cacheKey);
        if (match) {
          const blob = await match.blob();
          const blobUrl = URL.createObjectURL(blob);
          memoryUrlMap.set(cacheKey, blobUrl);
          return blobUrl;
        }

        // Not yet in cache: fetch from network and persist locally
        const response = await fetch(photoUrl, { mode: "cors" });
        if (response.ok) {
          // Clone the response to write to cache while consuming the body
          await cache.put(cacheKey, response.clone());
          const blob = await response.blob();
          const blobUrl = URL.createObjectURL(blob);
          memoryUrlMap.set(cacheKey, blobUrl);
          return blobUrl;
        }
      } catch (err) {
        console.warn("[LocalPhotoCache] Cache read/write error, falling back to original URL:", err);
      }
    }

    // 3. Fallback to direct URL if Cache API is unavailable
    memoryUrlMap.set(cacheKey, photoUrl);
    return photoUrl;
  })();

  inFlightFetches.set(cacheKey, fetchPromise);

  try {
    return await fetchPromise;
  } finally {
    inFlightFetches.delete(cacheKey);
  }
}

/**
 * Pre-warms local cache for multiple photos in parallel.
 */
export function preloadPhotos(photos: string[]): void {
  if (typeof window === "undefined" || !Array.isArray(photos)) return;
  for (const url of photos) {
    if (url) {
      void getCachedPhotoUrl(url);
    }
  }
}

/**
 * React hook that returns the cached local blob URL for a photo.
 * Returns synchronously if already in memory, or updates once retrieved from disk/network.
 */
export function useCachedPhoto(photoUrl?: string | null): string | null {
  const [src, setSrc] = useState<string | null>(() => {
    if (!photoUrl) return null;
    const key = getPhotoCacheKey(photoUrl);
    return memoryUrlMap.get(key) || photoUrl;
  });

  useEffect(() => {
    if (!photoUrl) {
      setSrc(null);
      return;
    }

    const key = getPhotoCacheKey(photoUrl);
    if (memoryUrlMap.has(key)) {
      setSrc(memoryUrlMap.get(key)!);
      return;
    }

    let active = true;
    getCachedPhotoUrl(photoUrl)
      .then((resolved) => {
        if (active && resolved) {
          setSrc(resolved);
        }
      })
      .catch(() => {
        if (active) setSrc(photoUrl);
      });

    return () => {
      active = false;
    };
  }, [photoUrl]);

  return src;
}
