"use client";

import { useEffect, useRef, useState } from "react";

import { HOW_TO_USE_STEPS, HOW_TO_USE_YOUTUBE_ID } from "./landing-how-to-use-content";

/*
 * The landing page's "How to use" dialog: the resident tutorial video, the
 * four steps, and the way in.
 *
 * Landing buttons open it with: window.dispatchEvent(new Event(OPEN_HOW_TO_USE)).
 */
export const OPEN_HOW_TO_USE = "alab:open-how-to-use";

// The YouTube player only loads after Play, so the dialog opens at once.
const VIDEO_EMBED_URL = `https://www.youtube-nocookie.com/embed/${HOW_TO_USE_YOUTUBE_ID}?autoplay=1&rel=0&playsinline=1`;
const VIDEO_POSTER_URL = `https://i.ytimg.com/vi/${HOW_TO_USE_YOUTUBE_ID}/maxresdefault.jpg`;

const styles = `
  .landing-page-root button.button,
  .landing-page-root button.connect-action { font-family: inherit; line-height: inherit; text-align: left; cursor: pointer; }
  .how-to-backdrop { position: fixed; inset: 0; z-index: 10001; display: flex; align-items: center; justify-content: center; padding: 16px; background: rgba(15, 23, 42, 0.66); backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px); animation: howToFade 0.2s ease both; }
  .how-to-dialog { position: relative; width: 100%; max-width: 48rem; max-height: calc(100dvh - 32px); overflow-y: auto; border-radius: 20px; background: #fff; color: #10222c; box-shadow: 0 24px 64px rgba(0, 0, 0, 0.35); font-family: Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif; animation: howToRise 0.28s cubic-bezier(0.16, 1, 0.3, 1) both; }
  .how-to-body { display: grid; gap: 24px; padding: 24px; }
  .how-to-close { position: absolute; top: 16px; right: 16px; z-index: 1; width: 40px; height: 40px; display: grid; place-items: center; border: 1px solid #e2e8f0; border-radius: 50%; background: #fff; color: #475569; font: inherit; font-size: 1.35rem; line-height: 1; cursor: pointer; transition: background 0.15s ease, color 0.15s ease; }
  .how-to-close:hover { background: #fef2f2; color: #b91c1c; }
  .how-to-head { display: flex; align-items: center; gap: 12px; padding-right: 48px; }
  .how-to-icon { flex: 0 0 44px; width: 44px; height: 44px; display: grid; place-items: center; border-radius: 12px; background: #fef2f2; color: #d91b10; }
  .how-to-icon svg { width: 24px; height: 24px; }
  .how-to-kicker { margin: 0; color: #d91b10; font-size: 0.72rem; font-weight: 850; letter-spacing: 0.12em; text-transform: uppercase; }
  .how-to-dialog h2 { margin: 2px 0 0; font-size: clamp(1.3rem, 3vw, 1.65rem); line-height: 1.2; letter-spacing: -0.02em; }
  .how-to-video { position: relative; overflow: hidden; width: min(100%, calc(46dvh * 16 / 9)); aspect-ratio: 16 / 9; margin: 0 auto; border-radius: 16px; background: #0b111c; box-shadow: 0 12px 32px rgba(15, 23, 42, 0.18); }
  .how-to-video iframe { display: block; width: 100%; height: 100%; border: 0; }
  .how-to-poster { position: absolute; inset: 0; display: block; width: 100%; height: 100%; padding: 0; border: 0; background: #0b111c; cursor: pointer; }
  .how-to-poster img { display: block; width: 100%; height: 100%; object-fit: cover; }
  .how-to-poster::after { content: ""; position: absolute; inset: 0; background: rgba(8, 12, 20, 0.28); transition: background 0.2s ease; }
  .how-to-play { position: absolute; top: 50%; left: 50%; z-index: 1; width: 72px; height: 72px; display: grid; place-items: center; border-radius: 50%; background: #d91b10; color: #fff; box-shadow: 0 8px 24px rgba(217, 27, 16, 0.45); transform: translate(-50%, -50%); transition: transform 0.2s ease, background 0.2s ease; }
  .how-to-play svg { width: 30px; height: 30px; margin-left: 4px; }
  .how-to-poster-label { position: absolute; left: 16px; bottom: 16px; z-index: 1; display: inline-flex; align-items: center; gap: 8px; padding: 8px 12px; border-radius: 999px; background: rgba(8, 12, 20, 0.78); color: #fff; font-size: 0.82rem; font-weight: 750; }
  .how-to-poster-label svg { width: 18px; height: 18px; }
  .how-to-poster:hover::after { background: rgba(8, 12, 20, 0.16); }
  .how-to-poster:hover .how-to-play { background: #b8150c; transform: translate(-50%, -50%) scale(1.06); }
  .how-to-poster:focus-visible { outline: 3px solid #d91b10; outline-offset: -3px; }
  .how-to-steps { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin: 0; padding: 0; list-style: none; }
  .how-to-step { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 12px; align-items: start; padding: 16px; border: 1px solid #e2e8f0; border-radius: 14px; background: #f8fafc; }
  .how-to-step-number { display: grid; width: 32px; height: 32px; place-items: center; border-radius: 10px; background: #d91b10; color: #fff; font-size: 0.88rem; font-weight: 850; }
  .how-to-step strong { display: block; font-size: 0.95rem; line-height: 1.3; }
  .how-to-step p { margin: 4px 0 0; color: #52616a; font-size: 0.84rem; line-height: 1.5; }
  .how-to-actions { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
  .how-to-actions a { display: inline-flex; min-height: 48px; align-items: center; justify-content: center; gap: 8px; border-radius: 12px; font-weight: 850; text-decoration: none; transition: background 0.15s ease, border-color 0.15s ease; }
  .how-to-actions svg { width: 20px; height: 20px; }
  .how-to-primary { color: #fff; background: #d91b10; }
  .how-to-primary:hover { background: #b8150c; }
  .how-to-secondary { color: #b91c1c; background: #fff; border: 1.5px solid #fecaca; }
  .how-to-secondary:hover { border-color: #d91b10; background: #fef2f2; }
  .how-to-note { display: flex; align-items: flex-start; gap: 12px; margin: 0; padding: 12px 16px; border-radius: 12px; background: #fff7ed; border: 1px solid #fed7aa; color: #7c2d12; font-size: 0.84rem; line-height: 1.5; }
  .how-to-note svg { flex: 0 0 20px; width: 20px; height: 20px; margin-top: 1px; color: #ea580c; }
  @media (max-width: 640px) {
    .how-to-backdrop { padding: 0; align-items: flex-end; }
    .how-to-dialog { max-height: 94dvh; border-radius: 20px 20px 0 0; }
    .how-to-body { gap: 16px; padding: 16px; }
    .how-to-close { top: 12px; right: 12px; }
    .how-to-video { width: 100%; border-radius: 12px; }
    .how-to-play { width: 60px; height: 60px; }
    .how-to-steps { grid-template-columns: 1fr; gap: 8px; }
    .how-to-step { padding: 12px; }
  }
  @media (max-width: 380px) { .how-to-actions { grid-template-columns: 1fr; } }
  @keyframes howToFade { from { opacity: 0; } to { opacity: 1; } }
  @keyframes howToRise { from { opacity: 0; transform: translateY(1rem); } to { opacity: 1; transform: none; } }
  @media (prefers-reduced-motion: reduce) { .how-to-backdrop, .how-to-dialog { animation: none; } }
`;

