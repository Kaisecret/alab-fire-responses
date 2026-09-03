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
    let notificationRequested: Notifications | null = null;
    let notificationSaveInFlight = false;
    let security: Security | null = null;
    const setFields = (values: Record<string, unknown>) => Object.entries(values).forEach(([field, value]) => {
      if (typeof value !== "string") return;
      root.querySelectorAll<HTMLElement>(`[data-profile-field="${field}"]`).forEach((element) => { element.textContent = value; });
    });
    const previousDocumentOverflow = document.documentElement.style.overflow;
    const previousBodyOverflow = document.body.style.overflow;
    const unlockBackground = () => {
      document.documentElement.style.overflow = previousDocumentOverflow;
      document.body.style.overflow = previousBodyOverflow;
    };
    const closeDialogs = () => {
      root.querySelectorAll<HTMLElement>("[data-profile-dialog]").forEach((dialog) => { dialog.hidden = true; });
      unlockBackground();
    };
    const setFeedback = (container: ParentNode, message: string) => {
      const feedback = container.querySelector<HTMLElement>("[data-profile-feedback]");
      if (feedback) feedback.textContent = message;
    };
    const setNotificationFeedback = (message: string) => {
      root.querySelectorAll<HTMLElement>("[data-notification-feedback]").forEach((feedback) => { feedback.textContent = message; });
    };
    const syncNotifications = (values: Notifications) => {
      notifications = { ...values };
      (Object.keys(values) as Array<keyof Notifications>).forEach((preference) => {
        root.querySelectorAll<HTMLButtonElement>(`[data-notification-toggle="${preference}"]`).forEach((toggle) => {
          toggle.setAttribute("aria-pressed", String(values[preference]));
          toggle.classList.toggle("active", values[preference]);
        });
      });
    };
    const notificationsMatch = (left: Notifications, right: Notifications) =>
      left.push === right.push && left.incidents === right.incidents && left.emergency === right.emergency;
    const saveRequestedNotifications = async () => {
      if (notificationSaveInFlight) return;
      notificationSaveInFlight = true;
      try {
        while (notificationRequested) {
          const requested = { ...notificationRequested };
          try {
            const response = await fetch("/api/resident/profile", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ notifications: requested }) });
            const result = await response.json() as { error?: string; notifications?: Notifications };
            if (!response.ok || !result.notifications) throw new Error(result.error ?? "Unable to save notification preference.");
            syncNotifications(result.notifications);
            if (notificationRequested && notificationsMatch(notificationRequested, result.notifications)) notificationRequested = null;
          } catch (error) {
            notificationRequested = null;
            if (notifications) syncNotifications(notifications);
            setNotificationFeedback(error instanceof Error ? error.message : "Unable to save notification preference.");
          }
        }
      } finally {
        notificationSaveInFlight = false;
      }
    };
    const setPrivacyLoading = (dialog: HTMLElement, loading: boolean) => {
      const checkbox = dialog.querySelector<HTMLInputElement>('input[name="bfpContactAllowed"]');
      const saveButton = dialog.querySelector<HTMLButtonElement>("[data-privacy-save]");
      if (checkbox) checkbox.disabled = loading;
      if (saveButton) saveButton.disabled = loading;
    };
    const loadSecurity = async (dialog: HTMLElement) => {
      setFeedback(dialog, "");
      const checkbox = dialog.querySelector<HTMLInputElement>('input[name="bfpContactAllowed"]');
      const saveButton = dialog.querySelector<HTMLButtonElement>("[data-privacy-save]");
      if (checkbox) {
        security = null;
        checkbox.disabled = true;
        if (saveButton) saveButton.disabled = true;
      }
      try {
        const response = await fetch("/api/resident/profile/security");
        const result = await response.json() as { error?: string; security?: Security };
        if (!response.ok || !result.security) throw new Error(result.error ?? "Unable to load security settings.");
        security = result.security;
        if (checkbox) {
          checkbox.checked = security.bfpContactAllowed;
          checkbox.disabled = false;
          if (saveButton) saveButton.disabled = false;
        }
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
      if (name === "privacy-settings") setPrivacyLoading(dialog, true);
      dialog.hidden = false;
      document.documentElement.style.overflow = "hidden";
      document.body.style.overflow = "hidden";
      dialog.querySelector<HTMLElement>("[data-profile-initial-focus]")?.focus({ preventScroll: true });
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
        setNotificationFeedback("");
        const base = notificationRequested ?? notifications;
        notificationRequested = { ...base, [preference]: !base[preference] };
        void saveRequestedNotifications();
        return;
      }
      const target = clicked.closest<HTMLElement>("[data-profile-action], [data-profile-close]");
      if (!target) return;
      event.preventDefault();
      if (target.hasAttribute("data-profile-close")) closeDialogs();
      else if (target.dataset.profileAction === "notification-settings") openDialog("notification-settings");
      else openDialog(target.dataset.profileAction ?? "");
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
        const saveButton = form.querySelector<HTMLButtonElement>("[data-privacy-save]");
        if (!security || checkbox?.disabled || saveButton?.disabled) {
          if (feedback) feedback.textContent = "Wait for privacy settings to finish loading.";
          return;
        }
        body.bfpContactAllowed = Boolean(checkbox?.checked);
      }
      try {
        const response = await fetch(endpoint, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
        const result = await response.json() as { error?: string; profile?: Record<string, unknown>; security?: Security };
        if (!response.ok) { if (feedback) feedback.textContent = result.error ?? "Unable to save changes."; return; }
        if (result.profile) { profile = { ...profile, ...result.profile }; setFields(result.profile); }
        if (result.security) security = result.security;
        if (feedback) feedback.textContent = formKind === "password" ? "Password updated." : formKind === "contact" ? "Contact details updated." : formKind === "pin-security" ? "PIN saved." : "Privacy settings saved.";
        if (formKind === "password" || formKind === "pin-security") form.reset();
      } catch {
        if (feedback) feedback.textContent = "Unable to save changes. Please try again.";
      }
    };
    root.addEventListener("click", onClick);
    root.addEventListener("submit", onSubmit);

    const applyProfile = (loadedProfile: Record<string, unknown>) => {
      profile = loadedProfile;
      setFields(profile);
      const loadedNotifications = profile.notifications;
      if (loadedNotifications && typeof loadedNotifications === "object" && !Array.isArray(loadedNotifications)) {
        const values = loadedNotifications as Partial<Notifications>;
        if (typeof values.push === "boolean" && typeof values.incidents === "boolean" && typeof values.emergency === "boolean") {
          syncNotifications({ push: values.push, incidents: values.incidents, emergency: values.emergency });
        }
      }
    };

    // 1. Instant Cache: Load profile immediately with zero delay
    try {
      const cached = sessionStorage.getItem("alab_cache_resident_profile");
      if (cached) {
        applyProfile(JSON.parse(cached));
      }
    } catch {}

    // 2. Background Revalidation
    fetch("/api/resident/profile")
      .then(async (response) => {
        const body = await response.json() as { profile?: Record<string, unknown> };
        return { response, body };
      })
      .then(({ response, body }) => {
        if (!response.ok || !body.profile) return;
        try {
          sessionStorage.setItem("alab_cache_resident_profile", JSON.stringify(body.profile));
        } catch {}
        applyProfile(body.profile);
      })
      .catch(() => undefined);
    return () => { closeDialogs(); root.removeEventListener("click", onClick); root.removeEventListener("submit", onSubmit); };
  }, []);

  return (
    <>
      <style>{profileStyles}</style>
      <div ref={rootRef} dangerouslySetInnerHTML={{ __html: profileMarkup }} />
    </>
  );
}
