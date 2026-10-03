/*
 * "Call BFP now" for the screens a person sees before they can report in the
 * app (login, sign-up, application under review). In-app reports stay limited
 * to verified residents; anyone can still reach BFP by phone in one tap.
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
  .login-page-root .alab-emergency-call,
  .signup-page-root .alab-emergency-call { margin: -0.5rem 0 1.25rem; }
`;

export const emergencyCallMarkup =
  `<button type="button" class="alab-emergency-call" data-call-bfp aria-haspopup="dialog">` +
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${PHONE_ICON_PATH}" /></svg>` +
  `<span>${EMERGENCY_CALL_LABEL}</span></button>`;
