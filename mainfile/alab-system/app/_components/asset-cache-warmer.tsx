"use client";

import { useEffect } from "react";

const STATIC_IMAGE_ASSETS: string[] = [
  // Municipal & Provincial Login
  "/images/formunicipallogin.webp",
  "/images/FOR%20PROVOCIAL%20SIDE.webp",
  "/images/WHITE%20LOGO.webp",
  // Resident Login & Sign Up
  "/images/side%20pic%20for%20login.webp",
  "/images/for%20sign%20up.webp",
  // Shared Brand Logos & Icons
  "/images/Logo.webp",
  "/images/LOGO%20FIRE.webp",
  "/images/fire%20logo.webp",
  "/images/logo%20white%20tint.webp",
  "/images/FAVICON.webp",
  // Landing Page Hero & Graphics
  "/images/bg%20images.webp",
  "/images/phone.webp",
  "/images/BFPBACK.webp",
  "/images/panay.webp",
];

const CACHE_NAME = "alab-static-assets-v1";

export function AssetCacheWarmer() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    // 1. Browser Cache API (persistent across reloads and offline)
    if ("caches" in window) {
      window.caches
        .open(CACHE_NAME)
        .then(async (cache) => {
          for (const assetUrl of STATIC_IMAGE_ASSETS) {
            try {
              const matched = await cache.match(assetUrl);
              if (!matched) {
                const response = await fetch(assetUrl, { cache: "force-cache" });
                if (response.ok) {
                  await cache.put(assetUrl, response.clone());
                }
              }
            } catch {
              // Non-blocking background caching
            }
          }
        })
        .catch(() => {});
    }

    // 2. In-Memory Image Pre-decoder (eliminates paint flicker on refresh)
    STATIC_IMAGE_ASSETS.forEach((src) => {
      try {
        const img = new Image();
        img.src = src;
        if ("decode" in img) {
          img.decode().catch(() => {});
        }
      } catch {
        // Non-blocking
      }
    });
  }, []);

  return null;
}
