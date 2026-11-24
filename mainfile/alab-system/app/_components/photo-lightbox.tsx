"use client";

import { useCallback, useEffect } from "react";
import { createPortal } from "react-dom";

const styles = `
  .plb-backdrop {
    position: fixed;
    inset: 0;
    z-index: 100010;
    display: grid;
    place-items: center;
    padding: 1.5rem;
    background: rgba(2, 6, 23, 0.86);
    backdrop-filter: blur(10px);
    animation: plbFade 0.18s ease-out both;
    font-family: 'Plus Jakarta Sans', sans-serif;
  }

  .plb-panel {
    width: min(1040px, 100%);
    max-height: 100%;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 20px;
    background: #0B1220;
    box-shadow: 0 40px 90px -30px rgba(0, 0, 0, 0.8);
    animation: plbPop 0.22s cubic-bezier(0.16, 1, 0.3, 1) both;
  }

  .plb-head {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.85rem 0.9rem 0.85rem 1.25rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    color: #F8FAFC;
  }
  .plb-title { min-width: 0; flex: 1; display: flex; flex-direction: column; gap: 0.1rem; }
  .plb-title strong { font-size: 0.98rem; font-weight: 800; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .plb-title span { color: #94A3B8; font-size: 0.76rem; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .plb-count {
    flex: none;
    padding: 0.25rem 0.65rem;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.08);
    color: #CBD5E1;
    font-size: 0.74rem;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }

  .plb-stage {
    position: relative;
    flex: 1;
    min-height: 0;
    display: grid;
    place-items: center;
    padding: 1rem 4rem;
    background: radial-gradient(circle at center, #172033 0%, #0B1220 70%);
  }
  .plb-img {
    display: block;
    max-width: 100%;
    max-height: calc(100vh - 15rem);
    border-radius: 12px;
    object-fit: contain;
    box-shadow: 0 24px 50px -20px rgba(0, 0, 0, 0.7);
  }

  .plb-btn {
    flex: none;
    width: 42px;
    height: 42px;
    border-radius: 50%;
    border: 1px solid rgba(255, 255, 255, 0.18);
    background: rgba(255, 255, 255, 0.08);
    color: #FFFFFF;
    display: grid;
    place-items: center;
    cursor: pointer;
    font-size: 0.95rem;
    transition: background 0.16s, border-color 0.16s;
  }
  .plb-btn:hover { background: rgba(255, 255, 255, 0.18); border-color: rgba(255, 255, 255, 0.4); }
  .plb-btn:focus-visible, .plb-thumb:focus-visible { outline: 2px solid #FFFFFF; outline-offset: 3px; }
  .plb-step { position: absolute; top: 50%; transform: translateY(-50%); }
  .plb-step.prev { left: 0.85rem; }
  .plb-step.next { right: 0.85rem; }

  .plb-thumbs {
    display: flex;
    justify-content: center;
    gap: 0.6rem;
    padding: 0.8rem 1rem 1rem;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
    overflow-x: auto;
  }
  .plb-thumb {
    flex: none;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.35rem;
    padding: 0;
    border: 0;
    background: transparent;
    color: #94A3B8;
    font: inherit;
    font-size: 0.7rem;
    font-weight: 700;
    cursor: pointer;
  }
  .plb-thumb img {
    width: 76px;
    height: 54px;
    object-fit: cover;
    border-radius: 9px;
    border: 2px solid transparent;
    opacity: 0.55;
    transition: opacity 0.16s, border-color 0.16s;
  }
  .plb-thumb:hover img { opacity: 0.85; }
  .plb-thumb.is-active { color: #FFFFFF; }
  .plb-thumb.is-active img { opacity: 1; border-color: #EF4444; }

  @keyframes plbFade { from { opacity: 0; } to { opacity: 1; } }
  @keyframes plbPop { from { opacity: 0; transform: translateY(8px) scale(0.98); } to { opacity: 1; transform: none; } }

  @media (prefers-reduced-motion: reduce) {
    .plb-backdrop, .plb-panel { animation: none; }
  }

  @media (max-width: 640px) {
    .plb-backdrop { padding: 0; }
    .plb-panel { width: 100%; height: 100%; border-radius: 0; border: 0; }
    .plb-stage { padding: 0.75rem; }
    .plb-step { top: auto; bottom: 0.9rem; transform: none; }
    .plb-img { max-height: calc(100vh - 13rem); }
  }
`;

interface PhotoLightboxProps {
  photos: string[];
  index: number;
  onIndexChange: (index: number) => void;
  onClose: () => void;
  caption?: string;
  /** One name per photo, e.g. "Front of ID"; shown as the title and under each thumbnail. */
  labels?: string[];
}

/**
 * Full-screen photo viewer: a title bar, the photo large in the middle, and
 * thumbnails to switch. Arrow keys and Escape work, because this is read under
 * pressure.
 */
export function PhotoLightbox({ photos, index, onIndexChange, onClose, caption, labels }: PhotoLightboxProps) {
  const total = photos.length;

  const step = useCallback((delta: number) => {
    if (total === 0) return;
    onIndexChange((index + delta + total) % total);
  }, [index, total, onIndexChange]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowRight") step(1);
      if (event.key === "ArrowLeft") step(-1);
    };
    window.addEventListener("keydown", onKey);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose, step]);

  if (typeof document === "undefined" || total === 0) return null;

  const current = Math.min(index, total - 1);
  const label = (position: number) => labels?.[position] ?? `Photo ${position + 1}`;
  const title = labels?.[current] ?? caption ?? "Photo";

  return createPortal(
    <>
      <style>{styles}</style>
      <div
        className="plb-backdrop"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => {
          if (event.target === event.currentTarget) onClose();
        }}
      >
        <div className="plb-panel">
          <div className="plb-head">
            <div className="plb-title">
              <strong>{title}</strong>
              {caption && labels && <span>{caption}</span>}
            </div>
            {total > 1 && <span className="plb-count">{current + 1} / {total}</span>}
            <button type="button" className="plb-btn" onClick={onClose} aria-label="Close photo">
              <i className="fa-solid fa-xmark" aria-hidden="true" />
            </button>
          </div>

          <div className="plb-stage">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="plb-img" src={photos[current]} alt={label(current)} />
            {total > 1 && (
              <>
                <button type="button" className="plb-btn plb-step prev" onClick={() => step(-1)} aria-label="Previous photo">
                  <i className="fa-solid fa-chevron-left" aria-hidden="true" />
                </button>
                <button type="button" className="plb-btn plb-step next" onClick={() => step(1)} aria-label="Next photo">
                  <i className="fa-solid fa-chevron-right" aria-hidden="true" />
                </button>
              </>
            )}
          </div>

          {total > 1 && (
            <div className="plb-thumbs">
              {photos.map((photo, position) => (
                <button
                  key={`${photo}-${position}`}
                  type="button"
                  className={`plb-thumb${position === current ? " is-active" : ""}`}
                  onClick={() => onIndexChange(position)}
                  aria-label={`Show ${label(position)}`}
                  aria-current={position === current}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photo} alt="" />
                  {labels && <span>{labels[position]}</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </>,
    document.body,
  );
}
