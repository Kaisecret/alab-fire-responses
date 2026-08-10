"use client";

import { useEffect, useRef } from "react";

import { profileStyles, profileMarkup } from "../../_content/resident-profile-content";

export default function ProfilePage() {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    fetch("/api/resident/profile")
      .then(async (response) => {
        const body = await response.json() as { profile?: Record<string, string> };
        return { response, body };
      })
      .then(({ response, body }) => {
        if (!response.ok || !body.profile) return;
        Object.entries(body.profile).forEach(([field, value]) => {
          root.querySelectorAll<HTMLElement>(`[data-profile-field="${field}"]`).forEach((element) => {
            element.textContent = value;
          });
        });
      })
      .catch(() => undefined);
  }, []);

  return (
    <>
      <style>{profileStyles}</style>
      <div ref={rootRef} dangerouslySetInnerHTML={{ __html: profileMarkup }} />
    </>
  );
}
