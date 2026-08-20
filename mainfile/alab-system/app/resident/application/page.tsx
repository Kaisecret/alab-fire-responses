"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";

type Application = {
  reference: string; status: "PENDING" | "VERIFIED" | "CHANGES_REQUESTED"; accountStatus: string;
  correctionReason: string | null; submittedAt: string; firstName: string; lastName: string;
  email: string; phone: string; username: string; municipality: string; barangay: string; address: string;
};

export default function ResidentApplicationPage() {
  const [application, setApplication] = useState<Application | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const load = useCallback(async () => {
    const response = await fetch("/api/resident/application-status", { cache: "no-store" });
    const result = await response.json() as { application?: Application; error?: string };
    if (!response.ok || !result.application) { setError(result.error ?? "Unable to load your application."); return; }
    setApplication(result.application); setError("");
  }, []);
  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function resubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError("");
    const response = await fetch("/api/resident/application-status/resubmit", { method: "POST", body: new FormData(event.currentTarget) });
    const result = await response.json() as { error?: string };
    setSaving(false);
    if (!response.ok) { setError(result.error ?? "Unable to resubmit corrections."); return; }
    await load();
  }

  const isApproved = application?.status === "VERIFIED" && application.accountStatus === "ACTIVE";
  const needsChanges = application?.status === "CHANGES_REQUESTED";
  return (
    <main className="approval-page">
      <style>{styles}</style>
      <section className="approval-shell">
        <header className="approval-brand"><img src="/images/Logo.webp" alt="ALAB" /><span>Resident identity review</span></header>
        {!application && !error && <div className="approval-loading"><span />Loading your secure application…</div>}
        {error && !application && <div className="approval-error"><h1>We could not open your application</h1><p>{error}</p><Link href="/resident/login">Return to resident login</Link></div>}
        {application && (
          <>
            <div className={`approval-hero ${needsChanges ? "changes" : isApproved ? "approved" : "pending"}`}>
              <div className="approval-symbol">{needsChanges ? "!" : isApproved ? "✓" : "⌛"}</div>
              <div><p className="eyebrow">{application.reference}</p><h1>{needsChanges ? "Changes requested" : isApproved ? "Application approved" : "Under review"}</h1>
              <p>{needsChanges ? "Please correct the items identified by your Municipal BFP and resubmit." : isApproved ? "Your identity is approved. You can now sign in to the resident application." : `Your application is safely queued with ${application.municipality} Municipal BFP.`}</p></div>
            </div>
            <div className="approval-summary">
              <div><small>Applicant</small><strong>{application.firstName} {application.lastName}</strong></div>
              <div><small>Municipality</small><strong>{application.municipality}</strong></div>
              <div><small>Submitted</small><strong>{new Date(application.submittedAt).toLocaleString("en-PH")}</strong></div>
            </div>
            {isApproved && <Link className="primary-action" href="/resident/login">Continue to resident login</Link>}
            {!isApproved && !needsChanges && <div className="review-note"><strong>What happens next?</strong><p>Authorized Municipal BFP personnel will compare your registration details with your protected, watermarked ID copies. You can return to this page after signing in to check the result.</p></div>}
            {needsChanges && (
              <form className="correction-form" onSubmit={resubmit}>
                <div className="correction-reason"><strong>Municipal BFP note</strong><p>{application.correctionReason}</p></div>
                <h2>Correct and resubmit</h2><p className="form-help">Submit clear replacement images. Review copies automatically receive an ALAB privacy watermark.</p>
                <div className="field-grid">
                  <label>First name<input name="firstName" defaultValue={application.firstName} required /></label>
                  <label>Last name<input name="lastName" defaultValue={application.lastName} required /></label>
                  <label>Barangay<input name="barangay" defaultValue={application.barangay} required /></label>
                  <label className="wide">Complete address<input name="address" defaultValue={application.address} required /></label>
                  <label className="upload">Valid ID — front<input name="frontId" type="file" accept="image/jpeg,image/png,image/webp" required /></label>
                  <label className="upload">Valid ID — back (optional)<input name="backId" type="file" accept="image/jpeg,image/png,image/webp" /></label>
                  <label className="upload wide">New selfie<input name="selfie" type="file" accept="image/jpeg,image/png,image/webp" capture="user" required /></label>
                </div>
                {error && <p className="inline-error" role="alert">{error}</p>}
                <button className="primary-action" disabled={saving}>{saving ? "Securing your corrections…" : "Resubmit for review"}</button>
              </form>
            )}
          </>
        )}
      </section>
    </main>
  );
}

