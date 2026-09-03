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
          bottom: 1.25rem;
          left: 50%;
          transform: translateX(-50%);
          z-index: 9999;
          width: min(92vw, 26rem);
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 1.25rem;
          box-shadow: 0 12px 32px rgba(15, 23, 42, 0.18), 0 2px 6px rgba(15, 23, 42, 0.08);
          padding: 1.1rem 1.2rem;
          display: flex;
          flex-direction: column;
          gap: 0.9rem;
          color: #0F172A;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          animation: chromeSheetSlideUp 0.28s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        @keyframes chromeSheetSlideUp {
          from {
            opacity: 0;
            transform: translate(-50%, 1.5rem);
          }
          to {
            opacity: 1;
            transform: translate(-50%, 0);
          }
        }

        .chrome-sheet-header {
          display: flex;
          align-items: center;
          gap: 0.85rem;
        }

        .chrome-sheet-icon {
          width: 3rem;
          height: 3rem;
          border-radius: 0.75rem;
          object-fit: cover;
          flex-shrink: 0;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
          border: 1px solid #E2E8F0;
        }

        .chrome-sheet-info {
          flex: 1;
          min-width: 0;
        }

        .chrome-sheet-title {
          font-size: 0.96rem;
          font-weight: 800;
          color: #0F172A;
          margin: 0 0 0.15rem;
          letter-spacing: -0.01em;
          display: flex;
          align-items: center;
          gap: 0.35rem;
        }

        .chrome-sheet-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          font-size: 0.73rem;
          color: #0369A1;
          font-weight: 600;
          background: #E0F2FE;
          padding: 0.15rem 0.5rem;
          border-radius: 999px;
        }

        .chrome-sheet-url {
          font-size: 0.78rem;
          color: #64748B;
          margin: 0;
          display: flex;
          align-items: center;
          gap: 0.3rem;
        }

        .chrome-sheet-desc {
          font-size: 0.8rem;
          color: #475569;
          margin: 0;
          line-height: 1.4;
          background: #F8FAFC;
          padding: 0.5rem 0.75rem;
          border-radius: 0.65rem;
          border: 1px solid #F1F5F9;
        }

        .chrome-sheet-actions {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 0.6rem;
        }

        .chrome-btn-cancel {
          background: transparent;
          border: 1px solid #E2E8F0;
          border-radius: 999px;
          padding: 0.5rem 1rem;
          font-size: 0.82rem;
          font-weight: 700;
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
          padding: 0.52rem 1.25rem;
          font-size: 0.82rem;
          font-weight: 800;
          color: #FFFFFF;
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(220, 38, 38, 0.25);
          transition: all 0.15s ease;
        }

        .chrome-btn-install:hover {
          background: #B91C1C;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(220, 38, 38, 0.35);
        }

        @media (max-width: 600px) {
          .resident-chrome-install-sheet {
            bottom: 4.8rem;
            width: calc(100vw - 1.5rem);
          }
        }
      `}</style>
      <div className="chrome-sheet-header">
        <img className="chrome-sheet-icon" src="/images/resident-pwa-192.png" alt="ALAB" />
        <div className="chrome-sheet-info">
          <h4 className="chrome-sheet-title">
            ALAB Emergency
            <span className="chrome-sheet-badge">Official</span>
          </h4>
          <p className="chrome-sheet-url">
            <span>🔒</span> alab-fire-responses.vercel.app
          </p>
        </div>
      </div>
      <p className="chrome-sheet-desc">
        ⚡ Gumagana kahit offline • Mabilisang pag-report ng sunog at alert notifications.
      </p>
      <div className="chrome-sheet-actions">
        <button
          type="button"
          className="chrome-btn-cancel"
          onClick={() => setIsDismissed(true)}
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
