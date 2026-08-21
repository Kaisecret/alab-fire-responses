"use client";

import { useEffect, useRef } from "react";

import { profileStyles, profileMarkup } from "../../_content/resident-profile-content";

export default function ProfilePage() {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    let profile: Record<string, string> = {};
    const setFields = (values: Record<string, string>) => Object.entries(values).forEach(([field, value]) => {
      root.querySelectorAll<HTMLElement>(`[data-profile-field="${field}"]`).forEach((element) => { element.textContent = value; });
    });
    const closeDialogs = () => root.querySelectorAll<HTMLElement>("[data-profile-dialog]").forEach((dialog) => { dialog.hidden = true; });
    const openDialog = (name: string) => {
      const dialog = root.querySelector<HTMLElement>(`[data-profile-dialog="${name}"]`);
      if (!dialog) return;
      dialog.hidden = false;
      if (name === "edit-profile") {
        const form = dialog.querySelector<HTMLFormElement>("form");
        ["name", "barangay", "phone", "email"].forEach((field) => { const input = form?.elements.namedItem(field) as HTMLInputElement | null; if (input) input.value = profile[field] ?? ""; });
      }
    };
    const onClick = (event: Event) => {
      const target = (event.target as HTMLElement).closest<HTMLElement>("[data-profile-action], [data-profile-close]");
      if (!target) return;
      event.preventDefault();
      if (target.hasAttribute("data-profile-close")) closeDialogs();
      else openDialog(target.dataset.profileAction ?? "");
    };
    const onSubmit = async (event: Event) => {
      const form = event.target as HTMLFormElement;
      if (!form.matches("[data-profile-form]")) return;
      event.preventDefault();
      const endpoint = form.dataset.profileForm === "password" ? "/api/resident/profile/password" : "/api/resident/profile";
      const body = Object.fromEntries(new FormData(form).entries());
      const feedback = form.querySelector<HTMLElement>("[data-profile-feedback]");
      const response = await fetch(endpoint, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const result = await response.json() as { error?: string; profile?: Record<string, string> };
      if (!response.ok) { if (feedback) feedback.textContent = result.error ?? "Unable to save changes."; return; }
      if (result.profile) { profile = { ...profile, ...result.profile }; setFields(result.profile); }
      if (feedback) feedback.textContent = form.dataset.profileForm === "password" ? "Password updated." : "Contact details updated.";
      if (form.dataset.profileForm === "password") form.reset();
    };
    root.addEventListener("click", onClick);
    root.addEventListener("submit", onSubmit);
    fetch("/api/resident/profile")
      .then(async (response) => {
        const body = await response.json() as { profile?: Record<string, string> };
        return { response, body };
      })
      .then(({ response, body }) => {
        if (!response.ok || !body.profile) return;
        profile = body.profile;
        setFields(profile);
      })
      .catch(() => undefined);
    return () => { root.removeEventListener("click", onClick); root.removeEventListener("submit", onSubmit); };
  }, []);

  return (
    <>
      <style>{profileStyles}</style>
      <div ref={rootRef} dangerouslySetInnerHTML={{ __html: profileMarkup }} />
    </>
  );
}
