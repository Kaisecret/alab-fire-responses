"use client";

import { ChangeEvent, FormEvent, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { RESIDENT_ID_ACCEPT as ID_ACCEPT, validateResidentIdFile } from "../../../lib/resident-applications/id-file";
import {
  ResidentApplicationRequestError,
  requestResidentApplicationJson,
} from "../../../lib/resident-applications/client-request";
import { ResidentSelfieCapture, residentSelfieCaptureStyles } from "../../_components/resident-selfie-capture";

type Application = {
  reference: string;
  status: "PENDING" | "VERIFIED" | "CHANGES_REQUESTED";
  accountStatus: string;
  correctionReason: string | null;
  submittedAt: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  username: string;
  municipality: string;
  barangay: string;
  address: string;
};

type IdSelection = { file: File; previewUrl: string };
type RecoveryIssue = {
  kind: "submission" | "status-check";
  status: number;
  requestId?: string;
  requiresStatusCheck: boolean;
  sessionExpired: boolean;
};

function fileSizeLabel(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function requestDetails(error: unknown) {
  if (error instanceof ResidentApplicationRequestError) {
    return { status: error.status, requestId: error.requestId };
  }
  return { status: 0, requestId: undefined };
}

function isUncertainStatus(status: number) {
  return status === 0 || status >= 500 || status === 409;
}

export default function ResidentApplicationPage() {
  const [application, setApplication] = useState<Application | null>(null);
  const [initialError, setInitialError] = useState("");
  const [initialLoading, setInitialLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [checking, setChecking] = useState(false);
  const [recoveryIssue, setRecoveryIssue] = useState<RecoveryIssue | null>(null);
  const [statusMessage, setStatusMessage] = useState("");
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [frontId, setFrontId] = useState<IdSelection | null>(null);
  const [backId, setBackId] = useState<IdSelection | null>(null);
  const [frontIdError, setFrontIdError] = useState("");
  const [backIdError, setBackIdError] = useState("");
  const [validationError, setValidationError] = useState("");

  const operationRef = useRef<"submitting" | "checking" | null>(null);
  const requestVersionRef = useRef(0);
  const frontInputRef = useRef<HTMLInputElement | null>(null);
  const backInputRef = useRef<HTMLInputElement | null>(null);
  const frontUrlRef = useRef<string | null>(null);
  const backUrlRef = useRef<string | null>(null);

  const loadInitial = useCallback(async () => {
    const version = ++requestVersionRef.current;
    setInitialLoading(true);
    setInitialError("");
    try {
      const result = await requestResidentApplicationJson<{ application?: Application }>("/api/resident/application-status");
      if (!result.application) throw new Error("Application data was missing.");
      if (requestVersionRef.current === version) setApplication(result.application);
    } catch {
      if (requestVersionRef.current === version) setInitialError("Unable to load your application. Please try again.");
    } finally {
      if (requestVersionRef.current === version) setInitialLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadInitial(), 0);
    return () => {
      window.clearTimeout(timer);
      requestVersionRef.current += 1;
    };
  }, [loadInitial]);

  useEffect(() => () => {
    if (frontUrlRef.current) URL.revokeObjectURL(frontUrlRef.current);
    if (backUrlRef.current) URL.revokeObjectURL(backUrlRef.current);
  }, []);

  function replacePreview(kind: "front" | "back", file: File | null) {
    const urlRef = kind === "front" ? frontUrlRef : backUrlRef;
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = file ? URL.createObjectURL(file) : null;
    const selection = file && urlRef.current ? { file, previewUrl: urlRef.current } : null;
    if (kind === "front") setFrontId(selection);
    else setBackId(selection);
  }

  function selectId(kind: "front" | "back", event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0] ?? null;
    const setError = kind === "front" ? setFrontIdError : setBackIdError;
    if (!file) {
      replacePreview(kind, null);
      setError("");
      return;
    }
    const message = validateResidentIdFile(file);
    if (message) {
      event.currentTarget.value = "";
      replacePreview(kind, null);
      setError(message);
      return;
    }
    replacePreview(kind, file);
    setError("");
    setValidationError("");
  }

  function removeBackId() {
    if (backInputRef.current) backInputRef.current.value = "";
    replacePreview("back", null);
    setBackIdError("");
  }

  async function checkApplicationStatus() {
    if (operationRef.current) return;
    operationRef.current = "checking";
    const version = ++requestVersionRef.current;
    setChecking(true);
    setStatusMessage("");
    try {
      const result = await requestResidentApplicationJson<{ application?: Application }>("/api/resident/application-status");
      if (!result.application) throw new ResidentApplicationRequestError("Application data was missing.");
      if (requestVersionRef.current !== version) return;
      setApplication(result.application);
      if (result.application.status === "CHANGES_REQUESTED") {
        setRecoveryIssue(null);
        setStatusMessage("Corrections are still requested. You can try submitting again.");
      } else {
        setRecoveryIssue(null);
        setStatusMessage("");
      }
    } catch (error) {
      if (requestVersionRef.current !== version) return;
      const details = requestDetails(error);
      setRecoveryIssue({
        kind: "status-check",
        status: details.status,
        requestId: details.requestId,
        requiresStatusCheck: true,
        sessionExpired: details.status === 401 || details.status === 403,
      });
    } finally {
      if (requestVersionRef.current === version) {
        operationRef.current = null;
        setChecking(false);
      }
    }
  }

  async function resubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (operationRef.current || recoveryIssue?.requiresStatusCheck || recoveryIssue?.sessionExpired) return;
    if (!selfieFile) {
      setValidationError("Take a new selfie using your camera before resubmitting.");
      return;
    }

    // Capture native values while controls are enabled. Disabled controls are
    // omitted by the FormData constructor, so pending state begins afterwards.
    const formData = new FormData(event.currentTarget);
    if (frontId) formData.set("frontId", frontId.file);
    if (backId) formData.set("backId", backId.file);
    else formData.delete("backId");
    formData.set("selfie", selfieFile);

    operationRef.current = "submitting";
    const version = ++requestVersionRef.current;
    setSaving(true);
    setRecoveryIssue(null);
    setStatusMessage("");
    setValidationError("");
    try {
      const result = await requestResidentApplicationJson<{
        application?: { reference: string; status: string; submittedAt?: string };
      }>("/api/resident/application-status/resubmit", { method: "POST", body: formData }, 60_000);
      if (!result.application?.reference || result.application.status !== "PENDING") {
        throw new ResidentApplicationRequestError("The successful response could not be confirmed.");
      }
      if (requestVersionRef.current !== version) return;
      const reference = result.application.reference;
      setApplication(current => current ? {
        ...current,
        reference,
        status: "PENDING",
        correctionReason: null,
        submittedAt: result.application?.submittedAt ?? current.submittedAt,
      } : current);
    } catch (error) {
      if (requestVersionRef.current !== version) return;
      const details = requestDetails(error);
      if (details.status === 400) {
        setValidationError(error instanceof Error && error.message === "Enter a valid barangay in your registered municipality."
          ? error.message : "Check your details and choose readable JPG, PNG or WebP images, up to 6 MB each.");
        return;
      }
      setRecoveryIssue({
        kind: "submission",
        status: details.status,
        requestId: details.requestId,
        requiresStatusCheck: isUncertainStatus(details.status),
        sessionExpired: details.status === 401 || details.status === 403,
      });
    } finally {
      if (requestVersionRef.current === version) {
        operationRef.current = null;
        setSaving(false);
      }
    }
  }

  const busy = saving || checking;
  const isApproved = application?.status === "VERIFIED" && application.accountStatus === "ACTIVE";
  const needsChanges = application?.status === "CHANGES_REQUESTED";
  const recoveryCopy = recoveryIssue?.sessionExpired
    ? "Your session has expired. Sign in again to continue. Leaving this page means you will need to select your photos again."
    : recoveryIssue?.kind === "status-check"
      ? "We couldn't check your status. Try checking again. Your details and photos are still here."
      : recoveryIssue?.requiresStatusCheck
        ? "Your details and photos are still here. Check your application status before trying again."
        : "Review your details and photos, then try submitting again.";

  function renderUpload(kind: "front" | "back", selection: IdSelection | null, fieldError: string) {
    const isFront = kind === "front";
    const inputId = `${kind}-id`;
    const helpId = `${kind}-id-help`;
    const errorId = `${kind}-id-error`;
    return (
      <div className="id-field">
        <div className="id-label-row">
          <label className="id-label" htmlFor={inputId}>{isFront ? "Front of ID · Required" : "Back of ID · Optional"}</label>
        </div>
        <p id={helpId} className="id-help">JPG, PNG or WebP. Up to 6 MB per photo.</p>
        <div className={`id-upload-row ${fieldError ? "has-error" : ""}`}>
          {selection ? (
            <>
              <img className="id-preview" src={selection.previewUrl} alt="" aria-hidden="true" />
              <div className="id-file-meta">
                <span className="id-file-name" title={selection.file.name}>{selection.file.name}</span>
                <span className="id-file-size">{fileSizeLabel(selection.file.size)}</span>
              </div>
            </>
          ) : (
            <div className="id-empty-copy"><strong>No photo selected</strong><span>{isFront ? "Show the complete front side" : "Add the back if it contains details"}</span></div>
          )}
          <div className="id-actions">
            <label className="file-action" htmlFor={inputId}>
              {selection ? "Change photo" : isFront ? "Choose front photo" : "Choose back photo"}
              <input
                ref={isFront ? frontInputRef : backInputRef}
                id={inputId}
                className="file-input"
                name={isFront ? "frontId" : "backId"}
                type="file"
                accept={ID_ACCEPT}
                required={isFront}
                aria-invalid={Boolean(fieldError)}
                aria-describedby={fieldError ? `${helpId} ${errorId}` : helpId}
                onChange={event => selectId(kind, event)}
              />
            </label>
            {!isFront && selection && <button type="button" className="remove-action" onClick={removeBackId}>Remove</button>}
          </div>
        </div>
        {fieldError && <p id={errorId} className="field-error" role="alert">{fieldError}</p>}
      </div>
    );
  }

  return (
    <main className="approval-page">
      <style>{styles}</style>
      <style>{residentSelfieCaptureStyles}</style>
      <section className="approval-shell">
        <header className="approval-brand"><img src="/images/Logo.webp" alt="ALAB" /><span>Resident identity review</span></header>

        {!application && initialLoading && <div className="approval-loading" role="status"><span />Loading your secure application…</div>}
        {!application && initialError && (
          <div className="approval-error">
            <h1>We could not open your application</h1>
            <p role="alert">{initialError}</p>
            <button type="button" onClick={() => void loadInitial()}>Retry loading</button>
            <Link href="/resident/login">Return to resident login</Link>
          </div>
        )}

        {application && (
          <>
            <div className={`approval-hero ${needsChanges ? "changes" : isApproved ? "approved" : "pending"}`}>
              <div className="approval-symbol" aria-hidden="true">{needsChanges ? "!" : isApproved ? "✓" : "·"}</div>
              <div>
                <p className="eyebrow">{application.reference}</p>
                <h1>{needsChanges ? "Changes requested" : isApproved ? "Application approved" : "Under review"}</h1>
                <p>{needsChanges ? "Please correct the items identified by your Municipal BFP and resubmit." : isApproved ? "Your identity is approved. You can now sign in to the resident application." : `Your application is safely queued with ${application.municipality} Municipal BFP.`}</p>
              </div>
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
                <div className="form-intro"><h2>Correct and resubmit</h2><p className="form-help">Update the requested details and provide clear replacement photos. Review copies receive an ALAB privacy watermark.</p></div>

                <fieldset className="form-fields" disabled={busy}>
                  <section className="form-section" aria-labelledby="details-heading">
                    <h3 id="details-heading" className="form-section-title">Your details</h3>
                    <div className="field-grid">
                      <label>First name<input name="firstName" defaultValue={application.firstName} required /></label>
                      <label>Last name<input name="lastName" defaultValue={application.lastName} required /></label>
                      <label>Barangay<input name="barangay" defaultValue={application.barangay} required /></label>
                      <label className="wide">Complete address<input name="address" defaultValue={application.address} required /></label>
                    </div>
                  </section>

                  <section className="form-section" aria-labelledby="id-heading">
                    <h3 id="id-heading" className="form-section-title">Valid ID</h3>
                    <div className="id-grid">
                      {renderUpload("front", frontId, frontIdError)}
                      {renderUpload("back", backId, backIdError)}
                    </div>
                  </section>

                  <section className="form-section" aria-labelledby="selfie-heading">
                    <h3 id="selfie-heading" className="form-section-title">New selfie</h3>
                    <p className="form-help small">Take a clear photo with your camera so we can review your identity.</p>
                    <ResidentSelfieCapture onCapture={setSelfieFile} disabled={busy} />
                  </section>
                </fieldset>

                {validationError && <p className="field-error form-validation-error" role="alert">{validationError}</p>}

                {recoveryIssue && (
                  <div className="recovery-panel" role="alert">
                    <h3><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M12 8v5m0 3.5v.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>{recoveryIssue.sessionExpired ? "Sign in to continue" : "We couldn't confirm your submission"}</h3>
                    <p>{recoveryCopy}</p>
                    {!recoveryIssue.sessionExpired && (recoveryIssue.requiresStatusCheck || recoveryIssue.kind === "status-check") && (
                      <button className="status-check-action" type="button" disabled={busy} onClick={() => checkApplicationStatus()}>
                        {checking ? "Checking status…" : "Check application status"}
                      </button>
                    )}
                    {recoveryIssue.sessionExpired && <Link className="status-check-action" href="/resident/login">Sign in again</Link>}
                    {(recoveryIssue.status > 0 || recoveryIssue.requestId) && (
                      <details className="technical-details">
                        <summary>Technical details</summary>
                        {recoveryIssue.status > 0 && <p>HTTP status: {recoveryIssue.status}</p>}
                        {recoveryIssue.requestId && <p>Request reference: {recoveryIssue.requestId}</p>}
                      </details>
                    )}
                  </div>
                )}

                {statusMessage && <p className="status-message" role="status">{statusMessage}</p>}
                {busy && <p className="progress-message" role="status"><span aria-hidden="true" />{checking ? "Checking application status…" : "Submitting corrections…"}</p>}

                <button className="primary-action" disabled={busy || !selfieFile || Boolean(recoveryIssue?.requiresStatusCheck || recoveryIssue?.sessionExpired)}>
                  {saving ? <><span className="button-spinner" aria-hidden="true" />Submitting corrections…</> : "Resubmit for review"}
                </button>
              </form>
            )}
          </>
        )}
      </section>
    </main>
  );
}

