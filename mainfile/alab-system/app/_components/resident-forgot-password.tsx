"use client";

import { useEffect, useRef, useState } from "react";

type Step = "request" | "code" | "password" | "done";

const RESEND_SECONDS = 60;

const styles = `
  .rfp-overlay { position: fixed; inset: 0; z-index: 1100; display: flex; align-items: center; justify-content: center; padding: 1.25rem; background: radial-gradient(circle at top, rgba(217, 27, 16, .28), rgba(15, 23, 42, .78)); backdrop-filter: blur(7px); -webkit-backdrop-filter: blur(7px); animation: rfpFade .2s ease both; }
  .rfp-card { position: relative; width: min(100%, 27rem); padding: 2rem 1.75rem 1.6rem; border: 1px solid rgba(217, 27, 16, .16); border-radius: 24px; background: linear-gradient(160deg, #FFFAF8 0%, #FFFFFF 55%); box-shadow: 0 30px 80px rgba(0, 0, 0, .35); font-family: var(--font-plus-jakarta, 'Plus Jakarta Sans'), system-ui, sans-serif; color: #0F172A; animation: rfpRise .28s cubic-bezier(.16, 1, .3, 1) both; }
  .rfp-close { position: absolute; top: .9rem; right: .9rem; width: 2.25rem; height: 2.25rem; display: grid; place-items: center; border: 0; border-radius: 50%; background: transparent; color: #64748B; font-size: 1.35rem; line-height: 1; cursor: pointer; }
  .rfp-close:hover { background: #F1F5F9; color: #0F172A; }
  .rfp-progress { display: flex; justify-content: center; gap: .4rem; margin-bottom: 1.25rem; }
  .rfp-progress span { width: 1.75rem; height: .3rem; border-radius: 99px; background: #F1E4E2; transition: background .2s ease, width .2s ease; }
  .rfp-progress span.on { width: 2.5rem; background: linear-gradient(90deg, #EF3D2C, #B8150C); }
  .rfp-icon { width: 4.25rem; height: 4.25rem; margin: 0 auto 1rem; display: grid; place-items: center; border-radius: 22px; background: linear-gradient(145deg, #EF3D2C, #B8150C); color: #fff; box-shadow: 0 14px 28px -12px rgba(217, 27, 16, .65); }
  .rfp-icon.ok { border-radius: 50%; background: linear-gradient(145deg, #22C55E, #15803D); box-shadow: 0 14px 28px -12px rgba(21, 128, 61, .6); }
  .rfp-icon svg { width: 2rem; height: 2rem; }
  .rfp-card h2 { margin: 0 0 .4rem; text-align: center; font-size: 1.45rem; font-weight: 800; letter-spacing: -.02em; }
  .rfp-sub { margin: 0 auto 1.35rem; max-width: 22rem; text-align: center; color: #475569; font-size: .92rem; line-height: 1.55; }
  .rfp-label { display: block; margin-bottom: .45rem; color: #334155; font-size: .8rem; font-weight: 700; }
  .rfp-input { width: 100%; box-sizing: border-box; min-height: 3.1rem; padding: .8rem 1rem; border: 1.5px solid #E2E8F0; border-radius: 14px; background: #fff; color: #0F172A; font: inherit; font-size: 1rem; outline: none; transition: border-color .18s ease, box-shadow .18s ease; }
  .rfp-input:focus { border-color: #D91B10; box-shadow: 0 0 0 4px rgba(217, 27, 16, .12); }
  .rfp-field { position: relative; margin-bottom: .9rem; }
  .rfp-eye { position: absolute; right: .55rem; bottom: .45rem; height: 2.2rem; padding: 0 .6rem; border: 0; border-radius: 10px; background: transparent; color: #64748B; font: inherit; font-size: .78rem; font-weight: 700; cursor: pointer; }
  .rfp-eye:hover { background: #F1F5F9; color: #0F172A; }
  .rfp-otp { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: .5rem; margin-bottom: 1rem; }
  .rfp-otp input { width: 100%; box-sizing: border-box; height: 3.5rem; border: 1.5px solid #E2E8F0; border-radius: 14px; background: #fff; color: #0F172A; font: inherit; font-size: 1.5rem; font-weight: 800; text-align: center; outline: none; transition: border-color .18s ease, box-shadow .18s ease, background .18s ease; }
  .rfp-otp input:focus { border-color: #D91B10; box-shadow: 0 0 0 4px rgba(217, 27, 16, .12); }
  .rfp-otp input.filled { border-color: #FCA5A5; background: #FFF7F6; }
  .rfp-rules { display: flex; flex-wrap: wrap; gap: .4rem; margin: -.2rem 0 1rem; padding: 0; list-style: none; }
  .rfp-rules li { padding: .25rem .6rem; border-radius: 99px; background: #F1F5F9; color: #64748B; font-size: .74rem; font-weight: 700; }
  .rfp-rules li.met { background: #ECFDF3; color: #047857; }
  .rfp-error { margin: 0 0 .9rem; padding: .65rem .8rem; border-radius: 12px; background: #FEF2F2; color: #B91C1C; font-size: .84rem; font-weight: 700; line-height: 1.45; }
  .rfp-primary { width: 100%; min-height: 3.25rem; border: 0; border-radius: 14px; background: linear-gradient(135deg, #E8331A, #B8150C); color: #fff; font: inherit; font-size: 1rem; font-weight: 800; letter-spacing: .01em; cursor: pointer; box-shadow: 0 12px 24px -12px rgba(217, 27, 16, .7); transition: transform .18s ease, box-shadow .18s ease, opacity .18s ease; }
  .rfp-primary:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 16px 28px -12px rgba(217, 27, 16, .75); }
  .rfp-primary:disabled { opacity: .6; cursor: wait; }
  .rfp-link { display: block; margin: .9rem auto 0; padding: .35rem .6rem; border: 0; background: transparent; color: #B8150C; font: inherit; font-size: .86rem; font-weight: 700; cursor: pointer; }
  .rfp-link:disabled { color: #94A3B8; cursor: default; }
  .rfp-note { margin: .85rem 0 0; text-align: center; color: #64748B; font-size: .8rem; line-height: 1.5; }
  .rfp-close:focus-visible, .rfp-primary:focus-visible, .rfp-link:focus-visible, .rfp-eye:focus-visible { outline: 3px solid rgba(217, 27, 16, .35); outline-offset: 2px; }
  @keyframes rfpFade { from { opacity: 0; } to { opacity: 1; } }
  @keyframes rfpRise { from { opacity: 0; transform: translateY(14px) scale(.98); } to { opacity: 1; transform: none; } }
  @media (max-width: 420px) { .rfp-card { padding: 1.75rem 1.2rem 1.4rem; } .rfp-otp { gap: .35rem; } .rfp-otp input { height: 3.1rem; font-size: 1.3rem; } }
  @media (prefers-reduced-motion: reduce) { .rfp-overlay, .rfp-card { animation: none; } }
`;

