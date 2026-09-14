"use client";

import { municipalTabFetch as fetch } from "../../lib/auth/municipal-tab-fetch";

import { FormEvent, useState } from "react";

import { BfpLoginLoader } from "./bfp-login-loader";

export function BfpChangePassword({ portal }: { portal: "MUNICIPAL" | "PROVINCIAL" }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [nextPassword, setNextPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNextPassword, setShowNextPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const isProvincial = portal === "PROVINCIAL";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const response = await fetch("/api/auth/bfp/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, nextPassword, portal }),
      });
      const result = (await response.json()) as { error?: string; redirectTo?: string };
      if (!response.ok || !result.redirectTo) {
        throw new Error(result.error || "Unable to update your password.");
      }
      window.location.assign(result.redirectTo);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to update your password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="bfp-auth-page">
      <style>{`
        /* =================================================================
           BFP TEMPORARY PASSWORD UPGRADE — MATCHING LOGIN VISUAL IDENTITY
           ================================================================= */
        .bfp-auth-page {
          min-height: 100vh;
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1.5rem 1rem;
          background: #EEF2F6;
          background-image:
            radial-gradient(circle at 10% 20%, rgba(220, 38, 38, 0.04) 0%, transparent 40%),
            radial-gradient(circle at 90% 80%, rgba(220, 38, 38, 0.04) 0%, transparent 40%),
            linear-gradient(to right, rgba(203, 213, 225, 0.25) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(203, 213, 225, 0.25) 1px, transparent 1px);
          background-size: 100% 100%, 100% 100%, 48px 48px, 48px 48px;
          font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          color: #0F172A;
          box-sizing: border-box;
        }

        .bfp-auth-card {
          width: min(94vw, 1060px);
          min-height: 600px;
          background: #FFFFFF;
          border-radius: 28px;
          box-shadow:
            0 24px 70px -15px rgba(15, 23, 42, 0.15),
            0 8px 24px -5px rgba(15, 23, 42, 0.06),
            0 0 0 1px rgba(226, 232, 240, 0.8);
          display: grid;
          grid-template-columns: 1.18fr 1fr;
          overflow: hidden;
          position: relative;
          animation: bfpCardFadeIn 0.55s cubic-bezier(0.16, 1, 0.3, 1) both;
        }

        @keyframes bfpCardFadeIn {
          0% {
            opacity: 0;
            transform: translateY(20px) scale(0.98);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        /* Left Side: Artwork Banner */
        .bfp-banner-side {
          position: relative;
          background: transparent;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          padding: 2.5rem 2.25rem 2.25rem;
          color: #FFFFFF;
          box-sizing: border-box;
          min-height: 580px;
        }

        .bfp-banner-img {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          object-fit: fill;
          z-index: 1;
          pointer-events: none;
        }

        .bfp-banner-content {
          position: relative;
          z-index: 3;
          display: flex;
          flex-direction: column;
          max-width: 440px;
        }

        .bfp-logo-lockup {
          display: flex;
          align-items: center;
          margin-bottom: 1.35rem;
        }

        .bfp-brand-text-logo {
          height: 5.6rem;
          width: auto;
          max-width: 320px;
          object-fit: contain;
          filter: drop-shadow(0 6px 20px rgba(0, 0, 0, 0.45));
        }

        .bfp-banner-heading {
          font-size: clamp(1.6rem, 2.1vw, 2.1rem);
          font-weight: 850;
          color: #FFFFFF;
          line-height: 1.2;
          letter-spacing: -0.02em;
          margin: 0 0 0.35rem;
          text-shadow: 0 2px 10px rgba(0, 0, 0, 0.4);
          white-space: nowrap;
        }

        .bfp-banner-tagline {
          font-size: 0.95rem;
          font-weight: 700;
          color: #FCD34D;
          margin: 0 0 0.75rem;
          letter-spacing: 0.01em;
          text-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
        }

        .bfp-banner-desc {
          font-size: 0.82rem;
          color: rgba(255, 255, 255, 0.94);
          line-height: 1.55;
          margin: 0;
          text-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
          font-weight: 500;
          max-width: 320px;
        }

        /* Right Side: Clean Form */
        .bfp-form-side {
          padding: clamp(2.5rem, 4vw, 3.25rem) clamp(2rem, 3.2vw, 3rem) 2.25rem;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          background: #FFFFFF;
          box-sizing: border-box;
          min-height: 580px;
        }

        .bfp-form-top-block {
          display: flex;
          flex-direction: column;
        }

        .bfp-station-tag {
          display: inline-flex;
          align-items: center;
          gap: 0.45rem;
          background: #FEF2F2;
          border: 1.5px solid #FECACA;
          color: #DC2626;
          font-size: 0.75rem;
          font-weight: 800;
          padding: 0.32rem 0.85rem;
          border-radius: 999px;
          margin-bottom: 1.1rem;
          width: fit-content;
          letter-spacing: 0.03em;
          text-transform: uppercase;
        }

        .bfp-form-header {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 1.65rem;
        }

        .bfp-shield-icon-badge {
          width: 54px;
          height: 54px;
          border-radius: 14px;
          background: transparent;
          border: 2px solid #DC2626;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .bfp-shield-fire-logo {
          width: 34px;
          height: 34px;
          object-fit: contain;
          display: block;
        }

        .bfp-header-text-group {
          display: flex;
          flex-direction: column;
        }

        .bfp-signin-title {
          font-size: 1.85rem;
          font-weight: 850;
          color: #0F172A;
          margin: 0;
          letter-spacing: -0.03em;
          line-height: 1.15;
        }

        .bfp-signin-subtitle {
          font-size: 0.84rem;
          color: #64748B;
          margin: 0.25rem 0 0;
          font-weight: 500;
        }

        /* Form Inputs */
        .bfp-form {
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          flex: 1;
        }

        .bfp-fields-block {
          display: flex;
          flex-direction: column;
          gap: 1.35rem;
          margin-top: 1.5rem;
        }

        .bfp-input-group {
          position: relative;
          display: flex;
          align-items: center;
          background: #FFFFFF;
          border: 1.5px solid #1E293B;
          border-radius: 12px;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          overflow: hidden;
        }

        .bfp-input-group:hover {
          border-color: #000000;
        }

        .bfp-input-group:focus-within {
          border-color: #DC2626;
          box-shadow: 0 0 0 3.5px rgba(220, 38, 38, 0.14);
        }

        .bfp-input-icon {
          width: 48px;
          height: 52px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #475569;
          font-size: 1rem;
          flex-shrink: 0;
          transition: color 0.2s;
        }

        .bfp-input-group:focus-within .bfp-input-icon {
          color: #DC2626;
        }

        .bfp-input {
          flex: 1;
          height: 52px;
          border: none;
          outline: none;
          background: transparent;
          font-size: 0.94rem;
          font-family: inherit;
          color: #0F172A;
          font-weight: 600;
          padding-right: 0.85rem;
        }

        .bfp-input::placeholder {
          color: #64748B;
          font-weight: 500;
        }

        .bfp-input:-webkit-autofill,
        .bfp-input:-webkit-autofill:hover,
        .bfp-input:-webkit-autofill:focus,
        .bfp-input:-webkit-autofill:active {
          -webkit-text-fill-color: #0F172A;
          -webkit-box-shadow: 0 0 0 1000px #FFFFFF inset;
          box-shadow: 0 0 0 1000px #FFFFFF inset;
          caret-color: #0F172A;
        }

        .bfp-password-toggle {
          background: transparent;
          border: none;
          color: #475569;
          font-size: 0.95rem;
          padding: 0 1rem;
          height: 100%;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: color 0.18s;
          touch-action: manipulation;
        }

        .bfp-password-toggle:hover {
          color: #000000;
        }

        .bfp-hint-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-top: -0.5rem;
          font-size: 0.78rem;
        }

        .bfp-char-pill {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          font-weight: 600;
          color: #64748B;
          transition: color 0.2s;
        }

        .bfp-char-pill.valid {
          color: #16A34A;
        }

        /* Error Banner */
        .bfp-error-banner {
          background: #FEF2F2;
          border: 1px solid #FECACA;
          border-radius: 8px;
          padding: 0.65rem 0.85rem;
          color: #991B1B;
          font-size: 0.8rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          animation: bfpShake 0.35s ease-in-out both;
        }

        @keyframes bfpShake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }

        /* Bottom Actions Block */
        .bfp-bottom-block {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
          margin-top: 2rem;
        }

        /* Submit Button */
        .bfp-submit-btn {
          width: 100%;
          height: 52px;
          background: #DC2626;
          border: none;
          border-radius: 12px;
          color: #FFFFFF;
          font-size: 0.98rem;
          font-weight: 800;
          letter-spacing: 0.01em;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.55rem;
          cursor: pointer;
          box-shadow: 0 4px 16px rgba(220, 38, 38, 0.32);
          transition: all 0.22s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .bfp-submit-btn:hover:not(:disabled) {
          background: #B91C1C;
          transform: translateY(-1.5px);
          box-shadow: 0 8px 24px rgba(220, 38, 38, 0.42);
        }

        .bfp-submit-btn:active:not(:disabled) {
          transform: translateY(0);
          box-shadow: 0 2px 8px rgba(220, 38, 38, 0.25);
        }

        .bfp-submit-btn:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }

        .bfp-footer-info {
          text-align: center;
        }

        .bfp-admin-hint {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          font-size: 0.8rem;
          color: #64748B;
          margin: 0;
          font-weight: 500;
        }

        .bfp-admin-hint i {
          color: #94A3B8;
          font-size: 0.85rem;
        }

        /* Mobile Layout */
        .bfp-mobile-logo-header {
          display: none;
        }

        @media (max-width: 880px) {
          .bfp-auth-card {
            grid-template-columns: 1fr;
            max-width: 480px;
            border-radius: 20px;
            min-height: auto;
          }
          .bfp-banner-side {
            display: none;
          }
          .bfp-form-side {
            min-height: auto;
            padding: 2rem 1.5rem;
          }
          .bfp-mobile-logo-header {
            display: flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 1.25rem;
          }
          .bfp-mobile-brand-logo {
            height: 2.75rem;
            width: auto;
            object-fit: contain;
          }
          .bfp-bottom-block {
            margin-top: 1.5rem;
          }
        }
      `}</style>

      <section className="bfp-auth-card" aria-labelledby="bfp-changepass-heading">
        {/* Left Side: Artwork Banner */}
        <aside className="bfp-banner-side">
          <img
            src={isProvincial ? "/images/FOR%20PROVOCIAL%20SIDE.webp" : "/images/formunicipallogin.webp"}
            alt={isProvincial ? "BFP Provincial Command Center" : "BFP Fire Station and Firetruck"}
            className="bfp-banner-img"
            loading="eager"
            fetchPriority="high"
            decoding="async"
          />

          <div className="bfp-banner-content">
            <div className="bfp-logo-lockup">
              <img
                src="/images/WHITE%20LOGO.webp"
                alt="ALAB Logo"
                className="bfp-brand-text-logo"
                loading="eager"
                decoding="async"
              />
            </div>

            <h1 className="bfp-banner-heading">
              {isProvincial ? "Provincial Command Center" : "Municipal Fire Station"}
            </h1>
            <p className="bfp-banner-tagline">
              {isProvincial ? "BFP Antique Fire Operations & Command" : "BFP Emergency & Truck Dispatch Operations"}
            </p>
            <p className="bfp-banner-desc">
              {isProvincial
                ? "Centralized coordination, cross-station monitoring, and strategic resource allocation."
                : "Real-time monitoring. Smarter response. Stronger protection for your municipality."}
            </p>
          </div>
        </aside>

        {/* Right Side: Clean Form */}
        <section className="bfp-form-side">
          <div className="bfp-mobile-logo-header">
            <img
              src="/images/Logo.webp"
              alt="ALAB Logo"
              className="bfp-mobile-brand-logo"
            />
          </div>

          <div className="bfp-form-top-block">
            {/* Top Badge */}
            <div className="bfp-station-tag">
              <i className={isProvincial ? "fa-solid fa-shield-halved" : "fa-solid fa-building-shield"} />
              <span>{isProvincial ? "BFP Provincial Headquarters" : "BFP Municipal Station Portal"}</span>
            </div>

            <header className="bfp-form-header">
              <div className="bfp-shield-icon-badge" aria-hidden="true">
                <img
                  src="/images/fire%20logo.webp"
                  alt="Fire Logo"
                  className="bfp-shield-fire-logo"
                />
              </div>
              <div className="bfp-header-text-group">
                <h2 id="bfp-changepass-heading" className="bfp-signin-title">
                  Set New Password
                </h2>
                <p className="bfp-signin-subtitle">
                  Create a permanent password to access your dashboard
                </p>
              </div>
            </header>
          </div>

          <form className="bfp-form" onSubmit={submit}>
            <div className="bfp-fields-block">
              {/* Temporary Password */}
              <div className="bfp-input-group">
                <span className="bfp-input-icon">
                  <i className="fa-solid fa-lock" />
                </span>
                <input
                  type={showCurrentPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Temporary password"
                  className="bfp-input"
                  required
                  aria-label="Temporary password"
                />
                <button
                  type="button"
                  className="bfp-password-toggle"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  aria-label={showCurrentPassword ? "Hide password" : "Show password"}
                  tabIndex={-1}
                >
                  <i className={`fa-regular ${showCurrentPassword ? "fa-eye-slash" : "fa-eye"}`} />
                </button>
              </div>

              {/* New Password */}
              <div className="bfp-input-group">
                <span className="bfp-input-icon">
                  <i className="fa-solid fa-shield-halved" />
                </span>
                <input
                  type={showNextPassword ? "text" : "password"}
                  autoComplete="new-password"
                  minLength={12}
                  value={nextPassword}
                  onChange={(e) => setNextPassword(e.target.value)}
                  placeholder="New password (min. 12 characters)"
                  className="bfp-input"
                  required
                  aria-label="New password"
                />
                <button
                  type="button"
                  className="bfp-password-toggle"
                  onClick={() => setShowNextPassword(!showNextPassword)}
                  aria-label={showNextPassword ? "Hide password" : "Show password"}
                  tabIndex={-1}
                >
                  <i className={`fa-regular ${showNextPassword ? "fa-eye-slash" : "fa-eye"}`} />
                </button>
              </div>

              {/* Micro Requirement Pill */}
              <div className="bfp-hint-row">
                <span className={`bfp-char-pill ${nextPassword.length >= 12 ? "valid" : ""}`}>
                  <i className={`fa-solid ${nextPassword.length >= 12 ? "fa-circle-check" : "fa-circle-info"}`} />
                  <span>{nextPassword.length >= 12 ? "Password requirement met (12+ characters)" : "Minimum 12 characters required"}</span>
                </span>
              </div>

              {/* Error Message */}
              {error && (
                <div className="bfp-error-banner" role="alert">
                  <i className="fa-solid fa-circle-exclamation" />
                  <span>{error}</span>
                </div>
              )}
            </div>

            {/* Bottom Actions Block */}
            <div className="bfp-bottom-block">
              {/* Submit Button */}
              <button disabled={loading} type="submit" className="bfp-submit-btn">
                {loading ? (
                  <>
                    <span aria-hidden="true" />
                    <span>Saving Password…</span>
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-shield-halved" />
                    <span>Save & Continue</span>
                  </>
                )}
              </button>

              {/* Help & Info */}
              <div className="bfp-footer-info">
                <p className="bfp-admin-hint">
                  <i className="fa-solid fa-shield-halved" />
                  <span>Need assistance? Contact your administrator.</span>
                </p>
              </div>
            </div>
          </form>
        </section>
      </section>

      {loading && <BfpLoginLoader theme={isProvincial ? "provincial" : "municipal"} />}
    </main>
  );
}
