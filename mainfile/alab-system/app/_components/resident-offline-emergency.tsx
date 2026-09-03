"use client";

import { useEffect, useState } from "react";

const EMERGENCY_BFP_PHONE = "09109975737";
const EMERGENCY_BFP_DISPLAY = "0910-997-5737";

export function ResidentOfflineEmergency() {
  const [isOffline, setIsOffline] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // Initial check
    if (typeof window !== "undefined") {
      setIsOffline(!navigator.onLine);
    }

    const handleOffline = () => {
      setIsOffline(true);
      setIsDismissed(false);
    };

    const handleOnline = () => {
      setIsOffline(false);
      setIsDismissed(false);
    };

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <>
      <style>{`
        /* =====================================================================
           OFFLINE EMERGENCY SLIDE-IN POPUP & FLOATING PILL
           ===================================================================== */
        .offline-emergency-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.65);
          backdrop-filter: blur(6px);
          -webkit-backdrop-filter: blur(6px);
          z-index: 10001;
          display: flex;
          align-items: flex-end;
          justify-content: center;
          padding: 1rem;
          animation: offlineFadeIn 0.25s ease forwards;
        }

        .offline-emergency-sheet {
          position: relative;
          width: 100%;
          max-width: 28rem;
          background: #FFFFFF;
          border: 1px solid rgba(220, 38, 38, 0.25);
          border-radius: 1.5rem;
          box-shadow: 0 24px 60px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(239, 68, 68, 0.15);
          padding: 1.5rem 1.4rem 1.3rem;
          color: #0F172A;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          animation: offlineSlideUp 0.32s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          overflow: hidden;
        }

        @keyframes offlineSlideUp {
          from {
            opacity: 0;
            transform: translateY(2.5rem) scale(0.96);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes offlineFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        /* Top Accent Warning Stripe */
        .offline-sheet-accent {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 5px;
          background: linear-gradient(90deg, #DC2626, #EA580C, #F59E0B, #DC2626);
          background-size: 200% 100%;
          animation: offlineStripeMove 3s linear infinite;
        }

        @keyframes offlineStripeMove {
          0% { background-position: 0% 0%; }
          100% { background-position: 200% 0%; }
        }

        .offline-sheet-close {
          position: absolute;
          top: 0.9rem;
          right: 0.9rem;
          width: 2rem;
          height: 2rem;
          border-radius: 50%;
          border: 1px solid #E2E8F0;
          background: #F8FAFC;
          color: #64748B;
          display: grid;
          place-items: center;
          font-size: 1.25rem;
          line-height: 1;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .offline-sheet-close:hover {
          background: #F1F5F9;
          color: #0F172A;
        }

        .offline-header {
          display: flex;
          align-items: flex-start;
          gap: 0.85rem;
          margin-bottom: 1.15rem;
        }

        .offline-icon-box {
          position: relative;
          width: 2.85rem;
          height: 2.85rem;
          flex-shrink: 0;
          border-radius: 0.85rem;
          background: linear-gradient(135deg, #FEF2F2, #FEE2E2);
          border: 1px solid #FECACA;
          display: grid;
          place-items: center;
          color: #DC2626;
        }

        .offline-icon-box svg {
          width: 1.55rem;
          height: 1.55rem;
        }

        .offline-icon-pulse {
          position: absolute;
          inset: -3px;
          border-radius: 1rem;
          border: 2px solid #EF4444;
          opacity: 0;
          animation: offlinePulseRing 2s cubic-bezier(0.24, 0, 0.38, 1) infinite;
        }

        @keyframes offlinePulseRing {
          0% { opacity: 0.8; transform: scale(0.95); }
          50% { opacity: 0; transform: scale(1.15); }
          100% { opacity: 0; transform: scale(1.2); }
        }

        .offline-title-wrap h3 {
          margin: 0 0 0.2rem;
          font-size: 1.1rem;
          font-weight: 800;
          color: #7F1D1D;
          letter-spacing: -0.02em;
          display: flex;
          align-items: center;
          gap: 0.4rem;
        }

        .offline-pill {
          font-size: 0.65rem;
          font-weight: 750;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          padding: 0.18rem 0.45rem;
          border-radius: 999px;
          background: #FEE2E2;
          color: #B91C1C;
        }

        .offline-title-wrap p {
          margin: 0;
          font-size: 0.82rem;
          line-height: 1.45;
          color: #475569;
        }

        /* Call Action Buttons Grid */
        .offline-actions {
          display: grid;
          gap: 0.75rem;
          margin-bottom: 0.9rem;
        }

        .offline-call-btn {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.85rem 1.1rem;
          border-radius: 1rem;
          text-decoration: none;
          font-weight: 700;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
          cursor: pointer;
        }

        .offline-call-btn:hover {
          transform: translateY(-2px);
        }

        .offline-call-btn:active {
          transform: translateY(0) scale(0.98);
        }

        /* 911 Primary Button */
        .offline-call-911 {
          background: linear-gradient(135deg, #DC2626, #991B1B);
          color: #FFFFFF;
          border: 1px solid #B91C1C;
          box-shadow: 0 6px 18px rgba(220, 38, 38, 0.35);
        }

        .offline-call-911:hover {
          box-shadow: 0 8px 24px rgba(220, 38, 38, 0.45);
        }

        /* Municipal BFP Button */
        .offline-call-bfp {
          background: linear-gradient(135deg, #0F172A, #1E293B);
          color: #FFFFFF;
          border: 1px solid #334155;
          box-shadow: 0 6px 18px rgba(15, 23, 42, 0.25);
        }

        .offline-call-bfp:hover {
          box-shadow: 0 8px 24px rgba(15, 23, 42, 0.35);
        }

        .offline-btn-left {
          display: flex;
          align-items: center;
          gap: 0.8rem;
        }

        .offline-btn-icon-circle {
          width: 2.3rem;
          height: 2.3rem;
          border-radius: 0.7rem;
          display: grid;
          place-items: center;
          flex-shrink: 0;
        }

        .offline-call-911 .offline-btn-icon-circle {
          background: rgba(255, 255, 255, 0.2);
          color: #FFFFFF;
        }

        .offline-call-bfp .offline-btn-icon-circle {
          background: rgba(249, 115, 22, 0.2);
          color: #FB923C;
        }

        .offline-btn-icon-circle svg {
          width: 1.25rem;
          height: 1.25rem;
        }

        .offline-btn-text {
          display: flex;
          flex-direction: column;
          gap: 0.12rem;
          text-align: left;
        }

        .offline-btn-label {
          font-size: 0.98rem;
          font-weight: 800;
          letter-spacing: -0.01em;
        }

        .offline-btn-sub {
          font-size: 0.72rem;
          font-weight: 550;
          opacity: 0.85;
        }

        .offline-dial-pill {
          font-size: 0.72rem;
          font-weight: 800;
          padding: 0.35rem 0.65rem;
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          gap: 0.3rem;
          white-space: nowrap;
        }

        .offline-call-911 .offline-dial-pill {
          background: #FFFFFF;
          color: #991B1B;
        }

        .offline-call-bfp .offline-dial-pill {
          background: #EA580C;
          color: #FFFFFF;
        }

        .offline-footer-note {
          text-align: center;
          margin-top: 0.65rem;
        }

        .offline-dismiss-link {
          background: none;
          border: none;
          color: #64748B;
          font-size: 0.75rem;
          font-weight: 600;
          text-decoration: underline;
          cursor: pointer;
          padding: 0.2rem 0.5rem;
          transition: color 0.15s ease;
        }

        .offline-dismiss-link:hover {
          color: #0F172A;
        }

        /* Minimized Floating Alert Pill (When Sheet is Dismissed) */
        .offline-minimized-pill {
          position: fixed;
          bottom: calc(5rem + env(safe-area-inset-bottom, 0px));
          right: 1rem;
          z-index: 9999;
          background: linear-gradient(135deg, #DC2626, #B91C1C);
          color: #FFFFFF;
          border: 1px solid #EF4444;
          border-radius: 999px;
          padding: 0.5rem 0.9rem;
          display: flex;
          align-items: center;
          gap: 0.55rem;
          box-shadow: 0 8px 24px rgba(220, 38, 38, 0.4);
          cursor: pointer;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          font-size: 0.8rem;
          font-weight: 800;
          animation: offlineFloatIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          transition: transform 0.15s ease;
        }

        .offline-minimized-pill:hover {
          transform: translateY(-2px);
        }

        .offline-min-dot {
          width: 0.5rem;
          height: 0.5rem;
          border-radius: 50%;
          background: #FEF08A;
          box-shadow: 0 0 8px #FACC15;
          animation: offlineDotBlink 1.2s infinite ease-in-out;
        }

        @keyframes offlineDotBlink {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.8); }
        }

        @keyframes offlineFloatIn {
          from { opacity: 0; transform: translateY(1rem) scale(0.9); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        @media (max-width: 600px) {
          .offline-emergency-backdrop {
            padding: 0.5rem 0.5rem calc(4.5rem + env(safe-area-inset-bottom, 0px));
          }
          .offline-emergency-sheet {
            padding: 1.25rem 1.1rem 1.1rem;
            border-radius: 1.25rem;
          }
        }
      `}</style>

      {isDismissed ? (
        <button
          type="button"
          className="offline-minimized-pill"
          onClick={() => setIsDismissed(false)}
          aria-label="Tawag sa Emergency (Offline)"
        >
          <span className="offline-min-dot" aria-hidden="true" />
          <span>📞 Tumawag sa BFP / 911 (Offline)</span>
        </button>
      ) : (
        <div
          className="offline-emergency-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="offlineEmergencyTitle"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsDismissed(true);
          }}
        >
          <aside className="offline-emergency-sheet">
            <div className="offline-sheet-accent" />
            <button
              type="button"
              className="offline-sheet-close"
              onClick={() => setIsDismissed(true)}
              aria-label="Isara ang emergency dialog"
            >
              ×
            </button>

            <div className="offline-header">
              <div className="offline-icon-box">
                <span className="offline-icon-pulse" />
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </div>
              <div className="offline-title-wrap">
                <h3 id="offlineEmergencyTitle">
                  Walang Internet <span className="offline-pill">Offline</span>
                </h3>
                <p>
                  Hindi makapag-send ng online report. Tumawag agad sa hotline sa ibaba para sa agarang responde.
                </p>
              </div>
            </div>

            <div className="offline-actions">
              {/* National 911 Hotline */}
              <a
                href="tel:911"
                className="offline-call-btn offline-call-911"
                id="offlineBtn911"
              >
                <div className="offline-btn-left">
                  <div className="offline-btn-icon-circle">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                    </svg>
                  </div>
                  <div className="offline-btn-text">
                    <span className="offline-btn-label">Tawag sa 911</span>
                    <span className="offline-btn-sub">National Emergency Hotline</span>
                  </div>
                </div>
                <span className="offline-dial-pill">Dial 911 📞</span>
              </a>

              {/* Municipal BFP Hotline */}
              <a
                href={`tel:${EMERGENCY_BFP_PHONE}`}
                className="offline-call-btn offline-call-bfp"
                id="offlineBtnBfp"
              >
                <div className="offline-btn-left">
                  <div className="offline-btn-icon-circle">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2" />
                      <path d="M15 18H9" />
                      <path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.62l-3.48-4.35A1 1 0 0 0 17.52 8H14" />
                      <circle cx="17" cy="18" r="2" />
                      <circle cx="7" cy="18" r="2" />
                    </svg>
                  </div>
                  <div className="offline-btn-text">
                    <span className="offline-btn-label">Municipal BFP Hotline</span>
                    <span className="offline-btn-sub">{EMERGENCY_BFP_DISPLAY}</span>
                  </div>
                </div>
                <span className="offline-dial-pill">Dial BFP 🚒</span>
              </a>
            </div>

            <div className="offline-footer-note">
              <button
                type="button"
                className="offline-dismiss-link"
                onClick={() => setIsDismissed(true)}
              >
                Mag-browse muna sa offline cached records
              </button>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
