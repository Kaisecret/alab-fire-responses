"use client";

import { useEffect, useState } from "react";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

async function registerResidentWorker() {
  if (!("serviceWorker" in navigator)) return undefined;

  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.all(
    registrations
      .filter((registration) => {
        const registrationScope = new URL(registration.scope);
        return registrationScope.origin === window.location.origin
          && registrationScope.pathname === "/resident/";
      })
      .map((registration) => registration.unregister()),
  );

  return navigator.serviceWorker.register("/resident-sw.js", { scope: "/resident" });
}

export function ResidentInstallPrompt() {
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(display-mode: standalone)").matches
      || ("standalone" in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone));
  });

  useEffect(() => {
    void registerResidentWorker();
    const captureInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", captureInstallPrompt);
    return () => {
      window.removeEventListener("beforeinstallprompt", captureInstallPrompt);
    };
  }, []);

  const install = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === "accepted") setIsInstalled(true);
    setInstallPrompt(null);
  };

  if (!installPrompt || isInstalled) return null;

  return (
    <aside className="resident-pwa-prompt" aria-label="ALAB app options">
      <style>{`
        .resident-pwa-prompt { position: fixed; right: 1rem; top: 1rem; z-index: 2000; display: flex; align-items: center; gap: .65rem; padding: .7rem .75rem; border: 1px solid rgba(255,255,255,.12); border-radius: 1rem; background: rgba(15,23,42,.96); box-shadow: 0 .75rem 2rem rgba(15,23,42,.3); color: #fff; backdrop-filter: blur(12px); font-family: 'Plus Jakarta Sans', sans-serif; }
        .resident-pwa-prompt img { width: 2rem; height: 2rem; border-radius: .6rem; object-fit: cover; }
        .resident-pwa-prompt::before { content: 'Install ALAB'; font-size: .8rem; font-weight: 800; white-space: nowrap; }
        .resident-pwa-prompt button { border: 0; border-radius: .65rem; padding: .62rem .75rem; background: #b91c1c; color: #fff; font: inherit; font-size: .75rem; font-weight: 800; cursor: pointer; }
        @media (max-width: 600px) { .resident-pwa-prompt { top: .75rem; right: .75rem; left: .75rem; justify-content: center; } }
      `}</style>
      <img src="/images/resident-pwa-192.png" alt="ALAB" />
      <button type="button" onClick={() => void install()}>Install</button>
    </aside>
  );
}
