"use client";

import { useEffect, useRef } from "react";

import { profileStyles, profileMarkup } from "../../_content/resident-profile-content";

export default function ProfilePage() {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    type Notifications = { push: boolean; incidents: boolean; emergency: boolean };
    type Security = { pinConfigured: boolean; bfpContactAllowed: boolean };
    type Activity = { deviceLabel?: string; occurredAt?: string };
    let profile: Record<string, unknown> = {};
    let notifications: Notifications | null = null;
    let security: Security | null = null;
    const setFields = (values: Record<string, unknown>) => Object.entries(values).forEach(([field, value]) => {
      if (typeof value !== "string") return;
      root.querySelectorAll<HTMLElement>(`[data-profile-field="${field}"]`).forEach((element) => { element.textContent = value; });
    });
    const closeDialogs = () => root.querySelectorAll<HTMLElement>("[data-profile-dialog]").forEach((dialog) => { dialog.hidden = true; });
    const setFeedback = (container: ParentNode, message: string) => {
      const feedback = container.querySelector<HTMLElement>("[data-profile-feedback]");
      if (feedback) feedback.textContent = message;
    };
    const syncNotifications = (values: Notifications) => {
      notifications = values;
      (Object.keys(values) as Array<keyof Notifications>).forEach((preference) => {
        root.querySelectorAll<HTMLButtonElement>(`[data-notification-toggle="${preference}"]`).forEach((toggle) => {
          toggle.setAttribute("aria-pressed", String(values[preference]));
          toggle.classList.toggle("active", values[preference]);
        });
      });
    };
    const loadSecurity = async (dialog: HTMLElement) => {
      setFeedback(dialog, "");
      try {
        const response = await fetch("/api/resident/profile/security");
        const result = await response.json() as { error?: string; security?: Security };
        if (!response.ok || !result.security) throw new Error(result.error ?? "Unable to load security settings.");
        security = result.security;
        const checkbox = dialog.querySelector<HTMLInputElement>('input[name="bfpContactAllowed"]');
        if (checkbox) checkbox.checked = security.bfpContactAllowed;
      } catch (error) {
        setFeedback(dialog, error instanceof Error ? error.message : "Unable to load security settings.");
      }
    };
    const loadActivity = async (dialog: HTMLElement) => {
      const activityList = dialog.querySelector<HTMLElement>("[data-login-activity]");
      if (!activityList) return;
      activityList.textContent = "Loading recent sign-ins...";
      try {
        const response = await fetch("/api/resident/profile/activity");
        const result = await response.json() as { error?: string; activity?: Activity[] };
        if (!response.ok || !Array.isArray(result.activity)) throw new Error(result.error ?? "Unable to load login activity.");
        activityList.textContent = "";
        if (!result.activity.length) {
          activityList.textContent = "No recent sign-ins were found.";
          return;
        }
        result.activity.forEach(({ deviceLabel, occurredAt }) => {
          const item = document.createElement("div");
          item.className = "login-activity-item";
          const device = document.createElement("strong");
          device.textContent = deviceLabel || "Unknown device";
          const date = document.createElement("span");
          const occurred = occurredAt ? new Date(occurredAt) : null;
          date.textContent = occurred && !Number.isNaN(occurred.getTime()) ? occurred.toLocaleString() : "Date unavailable";
          item.append(device, date);
          activityList.append(item);
        });
      } catch (error) {
        activityList.textContent = error instanceof Error ? error.message : "Unable to load login activity.";
      }
    };
    const openDialog = (name: string) => {
      const dialog = root.querySelector<HTMLElement>(`[data-profile-dialog="${name}"]`);
      if (!dialog) return;
      dialog.hidden = false;
      if (name === "edit-profile") {
        const form = dialog.querySelector<HTMLFormElement>("form");
        ["name", "barangay", "phone", "email"].forEach((field) => { const input = form?.elements.namedItem(field) as HTMLInputElement | null; if (input) input.value = typeof profile[field] === "string" ? profile[field] : ""; });
      }
      if (name === "pin-security" || name === "privacy-settings") void loadSecurity(dialog);
      if (name === "login-activity") void loadActivity(dialog);
    };
    const onClick = (event: Event) => {
      const clicked = event.target as HTMLElement;
      const toggle = clicked.closest<HTMLButtonElement>("[data-notification-toggle]");
      if (toggle) {
        event.preventDefault();
        const preference = toggle.dataset.notificationToggle as keyof Notifications | undefined;
        if (!preference || !notifications) return;
        const feedback = root.querySelector<HTMLElement>("[data-notification-feedback]");
        if (feedback) feedback.textContent = "";
        const nextNotifications = { ...notifications, [preference]: !notifications[preference] };
        void fetch("/api/resident/profile", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ notifications: nextNotifications }) })
          .then(async (response) => ({ response, result: await response.json() as { error?: string; notifications?: Notifications } }))
          .then(({ response, result }) => {
            if (!response.ok || !result.notifications) {
              if (feedback) feedback.textContent = result.error ?? "Unable to save notification preference.";
              return;
            }
            syncNotifications(result.notifications);
          })
          .catch(() => { if (feedback) feedback.textContent = "Unable to save notification preference."; });
        return;
      }
      const target = clicked.closest<HTMLElement>("[data-profile-action], [data-profile-close]");
      if (!target) return;
      event.preventDefault();
      if (target.hasAttribute("data-profile-close")) closeDialogs();
      else if (target.dataset.profileAction === "notification-settings") {
        const panel = root.querySelector<HTMLElement>("#profile-notifications");
        panel?.scrollIntoView({ behavior: "smooth", block: "start" });
        panel?.focus({ preventScroll: true });
      } else openDialog(target.dataset.profileAction ?? "");
    };
    const onSubmit = async (event: Event) => {
      const form = event.target as HTMLFormElement;
      if (!form.matches("[data-profile-form]")) return;
      event.preventDefault();
      const formKind = form.dataset.profileForm;
      const endpoint = formKind === "password" ? "/api/resident/profile/password" : formKind === "contact" ? "/api/resident/profile" : "/api/resident/profile/security";
      const body: Record<string, FormDataEntryValue | boolean> = Object.fromEntries(new FormData(form).entries());
      const feedback = form.querySelector<HTMLElement>("[data-profile-feedback]");
      if (formKind === "pin-security") {
        if (body.pin !== body.confirmPin) { if (feedback) feedback.textContent = "PIN confirmation does not match."; return; }
        delete body.confirmPin;
      }
      if (formKind === "privacy-settings") {
        const checkbox = form.elements.namedItem("bfpContactAllowed") as HTMLInputElement | null;
        body.bfpContactAllowed = Boolean(checkbox?.checked);
      }
      const response = await fetch(endpoint, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const result = await response.json() as { error?: string; profile?: Record<string, unknown>; security?: Security };
      if (!response.ok) { if (feedback) feedback.textContent = result.error ?? "Unable to save changes."; return; }
      if (result.profile) { profile = { ...profile, ...result.profile }; setFields(result.profile); }
      if (result.security) security = result.security;
      if (feedback) feedback.textContent = formKind === "password" ? "Password updated." : formKind === "contact" ? "Contact details updated." : formKind === "pin-security" ? "PIN saved." : "Privacy settings saved.";
      if (formKind === "password" || formKind === "pin-security") form.reset();
    };
    root.addEventListener("click", onClick);
    root.addEventListener("submit", onSubmit);
    fetch("/api/resident/profile")
      .then(async (response) => {
        const body = await response.json() as { profile?: Record<string, unknown> };
        return { response, body };
      })
      .then(({ response, body }) => {
        if (!response.ok || !body.profile) return;
        profile = body.profile;
        setFields(profile);
        const loadedNotifications = profile.notifications;
        if (loadedNotifications && typeof loadedNotifications === "object" && !Array.isArray(loadedNotifications)) {
          const values = loadedNotifications as Partial<Notifications>;
          if (typeof values.push === "boolean" && typeof values.incidents === "boolean" && typeof values.emergency === "boolean") {
            syncNotifications({ push: values.push, incidents: values.incidents, emergency: values.emergency });
          }
        }
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
