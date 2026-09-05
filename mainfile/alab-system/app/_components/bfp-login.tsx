'use client';

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

interface BfpLoginProps {
  portal: "MUNICIPAL" | "PROVINCIAL";
}

export function BfpLogin({ portal: initialPortal }: BfpLoginProps) {
  const router = useRouter();
  const [activePortal, setActivePortal] = useState<"MUNICIPAL" | "PROVINCIAL">(initialPortal);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [lockoutSeconds, setLockoutSeconds] = useState(0);

  const isProvincial = activePortal === "PROVINCIAL";
  const portalTitle = isProvincial ? "Provincial Command Center" : "Municipal Fire Station";
  const portalSubtitle = isProvincial
    ? "Bureau of Fire Protection • Antique Provincial Headquarters"
    : "Bureau of Fire Protection • Municipal Fire Operations";
  const placeholderEmail = isProvincial
    ? "e.g. province.admin@bfp.gov.ph"
    : "e.g. station.sanjose@bfp.gov.ph";

  useEffect(() => {
    try {
      const raw = localStorage.getItem("alab_bfp_login_lockout");
      if (raw) {
        const until = Number(raw);
        const remaining = Math.ceil((until - Date.now()) / 1000);
        if (remaining > 0) {
          setLockoutSeconds(remaining);
        } else {
          localStorage.removeItem("alab_bfp_login_lockout");
        }
      }
    } catch {
      // Ignore storage errors in restricted browser contexts
    }
  }, []);

  useEffect(() => {
    if (lockoutSeconds <= 0) return;
    const interval = setInterval(() => {
      setLockoutSeconds((prev) => {
        if (prev <= 1) {
          try {
            localStorage.removeItem("alab_bfp_login_lockout");
          } catch {}
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [lockoutSeconds]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (lockoutSeconds > 0) {
      setError(`Too many login attempts. Please wait ${lockoutSeconds} seconds before trying again.`);
      return;
    }
    setError("");
    setLoading(true);
    try {
      const response = await fetch("/api/auth/bfp/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, portal: activePortal }),
      });
      const result = (await response.json()) as {
        error?: string;
        redirectTo?: string;
        locked?: boolean;
        retryAfterSeconds?: number;
      };
      if (!response.ok || !result.redirectTo) {
        if (response.status === 429 || result.locked) {
          const waitSec = result.retryAfterSeconds || 120;
          setLockoutSeconds(waitSec);
          try {
            localStorage.setItem("alab_bfp_login_lockout", String(Date.now() + waitSec * 1000));
          } catch {}
        }
        throw new Error(result.error || "Unable to authenticate credentials.");
      }
      try {
        localStorage.removeItem("alab_bfp_login_lockout");
      } catch {}
      window.location.assign(result.redirectTo);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to authenticate credentials.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="bfp-auth-root">
      <style>{`
        /* =========================================================
           ALAB BFP COMMAND CENTER LOGIN — IMPECCABLE & UI/UX PRO MAX
           ========================================================= */
        .bfp-auth-root {
          min-height: 100vh;
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          position: relative;
          background: #080D1A;
          color: #F8FAFC;
          font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          overflow-x: hidden;
          padding: 1.5rem 1rem 2rem;
          box-sizing: border-box;
        }

        /* Ambient Command Halo & Subtle Grid Texture */
        .bfp-auth-bg {
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: 0;
          overflow: hidden;
        }

        .bfp-bg-glow-1 {
          position: absolute;
          top: -15%;
          left: 50%;
          transform: translateX(-50%);
          width: 800px;
          height: 600px;
          background: radial-gradient(circle, rgba(219, 27, 13, 0.16) 0%, rgba(245, 158, 11, 0.05) 45%, transparent 70%);
          filter: blur(60px);
        }

        .bfp-bg-glow-2 {
          position: absolute;
          bottom: -20%;
          right: 10%;
          width: 600px;
          height: 500px;
          background: radial-gradient(circle, rgba(30, 58, 138, 0.14) 0%, transparent 65%);
          filter: blur(70px);
        }

        .bfp-bg-grid {
          position: absolute;
          inset: 0;
          background-size: 40px 40px;
          background-image:
            linear-gradient(to right, rgba(255, 255, 255, 0.02) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255, 255, 255, 0.02) 1px, transparent 1px);
          mask-image: radial-gradient(circle at center, black 40%, transparent 90%);
          -webkit-mask-image: radial-gradient(circle at center, black 40%, transparent 90%);
        }

        /* Floating Subtle Embers */
        .bfp-ember-orb {
          position: absolute;
          border-radius: 50%;
          background: #FF6B35;
          opacity: 0.25;
          filter: blur(1px);
          animation: bfpEmberFloat 7s infinite ease-in-out;
        }
        .bfp-ember-1 { width: 5px; height: 5px; top: 25%; left: 18%; animation-delay: 0s; }
        .bfp-ember-2 { width: 4px; height: 4px; top: 65%; right: 22%; animation-delay: 2.5s; }
        .bfp-ember-3 { width: 6px; height: 6px; bottom: 18%; left: 28%; animation-delay: 4.5s; }

        @keyframes bfpEmberFloat {
          0%, 100% { transform: translateY(0) scale(1); opacity: 0.15; }
          50% { transform: translateY(-30px) scale(1.3); opacity: 0.45; }
        }

        /* Main Container Card */
        .bfp-login-wrapper {
          position: relative;
          z-index: 10;
          width: 100%;
          max-width: 460px;
          margin: auto 0;
          animation: bfpCardSlideUp 0.55s cubic-bezier(0.16, 1, 0.3, 1) both;
        }

        @keyframes bfpCardSlideUp {
          0% {
            opacity: 0;
            transform: translate3d(0, 24px, 0);
          }
          100% {
            opacity: 1;
            transform: translate3d(0, 0, 0);
          }
        }

        /* Portal Switcher Segmented Control */
        .bfp-portal-switch {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 6px;
          background: rgba(15, 23, 42, 0.85);
          border: 1px solid rgba(255, 255, 255, 0.1);
          padding: 5px;
          border-radius: 14px;
          margin-bottom: 1rem;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        }

        .bfp-portal-tab {
          padding: 0.65rem 0.75rem;
          border: none;
          background: transparent;
          color: #94A3B8;
          font-size: 0.78rem;
          font-weight: 700;
          border-radius: 10px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.45rem;
          transition: all 0.22s cubic-bezier(0.16, 1, 0.3, 1);
          touch-action: manipulation;
          font-family: inherit;
        }

        .bfp-portal-tab:hover {
          color: #FFFFFF;
          background: rgba(255, 255, 255, 0.05);
        }

        .bfp-portal-tab.active {
          background: #DB1B0D;
          color: #FFFFFF;
          box-shadow: 0 4px 14px rgba(219, 27, 13, 0.4);
        }

        .bfp-portal-tab i {
          font-size: 0.82rem;
        }

        /* Command Card Surface */
        .bfp-auth-card {
          background: rgba(15, 23, 42, 0.78);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 20px;
          padding: 2rem 2rem 1.75rem;
          box-shadow:
            0 24px 60px -12px rgba(0, 0, 0, 0.65),
            0 0 40px rgba(219, 27, 13, 0.08),
            inset 0 1px 1px rgba(255, 255, 255, 0.15);
          position: relative;
          overflow: hidden;
        }

        /* Top Accent Border Line */
        .bfp-auth-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: linear-gradient(90deg, #DB1B0D 0%, #FF6B35 50%, #FFAA00 100%);
          z-index: 2;
        }

        /* Card Header & Brand Lockup */
        .bfp-brand-header {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          margin-bottom: 1.5rem;
        }

        .bfp-badge-container {
          position: relative;
          margin-bottom: 0.85rem;
        }

        .bfp-badge-squircle {
          width: 60px;
          height: 60px;
          border-radius: 16px;
          background: #FFFFFF;
          border: 2px solid rgba(255, 255, 255, 0.9);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 8px 24px rgba(219, 27, 13, 0.35);
          position: relative;
          z-index: 2;
          transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .bfp-badge-squircle:hover {
          transform: scale(1.06);
        }

        .bfp-badge-icon {
          width: 38px;
          height: 38px;
          object-fit: contain;
        }

        .bfp-badge-halo {
          position: absolute;
          inset: -6px;
          border-radius: 20px;
          background: radial-gradient(circle, rgba(219, 27, 13, 0.45) 0%, transparent 70%);
          z-index: 1;
          filter: blur(6px);
        }

        .bfp-title-kicker {
          font-size: 0.68rem;
          font-weight: 800;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: #F87171;
          margin-bottom: 0.3rem;
          display: flex;
          align-items: center;
          gap: 0.35rem;
        }

        .bfp-login-title {
          font-size: 1.45rem;
          font-weight: 800;
          color: #FFFFFF;
          margin: 0;
          letter-spacing: -0.02em;
          line-height: 1.2;
        }

        .bfp-login-desc {
          font-size: 0.78rem;
          color: #94A3B8;
          margin: 0.4rem 0 0;
          line-height: 1.45;
        }

        /* Security Level Pill */
        .bfp-security-pill {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          background: rgba(16, 185, 129, 0.1);
          border: 1px solid rgba(16, 185, 129, 0.25);
          color: #34D399;
          font-size: 0.65rem;
          font-weight: 700;
          padding: 0.22rem 0.6rem;
          border-radius: 999px;
          margin-top: 0.65rem;
          letter-spacing: 0.02em;
        }

        /* Form Fields */
        .bfp-form {
          display: flex;
          flex-direction: column;
          gap: 1.1rem;
        }

        .bfp-field-group {
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
        }

        .bfp-field-label-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .bfp-field-label {
          font-size: 0.76rem;
          font-weight: 700;
          color: #E2E8F0;
          letter-spacing: 0.01em;
          display: flex;
          align-items: center;
          gap: 0.35rem;
        }

        .bfp-field-tag {
          font-size: 0.62rem;
          font-weight: 700;
          color: #64748B;
          text-transform: uppercase;
        }

        .bfp-input-box {
          position: relative;
          display: flex;
          align-items: center;
          background: rgba(11, 18, 33, 0.8);
          border: 1.5px solid rgba(255, 255, 255, 0.12);
          border-radius: 12px;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          overflow: hidden;
        }

        .bfp-input-box:hover {
          border-color: rgba(255, 255, 255, 0.22);
          background: rgba(11, 18, 33, 0.95);
        }

        .bfp-input-box:focus-within {
          border-color: #DB1B0D;
          background: #0B1221;
          box-shadow: 0 0 0 3px rgba(219, 27, 13, 0.22), 0 4px 16px rgba(0, 0, 0, 0.4);
        }

        .bfp-input-icon {
          width: 42px;
          height: 42px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #64748B;
          font-size: 0.9rem;
          flex-shrink: 0;
          transition: color 0.2s;
        }

        .bfp-input-box:focus-within .bfp-input-icon {
          color: #F87171;
        }

        .bfp-input {
          flex: 1;
          height: 44px;
          background: transparent;
          border: none;
          outline: none;
          color: #FFFFFF;
          font-size: 0.86rem;
          font-family: inherit;
          padding-right: 0.85rem;
        }

        .bfp-input::placeholder {
          color: #475569;
          font-size: 0.8rem;
        }

        .bfp-password-toggle {
          background: transparent;
          border: none;
          color: #64748B;
          font-size: 0.88rem;
          padding: 0 0.85rem;
          height: 100%;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: color 0.18s;
          touch-action: manipulation;
        }

        .bfp-password-toggle:hover {
          color: #F8FAFC;
        }

        /* Error Banner */
        .bfp-error-banner {
          background: rgba(220, 38, 38, 0.12);
          border: 1px solid rgba(220, 38, 38, 0.35);
          border-radius: 10px;
          padding: 0.75rem 0.95rem;
          display: flex;
          align-items: flex-start;
          gap: 0.6rem;
          color: #FCA5A5;
          font-size: 0.78rem;
          line-height: 1.4;
          animation: bfpShake 0.4s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
        }

        @keyframes bfpShake {
          10%, 90% { transform: translate3d(-1px, 0, 0); }
          20%, 80% { transform: translate3d(2px, 0, 0); }
          30%, 50%, 70% { transform: translate3d(-3px, 0, 0); }
          40%, 60% { transform: translate3d(3px, 0, 0); }
        }

        .bfp-error-banner i {
          color: #EF4444;
          font-size: 0.9rem;
          margin-top: 2px;
          flex-shrink: 0;
        }

        /* Primary Submit CTA */
        .bfp-submit-btn {
          width: 100%;
          height: 48px;
          margin-top: 0.5rem;
          background: linear-gradient(135deg, #E23632 0%, #C41C18 100%);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 12px;
          color: #FFFFFF;
          font-size: 0.88rem;
          font-weight: 800;
          letter-spacing: 0.02em;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.55rem;
          cursor: pointer;
          box-shadow: 0 4px 18px rgba(226, 54, 50, 0.35);
          transition: all 0.22s cubic-bezier(0.16, 1, 0.3, 1);
          touch-action: manipulation;
          position: relative;
          overflow: hidden;
          font-family: inherit;
        }

        .bfp-submit-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(226, 54, 50, 0.5);
          background: linear-gradient(135deg, #EC3C38 0%, #D4201C 100%);
        }

        .bfp-submit-btn:active:not(:disabled) {
          transform: translateY(0);
          box-shadow: 0 2px 10px rgba(226, 54, 50, 0.3);
        }

        .bfp-submit-btn:disabled {
          opacity: 0.75;
          cursor: wait;
        }

        /* Button Glow Sweep */
        .bfp-submit-btn::after {
          content: '';
          position: absolute;
          top: -50%;
          left: -60%;
          width: 40%;
          height: 200%;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
          transform: rotate(25deg);
          transition: left 0.75s ease-in-out;
        }

        .bfp-submit-btn:hover::after {
          left: 120%;
        }

        .bfp-spinner {
          width: 18px;
          height: 18px;
          border: 2.5px solid rgba(255, 255, 255, 0.3);
          border-top-color: #FFFFFF;
          border-radius: 50%;
          animation: bfpSpin 0.7s linear infinite;
        }

        @keyframes bfpSpin {
          to { transform: rotate(360deg); }
        }

        /* Card Footer Notes */
        .bfp-card-footer {
          margin-top: 1.5rem;
          padding-top: 1.15rem;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.85rem;
          text-align: center;
        }

        .bfp-help-text {
          font-size: 0.72rem;
          color: #64748B;
          line-height: 1.45;
          margin: 0;
        }

        .bfp-back-link {
          display: inline-flex;
          align-items: center;
          gap: 0.45rem;
          color: #94A3B8;
          font-size: 0.76rem;
          font-weight: 700;
          text-decoration: none;
          transition: color 0.18s, transform 0.18s;
          padding: 0.35rem 0.65rem;
          border-radius: 8px;
        }

        .bfp-back-link:hover {
          color: #F8FAFC;
          background: rgba(255, 255, 255, 0.05);
          transform: translateX(-2px);
        }

        .bfp-back-link i {
          font-size: 0.72rem;
        }

        /* Bottom Security Copyright */
        .bfp-bottom-meta {
          margin-top: 1.5rem;
          font-size: 0.68rem;
          color: #475569;
          text-align: center;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          z-index: 10;
        }

        @media (max-width: 520px) {
          .bfp-auth-card {
            padding: 1.5rem 1.25rem 1.35rem;
            border-radius: 16px;
          }
        }
      `}</style>

      {/* Background Aura & Blueprint Texture */}
      <div className="bfp-auth-bg" aria-hidden="true">
        <div className="bfp-bg-glow-1" />
        <div className="bfp-bg-glow-2" />
        <div className="bfp-bg-grid" />
        <div className="bfp-ember-orb bfp-ember-1" />
        <div className="bfp-ember-orb bfp-ember-2" />
        <div className="bfp-ember-orb bfp-ember-3" />
      </div>

      {/* Main Login Module Wrapper */}
      <div className="bfp-login-wrapper">
        {/* Portal Switcher Segmented Control */}
        <div className="bfp-portal-switch" role="tablist" aria-label="Portal Selection">
          <button
            type="button"
            role="tab"
            aria-selected={isProvincial}
            className={`bfp-portal-tab ${isProvincial ? "active" : ""}`}
            onClick={() => {
              setActivePortal("PROVINCIAL");
              setError("");
              router.replace("/provincial-bfp/login");
            }}
          >
            <i className="fa-solid fa-building-shield" />
            <span>Provincial HQ</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={!isProvincial}
            className={`bfp-portal-tab ${!isProvincial ? "active" : ""}`}
            onClick={() => {
              router.push("/municipal-bfp/login");
            }}
          >
            <i className="fa-solid fa-fire-extinguisher" />
            <span>Municipal Station</span>
          </button>
        </div>

        {/* Command Card */}
        <section className="bfp-auth-card" aria-labelledby="bfp-login-title">
          {/* Card Header Brand Lockup */}
          <div className="bfp-brand-header">
            <div className="bfp-badge-container">
              <div className="bfp-badge-halo" />
              <div className="bfp-badge-squircle">
                <img
                  src="/images/FAVICON.webp"
                  alt="Bureau of Fire Protection Emblem"
                  className="bfp-badge-icon"
                />
              </div>
            </div>

            <div className="bfp-title-kicker">
              <i className="fa-solid fa-shield-halved" />
              <span>{isProvincial ? "Provincial Command HQ" : "Municipal Fire Station"}</span>
            </div>

            <h1 id="bfp-login-title" className="bfp-login-title">
              {portalTitle}
            </h1>

            <p className="bfp-login-desc">{portalSubtitle}</p>

            <div className="bfp-security-pill">
              <i className="fa-solid fa-lock" />
              <span>256-Bit Encrypted • Official BFP Personnel Only</span>
            </div>
          </div>

          {/* Form */}
          <form className="bfp-form" onSubmit={submit}>
            {/* Email Field */}
            <div className="bfp-field-group">
              <div className="bfp-field-label-row">
                <label htmlFor="bfp-email-input" className="bfp-field-label">
                  <i className="fa-regular fa-envelope" /> Official BFP Email
                </label>
                <span className="bfp-field-tag">Required</span>
              </div>
              <div className="bfp-input-box">
                <span className="bfp-input-icon">
                  <i className="fa-solid fa-user-shield" />
                </span>
                <input
                  id="bfp-email-input"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={placeholderEmail}
                  className="bfp-input"
                  required
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="bfp-field-group">
              <div className="bfp-field-label-row">
                <label htmlFor="bfp-password-input" className="bfp-field-label">
                  <i className="fa-solid fa-key" /> Secure Password
                </label>
                <span className="bfp-field-tag">Restricted</span>
              </div>
              <div className="bfp-input-box">
                <span className="bfp-input-icon">
                  <i className="fa-solid fa-lock" />
                </span>
                <input
                  id="bfp-password-input"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="bfp-input"
                  required
                />
                <button
                  type="button"
                  className="bfp-password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  tabIndex={-1}
                >
                  <i className={`fa-regular ${showPassword ? "fa-eye-slash" : "fa-eye"}`} />
                </button>
              </div>
            </div>

            {/* Error Alert */}
            {error && (
              <div className="bfp-error-banner" role="alert">
                <i className="fa-solid fa-triangle-exclamation" />
                <span>{error}</span>
              </div>
            )}

            {/* Submit Button */}
            <button disabled={loading || lockoutSeconds > 0} type="submit" className="bfp-submit-btn">
              {lockoutSeconds > 0 ? (
                <>
                  <i className="fa-solid fa-lock" />
                  <span>Locked for Security ({lockoutSeconds}s wait)</span>
                </>
              ) : loading ? (
                <>
                  <span className="bfp-spinner" />
                  <span>Verifying Clearance…</span>
                </>
              ) : (
                <>
                  <span>Authorize & Sign In</span>
                  <i className="fa-solid fa-arrow-right" />
                </>
              )}
            </button>
          </form>

          {/* Card Footer */}
          <footer className="bfp-card-footer">
            <p className="bfp-help-text">
              Accounts are provisioned by Provincial BFP Administrators.
              <br />
              Need credentials or assistance? Contact IT Dispatch Command.
            </p>
            <Link href="/" className="bfp-back-link">
              <i className="fa-solid fa-arrow-left" />
              <span>Return to ALAB Citizen Portal</span>
            </Link>
          </footer>
        </section>
      </div>

      {/* Bottom Meta */}
      <footer className="bfp-bottom-meta">
        <span>© {new Date().getFullYear()} ALAB Emergency System</span>
        <span>•</span>
        <span>Republic of the Philippines • BFP Region VI</span>
      </footer>
    </main>
  );
}
