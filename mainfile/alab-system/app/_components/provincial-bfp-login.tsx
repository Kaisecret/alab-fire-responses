'use client';

import { FormEvent, useState } from "react";

import { BfpLoginLoader } from "./bfp-login-loader";

export function ProvincialBfpLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch("/api/auth/bfp/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          password,
          portal: "PROVINCIAL",
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Login failed. Please check your credentials.");
      }

      window.location.href = result.redirectTo || "/provincial-bfp";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to connect to BFP network.");
      setLoading(false);
    }
  };

  return (
    <main className="prov-login-page">
      <style>{`
        .prov-login-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1.5rem;
          background-color: #EEF2F6;
          background-image:
            radial-gradient(at 100% 0%, rgba(220, 38, 38, 0.05) 0px, transparent 50%),
            radial-gradient(at 0% 100%, rgba(15, 23, 42, 0.04) 0px, transparent 50%),
            linear-gradient(to right, rgba(203, 213, 225, 0.3) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(203, 213, 225, 0.3) 1px, transparent 1px);
          background-size: 100% 100%, 100% 100%, 48px 48px, 48px 48px;
          font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          color: #0F172A;
          box-sizing: border-box;
        }

        .prov-login-card {
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
          animation: provCardFadeIn 0.55s cubic-bezier(0.16, 1, 0.3, 1) both;
        }

        @keyframes provCardFadeIn {
          0% {
            opacity: 0;
            transform: translateY(20px) scale(0.98);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        /* Left Side: Rich Provincial Artwork Banner */
        .prov-banner-side {
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

        .prov-banner-img {
          position: absolute;
          top: -4.9%;
          left: -3%;
          width: 103.5%;
          height: 109.8%;
          object-fit: fill;
          z-index: 1;
          pointer-events: none;
        }

        .prov-banner-content {
          position: relative;
          z-index: 3;
          display: flex;
          flex-direction: column;
          max-width: 440px;
        }

        .prov-logo-lockup {
          display: flex;
          align-items: center;
          margin-bottom: 1.35rem;
        }

        .prov-brand-text-logo {
          height: 5.6rem;
          width: auto;
          max-width: 320px;
          object-fit: contain;
          filter: drop-shadow(0 6px 20px rgba(0, 0, 0, 0.45));
        }

        .prov-banner-heading {
          font-size: clamp(1.6rem, 2.1vw, 2.1rem);
          font-weight: 850;
          color: #FFFFFF;
          line-height: 1.2;
          letter-spacing: -0.02em;
          margin: 0 0 0.35rem;
          text-shadow: 0 2px 10px rgba(0, 0, 0, 0.4);
          white-space: nowrap;
        }

        .prov-banner-tagline {
          font-size: 0.95rem;
          font-weight: 700;
          color: #FCD34D;
          margin: 0 0 0.75rem;
          letter-spacing: 0.01em;
          text-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
        }

        .prov-banner-desc {
          font-size: 0.82rem;
          color: rgba(255, 255, 255, 0.94);
          line-height: 1.55;
          margin: 0;
          text-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
          font-weight: 500;
          max-width: 320px;
        }

        /* Right Side: Clean Form */
        .prov-form-side {
          padding: clamp(2.5rem, 4vw, 3.25rem) clamp(2rem, 3.2vw, 3rem) 2.25rem;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          background: #FFFFFF;
          box-sizing: border-box;
          min-height: 580px;
        }

        .prov-form-top-block {
          display: flex;
          flex-direction: column;
        }

        .prov-station-tag {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          background: #FFFFFF;
          border: 1.5px solid #0F172A;
          color: #0F172A;
          font-size: 0.76rem;
          font-weight: 800;
          padding: 0.38rem 1rem;
          border-radius: 999px;
          margin-bottom: 1.25rem;
          width: fit-content;
          letter-spacing: 0.03em;
          text-transform: uppercase;
        }

        .prov-form-header {
          display: flex;
          align-items: center;
          gap: 1.15rem;
          margin-bottom: 1.65rem;
        }

        .prov-shield-icon-badge {
          width: 54px;
          height: 54px;
          border-radius: 14px;
          background: transparent;
          border: 2px solid #0F172A;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .prov-shield-fire-logo {
          width: 32px;
          height: 32px;
          object-fit: contain;
          display: block;
          filter: brightness(0) saturate(100%) invert(8%) sepia(20%) saturate(2200%) hue-rotate(185deg) brightness(95%) contrast(98%);
        }

        .prov-header-text-group {
          display: flex;
          flex-direction: column;
        }

        .prov-signin-title {
          font-size: 1.85rem;
          font-weight: 850;
          color: #0F172A;
          margin: 0;
          letter-spacing: -0.03em;
          line-height: 1.15;
        }

        .prov-signin-subtitle {
          font-size: 0.84rem;
          color: #64748B;
          margin: 0.25rem 0 0;
          font-weight: 500;
        }

        /* Form Inputs */
        .prov-form {
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          flex: 1;
        }

        .prov-fields-block {
          display: flex;
          flex-direction: column;
          gap: 1.35rem;
          margin-top: 1.5rem;
        }

        .prov-input-group {
          position: relative;
          display: flex;
          align-items: center;
          background: #FFFFFF;
          border: 1.5px solid #CBD5E1;
          border-radius: 12px;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          overflow: hidden;
        }

        .prov-input-group:hover {
          border-color: #0F172A;
        }

        .prov-input-group:focus-within {
          border-color: #0F172A;
          box-shadow: 0 0 0 3.5px rgba(15, 23, 42, 0.12);
        }

        .prov-input-icon {
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

        .prov-input-group:focus-within .prov-input-icon {
          color: #0F172A;
        }

        .prov-input {
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

        .prov-input::placeholder {
          color: #64748B;
          font-weight: 500;
        }

        .prov-password-toggle {
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

        .prov-password-toggle:hover {
          color: #0F172A;
        }

        /* Options Row */
        .prov-options-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 0.84rem;
          margin-top: 0.25rem;
        }

        .prov-checkbox-label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: #475569;
          font-weight: 600;
          cursor: pointer;
          user-select: none;
        }

        .prov-checkbox {
          width: 16px;
          height: 16px;
          border-radius: 4px;
          accent-color: #0F172A;
          cursor: pointer;
        }

        .prov-forgot-link {
          color: #0F172A;
          font-weight: 700;
          text-decoration: none;
          transition: color 0.18s, text-decoration 0.18s;
        }

        .prov-forgot-link:hover {
          color: #020617;
          text-decoration: underline;
        }

        /* Error Banner */
        .prov-error-banner {
          background: #FEF2F2;
          border: 1px solid #FECACA;
          border-radius: 8px;
          padding: 0.65rem 0.85rem;
          color: #991B1B;
          font-size: 0.8rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          animation: provShake 0.35s ease-in-out both;
        }

        @keyframes provShake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }

        /* Bottom Actions Block */
        .prov-bottom-block {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
          margin-top: 2rem;
        }

        /* Submit Button */
        .prov-submit-btn {
          width: 100%;
          height: 52px;
          background: #0B132B;
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
          box-shadow: 0 6px 20px rgba(11, 19, 43, 0.28);
          transition: all 0.22s cubic-bezier(0.16, 1, 0.3, 1);
          touch-action: manipulation;
          font-family: inherit;
        }

        .prov-submit-btn:hover:not(:disabled) {
          background: #020617;
          transform: translateY(-1.5px);
          box-shadow: 0 10px 26px rgba(2, 6, 23, 0.4);
        }

        .prov-submit-btn:active:not(:disabled) {
          transform: translateY(0);
          box-shadow: 0 2px 8px rgba(11, 19, 43, 0.25);
        }

        .prov-submit-btn:disabled {
          opacity: 0.7;
          cursor: wait;
        }

        /* Divider with Shield Badge */
        .prov-divider {
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          margin: 0.25rem 0;
        }

        .prov-divider::before {
          content: "";
          position: absolute;
          left: 0;
          right: 0;
          top: 50%;
          height: 1px;
          background: #E2E8F0;
        }

        .prov-divider-icon {
          position: relative;
          background: #FFFFFF;
          padding: 0 0.65rem;
          color: #94A3B8;
          font-size: 0.85rem;
        }

        /* Footer Info */
        .prov-footer-info {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.65rem;
          text-align: center;
        }

        .prov-admin-hint {
          font-size: 0.78rem;
          color: #64748B;
          display: flex;
          align-items: center;
          gap: 0.4rem;
          margin: 0;
          font-weight: 500;
        }

        /* Mobile Header Logo */
        .prov-mobile-logo-header {
          display: none;
          align-items: center;
          justify-content: center;
          margin-bottom: 1.5rem;
        }

        .prov-mobile-brand-logo {
          height: 3.2rem;
          width: auto;
          object-fit: contain;
          filter: drop-shadow(0 2px 8px rgba(15, 23, 42, 0.15));
        }

        /* Responsive */
        @media (max-width: 900px) {
          .prov-login-page {
            padding: 1rem 0.85rem;
            align-items: center;
          }
          .prov-login-card {
            grid-template-columns: 1fr;
            max-width: 440px;
            width: 100%;
            min-height: auto;
            border-radius: 22px;
            box-shadow: 0 16px 45px -10px rgba(15, 23, 42, 0.12);
          }
          .prov-banner-side {
            display: none !important;
          }
          .prov-mobile-logo-header {
            display: flex;
          }
          .prov-form-side {
            padding: 2.25rem 1.6rem 2rem;
            min-height: auto;
          }
          .prov-fields-block {
            margin-top: 1.25rem;
            gap: 1.15rem;
          }
          .prov-bottom-block {
            margin-top: 1.5rem;
          }
        }
      `}</style>

      <section className="prov-login-card" aria-labelledby="prov-signin-heading">
        {/* Left Side: Provincial Command Artwork Banner */}
        <aside className="prov-banner-side">
          <img
            src="/images/FOR%20PROVOCIAL%20SIDE.webp"
            alt="BFP Provincial Command Center"
            className="prov-banner-img"
          />
          <div className="prov-banner-content">
            <div className="prov-logo-lockup">
              <img
                src="/images/WHITE%20LOGO.webp"
                alt="ALAB Logo"
                className="prov-brand-text-logo"
              />
            </div>

            <h1 className="prov-banner-heading">Provincial Fire Command</h1>
            <p className="prov-banner-tagline">BFP Provincial Command &amp; Coordination Operations.</p>
            <p className="prov-banner-desc">
              Real-time monitoring. Smarter response. Stronger protection for the whole province.
            </p>
          </div>
        </aside>

        {/* Right Side: Sign In Form matching mockup */}
        <section className="prov-form-side">
          <div className="prov-mobile-logo-header">
            <img
              src="/images/Logo.webp"
              alt="ALAB Logo"
              className="prov-mobile-brand-logo"
            />
          </div>

          <div className="prov-form-top-block">
            {/* Provincial Top Identifier */}
            <div className="prov-station-tag">
              <i className="fa-solid fa-shield-halved" />
              <span>BFP PROVINCIAL COMMAND PORTAL</span>
            </div>

            <header className="prov-form-header">
              <div className="prov-shield-icon-badge" aria-hidden="true">
                <img
                  src="/images/fire%20logo.webp"
                  alt="Fire Logo"
                  className="prov-shield-fire-logo"
                />
              </div>
              <div className="prov-header-text-group">
                <h2 id="prov-signin-heading" className="prov-signin-title">
                  Provincial Sign In
                </h2>
                <p className="prov-signin-subtitle">Access the Provincial Fire Command Dashboard</p>
              </div>
            </header>
          </div>

          <form className="prov-form" onSubmit={submit}>
            <div className="prov-fields-block">
              {/* Username / Official Provincial Email */}
              <div className="prov-input-group">
                <span className="prov-input-icon">
                  <i className="fa-regular fa-user" />
                </span>
                <input
                  type="text"
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Username or provincial email"
                  className="prov-input"
                  required
                  aria-label="Username or provincial email"
                />
              </div>

              {/* Password */}
              <div className="prov-input-group">
                <span className="prov-input-icon">
                  <i className="fa-solid fa-lock" />
                </span>
                <input
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  className="prov-input"
                  required
                  aria-label="Password"
                />
                <button
                  type="button"
                  className="prov-password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  tabIndex={-1}
                >
                  <i className={`fa-regular ${showPassword ? "fa-eye-slash" : "fa-eye"}`} />
                </button>
              </div>

              {/* Remember Me & Forgot Password */}
              <div className="prov-options-row">
                <label className="prov-checkbox-label">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="prov-checkbox"
                  />
                  <span>Remember me</span>
                </label>

                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    alert("To reset your provincial account password, please contact the BFP Regional Office / IT Administrator.");
                  }}
                  className="prov-forgot-link"
                >
                  Forgot password?
                </a>
              </div>

              {/* Error Message */}
              {error && (
                <div className="prov-error-banner" role="alert">
                  <i className="fa-solid fa-circle-exclamation" />
                  <span>{error}</span>
                </div>
              )}
            </div>

            {/* Bottom Actions Block */}
            <div className="prov-bottom-block">
              {/* Submit Button */}
              <button disabled={loading} type="submit" className="prov-submit-btn">
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

              {/* Divider */}
              <div className="prov-divider">
                <i className="fa-solid fa-shield-halved prov-divider-icon" />
              </div>

              {/* Help & Info */}
              <div className="prov-footer-info">
                <p className="prov-admin-hint">
                  <i className="fa-solid fa-shield-halved" />
                  <span>Need access? Contact your administrator.</span>
                </p>
              </div>
            </div>
          </form>
        </section>
      </section>
      {loading && <BfpLoginLoader theme="provincial" />}
    </main>
  );
}
