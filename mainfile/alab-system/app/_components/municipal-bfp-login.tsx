'use client';

import Link from "next/link";
import { FormEvent, useState } from "react";

import { BfpLoginLoader } from "./bfp-login-loader";

export function MunicipalBfpLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const response = await fetch("/api/auth/bfp/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, portal: "MUNICIPAL" }),
      });
      const result = (await response.json()) as { error?: string; redirectTo?: string };
      if (!response.ok || !result.redirectTo) {
        throw new Error(result.error || "Unable to authenticate credentials.");
      }
      window.location.assign(result.redirectTo);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to authenticate credentials.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="muni-login-page">
      <style>{`
        /* =================================================================
           MUNICIPAL BFP LOGIN — MATCHING MOCKUP WITH formunicipallogin.webp
           ================================================================= */
        .muni-login-page {
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

        .muni-login-card {
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
          animation: muniCardFadeIn 0.55s cubic-bezier(0.16, 1, 0.3, 1) both;
        }

        @keyframes muniCardFadeIn {
          0% {
            opacity: 0;
            transform: translateY(20px) scale(0.98);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        /* Left Side: Rich Fire Truck Artwork Banner with transparent cutout */
        .muni-banner-side {
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

        .muni-banner-img {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          object-fit: fill;
          z-index: 1;
          pointer-events: none;
        }

        .muni-banner-content {
          position: relative;
          z-index: 3;
          display: flex;
          flex-direction: column;
          max-width: 440px;
        }

        .muni-logo-lockup {
          display: flex;
          align-items: center;
          margin-bottom: 1.35rem;
        }

        .muni-brand-text-logo {
          height: 5.6rem;
          width: auto;
          max-width: 320px;
          object-fit: contain;
          filter: drop-shadow(0 6px 20px rgba(0, 0, 0, 0.45));
        }

        .muni-banner-heading {
          font-size: clamp(1.6rem, 2.1vw, 2.1rem);
          font-weight: 850;
          color: #FFFFFF;
          line-height: 1.2;
          letter-spacing: -0.02em;
          margin: 0 0 0.35rem;
          text-shadow: 0 2px 10px rgba(0, 0, 0, 0.4);
          white-space: nowrap;
        }

        .muni-banner-tagline {
          font-size: 0.95rem;
          font-weight: 700;
          color: #FCD34D;
          margin: 0 0 0.75rem;
          letter-spacing: 0.01em;
          text-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
        }

        .muni-banner-desc {
          font-size: 0.82rem;
          color: rgba(255, 255, 255, 0.94);
          line-height: 1.55;
          margin: 0;
          text-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
          font-weight: 500;
          max-width: 320px;
        }

        /* Right Side: Clean Form */
        .muni-form-side {
          padding: clamp(2.5rem, 4vw, 3.25rem) clamp(2rem, 3.2vw, 3rem) 2.25rem;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          background: #FFFFFF;
          box-sizing: border-box;
          min-height: 580px;
        }

        .muni-form-top-block {
          display: flex;
          flex-direction: column;
        }

        .muni-station-tag {
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

        .muni-form-header {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 1.65rem;
        }

        .muni-shield-icon-badge {
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

        .muni-shield-fire-logo {
          width: 34px;
          height: 34px;
          object-fit: contain;
          display: block;
        }

        .muni-header-text-group {
          display: flex;
          flex-direction: column;
        }

        .muni-signin-title {
          font-size: 1.85rem;
          font-weight: 850;
          color: #0F172A;
          margin: 0;
          letter-spacing: -0.03em;
          line-height: 1.15;
        }

        .muni-signin-subtitle {
          font-size: 0.84rem;
          color: #64748B;
          margin: 0.25rem 0 0;
          font-weight: 500;
        }

        /* Form Inputs */
        .muni-form {
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          flex: 1;
        }

        .muni-fields-block {
          display: flex;
          flex-direction: column;
          gap: 1.35rem;
          margin-top: 1.5rem;
        }

        .muni-input-group {
          position: relative;
          display: flex;
          align-items: center;
          background: #FFFFFF;
          border: 1.5px solid #1E293B;
          border-radius: 12px;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          overflow: hidden;
        }

        .muni-input-group:hover {
          border-color: #000000;
        }

        .muni-input-group:focus-within {
          border-color: #DC2626;
          box-shadow: 0 0 0 3.5px rgba(220, 38, 38, 0.14);
        }

        .muni-input-icon {
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

        .muni-input-group:focus-within .muni-input-icon {
          color: #DC2626;
        }

        .muni-input {
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

        .muni-input::placeholder {
          color: #64748B;
          font-weight: 500;
        }

        .muni-password-toggle {
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

        .muni-password-toggle:hover {
          color: #000000;
        }

        /* Options Row */
        .muni-options-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 0.84rem;
          margin-top: 0.25rem;
        }

        .muni-checkbox-label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: #475569;
          font-weight: 600;
          cursor: pointer;
          user-select: none;
        }

        .muni-checkbox {
          width: 16px;
          height: 16px;
          border-radius: 4px;
          accent-color: #DC2626;
          cursor: pointer;
        }

        .muni-forgot-link {
          color: #DC2626;
          font-weight: 700;
          text-decoration: none;
          transition: color 0.18s, text-decoration 0.18s;
        }

        .muni-forgot-link:hover {
          color: #B91C1C;
          text-decoration: underline;
        }

        /* Error Banner */
        .muni-error-banner {
          background: #FEF2F2;
          border: 1px solid #FECACA;
          border-radius: 8px;
          padding: 0.65rem 0.85rem;
          color: #991B1B;
          font-size: 0.8rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          animation: muniShake 0.35s ease-in-out both;
        }

        @keyframes muniShake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }

        /* Bottom Actions Block */
        .muni-bottom-block {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
          margin-top: 2rem;
        }

        /* Submit Button */
        .muni-submit-btn {
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
          touch-action: manipulation;
          font-family: inherit;
        }

        .muni-submit-btn:hover:not(:disabled) {
          background: #B91C1C;
          transform: translateY(-1.5px);
          box-shadow: 0 8px 22px rgba(220, 38, 38, 0.45);
        }

        .muni-submit-btn:active:not(:disabled) {
          transform: translateY(0);
          box-shadow: 0 2px 8px rgba(220, 38, 38, 0.25);
        }

        .muni-submit-btn:disabled {
          opacity: 0.7;
          cursor: wait;
        }

        /* Footer Info */
        .muni-footer-info {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.65rem;
          padding-top: 1.15rem;
          border-top: 1px solid #F1F5F9;
          text-align: center;
        }

        .muni-admin-hint {
          font-size: 0.78rem;
          color: #64748B;
          display: flex;
          align-items: center;
          gap: 0.4rem;
          margin: 0;
          font-weight: 500;
        }

        /* Mobile Header Logo */
        .muni-mobile-logo-header {
          display: none;
          align-items: center;
          justify-content: center;
          margin-bottom: 1.5rem;
        }

        .muni-mobile-brand-logo {
          height: 3.2rem;
          width: auto;
          object-fit: contain;
          filter: drop-shadow(0 2px 8px rgba(220, 38, 38, 0.15));
        }

        /* Responsive */
        @media (max-width: 900px) {
          .muni-login-page {
            padding: 1rem 0.85rem;
            align-items: center;
          }
          .muni-login-card {
            grid-template-columns: 1fr;
            max-width: 440px;
            width: 100%;
            min-height: auto;
            border-radius: 22px;
            box-shadow: 0 16px 45px -10px rgba(15, 23, 42, 0.12);
          }
          .muni-banner-side {
            display: none !important;
          }
          .muni-mobile-logo-header {
            display: flex;
          }
          .muni-form-side {
            padding: 2.25rem 1.6rem 2rem;
            min-height: auto;
          }
          .muni-fields-block {
            margin-top: 1.25rem;
            gap: 1.15rem;
          }
          .muni-bottom-block {
            margin-top: 1.5rem;
          }
        }
      `}</style>

      <section className="muni-login-card" aria-labelledby="muni-signin-heading">
        {/* Left Side: Fire Truck Banner matching mockup */}
        <aside className="muni-banner-side">
          <img
            src="/images/formunicipallogin.webp"
            alt="BFP Fire Station and Firetruck"
            className="muni-banner-img"
          />

          <div className="muni-banner-content">
            <div className="muni-logo-lockup">
              <img
                src="/images/WHITE%20LOGO.webp"
                alt="ALAB Logo"
                className="muni-brand-text-logo"
              />
            </div>

            <h1 className="muni-banner-heading">Municipal Fire Station</h1>
            <p className="muni-banner-tagline">BFP Emergency & Truck Dispatch Operations</p>
            <p className="muni-banner-desc">
              Real-time monitoring. Smarter response. Stronger protection for your municipality.
            </p>
          </div>
        </aside>

        {/* Right Side: Sign In Form matching mockup */}
        <section className="muni-form-side">
          <div className="muni-mobile-logo-header">
            <img
              src="/images/Logo.webp"
              alt="ALAB Logo"
              className="muni-mobile-brand-logo"
            />
          </div>

          <div className="muni-form-top-block">
            {/* Municipality Top Identifier */}
            <div className="muni-station-tag">
              <i className="fa-solid fa-building-shield" />
              <span>BFP Municipal Station Portal</span>
            </div>

            <header className="muni-form-header">
              <div className="muni-shield-icon-badge" aria-hidden="true">
                <img
                  src="/images/fire%20logo.webp"
                  alt="Fire Logo"
                  className="muni-shield-fire-logo"
                />
              </div>
              <div className="muni-header-text-group">
                <h2 id="muni-signin-heading" className="muni-signin-title">
                  Municipal Sign In
                </h2>
                <p className="muni-signin-subtitle">Access your municipal fire command dashboard</p>
              </div>
            </header>
          </div>

          <form className="muni-form" onSubmit={submit}>
            <div className="muni-fields-block">
              {/* Username / Official Email */}
              <div className="muni-input-group">
                <span className="muni-input-icon">
                  <i className="fa-regular fa-user" />
                </span>
                <input
                  type="text"
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Username or municipal email"
                  className="muni-input"
                  required
                  aria-label="Username or municipal email"
                />
              </div>

              {/* Password */}
              <div className="muni-input-group">
                <span className="muni-input-icon">
                  <i className="fa-solid fa-lock" />
                </span>
                <input
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  className="muni-input"
                  required
                  aria-label="Password"
                />
                <button
                  type="button"
                  className="muni-password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  tabIndex={-1}
                >
                  <i className={`fa-regular ${showPassword ? "fa-eye-slash" : "fa-eye"}`} />
                </button>
              </div>

              {/* Remember Me & Forgot Password */}
              <div className="muni-options-row">
                <label className="muni-checkbox-label">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="muni-checkbox"
                  />
                  <span>Remember me</span>
                </label>

                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    alert("To reset your station password, please contact the Provincial BFP Administrator.");
                  }}
                  className="muni-forgot-link"
                >
                  Forgot password?
                </a>
              </div>

              {/* Error Message */}
              {error && (
                <div className="muni-error-banner" role="alert">
                  <i className="fa-solid fa-circle-exclamation" />
                  <span>{error}</span>
                </div>
              )}
            </div>

            {/* Bottom Actions Block */}
            <div className="muni-bottom-block">
              {/* Submit Button */}
              <button disabled={loading} type="submit" className="muni-submit-btn">
                {loading ? (
                  <>
                    <span aria-hidden="true" />
                    <span>Signing In…</span>
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-shield-halved" />
                    <span>Sign In</span>
                  </>
                )}
              </button>

              {/* Help & Info */}
              <div className="muni-footer-info">
                <p className="muni-admin-hint">
                  <i className="fa-solid fa-shield-halved" />
                  <span>Need access? Contact your administrator.</span>
                </p>
              </div>
            </div>
          </form>
        </section>
      </section>
      {loading && <BfpLoginLoader theme="municipal" />}
    </main>
  );
}