const styles = `
*{box-sizing:border-box}.approval-page{min-height:100dvh;padding:clamp(1rem,4vw,3rem);font-family:var(--font-plus-jakarta),Arial,sans-serif;color:#111827;background:#fff8f5 radial-gradient(circle at 10% 0%,#fee2e2 0,transparent 28%)}
.approval-shell{width:min(880px,100%);margin:auto;background:#fff;border:1px solid #f1dfdb;border-radius:28px;box-shadow:0 24px 70px rgba(127,29,29,.1);overflow:hidden}.approval-brand{display:flex;align-items:center;justify-content:space-between;padding:1.1rem 1.4rem;border-bottom:1px solid #f4e6e2;color:#7f1d1d;font-weight:800}.approval-brand img{width:92px;height:42px;object-fit:contain}.approval-hero{display:grid;grid-template-columns:auto 1fr;gap:1.2rem;padding:clamp(1.5rem,5vw,3.2rem)}.approval-hero.pending{background:#fffaf0}.approval-hero.changes{background:#fff1f2}.approval-hero.approved{background:#effcf4}.approval-symbol{width:60px;height:60px;border-radius:18px;display:grid;place-items:center;font-size:1.5rem;font-weight:900;color:#fff;background:#d97706}.changes .approval-symbol{background:#dc2626}.approved .approval-symbol{background:#16834b}.eyebrow{margin:0 0 .35rem;text-transform:uppercase;letter-spacing:.1em;font-size:.74rem;font-weight:900;color:#9a3412}.approval-hero h1{margin:0;font-size:clamp(1.75rem,4vw,2.7rem);letter-spacing:-.04em}.approval-hero p:last-child{margin:.65rem 0 0;color:#586174;line-height:1.65}.approval-summary{display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:#eadedb;border-block:1px solid #eadedb}.approval-summary div{padding:1.1rem 1.4rem;background:#fff}.approval-summary small{display:block;color:#778195;font-weight:700;margin-bottom:.3rem}.approval-summary strong{font-size:.92rem}.review-note,.correction-form{margin:1.4rem;padding:1.35rem;border-radius:18px;background:#f8fafc;border:1px solid #e5e7eb}.review-note p,.form-help{color:#64748b;line-height:1.6}.correction-reason{padding:1rem;border-left:4px solid #dc2626;background:#fff1f2;border-radius:10px}.correction-reason p{margin:.4rem 0 0;color:#7f1d1d}.correction-form h2{margin:1.5rem 0 .2rem}.field-grid{display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-top:1.2rem}.field-grid label{display:grid;gap:.45rem;font-size:.82rem;font-weight:800;color:#475569}.field-grid input{width:100%;padding:.85rem;border:1px solid #cbd5e1;border-radius:11px;background:#fff;font:inherit}.field-grid .wide{grid-column:1/-1}.upload{padding:.9rem;border:1px dashed #ef9a91;border-radius:12px;background:#fff}.primary-action{display:block;width:calc(100% - 2.8rem);margin:1.4rem;padding:1rem 1.2rem;border:0;border-radius:13px;background:#db1b0d;color:#fff;text-align:center;text-decoration:none;font:800 1rem inherit;cursor:pointer;box-shadow:0 12px 24px rgba(219,27,13,.2)}.correction-form .primary-action{width:100%;margin:1.2rem 0 0}.primary-action:disabled{opacity:.65;cursor:wait}.approval-loading,.approval-error{padding:4rem 2rem;text-align:center}.approval-loading span{display:inline-block;width:18px;height:18px;margin-right:.7rem;border:2px solid #fecaca;border-top-color:#db1b0d;border-radius:50%;animation:spin .8s linear infinite}.inline-error{color:#b91c1c;font-weight:800}@keyframes spin{to{transform:rotate(360deg)}}
@media(max-width:640px){.approval-page{padding:0;background:#fff}.approval-shell{min-height:100dvh;border:0;border-radius:0;box-shadow:none}.approval-hero{grid-template-columns:1fr}.approval-summary{grid-template-columns:1fr}.field-grid{grid-template-columns:1fr}.field-grid .wide{grid-column:auto}.approval-brand{position:sticky;top:0;background:#fff;z-index:2}}
`;
