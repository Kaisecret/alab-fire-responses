"use client";

import { useEffect, useRef, useState } from "react";

import { HOW_TO_USE_STEPS, HOW_TO_USE_VIDEO_SRC } from "./landing-how-to-use-content";

/*
 * The landing page's "How to use" dialog: the resident how-to video (or its
 * placeholder until the video is added), the four steps, and the way in.
 *
 * Landing buttons open it with: window.dispatchEvent(new Event(OPEN_HOW_TO_USE)).
 */
export const OPEN_HOW_TO_USE = "alab:open-how-to-use";

const styles = `
  .landing-page-root button.button,
  .landing-page-root button.connect-action { font-family: inherit; line-height: inherit; text-align: left; cursor: pointer; }
  .how-to-backdrop { position: fixed; inset: 0; z-index: 10001; display: flex; align-items: center; justify-content: center; padding: 1rem; background: rgba(15, 23, 42, 0.62); backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px); animation: howToFade 0.2s ease both; }
  .how-to-dialog { position: relative; width: 100%; max-width: 46rem; max-height: calc(100dvh - 2rem); overflow-y: auto; border-radius: 1.25rem; background: #fff; color: #10222c; box-shadow: 0 24px 60px rgba(0, 0, 0, 0.35); font-family: Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif; animation: howToRise 0.28s cubic-bezier(0.16, 1, 0.3, 1) both; }
  .how-to-body { display: grid; gap: 1.1rem; padding: 1.5rem; }
  .how-to-close { position: absolute; top: 0.85rem; right: 0.85rem; z-index: 1; width: 2.2rem; height: 2.2rem; display: grid; place-items: center; border: 1px solid #e2e8f0; border-radius: 50%; background: #f8fafc; color: #475569; font: inherit; font-size: 1.3rem; line-height: 1; cursor: pointer; }
  .how-to-kicker { margin: 0; color: #d91b10; font-size: 0.74rem; font-weight: 850; letter-spacing: 0.12em; text-transform: uppercase; }
  .how-to-dialog h2 { margin: 0.25rem 2.5rem 0 0; font-size: clamp(1.35rem, 3vw, 1.75rem); line-height: 1.2; letter-spacing: -0.02em; }
  .how-to-video { position: relative; overflow: hidden; width: min(100%, calc(36dvh * 16 / 9)); aspect-ratio: 16 / 9; margin: 0 auto; border-radius: 0.9rem; background: #10222c; }
  .how-to-video video { display: block; width: 100%; height: 100%; object-fit: contain; background: #000; }
  .how-to-placeholder { position: absolute; inset: 0; display: grid; place-content: center; justify-items: center; gap: 0.6rem; padding: 1rem; color: #fff; text-align: center; background: radial-gradient(circle at 30% 20%, rgba(232, 41, 18, 0.45), transparent 55%), #10222c; }
  .how-to-placeholder svg { width: 3.25rem; height: 3.25rem; }
  .how-to-placeholder strong { font-size: 1.05rem; }
  .how-to-placeholder span { color: rgba(255, 255, 255, 0.78); font-size: 0.85rem; }
  .how-to-steps { display: grid; gap: 0.75rem; margin: 0; padding: 0; list-style: none; }
  .how-to-step { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 0.8rem; align-items: start; }
  .how-to-step-number { display: grid; width: 1.9rem; height: 1.9rem; place-items: center; border-radius: 50%; background: #fef2f2; border: 1px solid #fecaca; color: #b91c1c; font-size: 0.85rem; font-weight: 850; }
  .how-to-step strong { display: block; font-size: 0.98rem; }
  .how-to-step p { margin: 0.2rem 0 0; color: #52616a; font-size: 0.88rem; line-height: 1.5; }
  .how-to-actions { display: flex; flex-wrap: wrap; gap: 0.75rem; }
  .how-to-actions a { flex: 1 1 12rem; display: inline-flex; min-height: 3rem; align-items: center; justify-content: center; border-radius: 0.65rem; font-weight: 850; text-decoration: none; }
  .how-to-primary { color: #fff; background: linear-gradient(135deg, #e82912, #ce0d08); }
  .how-to-secondary { color: #b91c1c; background: #fff; border: 1.5px solid #fecaca; }
  .how-to-note { margin: 0; color: #52616a; font-size: 0.82rem; }
  @keyframes howToFade { from { opacity: 0; } to { opacity: 1; } }
  @keyframes howToRise { from { opacity: 0; transform: translateY(1rem); } to { opacity: 1; transform: none; } }
  @media (prefers-reduced-motion: reduce) { .how-to-backdrop, .how-to-dialog { animation: none; } }
`;

export function LandingHowToUse() {
  const [open, setOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const show = () => setOpen(true);
    window.addEventListener(OPEN_HOW_TO_USE, show);
    return () => window.removeEventListener(OPEN_HOW_TO_USE, show);
  }, []);

  useEffect(() => {
    if (!open) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [open]);

  return (
    <>
      <style>{styles}</style>
      {open && (
        <div className="how-to-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
          <section className="how-to-dialog" role="dialog" aria-modal="true" aria-labelledby="how-to-title">
            <button ref={closeRef} type="button" className="how-to-close" aria-label="Close how to use" onClick={() => setOpen(false)}>×</button>
            <div className="how-to-body">
              <div>
                <p className="how-to-kicker">Resident guide</p>
                <h2 id="how-to-title">How to use ALAB</h2>
              </div>
              <div className="how-to-video">
                {HOW_TO_USE_VIDEO_SRC ? (
                  <video controls preload="metadata" playsInline src={HOW_TO_USE_VIDEO_SRC} aria-label="How to use ALAB video" />
                ) : (
                  <div className="how-to-placeholder">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
                      <circle cx="12" cy="12" r="9.5" />
                      <path d="m10 8.5 5.5 3.5-5.5 3.5z" fill="currentColor" />
                    </svg>
                    <strong>Video coming soon</strong>
                    <span>Follow the steps below in the meantime.</span>
                  </div>
                )}
              </div>
              <ol className="how-to-steps">
                {HOW_TO_USE_STEPS.map((step, index) => (
                  <li key={step.title} className="how-to-step">
                    <span className="how-to-step-number" aria-hidden="true">{index + 1}</span>
                    <div>
                      <strong>{step.title}</strong>
                      <p>{step.detail}</p>
                    </div>
                  </li>
                ))}
              </ol>
              <div className="how-to-actions">
                <a className="how-to-primary" href="/resident/signup">Create account</a>
                <a className="how-to-secondary" href="/resident/login">Log in</a>
              </div>
              <p className="how-to-note">In a fire right now? Use Call BFP on this page first. A phone call reaches BFP even before your account is approved.</p>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
