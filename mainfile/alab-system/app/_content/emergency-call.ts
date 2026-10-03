/*
 * "Call BFP now" for people who cannot report in the app yet: the landing
 * page hero and the application-under-review screen. In-app reports stay
 * limited to verified residents; anyone can still reach BFP by phone.
 * The button opens the BFP hotline sheet (ResidentOfflineEmergency).
 */

export const EMERGENCY_CALL_LABEL = "Fire emergency? Call BFP now";

export const PHONE_ICON_PATH =
  "M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z";

export const emergencyCallStyles = `
  .alab-emergency-call {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.55rem;
    width: 100%;
    box-sizing: border-box;
    padding: 0.75rem 1rem;
    border: 1.5px solid #fecaca;
    border-radius: 10px;
    background: #fef2f2;
    color: #b91c1c;
    font: inherit;
    font-size: 0.9rem;
    font-weight: 800;
    line-height: 1.3;
    cursor: pointer;
    transition: background 0.15s ease, border-color 0.15s ease;
  }
  .alab-emergency-call:hover { background: #fee2e2; border-color: #fca5a5; }
  .alab-emergency-call:focus-visible { outline: 3px solid rgba(217, 27, 16, 0.35); outline-offset: 2px; }
  .alab-emergency-call svg { flex: 0 0 auto; width: 18px; height: 18px; }
`;

/**
 * The landing hero version. It takes the place of "View active incidents" and
 * uses the hero .button class, so it is the same size as "Report a fire" at
 * every screen width.
 */
export const heroEmergencyMarkup =
  `<button type="button" class="button hero__emergency" data-call-bfp aria-haspopup="dialog">` +
  `<span class="hero__emergency-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="${PHONE_ICON_PATH}" /></svg></span>` +
  `<span class="hero__emergency-text"><strong>Fire emergency?</strong><span>Call BFP or 911 now</span></span>` +
  `<svg class="hero__emergency-arrow" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>` +
  `</button>`;

export const heroEmergencyStyles = `
  .hero__actions .button--primary,
  .hero__actions .hero__emergency { min-width: 15.5rem; }
  .hero__emergency.button {
    justify-content: flex-start;
    padding: 0.45rem 0.95rem 0.45rem 0.5rem;
    gap: 0.7rem;
    color: var(--ink, #10222c);
    background: rgb(255 250 245 / 82%);
    backdrop-filter: blur(0.4rem);
    text-align: left;
    cursor: pointer;
  }
  .hero__emergency.button:hover { background: #fff1ef; }
  .hero__emergency:focus-visible { outline: 3px solid rgb(217 27 16 / 40%); outline-offset: 3px; }
  .hero__emergency-icon {
    position: relative;
    display: grid;
    flex: 0 0 auto;
    width: 2.5rem;
    height: 2.5rem;
    place-items: center;
    border-radius: 50%;
    color: #ffffff;
    background: linear-gradient(135deg, #e82912, #ce0d08);
  }
  .hero__emergency-icon::after {
    content: "";
    position: absolute;
    inset: 0;
    border-radius: 50%;
    box-shadow: 0 0 0 0 rgb(232 41 18 / 45%);
    animation: hero-emergency-ring 1.8s ease-out infinite;
  }
  .hero__emergency-icon svg { width: 1.15rem; height: 1.15rem; fill: none; stroke: currentColor; stroke-width: 2.2; stroke-linecap: round; stroke-linejoin: round; }
  .hero__emergency-text { display: grid; flex: 1 1 auto; gap: 0.05rem; min-width: 0; }
  .hero__emergency-text strong { color: #b91c1c; font-size: 0.95rem; font-weight: 850; line-height: 1.2; letter-spacing: -0.01em; }
  .hero__emergency-text span { color: var(--muted, #52616a); font-size: 0.76rem; font-weight: 650; line-height: 1.25; }
  .hero__emergency-arrow { flex: 0 0 auto; width: 1.1rem; height: 1.1rem; fill: none; stroke: #b91c1c; stroke-width: 2.2; stroke-linecap: round; stroke-linejoin: round; }
  @keyframes hero-emergency-ring { 0% { box-shadow: 0 0 0 0 rgb(232 41 18 / 45%); } 80%, 100% { box-shadow: 0 0 0 0.6rem rgb(232 41 18 / 0%); } }
  @media (max-width: 640px) {
    .hero__actions .button--primary,
    .hero__actions .hero__emergency { min-width: 0; }
    .hero__emergency-icon { width: 2.2rem; height: 2.2rem; }
  }
  @media (prefers-reduced-motion: reduce) {
    .hero__emergency-icon::after { animation: none; }
  }
`;