const styles = `
*{box-sizing:border-box}
.approval-page{min-height:100dvh;padding:clamp(1rem,4vw,3rem);font-family:var(--font-plus-jakarta),Arial,sans-serif;color:#111827;background:#fff8f5 radial-gradient(circle at 10% 0%,#fee2e2 0,transparent 28%)}
.approval-shell{width:min(880px,100%);margin:auto;background:#fff;border:1px solid #f1dfdb;border-radius:28px;box-shadow:0 24px 70px rgba(127,29,29,.1);overflow:hidden}
.approval-brand{display:flex;align-items:center;justify-content:space-between;padding:1.1rem 1.4rem;border-bottom:1px solid #f4e6e2;color:#7f1d1d;font-weight:800}
.approval-brand img{width:92px;height:42px;object-fit:contain}
.approval-hero{display:grid;grid-template-columns:auto 1fr;gap:1.2rem;padding:clamp(1.5rem,5vw,3.2rem)}
.approval-hero.pending{background:#fffaf0}.approval-hero.changes{background:#fff1f2}.approval-hero.approved{background:#effcf4}
.approval-symbol{width:60px;height:60px;border-radius:18px;display:grid;place-items:center;font-size:1.5rem;font-weight:900;color:#fff;background:#d97706}
.changes .approval-symbol{background:#dc2626}.approved .approval-symbol{background:#16834b}
.eyebrow{margin:0 0 .35rem;text-transform:uppercase;letter-spacing:.1em;font-size:.74rem;font-weight:900;color:#9a3412}
.approval-hero h1{margin:0;font-size:clamp(1.75rem,4vw,2.7rem);letter-spacing:-.04em}
.approval-hero p:last-child{margin:.65rem 0 0;color:#586174;line-height:1.65}
.approval-summary{display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:#eadedb;border-block:1px solid #eadedb}
.approval-summary div{padding:1.1rem 1.4rem;background:#fff;min-width:0}
.approval-summary small{display:block;color:#64748b;font-weight:700;margin-bottom:.3rem}
.approval-summary strong{display:block;overflow-wrap:anywhere;font-size:.92rem}
.review-note,.correction-form{margin:1.4rem;padding:1.35rem;border-radius:18px;background:#f8fafc;border:1px solid #e5e7eb}
.review-note p,.form-help{color:#64748b;line-height:1.6}
.form-intro h2{margin:1.5rem 0 .25rem;font-size:1.25rem}.form-intro .form-help{margin:.25rem 0 0}
.form-help.small{margin:.35rem 0 .9rem;font-size:.9rem}
.correction-reason{padding:1rem;border-left:4px solid #dc2626;background:#fff1f2;border-radius:10px}
.correction-reason p{margin:.4rem 0 0;color:#7f1d1d;line-height:1.55}
.form-fields{min-width:0;margin:0;padding:0;border:0}.form-fields:disabled{opacity:.76}
.form-section{margin-top:1.5rem;padding-top:1.35rem;border-top:1px solid #e5e7eb}
.form-section-title{margin:0;font-size:1.05rem;font-weight:800;color:#1f2937}
.field-grid{display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-top:.9rem}
.field-grid label{display:grid;gap:.45rem;min-width:0;font-size:.82rem;font-weight:800;color:#475569}
.field-grid input{width:100%;min-height:46px;padding:.78rem .85rem;border:1px solid #cbd5e1;border-radius:11px;background:#fff;color:#111827;font-family:inherit;font-size:.95rem;font-weight:500}
.field-grid input:focus-visible{outline:3px solid rgba(219,27,13,.2);border-color:#db1b0d}
.field-grid .wide{grid-column:1/-1}
.id-grid{display:grid;gap:1rem;margin-top:.9rem}
.id-field{display:grid;min-width:0;gap:.35rem}.id-label-row{display:flex;align-items:center;justify-content:space-between;gap:.75rem}
.id-label{font-size:.86rem;font-weight:800;color:#334155}.id-help{margin:0;color:#64748b;font-size:.79rem;line-height:1.5}
.id-upload-row{display:flex;align-items:center;gap:.75rem;min-width:0;padding:.7rem;border:1px solid #cbd5e1;border-radius:13px;background:#fff}
.id-upload-row.has-error{border-color:#dc2626}.id-preview{width:60px;height:60px;flex:none;border-radius:10px;object-fit:cover;background:#e2e8f0}
.id-empty-copy,.id-file-meta{display:grid;gap:.15rem;min-width:0;flex:1}.id-empty-copy strong{font-size:.87rem;color:#334155}.id-empty-copy span,.id-file-size{font-size:.76rem;color:#64748b}
.id-file-name{display:block;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:.87rem;font-weight:750;color:#1f2937}
.id-actions{display:flex;align-items:center;justify-content:flex-end;gap:.35rem;flex-wrap:wrap}
.file-action,.remove-action{position:relative;display:inline-flex;align-items:center;justify-content:center;min-height:44px;padding:.62rem .8rem;border-radius:10px;font-family:inherit;font-size:.79rem;font-weight:800;cursor:pointer}
.file-action{overflow:hidden;border:1px solid #cbd5e1;background:#fff;color:#7f1d1d}.remove-action{border:0;background:transparent;color:#b91c1c}
.file-input{position:absolute;inset:0;width:100%;height:100%;opacity:0;cursor:pointer}.file-action:focus-within{outline:3px solid rgba(219,27,13,.22);outline-offset:2px;border-color:#db1b0d}
.field-error{margin:.15rem 0 0;color:#b91c1c;font-size:.82rem;font-weight:700;line-height:1.45}.form-validation-error{margin:1rem 0 0}
.recovery-panel{margin-top:1.25rem;padding:1rem;border:1px solid #fecaca;border-radius:14px;background:#fff7f7;color:#475569}
.recovery-panel h3{display:flex;align-items:center;gap:.5rem;margin:0;color:#7f1d1d;font-size:.98rem;font-weight:800}.recovery-panel h3 svg{width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
.recovery-panel>p{margin:.45rem 0 .85rem;font-size:.88rem;line-height:1.55}
.status-check-action{display:flex;align-items:center;justify-content:center;width:100%;min-height:46px;padding:.7rem 1rem;border:1px solid #b91c1c;border-radius:11px;background:#fff;color:#991b1b;text-decoration:none;font-family:inherit;font-size:.88rem;font-weight:800;cursor:pointer}
.status-check-action:disabled{opacity:.55;cursor:not-allowed}.technical-details{margin-top:.75rem;padding-top:.65rem;border-top:1px solid #fecaca;font-size:.77rem}.technical-details summary{cursor:pointer;font-weight:750;color:#64748b}.technical-details p{margin:.35rem 0 0;overflow-wrap:anywhere;color:#64748b}
.status-message{margin:1rem 0 0;padding:.75rem .85rem;border-radius:10px;background:#f0fdf4;color:#166534;font-size:.86rem;font-weight:700;line-height:1.5}
.progress-message{display:flex;align-items:center;gap:.5rem;margin:1rem 0 0;color:#64748b;font-size:.84rem}.progress-message span,.button-spinner{display:inline-block;width:16px;height:16px;flex:none;border:2px solid #fecaca;border-top-color:#db1b0d;border-radius:50%;animation:spin .8s linear infinite}.button-spinner{border-color:rgba(255,255,255,.38);border-top-color:#fff}
.primary-action{display:flex;align-items:center;justify-content:center;gap:.55rem;width:calc(100% - 2.8rem);min-height:50px;margin:1.4rem;padding:.85rem 1.2rem;border:0;border-radius:13px;background:#db1b0d;color:#fff;text-align:center;text-decoration:none;font-family:inherit;font-size:1rem;font-weight:800;cursor:pointer;box-shadow:0 10px 22px rgba(219,27,13,.18)}
.correction-form .primary-action{width:100%;margin:1.25rem 0 0}.primary-action:disabled{opacity:.55;cursor:not-allowed;box-shadow:none}
.approval-loading,.approval-error{padding:4rem 2rem;text-align:center}.approval-loading span{display:inline-block;width:18px;height:18px;margin-right:.7rem;border:2px solid #fecaca;border-top-color:#db1b0d;border-radius:50%;animation:spin .8s linear infinite}
.approval-error{display:grid;justify-items:center;gap:.8rem}.approval-error h1,.approval-error p{margin:0}.approval-error button{min-height:44px;padding:.65rem 1rem;border:1px solid #b91c1c;border-radius:10px;background:#fff;color:#991b1b;font:inherit;cursor:pointer}
@keyframes spin{to{transform:rotate(360deg)}}
@media(prefers-reduced-motion:reduce){.approval-loading span,.progress-message span,.button-spinner{animation-duration:1.6s}}
@media(max-width:950px){.approval-page{padding-bottom:calc(6.5rem + env(safe-area-inset-bottom))}}
@media(max-width:640px){
  .approval-page{padding:0 0 calc(6.5rem + env(safe-area-inset-bottom));background:#fff}
  .approval-shell{min-height:auto;border:0;border-radius:0;box-shadow:none}.approval-hero{grid-template-columns:1fr}.approval-summary{grid-template-columns:1fr}.field-grid{grid-template-columns:1fr}.field-grid .wide{grid-column:auto}
  .approval-brand{position:sticky;top:0;background:#fff;z-index:2}.review-note,.correction-form{margin:1rem;padding:1rem}
  .id-upload-row{align-items:flex-start;flex-wrap:wrap}.id-empty-copy,.id-file-meta{min-width:calc(100% - 4.75rem)}.id-actions{width:100%;justify-content:stretch}.file-action{flex:1}.remove-action{min-width:84px}
}
`;
