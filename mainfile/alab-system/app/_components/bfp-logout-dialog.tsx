"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

/**
 * Checks that a BFP sign-out really ended the session: the logout call must
 * answer with `signedOut`, and the portal's /me check must then refuse this
 * browser. The page leaves only after both, so a session that still works is
 * never reported as signed out.
 */
export async function confirmBfpSignedOut(logout: Response, checkSession: () => Promise<Response>) {
  if (!logout.ok) throw new Error("The server could not end your session. Try again.");
  const result = (await logout.json().catch(() => null)) as { signedOut?: boolean; previewSession?: boolean } | null;
  if (!result?.signedOut) throw new Error("The server did not confirm the sign-out. Try again.");
  // Local UI previews have no real session to end.
  if (result.previewSession) return;
  const check = await checkSession();
  if (check.ok) throw new Error("This browser is still signed in. Try again.");
}

const styles = `
  .bfp-logout-backdrop { position:fixed; inset:0; z-index:10000; display:grid; place-items:center; padding:1rem; background:rgba(15,23,42,.6); backdrop-filter:blur(3px); animation:bfpLogoutFade .18s ease-out; }
  .bfp-logout { width:min(400px,100%); padding:1.5rem 1.4rem 1.25rem; border-radius:20px; background:#fff; color:#172033; font-family:'Plus Jakarta Sans', sans-serif; text-align:center; box-shadow:0 30px 80px -24px rgba(15,23,42,.6); animation:bfpLogoutPop .22s cubic-bezier(.16,1,.3,1); }
  .bfp-logout * { box-sizing:border-box; }
  .bfp-logout__icon { display:grid; width:60px; height:60px; margin:0 auto .9rem; place-items:center; border-radius:18px; background:linear-gradient(135deg,#ef4444,#b91c1c); color:#fff; font-size:1.4rem; box-shadow:0 0 0 8px #fef2f2, 0 14px 26px -12px rgba(185,28,28,.8); }
  .bfp-logout h2 { margin:0; font-size:1.15rem; font-weight:800; letter-spacing:-.01em; }
  .bfp-logout__text { margin:.45rem 0 0; color:#667085; font-size:.84rem; line-height:1.5; }
  .bfp-logout__account { display:inline-flex; align-items:center; gap:.45rem; max-width:100%; margin-top:.85rem; padding:.4rem .75rem; border:1px solid #e4e7ec; border-radius:999px; background:#f8fafc; color:#344054; font-size:.76rem; font-weight:750; }
  .bfp-logout__account span { overflow:hidden; white-space:nowrap; text-overflow:ellipsis; }
  .bfp-logout__account i { color:#b91c1c; }
  .bfp-logout__error { display:flex; align-items:flex-start; gap:.5rem; margin:1rem 0 0; padding:.65rem .8rem; border:1px solid #fecdca; border-radius:10px; background:#fef3f2; color:#b42318; font-size:.78rem; font-weight:700; line-height:1.4; text-align:left; }
  .bfp-logout__error i { margin-top:.12rem; }
  .bfp-logout__actions { display:grid; grid-template-columns:1fr 1fr; gap:.6rem; margin-top:1.25rem; }
  .bfp-logout__actions button { display:inline-flex; align-items:center; justify-content:center; gap:.5rem; min-height:44px; border-radius:11px; padding:.6rem 1rem; font:inherit; font-size:.86rem; font-weight:800; cursor:pointer; transition:background .15s, box-shadow .15s, transform .15s; }
  .bfp-logout__cancel { border:1px solid #d0d5dd; background:#fff; color:#344054; }
  .bfp-logout__cancel:hover:not(:disabled) { background:#f2f4f7; }
  .bfp-logout__confirm { border:0; background:linear-gradient(135deg,#ef4444,#b91c1c); color:#fff; box-shadow:0 10px 20px -10px rgba(185,28,28,.85); }
  .bfp-logout__confirm:hover:not(:disabled) { transform:translateY(-1px); box-shadow:0 14px 24px -10px rgba(185,28,28,.9); }
  .bfp-logout__actions button:disabled { opacity:.7; cursor:wait; }
  .bfp-logout__actions button:focus-visible { outline:3px solid rgba(185,28,28,.35); outline-offset:2px; }
  @keyframes bfpLogoutFade { from { opacity:0; } to { opacity:1; } }
  @keyframes bfpLogoutPop { from { opacity:0; transform:translateY(8px) scale(.97); } to { opacity:1; transform:none; } }
  @media (prefers-reduced-motion:reduce) { .bfp-logout-backdrop, .bfp-logout { animation:none; } .bfp-logout__confirm:hover:not(:disabled) { transform:none; } }
`;

export function BfpLogoutDialog({ open, message, accountName, onCancel, onConfirm }: {
  open: boolean;
  message: string;
  accountName?: string | null;
  onCancel: () => void;
  /** Ends the session and leaves the page; throws when the sign-out fails. */
  onConfirm: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const busyRef = useRef(false);

  const close = () => {
    if (busyRef.current) return;
    setError(null);
    onCancel();
  };
  const closeRef = useRef(close);
  useEffect(() => { closeRef.current = close; });

  useEffect(() => {
    if (!open) return;
    cancelRef.current?.focus();
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") closeRef.current(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!open) return null;

  const confirm = async () => {
    busyRef.current = true;
    setBusy(true);
    setError(null);
    try {
      await onConfirm();
      // Success navigates away; the dialog stays busy until the page unloads.
    } catch (failure) {
      busyRef.current = false;
      setBusy(false);
      setError(failure instanceof Error && failure.message ? failure.message : "Sign-out failed. Try again.");
    }
  };

  return createPortal(
    <div className="bfp-logout-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}>
      <style>{styles}</style>
      <section className="bfp-logout" role="alertdialog" aria-modal="true" aria-labelledby="bfp-logout-title" aria-describedby="bfp-logout-text">
        <span className="bfp-logout__icon" aria-hidden="true"><i className="fa-solid fa-arrow-right-from-bracket" /></span>
        <h2 id="bfp-logout-title">Sign out?</h2>
        <p id="bfp-logout-text" className="bfp-logout__text">{message}</p>
        {accountName && <span className="bfp-logout__account"><i className="fa-solid fa-user-shield" aria-hidden="true" /><span>{accountName}</span></span>}
        {error && <p className="bfp-logout__error" role="alert"><i className="fa-solid fa-circle-exclamation" aria-hidden="true" />{error}</p>}
        <div className="bfp-logout__actions">
          <button ref={cancelRef} type="button" className="bfp-logout__cancel" onClick={close} disabled={busy}>Cancel</button>
          <button type="button" className="bfp-logout__confirm" onClick={confirm} disabled={busy}>
            <i className={`fa-solid ${busy ? "fa-spinner fa-spin" : "fa-arrow-right-from-bracket"}`} aria-hidden="true" />
            {busy ? "Signing out…" : "Sign out"}
          </button>
        </div>
      </section>
    </div>,
    document.body,
  );
}
