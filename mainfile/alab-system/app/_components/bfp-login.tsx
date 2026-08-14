'use client';

import Link from "next/link";
import { FormEvent, useState } from "react";

export function BfpLogin({ portal }: { portal: "MUNICIPAL" | "PROVINCIAL" }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const title = portal === "PROVINCIAL" ? "Provincial BFP" : "Municipal BFP";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const response = await fetch("/api/auth/bfp/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, portal }),
      });
      const result = await response.json() as { error?: string; redirectTo?: string };
      if (!response.ok || !result.redirectTo) throw new Error(result.error || "Unable to sign in.");
      window.location.assign(result.redirectTo);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to sign in.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="bfp-auth">
      <style>{`
        .bfp-auth{min-height:100vh;display:grid;place-items:center;padding:1.25rem;background:radial-gradient(circle at 15% 15%,#ffe4df 0,transparent 33%),#f8fafc;font-family:Arial,sans-serif;color:#18212f}.bfp-auth-card{width:min(100%,30rem);background:#fff;border:1px solid #ffe0dc;border-radius:1.4rem;padding:2rem;box-shadow:0 22px 60px rgba(120,22,15,.14)}.bfp-auth-mark{width:3rem;height:3rem;display:grid;place-items:center;border-radius:1rem;background:#db1b0d;color:#fff;font-size:1.4rem}.bfp-auth h1{margin:1rem 0 .4rem;font-size:1.8rem}.bfp-auth p{color:#5e6b7b;line-height:1.5}.bfp-auth label{display:grid;gap:.45rem;margin-top:1rem;font-weight:700;font-size:.9rem}.bfp-auth input{padding:.82rem .9rem;border:1px solid #cbd5e1;border-radius:.7rem;font:inherit}.bfp-auth input:focus{outline:3px solid #fecaca;border-color:#db1b0d}.bfp-auth button{width:100%;margin-top:1.35rem;padding:.9rem;border:0;border-radius:.7rem;background:#db1b0d;color:#fff;font:700 1rem inherit;cursor:pointer}.bfp-auth button:disabled{opacity:.65;cursor:wait}.bfp-auth-error{margin-top:1rem;padding:.7rem .8rem;background:#fff1f1;color:#b42318;border-radius:.6rem;font-size:.9rem}.bfp-auth a{display:block;margin-top:1rem;text-align:center;color:#b42318;font-weight:700;text-decoration:none}
      `}</style>
      <section className="bfp-auth-card" aria-labelledby="bfp-login-title">
        <div className="bfp-auth-mark" aria-hidden="true">♜</div>
        <h1 id="bfp-login-title">{title} sign in</h1>
        <p>Use the official email and individual password issued by Provincial BFP.</p>
        <form onSubmit={submit}>
          <label>Official email<input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
          <label>Password<input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required /></label>
          {error && <p className="bfp-auth-error" role="alert">{error}</p>}
          <button disabled={loading} type="submit">{loading ? "Signing in…" : "Sign in securely"}</button>
        </form>
        <Link href="/">Return to ALAB home</Link>
      </section>
    </main>
  );
}
