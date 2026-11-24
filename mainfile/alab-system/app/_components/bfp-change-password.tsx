"use client";

import { municipalTabFetch as fetch } from "../../lib/auth/municipal-tab-fetch";

import { FormEvent, useState } from "react";

import { BfpLoginLoader } from "./bfp-login-loader";

const MIN_LENGTH = 12;

export function BfpChangePassword({ portal }: { portal: "MUNICIPAL" | "PROVINCIAL" }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [nextPassword, setNextPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNextPassword, setShowNextPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const isProvincial = portal === "PROVINCIAL";
  const longEnough = nextPassword.length >= MIN_LENGTH;
  const matches = confirmPassword.length > 0 && confirmPassword === nextPassword;
  const differs = nextPassword.length > 0 && nextPassword !== currentPassword;
  const ready = currentPassword.length > 0 && longEnough && matches && differs;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!ready) return;
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

  const checks = [
    { ok: longEnough, label: `At least ${MIN_LENGTH} characters` },
    { ok: differs, label: "Different from the temporary password" },
    { ok: matches, label: "Both new passwords match" },
  ];

  return (
    <main className="bfp-pass-page">
      <style>{`
        /* A focused account-security step, deliberately unlike the sign-in page. */
        .bfp-pass-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem 1rem;
          box-sizing: border-box;
          background: #F1F5F9;
          font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          color: #0F172A;
        }
        .bfp-pass-card {
          width: min(100%, 460px);
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 20px;
          box-shadow: 0 18px 40px -20px rgba(15, 23, 42, 0.25);
          overflow: hidden;
        }
        .bfp-pass-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.75rem;
          padding: 0.9rem 1.5rem;
          border-bottom: 1px solid #F1F5F9;
        }
        .bfp-pass-logo { height: 2.75rem; width: auto; display: block; }
        .bfp-pass-portal {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0.25rem 0.65rem;
          border-radius: 999px;
          background: #F8FAFC;
          border: 1px solid #E2E8F0;
          color: #475569;
          font-size: 0.72rem;
          font-weight: 700;
        }
        .bfp-pass-body { padding: 1.75rem 1.5rem 1.5rem; }
        .bfp-pass-icon {
          width: 52px;
          height: 52px;
          border-radius: 16px;
          display: grid;
          place-items: center;
          background: #FEF2F2;
          color: #DC2626;
          font-size: 1.35rem;
          margin-bottom: 1rem;
        }
        .bfp-pass-title { margin: 0; font-size: 1.45rem; font-weight: 800; letter-spacing: -0.02em; }
        .bfp-pass-sub { margin: 0.35rem 0 0; color: #64748B; font-size: 0.88rem; line-height: 1.5; }
        .bfp-pass-form { display: flex; flex-direction: column; gap: 1rem; margin-top: 1.5rem; }
        .bfp-pass-field { display: flex; flex-direction: column; gap: 0.4rem; }
        .bfp-pass-field label { font-size: 0.8rem; font-weight: 700; color: #334155; }
        .bfp-pass-input {
          display: flex;
          align-items: center;
          border: 1.5px solid #CBD5E1;
          border-radius: 12px;
          background: #FFFFFF;
          transition: border-color 0.18s, box-shadow 0.18s;
        }
        .bfp-pass-input:focus-within { border-color: #DC2626; box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.12); }
        .bfp-pass-input input {
          flex: 1;
          min-width: 0;
          height: 48px;
          padding: 0 0.9rem;
          border: 0;
          outline: 0;
          background: transparent;
          font: inherit;
          font-size: 0.95rem;
          font-weight: 600;
          color: #0F172A;
        }
        .bfp-pass-eye {
          width: 46px;
          height: 46px;
          border: 0;
          background: transparent;
          color: #64748B;
          cursor: pointer;
          font-size: 0.95rem;
        }
        .bfp-pass-eye:hover { color: #0F172A; }
        .bfp-pass-eye:focus-visible { outline: 2px solid #DC2626; outline-offset: -4px; border-radius: 10px; }
        .bfp-pass-checks {
          list-style: none;
          margin: 0;
          padding: 0.85rem 1rem;
          border-radius: 12px;
          background: #F8FAFC;
          display: flex;
          flex-direction: column;
          gap: 0.45rem;
        }
        .bfp-pass-checks li { display: flex; align-items: center; gap: 0.55rem; font-size: 0.8rem; font-weight: 600; color: #64748B; }
        .bfp-pass-checks li i { width: 1rem; text-align: center; color: #CBD5E1; }
        .bfp-pass-checks li.ok { color: #15803D; }
        .bfp-pass-checks li.ok i { color: #16A34A; }
        .bfp-pass-error {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.65rem 0.85rem;
          border-radius: 10px;
          background: #FEF2F2;
          border: 1px solid #FECACA;
          color: #991B1B;
          font-size: 0.82rem;
        }
        .bfp-pass-submit {
          height: 50px;
          border: 0;
          border-radius: 12px;
          background: #DC2626;
          color: #FFFFFF;
          font: inherit;
          font-size: 0.95rem;
          font-weight: 800;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          cursor: pointer;
          transition: background 0.18s;
        }
        .bfp-pass-submit:hover:not(:disabled) { background: #B91C1C; }
        .bfp-pass-submit:focus-visible { outline: 3px solid rgba(220, 38, 38, 0.35); outline-offset: 2px; }
        .bfp-pass-submit:disabled { background: #F1A5A5; cursor: not-allowed; }
        .bfp-pass-help { margin: 0; text-align: center; font-size: 0.78rem; color: #94A3B8; }
        @media (max-width: 480px) {
          .bfp-pass-page { align-items: flex-start; padding: 1rem 0.75rem; }
          .bfp-pass-body { padding: 1.4rem 1.1rem 1.25rem; }
          .bfp-pass-top { padding: 0.8rem 1.1rem; }
        }
      `}</style>

      <section className="bfp-pass-card" aria-labelledby="bfp-changepass-heading">
        <div className="bfp-pass-top">
          <img src="/images/Logo.webp" alt="ALAB" className="bfp-pass-logo" />
          <span className="bfp-pass-portal">
            <i className={isProvincial ? "fa-solid fa-shield-halved" : "fa-solid fa-building-shield"} aria-hidden="true" />
            {isProvincial ? "Provincial BFP" : "Municipal BFP"}
          </span>
        </div>

        <div className="bfp-pass-body">
          <div className="bfp-pass-icon" aria-hidden="true"><i className="fa-solid fa-key" /></div>
          <h1 id="bfp-changepass-heading" className="bfp-pass-title">Change your password</h1>
          <p className="bfp-pass-sub">Replace the temporary password before you open the dashboard.</p>

          <form className="bfp-pass-form" onSubmit={submit} noValidate>
            <div className="bfp-pass-field">
              <label htmlFor="bfp-current-password">Temporary password</label>
              <div className="bfp-pass-input">
                <input
                  id="bfp-current-password"
                  type={showCurrentPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="bfp-pass-eye"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  aria-label={showCurrentPassword ? "Hide temporary password" : "Show temporary password"}
                >
                  <i className={`fa-regular ${showCurrentPassword ? "fa-eye-slash" : "fa-eye"}`} aria-hidden="true" />
                </button>
              </div>
            </div>

            <div className="bfp-pass-field">
              <label htmlFor="bfp-next-password">New password</label>
              <div className="bfp-pass-input">
                <input
                  id="bfp-next-password"
                  type={showNextPassword ? "text" : "password"}
                  autoComplete="new-password"
                  minLength={MIN_LENGTH}
                  value={nextPassword}
                  onChange={(e) => setNextPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="bfp-pass-eye"
                  onClick={() => setShowNextPassword(!showNextPassword)}
                  aria-label={showNextPassword ? "Hide new password" : "Show new password"}
                >
                  <i className={`fa-regular ${showNextPassword ? "fa-eye-slash" : "fa-eye"}`} aria-hidden="true" />
                </button>
              </div>
            </div>

            <div className="bfp-pass-field">
              <label htmlFor="bfp-confirm-password">Confirm new password</label>
              <div className="bfp-pass-input">
                <input
                  id="bfp-confirm-password"
                  type={showNextPassword ? "text" : "password"}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <ul className="bfp-pass-checks" aria-label="Password requirements">
              {checks.map((check) => (
                <li key={check.label} className={check.ok ? "ok" : ""}>
                  <i className={`fa-solid ${check.ok ? "fa-circle-check" : "fa-circle"}`} aria-hidden="true" />
                  <span>{check.label}</span>
                </li>
              ))}
            </ul>

            {error && (
              <div className="bfp-pass-error" role="alert">
                <i className="fa-solid fa-circle-exclamation" aria-hidden="true" />
                <span>{error}</span>
              </div>
            )}

            <button disabled={loading || !ready} type="submit" className="bfp-pass-submit">
              <i className="fa-solid fa-lock" aria-hidden="true" />
              <span>{loading ? "Saving…" : "Save new password"}</span>
            </button>

            <p className="bfp-pass-help">Forgot the temporary password? Contact your administrator.</p>
          </form>
        </div>
      </section>

      {loading && <BfpLoginLoader theme={isProvincial ? "provincial" : "municipal"} />}
    </main>
  );
}
