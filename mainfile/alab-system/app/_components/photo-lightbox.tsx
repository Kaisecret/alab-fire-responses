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
    padding: 2.5rem 1.25rem;
    background: rgba(2, 6, 23, 0.92);
    backdrop-filter: blur(8px);
    animation: plbFade 0.18s ease-out both;
    font-family: 'Plus Jakarta Sans', sans-serif;
  }

  .plb-stage {
    position: relative;
    max-width: min(1100px, 100%);
    max-height: 100%;
    display: flex;
    flex-direction: column;
    gap: 0.9rem;
    align-items: center;
  }

  .plb-frame {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 0;
  }

  .plb-img {
    max-width: 100%;
    max-height: calc(100vh - 11rem);
    border-radius: 12px;
    object-fit: contain;
    box-shadow: 0 30px 70px -20px rgba(0, 0, 0, 0.75);
    animation: plbPop 0.2s cubic-bezier(0.16, 1, 0.3, 1) both;
  }

  .plb-bar {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    color: #E2E8F0;
    font-size: 0.82rem;
    font-weight: 700;
  }

  .plb-count {
    font-variant-numeric: tabular-nums;
    letter-spacing: 0.02em;
    color: #CBD5E1;
  }

  .plb-caption { color: #94A3B8; font-weight: 600; }

  .plb-btn {
    width: 44px;
    height: 44px;
    border-radius: 50%;
    border: 1px solid rgba(255, 255, 255, 0.22);
    background: rgba(15, 23, 42, 0.72);
    color: #FFFFFF;
    display: grid;
    place-items: center;
    cursor: pointer;
    font-size: 1rem;
    transition: background 0.16s, border-color 0.16s, transform 0.16s;
  }

  .plb-btn:hover:not(:disabled) {
    background: rgba(30, 41, 59, 0.95);
    border-color: rgba(255, 255, 255, 0.45);
  }

  .plb-btn:disabled { opacity: 0.32; cursor: default; }
  .plb-btn:focus-visible { outline: 2px solid #FFFFFF; outline-offset: 3px; }

  /* Step controls sit beside the image on a wide screen, under it on a phone. */
  .plb-step {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
  }
  .plb-step.prev { left: -58px; }
  .plb-step.next { right: -58px; }

  .plb-close {
    position: fixed;
    top: 1.1rem;
    right: 1.1rem;
  }

  .plb-mobile-steps { display: none; gap: 0.75rem; }

  @keyframes plbFade { from { opacity: 0; } to { opacity: 1; } }
  @keyframes plbPop { from { opacity: 0; transform: scale(0.97); } to { opacity: 1; transform: none; } }

  @media (prefers-reduced-motion: reduce) {
    .plb-backdrop, .plb-img { animation: none; }
  }

  @media (max-width: 860px) {
    .plb-step { display: none; }
    .plb-mobile-steps { display: flex; }
    .plb-img { max-height: calc(100vh - 14rem); }
  }
`;

interface PhotoLightboxProps {
  photos: string[];
  index: number;
  onIndexChange: (index: number) => void;
  onClose: () => void;
  caption?: string;
}

/**
 * Full-screen viewer for scene photographs, so a duty officer can actually see
 * the fire rather than squinting at a thumbnail. Arrow keys and Escape work,
 * because this is read under pressure.
 */
export function PhotoLightbox({ photos, index, onIndexChange, onClose, caption }: PhotoLightboxProps) {
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

  const photo = photos[Math.min(index, total - 1)];

  return createPortal(
    <>
      <style>{styles}</style>
      <div
        className="plb-backdrop"
        role="dialog"
        aria-modal="true"
        aria-label="Scene photograph"
        onClick={(event) => {
          if (event.target === event.currentTarget) onClose();
        }}
      >
        <button type="button" className="plb-btn plb-close" onClick={onClose} aria-label="Close photo">
          <i className="fa-solid fa-xmark" />
        </button>

        <div className="plb-stage">
          <div className="plb-frame">
            {total > 1 && (
              <button
                type="button"
                className="plb-btn plb-step prev"
                onClick={() => step(-1)}
                aria-label="Previous photo"
              >
                <i className="fa-solid fa-chevron-left" />
              </button>
            )}

            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="plb-img" src={photo} alt={`Scene photograph ${index + 1} of ${total}`} />

            {total > 1 && (
              <button
                type="button"
                className="plb-btn plb-step next"
                onClick={() => step(1)}
                aria-label="Next photo"
              >
                <i className="fa-solid fa-chevron-right" />
              </button>
            )}
          </div>

          <div className="plb-bar">
            {total > 1 && (
              <div className="plb-mobile-steps">
                <button type="button" className="plb-btn" onClick={() => step(-1)} aria-label="Previous photo">
                  <i className="fa-solid fa-chevron-left" />
                </button>
                <button type="button" className="plb-btn" onClick={() => step(1)} aria-label="Next photo">
                  <i className="fa-solid fa-chevron-right" />
                </button>
              </div>
            )}
            {total > 1 && <span className="plb-count">{index + 1} / {total}</span>}
            {caption && <span className="plb-caption">{caption}</span>}
          </div>
        </div>
      </div>
    </>,
    document.body,
  );
}
