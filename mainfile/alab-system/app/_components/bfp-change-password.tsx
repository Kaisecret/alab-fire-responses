'use client';

import { FormEvent, useState } from "react";

export function BfpChangePassword() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [nextPassword, setNextPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setLoading(true);
    try {
      const response = await fetch("/api/auth/bfp/change-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ currentPassword, nextPassword }) });
      const result = await response.json() as { error?: string; redirectTo?: string };
      if (!response.ok || !result.redirectTo) throw new Error(result.error || "Unable to update your password.");
      window.location.assign(result.redirectTo);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to update your password."); } finally { setLoading(false); }
  }
  return <main className="bfp-auth"><style>{`.bfp-auth{min-height:100vh;display:grid;place-items:center;padding:1.25rem;background:#f8fafc;font-family:Arial,sans-serif;color:#18212f}.bfp-auth-card{width:min(100%,30rem);background:#fff;border:1px solid #ffe0dc;border-radius:1.4rem;padding:2rem;box-shadow:0 22px 60px rgba(120,22,15,.14)}.bfp-auth h1{margin:0 0 .5rem;font-size:1.8rem}.bfp-auth p{color:#5e6b7b;line-height:1.5}.bfp-auth label{display:grid;gap:.45rem;margin-top:1rem;font-weight:700;font-size:.9rem}.bfp-auth input{padding:.82rem .9rem;border:1px solid #cbd5e1;border-radius:.7rem;font:inherit}.bfp-auth button{width:100%;margin-top:1.35rem;padding:.9rem;border:0;border-radius:.7rem;background:#db1b0d;color:#fff;font:700 1rem Arial;cursor:pointer}.bfp-auth-error{margin-top:1rem;padding:.7rem .8rem;background:#fff1f1;color:#b42318;border-radius:.6rem}`}</style><section className="bfp-auth-card"><h1>Set your personal password</h1><p>This is required before you can use the BFP dashboard. Use at least 12 characters and do not share it.</p><form onSubmit={submit}><label>Temporary password<input type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} required /></label><label>New password<input type="password" autoComplete="new-password" minLength={12} value={nextPassword} onChange={(event) => setNextPassword(event.target.value)} required /></label>{error && <p className="bfp-auth-error" role="alert">{error}</p>}<button disabled={loading} type="submit">{loading ? "Updating…" : "Save secure password"}</button></form></section></main>;
}
