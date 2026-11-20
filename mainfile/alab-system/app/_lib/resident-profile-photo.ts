"use client";

import { useEffect, useState } from "react";

export const DEFAULT_RESIDENT_PHOTO = "/images/resident-avatar.webp";
export const RESIDENT_PHOTO_CHANGED = "alab:resident-photo-changed";

export function useResidentProfilePhoto(enabled = true) {
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!enabled) return;
    let changed = false;
    const controller = new AbortController();
    const update = (event: Event) => {
      changed = true;
      setPhotoUrl((event as CustomEvent<{ photoUrl: string | null }>).detail.photoUrl);
    };
    window.addEventListener(RESIDENT_PHOTO_CHANGED, update);
    fetch("/api/resident/profile/photo", { cache: "no-store", signal: controller.signal })
      .then(async response => {
        if (!response.ok) return;
        const body = await response.json() as { photoUrl?: string | null };
        // An older read must never replace a photo the resident just saved.
        if (!changed && !controller.signal.aborted) setPhotoUrl(body.photoUrl ?? null);
      }).catch(() => undefined);
    return () => {
      controller.abort();
      window.removeEventListener(RESIDENT_PHOTO_CHANGED, update);
    };
  }, [enabled]);
  return enabled ? photoUrl : null;
}
