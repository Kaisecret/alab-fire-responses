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
  const [installHelpOpen, setInstallHelpOpen] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [installPromptVisible, setInstallPromptVisible] = useState(false);

  useEffect(() => {
    void registerResidentWorker();
    setIsInstalled(window.matchMedia("(display-mode: standalone)").matches || ("standalone" in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone)));
    const captureInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", captureInstallPrompt);
    const promptInterval = window.setInterval(() => setInstallPromptVisible(true), 10_000);
    return () => {
      window.removeEventListener("beforeinstallprompt", captureInstallPrompt);
      window.clearInterval(promptInterval);
    };
  }, []);

  const install = async () => {
    if (!installPrompt) {
      setInstallPromptVisible(false);
      setInstallHelpOpen(true);
      return;
    }
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === "accepted") setIsInstalled(true);
    setInstallPrompt(null);
    setInstallPromptVisible(false);
  };

  if (isInstalled || (!installPromptVisible && !installHelpOpen)) return null;

  return (
    <aside className="resident-pwa-prompt" aria-label="ALAB app options">
      <style>{`
        .resident-pwa-prompt { position: fixed; right: 1rem; top: 1rem; z-index: 2000; display: flex; align-items: center; gap: .5rem; padding: .5rem; border: 1px solid rgba(185,28,28,.16); border-radius: 1rem; background: rgba(255,255,255,.96); box-shadow: 0 .75rem 2rem rgba(15,23,42,.16); backdrop-filter: blur(12px); font-family: 'Plus Jakarta Sans', sans-serif; }
        .resident-pwa-prompt img { width: 2rem; height: 2rem; border-radius: .6rem; object-fit: cover; }
        .resident-pwa-prompt button { border: 0; border-radius: .65rem; padding: .62rem .75rem; background: #b91c1c; color: #fff; font: inherit; font-size: .75rem; font-weight: 800; cursor: pointer; }
        .resident-pwa-prompt .resident-pwa-dismiss { padding: .4rem; background: transparent; color: #64748b; font-size: 1rem; line-height: 1; }
        .resident-pwa-help-backdrop { position: fixed; inset: 0; z-index: 2100; display: grid; place-items: center; padding: 1rem; background: rgba(15,23,42,.52); font-family: 'Plus Jakarta Sans', sans-serif; }
        .resident-pwa-help { width: min(100%, 24rem); padding: 1.25rem; border-radius: 1rem; background: #fff; box-shadow: 0 1rem 2.5rem rgba(15,23,42,.28); color: #17233a; }
        .resident-pwa-help h2 { margin: 0 0 .5rem; font-size: 1.1rem; }
        .resident-pwa-help p { margin: .65rem 0; color: #52647f; font-size: .86rem; line-height: 1.5; }
        .resident-pwa-help strong { color: #17233a; }
        .resident-pwa-help button { width: 100%; margin-top: .5rem; border: 0; border-radius: .65rem; padding: .7rem; background: #b91c1c; color: #fff; font: inherit; font-weight: 800; cursor: pointer; }
        @media (max-width: 600px) { .resident-pwa-prompt { top: .75rem; right: .75rem; left: .75rem; justify-content: center; } }
      `}</style>
      {installPromptVisible && <>
        <img src="/images/FAVICON.webp" alt="ALAB" />
        <button type="button" onClick={() => void install()}>Install ALAB</button>
        <button className="resident-pwa-dismiss" type="button" aria-label="Hide install message" onClick={() => setInstallPromptVisible(false)}>×</button>
      </>}
      {installHelpOpen && (
        <div className="resident-pwa-help-backdrop" role="presentation" onClick={() => setInstallHelpOpen(false)}>
          <section className="resident-pwa-help" role="dialog" aria-modal="true" aria-labelledby="resident-install-title" onClick={(event) => event.stopPropagation()}>
            <h2 id="resident-install-title">Install ALAB</h2>
            <p><strong>Android:</strong> open the browser menu (⋮), then choose <strong>Install app</strong> or <strong>Add to Home screen</strong>.</p>
            <p><strong>iPhone:</strong> open this page in Safari, tap Share, then choose <strong>Add to Home Screen</strong>.</p>
            <button type="button" onClick={() => setInstallHelpOpen(false)}>Close</button>
          </section>
        </div>
      )}
    </aside>
  );
}
