"use client";

import { useEffect, useRef, useState } from "react";

import { useNotifications } from "./notifications/use-notifications";
import type { AccountNotification } from "@/lib/notifications/types";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function registerResidentWorker() {
  if (!("serviceWorker" in navigator)) return Promise.resolve(undefined);
  return navigator.serviceWorker.register("/resident-sw.js", { scope: "/resident/" });
}

function residentNotificationUrl(actionHref: string | null) {
  return actionHref?.startsWith("/resident/") ? actionHref : "/resident/notifications";
}

function showResidentNotification(notification: AccountNotification) {
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  const options: NotificationOptions = {
    body: notification.summary,
    icon: "/images/FAVICON.webp",
    badge: "/images/FAVICON.webp",
    tag: `alab-${notification.id}`,
    data: { url: residentNotificationUrl(notification.actionHref) },
  };
  if (!("serviceWorker" in navigator)) {
    new Notification(notification.title, options);
    return;
  }
  void navigator.serviceWorker.ready
    .then((registration) => registration.showNotification(notification.title, options))
    .catch(() => new Notification(notification.title, options));
}

export function ResidentInstallPrompt() {
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | "unsupported">("unsupported");

  useEffect(() => {
    void registerResidentWorker();
    if (!("Notification" in window)) return;
    setNotificationPermission(Notification.permission);
    const captureInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", captureInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", captureInstallPrompt);
  }, []);

  const install = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  };

  const enableNotifications = async () => {
    if (!("Notification" in window)) return;
    const permission = await Notification.requestPermission();
    setNotificationPermission(permission);
    if (permission === "granted") {
      const registration = await registerResidentWorker();
      await registration?.showNotification("ALAB notifications enabled", {
        body: "You will receive new resident emergency updates while ALAB is open.",
        icon: "/images/FAVICON.webp",
        badge: "/images/FAVICON.webp",
        data: { url: "/resident/notifications" },
      });
    }
  };

  if (!installPrompt && notificationPermission !== "default") return null;

  return (
    <aside className="resident-pwa-prompt" aria-label="ALAB app options">
      <style>{`
        .resident-pwa-prompt { position: fixed; right: 1rem; top: 1rem; z-index: 2000; display: flex; align-items: center; gap: .5rem; padding: .5rem; border: 1px solid rgba(185,28,28,.16); border-radius: 1rem; background: rgba(255,255,255,.96); box-shadow: 0 .75rem 2rem rgba(15,23,42,.16); backdrop-filter: blur(12px); font-family: 'Plus Jakarta Sans', sans-serif; }
        .resident-pwa-prompt img { width: 2rem; height: 2rem; border-radius: .6rem; object-fit: cover; }
        .resident-pwa-prompt button { border: 0; border-radius: .65rem; padding: .62rem .75rem; background: #b91c1c; color: #fff; font: inherit; font-size: .75rem; font-weight: 800; cursor: pointer; }
        .resident-pwa-prompt button + button { background: #fff5f5; color: #b91c1c; }
        @media (max-width: 600px) { .resident-pwa-prompt { top: auto; right: .75rem; bottom: .75rem; left: .75rem; justify-content: center; } }
      `}</style>
      <img src="/images/FAVICON.webp" alt="ALAB" />
      {installPrompt && <button type="button" onClick={() => void install()}>Install ALAB</button>}
      {notificationPermission === "default" && <button type="button" onClick={() => void enableNotifications()}>Enable alerts</button>}
    </aside>
  );
}

export function ResidentBrowserNotifications() {
  const { notifications } = useNotifications("/api/resident/notifications", 25);
  const seenIds = useRef<Set<string> | null>(null);

  useEffect(() => { void registerResidentWorker(); }, []);

  useEffect(() => {
    if (!seenIds.current) {
      seenIds.current = new Set(notifications.map((notification) => notification.id));
      return;
    }
    const freshUnread = notifications.filter((notification) => !seenIds.current?.has(notification.id) && !notification.readAt);
    freshUnread.forEach(showResidentNotification);
    notifications.forEach((notification) => seenIds.current?.add(notification.id));
  }, [notifications]);

  return null;
}
