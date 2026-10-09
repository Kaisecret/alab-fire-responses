"use client";

import { useEffect, useState } from "react";

import { SUCCESS_TOAST_EVENT, SUCCESS_TOAST_FLASH_KEY } from "./success-toast";

const VISIBLE_MS = 3000;
/** A flash older than this was left by a navigation that never finished. */
const FLASH_MAX_AGE_MS = 15_000;

const styles = `
  .alab-toast-region { position: fixed; z-index: 2147483647; top: 1rem; right: 1rem; display: grid; justify-items: end; pointer-events: none; }
  .alab-toast { display: flex; align-items: center; gap: .6rem; max-width: min(26rem, calc(100vw - 2rem)); padding: .8rem 1rem; border-radius: 12px; background: #15803D; color: #FFFFFF; font-size: .88rem; font-weight: 700; line-height: 1.35; box-shadow: 0 14px 32px rgba(21, 128, 61, .32), 0 2px 6px rgba(15, 23, 42, .12); animation: alab-toast-life ${VISIBLE_MS}ms ease forwards; }
  .alab-toast i { flex-shrink: 0; font-size: 1.05rem; }
  @keyframes alab-toast-life {
    0% { opacity: 0; transform: translateY(-8px); }
    8%, 88% { opacity: 1; transform: translateY(0); }
    100% { opacity: 0; transform: translateY(-8px); }
  }
  @media (max-width: 480px) { .alab-toast-region { left: 1rem; justify-items: stretch; } .alab-toast { max-width: none; } }
  @media (prefers-reduced-motion: reduce) { .alab-toast { animation: none; } }
`;

function takeFlash(): string | null {
  try {
    const raw = sessionStorage.getItem(SUCCESS_TOAST_FLASH_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(SUCCESS_TOAST_FLASH_KEY);
    const flash = JSON.parse(raw) as { message?: unknown; at?: unknown };
    if (typeof flash.message !== "string" || typeof flash.at !== "number") return null;
    return Date.now() - flash.at < FLASH_MAX_AGE_MS ? flash.message : null;
  } catch {
    return null;
  }
}

/** Shows each success toast for three seconds, then removes it. */
export function SuccessToastHost() {
  const [toast, setToast] = useState<{ id: number; message: string } | null>(null);

  useEffect(() => {
    let nextId = 0;
    const show = (message: string) => setToast({ id: (nextId += 1), message });
    const onToast = (event: Event) => {
      const message = (event as CustomEvent<string>).detail;
      if (typeof message === "string" && message) show(message);
    };
    window.addEventListener(SUCCESS_TOAST_EVENT, onToast);
    // An action that navigated here left its confirmation behind.
    const pending = window.setTimeout(() => {
      const flashed = takeFlash();
      if (flashed) show(flashed);
    }, 0);
    return () => {
      window.removeEventListener(SUCCESS_TOAST_EVENT, onToast);
      window.clearTimeout(pending);
    };
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), VISIBLE_MS);
    return () => window.clearTimeout(timer);
  }, [toast]);

  return (
    <>
      <style>{styles}</style>
      <div className="alab-toast-region" role="status" aria-live="polite">
        {toast && (
          <div key={toast.id} className="alab-toast">
            <i className="fa-solid fa-circle-check" aria-hidden="true" />
            <span>{toast.message}</span>
          </div>
        )}
      </div>
    </>
  );
}