const STEP_ORDER: Step[] = ["request", "code", "password", "done"];

async function post(url: string, body: unknown) {
  const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await response.json().catch(() => ({})) as { error?: string; resetId?: string };
  if (!response.ok) throw new Error(data.error || "Something went wrong. Please try again.");
  return data;
}

/** Recover with a code sent to the account's email, or SMS when no email is saved. */
export function ResidentForgotPassword({ initialIdentifier, onClose, onDone }: {
  initialIdentifier: string;
  onClose: () => void;
  onDone: (identifier: string) => void;
}) {
  const [step, setStep] = useState<Step>("request");
  const [identifier, setIdentifier] = useState(initialIdentifier);
  const [resetId, setResetId] = useState("");
  const [digits, setDigits] = useState<string[]>(Array(6).fill(""));
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const cardRef = useRef<HTMLDivElement>(null);
  const otpRefs = useRef<Array<HTMLInputElement | null>>([]);
  const code = digits.join("");

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Move focus to the first field of each step.
  useEffect(() => {
    const target = step === "code" ? otpRefs.current[0] : cardRef.current?.querySelector<HTMLElement>("input, .rfp-primary");
    target?.focus();
  }, [step]);

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = window.setTimeout(() => setResendIn((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [resendIn]);

  const run = async (work: () => Promise<void>) => {
    setBusy(true);
    setError("");
    try { await work(); } catch (cause) { setError(cause instanceof Error ? cause.message : "Something went wrong. Please try again."); } finally { setBusy(false); }
  };

  const sendCode = () => run(async () => {
    if (!identifier.trim()) throw new Error("Enter your username, email, or mobile number.");
    const data = await post("/api/auth/password-reset/start", { identifier: identifier.trim() });
    setResetId(data.resetId ?? "");
    setDigits(Array(6).fill(""));
    setResendIn(RESEND_SECONDS);
    setStep("code");
  });

  const verifyCode = () => run(async () => {
    if (code.length !== 6) throw new Error("Enter all 6 digits of the code.");
    await post("/api/auth/password-reset/confirm", { resetId, code });
    setStep("password");
  });

  const savePassword = () => run(async () => {
    if (password.length < 8) throw new Error("Use at least 8 characters.");
    if (password !== confirm) throw new Error("The two passwords do not match.");
    await post("/api/auth/password-reset/confirm", { resetId, code, password });
    setStep("done");
  });

  const setDigit = (index: number, value: string) => {
    const clean = value.replace(/\D/g, "");
    if (clean.length > 1) {
      // A pasted or auto-filled code fills every box.
      const next = clean.slice(0, 6).split("");
      setDigits(Array.from({ length: 6 }, (_, i) => next[i] ?? ""));
      otpRefs.current[Math.min(next.length, 5)]?.focus();
      return;
    }
    setDigits((current) => current.map((digit, i) => (i === index ? clean : digit)));
    if (clean && index < 5) otpRefs.current[index + 1]?.focus();
  };

  const onDigitKey = (index: number, event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Backspace" && !digits[index] && index > 0) otpRefs.current[index - 1]?.focus();
    if (event.key === "ArrowLeft" && index > 0) otpRefs.current[index - 1]?.focus();
    if (event.key === "ArrowRight" && index < 5) otpRefs.current[index + 1]?.focus();
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (busy) return;
    if (step === "request") void sendCode();
    else if (step === "code") void verifyCode();
    else if (step === "password") void savePassword();
    else onDone(identifier.trim());
  };

  const titles: Record<Step, [string, string]> = {
    request: ["Forgot your password?", "Enter your username, email, or mobile number. We will email a 6-digit code to the address on your account. Accounts without email receive a text message."],
    code: ["Enter the code", "If the account exists, check its registered email or mobile for your code. It expires in 10 minutes."],
    password: ["Set a new password", "Use at least 8 characters. You will log in with this password."],
    done: ["Password updated", "You can now log in with your new password."],
  };
  const [title, subtitle] = titles[step];
  const stepIndex = STEP_ORDER.indexOf(step);

  return (
    <div className="rfp-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <style>{styles}</style>
      <div ref={cardRef} className="rfp-card" role="dialog" aria-modal="true" aria-labelledby="rfp-title" aria-describedby="rfp-sub">
        <button type="button" className="rfp-close" aria-label="Close" onClick={onClose}>×</button>
        <div className="rfp-progress" aria-hidden="true">
          {STEP_ORDER.map((item, index) => <span key={item} className={index <= stepIndex ? "on" : ""} />)}
        </div>
        <div className={`rfp-icon ${step === "done" ? "ok" : ""}`} aria-hidden="true">
          {step === "done" ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
          ) : step === "code" ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" /><path d="M12 18h.01" /></svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
          )}
        </div>
        <h2 id="rfp-title">{title}</h2>
        <p id="rfp-sub" className="rfp-sub">{subtitle}</p>

        <form onSubmit={submit} noValidate>
          {step === "request" && (
            <div className="rfp-field">
              <label className="rfp-label" htmlFor="rfp-identifier">Username, email, or mobile number</label>
              <input id="rfp-identifier" className="rfp-input" value={identifier} autoComplete="username" maxLength={100}
                placeholder="e.g. 09171234567" onChange={(event) => setIdentifier(event.target.value)} />
            </div>
          )}

          {step === "code" && (
            <div className="rfp-otp" role="group" aria-label="6-digit code">
              {digits.map((digit, index) => (
                <input key={index} ref={(element) => { otpRefs.current[index] = element; }} className={digit ? "filled" : ""}
                  value={digit} inputMode="numeric" pattern="[0-9]*" maxLength={index === 0 ? 6 : 1}
                  autoComplete={index === 0 ? "one-time-code" : "off"} aria-label={`Digit ${index + 1}`}
                  onChange={(event) => setDigit(index, event.target.value)} onKeyDown={(event) => onDigitKey(index, event)}
                  onFocus={(event) => event.target.select()} />
              ))}
            </div>
          )}

          {step === "password" && (
            <>
              <div className="rfp-field">
                <label className="rfp-label" htmlFor="rfp-password">New password</label>
                <input id="rfp-password" className="rfp-input" type={showPassword ? "text" : "password"} value={password}
                  autoComplete="new-password" maxLength={128} onChange={(event) => setPassword(event.target.value)} />
                <button type="button" className="rfp-eye" onClick={() => setShowPassword((value) => !value)} aria-pressed={showPassword}>
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
              <div className="rfp-field">
                <label className="rfp-label" htmlFor="rfp-confirm">Confirm new password</label>
                <input id="rfp-confirm" className="rfp-input" type={showPassword ? "text" : "password"} value={confirm}
                  autoComplete="new-password" maxLength={128} onChange={(event) => setConfirm(event.target.value)} />
              </div>
              <ul className="rfp-rules" aria-label="Password checks">
                <li className={password.length >= 8 ? "met" : ""}>{password.length >= 8 ? "✓ " : ""}8+ characters</li>
                <li className={confirm.length > 0 && password === confirm ? "met" : ""}>{confirm.length > 0 && password === confirm ? "✓ " : ""}Passwords match</li>
              </ul>
            </>
          )}

          {error && <p className="rfp-error" role="alert">{error}</p>}

          <button type="submit" className="rfp-primary" disabled={busy}>
            {busy ? "Please wait…" : step === "request" ? "Send code" : step === "code" ? "Verify code" : step === "password" ? "Update password" : "Back to login"}
          </button>
        </form>

        {step === "code" && (
          <>
            <button type="button" className="rfp-link" disabled={busy || resendIn > 0} onClick={() => void sendCode()}>
              {resendIn > 0 ? `Resend code in ${resendIn}s` : "Resend code"}
            </button>
            <p className="rfp-note">No code yet? Check your email inbox and Spam folder. If your account has no email, check your text messages.</p>
          </>
        )}
        {step === "request" && <button type="button" className="rfp-link" onClick={onClose}>Back to login</button>}
      </div>
    </div>
  );
}
