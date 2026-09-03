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
  const [isDismissed, setIsDismissed] = useState(false);
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
  if (isDismissed) return null;

  return (
    <aside className="resident-chrome-install-sheet" aria-label="ALAB app options">
      <style>{`
        .resident-chrome-install-sheet {
          position: fixed;
          top: 0.85rem;
          left: 50%;
          transform: translateX(-50%);
          z-index: 9999;
          width: min(94vw, 24rem);
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 999px;
          box-shadow: 0 8px 24px rgba(15, 23, 42, 0.14), 0 2px 6px rgba(15, 23, 42, 0.06);
          padding: 0.45rem 0.65rem 0.45rem 0.75rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.65rem;
          color: #0F172A;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          animation: chromeSheetSlideDown 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        @keyframes chromeSheetSlideDown {
          from {
            opacity: 0;
            transform: translate(-50%, -1rem);
          }
          to {
            opacity: 1;
            transform: translate(-50%, 0);
          }
        }

        .chrome-sheet-header {
          display: flex;
          align-items: center;
          gap: 0.55rem;
          min-width: 0;
          flex: 1;
        }

        .chrome-sheet-icon {
          width: 2.1rem;
          height: 2.1rem;
          border-radius: 0.55rem;
          object-fit: cover;
          flex-shrink: 0;
          box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
          border: 1px solid #E2E8F0;
        }

        .chrome-sheet-info {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          min-width: 0;
          white-space: nowrap;
        }

        .chrome-sheet-title {
          font-size: 0.86rem;
          font-weight: 800;
          color: #0F172A;
          margin: 0;
          letter-spacing: -0.01em;
        }

        .chrome-sheet-badge {
          display: inline-flex;
          align-items: center;
          font-size: 0.68rem;
          color: #0369A1;
          font-weight: 700;
          background: #E0F2FE;
          padding: 0.1rem 0.4rem;
          border-radius: 999px;
        }

        .chrome-sheet-actions {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          flex-shrink: 0;
        }

        .chrome-btn-cancel {
          background: transparent;
          border: none;
          border-radius: 999px;
          padding: 0.35rem 0.6rem;
          font-size: 0.76rem;
          font-weight: 600;
          color: #64748B;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .chrome-btn-cancel:hover {
          background: #F1F5F9;
          color: #0F172A;
        }

        .chrome-btn-install {
          background: #DC2626;
          border: none;
          border-radius: 999px;
          padding: 0.38rem 0.95rem;
          font-size: 0.78rem;
          font-weight: 800;
          color: #FFFFFF;
          cursor: pointer;
          box-shadow: 0 2px 6px rgba(220, 38, 38, 0.25);
          transition: all 0.15s ease;
          white-space: nowrap;
        }

        .chrome-btn-install:hover {
          background: #B91C1C;
          transform: translateY(-1px);
          box-shadow: 0 3px 8px rgba(220, 38, 38, 0.35);
        }

        @media (max-width: 600px) {
          .resident-chrome-install-sheet {
            top: 0.65rem;
            width: calc(100vw - 1.25rem);
            padding: 0.4rem 0.5rem 0.4rem 0.65rem;
          }
        }
      `}</style>
      <div className="chrome-sheet-header">
        <img className="chrome-sheet-icon" src="/images/resident-pwa-192.png" alt="ALAB" />
        <div className="chrome-sheet-info">
          <span className="chrome-sheet-title">ALAB Emergency</span>
          <span className="chrome-sheet-badge">Official</span>
        </div>
      </div>
      <div className="chrome-sheet-actions">
        <button
          type="button"
          className="chrome-btn-cancel"
          onClick={() => setIsDismissed(true)}
          aria-label="Dismiss"
        >
          Hindi muna
        </button>
        <button
          type="button"
          className="chrome-btn-install"
          onClick={() => void install()}
        >
          Install
        </button>
      </div>
    </aside>
  );
}
