"use client";

import { useEffect, useState } from "react";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function registerResidentWorker() {
  if (!("serviceWorker" in navigator)) return Promise.resolve(undefined);
  return navigator.serviceWorker.register("/resident-sw.js", { scope: "/resident/" });
}

export function ResidentInstallPrompt() {
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);

  useEffect(() => {
    void registerResidentWorker();
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

  if (!installPrompt) return null;

  return (
    <aside className="resident-pwa-prompt" aria-label="ALAB app options">
      <style>{`
        .resident-pwa-prompt { position: fixed; right: 1rem; top: 1rem; z-index: 2000; display: flex; align-items: center; gap: .5rem; padding: .5rem; border: 1px solid rgba(185,28,28,.16); border-radius: 1rem; background: rgba(255,255,255,.96); box-shadow: 0 .75rem 2rem rgba(15,23,42,.16); backdrop-filter: blur(12px); font-family: 'Plus Jakarta Sans', sans-serif; }
        .resident-pwa-prompt img { width: 2rem; height: 2rem; border-radius: .6rem; object-fit: cover; }
        .resident-pwa-prompt button { border: 0; border-radius: .65rem; padding: .62rem .75rem; background: #b91c1c; color: #fff; font: inherit; font-size: .75rem; font-weight: 800; cursor: pointer; }
        @media (max-width: 600px) { .resident-pwa-prompt { top: auto; right: .75rem; bottom: .75rem; left: .75rem; justify-content: center; } }
      `}</style>
      <img src="/images/FAVICON.webp" alt="ALAB" />
      <button type="button" onClick={() => void install()}>Install ALAB</button>
    </aside>
  );
}