export function LandingHowToUse() {
  const [open, setOpen] = useState(false);
  const [playing, setPlaying] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    // Each opening starts from the poster; closing unmounts the player, which stops the video.
    const show = () => { setPlaying(false); setOpen(true); };
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
              <div className="how-to-head">
                <span className="how-to-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9.5" /><path d="m10 8.5 5.5 3.5-5.5 3.5z" /></svg>
                </span>
                <div>
                  <p className="how-to-kicker">Resident guide</p>
                  <h2 id="how-to-title">How to use ALAB</h2>
                </div>
              </div>
              <div className="how-to-video">
                {playing ? (
                  <iframe
                    src={VIDEO_EMBED_URL}
                    title="ALAB tutorial video"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    referrerPolicy="strict-origin-when-cross-origin"
                    allowFullScreen
                  />
                ) : (
                  <button type="button" className="how-to-poster" aria-label="Play the ALAB tutorial video" onClick={() => setPlaying(true)}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={VIDEO_POSTER_URL} alt="" width={1280} height={720} />
                    <span className="how-to-play" aria-hidden="true">
                      <svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 4.5v15l12.5-7.5z" /></svg>
                    </span>
                    <span className="how-to-poster-label" aria-hidden="true">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2.5" y="5" width="19" height="14" rx="3" /><path d="m10 9.5 4.5 2.5-4.5 2.5z" /></svg>
                      Watch the tutorial
                    </span>
                  </button>
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
                <a className="how-to-primary" href="/resident/signup">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 19v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 3 17.5V19" /><circle cx="9" cy="7.5" r="3.5" /><path d="M19 8v6M16 11h6" /></svg>
                  Create account
                </a>
                <a className="how-to-secondary" href="/resident/login">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" /><path d="m10 17 5-5-5-5M15 12H3" /></svg>
                  Log in
                </a>
              </div>
              <p className="how-to-note">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z" /></svg>
                <span>In a fire right now? Use Call BFP on this page first. A phone call reaches BFP even before your account is approved.</span>
              </p>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
