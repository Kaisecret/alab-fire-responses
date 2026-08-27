"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

type Summary = {
  id: string;
  reference: string;
  status: string;
  submittedAt: string;
  correctionReason: string | null;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  barangay: string;
  address: string;
};

type Detail = Summary & {
  username: string;
  municipality: string;
  evidence: {
    frontUrl: string | null;
    backUrl: string | null;
    selfieUrl: string | null;
  };
  events: {
    type: string;
    notes: string | null;
    createdAt: string;
  }[];
};

export default function VerificationQueuePage() {
  const [mounted, setMounted] = useState(false);
  const [applications, setApplications] = useState<Summary[]>([]);
  const [municipality, setMunicipality] = useState("");
  const [filter, setFilter] = useState<"ALL" | "PENDING" | "CHANGES_REQUESTED" | "VERIFIED">("PENDING");
  const [searchQuery, setSearchQuery] = useState("");
  const [selected, setSelected] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [correctionMode, setCorrectionMode] = useState(false);
  const [reason, setReason] = useState("");
  const [zoomImage, setZoomImage] = useState<{ url: string; label: string } | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/municipal-bfp/resident-applications", { cache: "no-store" });
      const result = (await response.json()) as {
        applications?: Summary[];
        municipality?: string;
        error?: string;
      };
      setLoading(false);
      if (!response.ok) {
        setError(result.error ?? "Unable to load resident applications.");
        return;
      }
      setApplications(result.applications ?? []);
      setMunicipality(result.municipality ?? "");
      setError("");
    } catch {
      setLoading(false);
      setError("Network error: Unable to connect to verification queue.");
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const visible = useMemo(() => {
    return applications.filter((item) => {
      const matchesFilter = filter === "ALL" || item.status === filter;
      if (!matchesFilter) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        item.firstName.toLowerCase().includes(q) ||
        item.lastName.toLowerCase().includes(q) ||
        item.reference.toLowerCase().includes(q) ||
        item.barangay.toLowerCase().includes(q) ||
        item.phone.toLowerCase().includes(q) ||
        item.email.toLowerCase().includes(q)
      );
    });
  }, [applications, filter, searchQuery]);

  const pendingCount = applications.filter((item) => item.status === "PENDING").length;
  const correctionsCount = applications.filter((item) => item.status === "CHANGES_REQUESTED").length;
  const verifiedCount = applications.filter((item) => item.status === "VERIFIED").length;

  async function openApplication(id: string) {
    setWorking(true);
    setError("");
    try {
      const response = await fetch(`/api/municipal-bfp/resident-applications/${id}`, { cache: "no-store" });
      const result = (await response.json()) as { application?: Detail; error?: string };
      setWorking(false);
      if (!response.ok || !result.application) {
        setError(result.error ?? "Unable to open this application.");
        return;
      }
      setSelected(result.application);
      setReason("");
      setCorrectionMode(false);
    } catch {
      setWorking(false);
      setError("Network error: Unable to load application dossier.");
    }
  }

  async function decide(action: "approve" | "request-corrections") {
    if (!selected) return;
    setWorking(true);
    setError("");
    try {
      const response = await fetch(`/api/municipal-bfp/resident-applications/${selected.id}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: action === "request-corrections" ? JSON.stringify({ reason }) : undefined,
      });
      const result = (await response.json()) as { error?: string };
      setWorking(false);
      if (!response.ok) {
        setError(result.error ?? "Unable to save this review.");
        return;
      }
      setSelected(null);
      setCorrectionMode(false);
      await load();
    } catch {
      setWorking(false);
      setError("Network error: Failed to record decision.");
    }
  }

  return (
    <main className="vq-page">
      <style>{styles}</style>

      {/* HEADER SECTION */}
      <header className="vq-header">
        <div className="vq-kicker">
          <span className="vq-kicker-badge">
            <i className="fa-solid fa-shield-halved" />
            <span>Identity &amp; Residency Control</span>
          </span>
          {municipality && (
            <span className="vq-muni-tag">
              <i className="fa-solid fa-location-dot" />
              <span>{municipality} Station Command</span>
            </span>
          )}
        </div>

        <div className="vq-header-actions">
          <button
            type="button"
            className="vq-refresh-btn"
            onClick={() => void load()}
            disabled={loading}
            title="Refresh verification queue"
          >
            <i className={`fa-solid fa-arrows-rotate ${loading ? "fa-spin" : ""}`} />
            <span>{loading ? "Refreshing…" : "Refresh"}</span>
          </button>
        </div>
      </header>

      {/* ERROR NOTICE BANNER */}
      {error && (
        <div className="vq-alert-banner" role="alert">
          <div className="vq-alert-icon">
            <i className="fa-solid fa-circle-exclamation" />
          </div>
          <div className="vq-alert-text">
            <strong>System Notice:</strong> {error}
          </div>
          <button
            type="button"
            className="vq-alert-close"
            onClick={() => setError("")}
            aria-label="Dismiss alert"
          >
            <i className="fa-solid fa-xmark" />
          </button>
        </div>
      )}

      {/* METRIC CARDS (TACTICAL OVERVIEW) */}
      <section className="vq-metrics-grid" aria-label="Application totals">
        {/* PENDING / UNDER REVIEW */}
        <div
          className={`vq-metric-card pending ${filter === "PENDING" ? "active-card" : ""}`}
          onClick={() => setFilter("PENDING")}
          role="button"
          tabIndex={0}
        >
          <div className="vq-metric-top">
            <div className="vq-metric-icon-wrap pending">
              <i className="fa-solid fa-clock" />
            </div>
            <span className="vq-metric-status pending">Pending Review</span>
          </div>
          <div className="vq-metric-value">{pendingCount}</div>
          <div className="vq-metric-label">Awaiting Verification</div>
        </div>

        {/* CORRECTIONS REQUESTED */}
        <div
          className={`vq-metric-card corrections ${filter === "CHANGES_REQUESTED" ? "active-card" : ""}`}
          onClick={() => setFilter("CHANGES_REQUESTED")}
          role="button"
          tabIndex={0}
        >
          <div className="vq-metric-top">
            <div className="vq-metric-icon-wrap corrections">
              <i className="fa-solid fa-triangle-exclamation" />
            </div>
            <span className="vq-metric-status corrections">Action Needed</span>
          </div>
          <div className="vq-metric-value">{correctionsCount}</div>
          <div className="vq-metric-label">Corrections Requested</div>
        </div>

        {/* VERIFIED / APPROVED */}
        <div
          className={`vq-metric-card approved ${filter === "VERIFIED" ? "active-card" : ""}`}
          onClick={() => setFilter("VERIFIED")}
          role="button"
          tabIndex={0}
        >
          <div className="vq-metric-top">
            <div className="vq-metric-icon-wrap approved">
              <i className="fa-solid fa-circle-check" />
            </div>
            <span className="vq-metric-status approved">Cleared</span>
          </div>
          <div className="vq-metric-value">{verifiedCount}</div>
          <div className="vq-metric-label">Approved Residents</div>
        </div>

        {/* TOTAL SUBMISSIONS */}
        <div
          className={`vq-metric-card total ${filter === "ALL" ? "active-card" : ""}`}
          onClick={() => setFilter("ALL")}
          role="button"
          tabIndex={0}
        >
          <div className="vq-metric-top">
            <div className="vq-metric-icon-wrap total">
              <i className="fa-solid fa-id-card" />
            </div>
            <span className="vq-metric-status total">All Time</span>
          </div>
          <div className="vq-metric-value">{applications.length}</div>
          <div className="vq-metric-label">Total Submissions</div>
        </div>
      </section>

      {/* FILTER TABS & SEARCH TOOLBAR */}
      <section className="vq-toolbar">
        <div className="vq-filter-pills" role="tablist" aria-label="Filter applications">
          <button
            type="button"
            role="tab"
            aria-selected={filter === "PENDING"}
            className={`vq-pill ${filter === "PENDING" ? "active" : ""}`}
            onClick={() => setFilter("PENDING")}
          >
            <span className="vq-pill-dot pending" />
            <span>Under Review</span>
            <span className="vq-pill-badge">{pendingCount}</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={filter === "CHANGES_REQUESTED"}
            className={`vq-pill ${filter === "CHANGES_REQUESTED" ? "active" : ""}`}
            onClick={() => setFilter("CHANGES_REQUESTED")}
          >
            <span className="vq-pill-dot corrections" />
            <span>Needs Correction</span>
            <span className="vq-pill-badge">{correctionsCount}</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={filter === "VERIFIED"}
            className={`vq-pill ${filter === "VERIFIED" ? "active" : ""}`}
            onClick={() => setFilter("VERIFIED")}
          >
            <span className="vq-pill-dot approved" />
            <span>Approved</span>
            <span className="vq-pill-badge">{verifiedCount}</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={filter === "ALL"}
            className={`vq-pill ${filter === "ALL" ? "active" : ""}`}
            onClick={() => setFilter("ALL")}
          >
            <span>All</span>
            <span className="vq-pill-badge">{applications.length}</span>
          </button>
        </div>

        {/* SEARCH BOX */}
        <div className="vq-search-box">
          <i className="fa-solid fa-magnifying-glass" />
          <input
            type="text"
            placeholder="Search by name, reference, barangay, or phone…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              className="vq-search-clear"
              onClick={() => setSearchQuery("")}
              aria-label="Clear search query"
            >
              <i className="fa-solid fa-xmark" />
            </button>
          )}
        </div>
      </section>

      {/* APPLICATION LIST CONTAINER */}
      <section className="vq-table-container">
        {/* LOADING SKELETON */}
        {loading && applications.length === 0 && (
          <div className="vq-loading-state">
            <div className="vq-spinner" />
            <span>Loading verification roster…</span>
          </div>
        )}

        {/* EMPTY STATE */}
        {!loading && visible.length === 0 && (
          <div className="vq-empty-state">
            <div className="vq-empty-icon-wrap">
              <i className="fa-solid fa-folder-open" />
            </div>
            <h3>No applications in this view</h3>
            <p>
              {searchQuery
                ? `No submissions found matching “${searchQuery}”. Try clearing your search term.`
                : `There are currently no resident applications matching this filter for ${
                    municipality || "your municipality"
                  }.`}
            </p>
            {searchQuery ? (
              <button
                type="button"
                className="vq-empty-action"
                onClick={() => setSearchQuery("")}
              >
                Clear Search
              </button>
            ) : filter !== "ALL" ? (
              <button
                type="button"
                className="vq-empty-action"
                onClick={() => setFilter("ALL")}
              >
                View All Applications
              </button>
            ) : null}
          </div>
        )}

        {/* DATA ROWS */}
        {visible.map((item) => {
          const initials = `${item.firstName?.[0] || ""}${item.lastName?.[0] || ""}`.toUpperCase();
          const isPending = item.status === "PENDING";
          const isChanges = item.status === "CHANGES_REQUESTED";
          const isApproved = item.status === "VERIFIED";

          return (
            <article className="vq-row" key={item.id}>
              {/* MONOGRAM AVATAR */}
              <div className={`vq-avatar ${isApproved ? "verified" : isChanges ? "changes" : "pending"}`}>
                <span>{initials || "RA"}</span>
              </div>

              {/* APPLICANT IDENTITY */}
              <div className="vq-cell-main">
                <div className="vq-status-row">
                  <span
                    className={`vq-status-tag ${
                      isPending ? "pending" : isChanges ? "changes" : "approved"
                    }`}
                  >
                    <span className="vq-status-pulse" />
                    {isPending ? "Under Review" : isChanges ? "Changes Requested" : "Approved"}
                  </span>
                  <span className="vq-ref-tag">{item.reference}</span>
                </div>
                <h2 className="vq-resident-name">
                  {item.firstName} {item.lastName}
                </h2>
                <div className="vq-location-meta">
                  <i className="fa-solid fa-location-dot" />
                  <span>Brgy. {item.barangay}</span>
                </div>
              </div>

              {/* CONTACT DETAILS */}
              <div className="vq-cell-contact">
                <div className="vq-contact-item">
                  <i className="fa-solid fa-phone" />
                  <span>{item.phone || "No phone provided"}</span>
                </div>
                <div className="vq-contact-item">
                  <i className="fa-solid fa-envelope" />
                  <span className="truncate">{item.email}</span>
                </div>
              </div>

              {/* SUBMISSION TIMESTAMP */}
              <div className="vq-cell-time">
                <span className="vq-time-label">Submitted</span>
                <time dateTime={item.submittedAt}>
                  {new Date(item.submittedAt).toLocaleDateString("en-PH", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </time>
                <small className="vq-time-sub">
                  {new Date(item.submittedAt).toLocaleTimeString("en-PH", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </small>
              </div>

              {/* ACTION BUTTON */}
              <div className="vq-cell-action">
                <button
                  type="button"
                  className="vq-review-btn"
                  onClick={() => void openApplication(item.id)}
                >
                  <span>Review Application</span>
                  <i className="fa-solid fa-arrow-right" />
                </button>
              </div>
            </article>
          );
        })}
      </section>

      {/* WORKING / LOADING TOAST */}
      {working && (
        <div className="vq-toast" aria-live="polite">
          <i className="fa-solid fa-circle-notch fa-spin" />
          <span>Processing verification…</span>
        </div>
      )}

      {/* =========================================================================
          REVIEW DOSSIER DIALOG (PORTAL TO DOCUMENT.BODY)
          ========================================================================= */}
      {mounted && selected && createPortal(
        <div
          className="vq-modal-overlay"
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget && !working) setSelected(null);
          }}
        >
          <section
            className="vq-modal-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="dossier-title"
          >
            {/* MODAL HEADER */}
            <header className="vq-modal-header">
              <div className="vq-modal-header-info">
                <div className="vq-modal-kicker">
                  <span className="vq-modal-ref">{selected.reference}</span>
                  <span
                    className={`vq-status-tag ${
                      selected.status === "PENDING"
                        ? "pending"
                        : selected.status === "CHANGES_REQUESTED"
                        ? "changes"
                        : "approved"
                    }`}
                  >
                    <span className="vq-status-pulse" />
                    {selected.status === "PENDING"
                      ? "Under Review"
                      : selected.status === "CHANGES_REQUESTED"
                      ? "Changes Requested"
                      : "Approved"}
                  </span>
                </div>
                <h2 id="dossier-title" className="vq-modal-title">
                  {selected.firstName} {selected.lastName}
                </h2>
                <div className="vq-modal-sub">
                  <i className="fa-solid fa-location-dot" />
                  <span>
                    Brgy. {selected.barangay}, {selected.municipality}
                  </span>
                </div>
              </div>

              <button
                type="button"
                className="vq-modal-close"
                aria-label="Close dialog"
                onClick={() => setSelected(null)}
                disabled={working}
              >
                <i className="fa-solid fa-xmark" />
              </button>
            </header>

            {/* MODAL BODY */}
            <div className="vq-modal-body">
              {error && (
                <div className="vq-modal-alert">
                  <i className="fa-solid fa-triangle-exclamation" />
                  <span>{error}</span>
                </div>
              )}

              {/* IDENTITY QUICK FACTS */}
              <div className="vq-dossier-section">
                <h3 className="vq-dossier-heading">
                  <i className="fa-solid fa-id-badge" /> Applicant Dossier Information
                </h3>
                <div className="vq-facts-grid">
                  <div className="vq-fact-item">
                    <small>System Username</small>
                    <strong>{selected.username || "—"}</strong>
                  </div>
                  <div className="vq-fact-item">
                    <small>Official Phone</small>
                    <strong>{selected.phone || "—"}</strong>
                  </div>
                  <div className="vq-fact-item">
                    <small>Email Address</small>
                    <strong className="truncate">{selected.email || "—"}</strong>
                  </div>
                  <div className="vq-fact-item">
                    <small>Residential Address</small>
                    <strong>{selected.address || "—"}</strong>
                  </div>
                </div>
              </div>

              {/* PROTECTED EVIDENCE GALLERY */}
              <div className="vq-dossier-section">
                <div className="vq-evidence-header">
                  <div>
                    <h3 className="vq-dossier-heading">
                      <i className="fa-solid fa-shield-halved" /> Official Identity Evidence
                    </h3>
                    <p className="vq-evidence-subtitle">
                      Confidential review copies. Click on any document image to expand full-size.
                    </p>
                  </div>
                </div>

                <div className="vq-evidence-grid">
                  <EvidenceCard
                    label="Government ID — Front"
                    url={selected.evidence.frontUrl}
                    onZoom={() =>
                      selected.evidence.frontUrl &&
                      setZoomImage({
                        url: selected.evidence.frontUrl,
                        label: "Government ID — Front",
                      })
                    }
                  />
                  <EvidenceCard
                    label="Government ID — Back"
                    url={selected.evidence.backUrl}
                    onZoom={() =>
                      selected.evidence.backUrl &&
                      setZoomImage({
                        url: selected.evidence.backUrl,
                        label: "Government ID — Back",
                      })
                    }
                  />
                  <EvidenceCard
                    label="Applicant Live Selfie"
                    url={selected.evidence.selfieUrl}
                    onZoom={() =>
                      selected.evidence.selfieUrl &&
                      setZoomImage({
                        url: selected.evidence.selfieUrl,
                        label: "Applicant Live Selfie",
                      })
                    }
                  />
                </div>
              </div>

              {/* AUDIT / REVIEW HISTORY */}
              {selected.events && selected.events.length > 0 && (
                <div className="vq-dossier-section">
                  <h3 className="vq-dossier-heading">
                    <i className="fa-solid fa-clock-rotate-left" /> Verification Audit Log
                  </h3>
                  <div className="vq-timeline">
                    {selected.events.map((event, index) => (
                      <div key={`${event.type}-${index}`} className="vq-timeline-item">
                        <span className="vq-timeline-node" />
                        <div className="vq-timeline-content">
                          <div className="vq-timeline-title">
                            <strong>{event.type.replaceAll("_", " ")}</strong>
                            <small>
                              {new Date(event.createdAt).toLocaleString("en-PH", {
                                dateStyle: "medium",
                                timeStyle: "short",
                              })}
                            </small>
                          </div>
                          {event.notes && <p className="vq-timeline-notes">{event.notes}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* CORRECTION MODE DRAWER */}
              {correctionMode && (
                <div className="vq-correction-box">
                  <div className="vq-correction-header">
                    <i className="fa-solid fa-pen-to-square" />
                    <strong>Request Corrections from Resident</strong>
                  </div>
                  <p className="vq-correction-help">
                    Specify what the resident needs to correct or re-upload. They will receive this guidance immediately.
                  </p>
                  <textarea
                    className="vq-correction-textarea"
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                    minLength={10}
                    maxLength={1000}
                    placeholder="E.g., The front ID image is blurry and the expiration date is unreadable. Please upload a clear photo showing all four corners."
                    autoFocus
                  />
                  <div className="vq-correction-meta">
                    <span className={reason.trim().length < 10 ? "text-muted" : "text-valid"}>
                      {reason.trim().length} / 10 min characters
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* MODAL FOOTER ACTIONS */}
            {selected.status === "PENDING" && (
              <footer className="vq-modal-footer">
                {correctionMode ? (
                  <>
                    <button
                      type="button"
                      className="vq-btn-cancel"
                      onClick={() => setCorrectionMode(false)}
                      disabled={working}
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      className="vq-btn-danger"
                      disabled={reason.trim().length < 10 || working}
                      onClick={() => void decide("request-corrections")}
                    >
                      {working ? (
                        <>
                          <i className="fa-solid fa-circle-notch fa-spin" />
                          <span>Submitting Request…</span>
                        </>
                      ) : (
                        <>
                          <i className="fa-solid fa-paper-plane" />
                          <span>Send Correction Notice</span>
                        </>
                      )}
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      className="vq-btn-secondary"
                      onClick={() => setCorrectionMode(true)}
                      disabled={working}
                    >
                      <i className="fa-solid fa-pen" />
                      <span>Request Corrections</span>
                    </button>
                    <button
                      type="button"
                      className="vq-btn-approve"
                      disabled={working}
                      onClick={() => void decide("approve")}
                    >
                      {working ? (
                        <>
                          <i className="fa-solid fa-circle-notch fa-spin" />
                          <span>Approving…</span>
                        </>
                      ) : (
                        <>
                          <i className="fa-solid fa-check" />
                          <span>Approve Resident Clearance</span>
                        </>
                      )}
                    </button>
                  </>
                )}
              </footer>
            )}
          </section>
        </div>,
        document.body
      )}

      {/* FULL-SCREEN EVIDENCE IMAGE INSPECTION VIEWER */}
      {mounted && zoomImage && createPortal(
        <div
          className="vq-zoom-overlay"
          role="presentation"
          onClick={() => setZoomImage(null)}
        >
          <div className="vq-zoom-container" onClick={(e) => e.stopPropagation()}>
            <div className="vq-zoom-header">
              <span>{zoomImage.label}</span>
              <button
                type="button"
                className="vq-zoom-close"
                onClick={() => setZoomImage(null)}
                aria-label="Close preview"
              >
                <i className="fa-solid fa-xmark" />
              </button>
            </div>
            <div className="vq-zoom-body">
              <img src={zoomImage.url} alt={zoomImage.label} />
            </div>
          </div>
        </div>,
        document.body
      )}
    </main>
  );
}

function EvidenceCard({
  label,
  url,
  onZoom,
}: {
  label: string;
  url: string | null;
  onZoom: () => void;
}) {
  return (
    <figure className="vq-evidence-card">
      <div className="vq-evidence-preview" onClick={url ? onZoom : undefined}>
        {url ? (
          <>
            <img src={url} alt={`${label}, protected official copy`} />
            <div className="vq-evidence-hover-hint">
              <i className="fa-solid fa-magnifying-glass-plus" />
              <span>Click to enlarge</span>
            </div>
          </>
        ) : (
          <div className="vq-evidence-missing">
            <i className="fa-solid fa-image-slash" />
            <span>Document not provided</span>
          </div>
        )}
      </div>
      <figcaption className="vq-evidence-caption">
        <span>{label}</span>
        {url && (
          <button type="button" className="vq-evidence-zoom-btn" onClick={onZoom}>
            <i className="fa-solid fa-expand" />
          </button>
        )}
      </figcaption>
    </figure>
  );
}

const styles = `
  /* ================= PAGE CONTAINER ================= */
  .vq-page {
    padding: 1rem 1.75rem 2.5rem;
    font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    color: #0F172A;
    display: flex;
    flex-direction: column;
    gap: 0.9rem;
    max-width: 1440px;
    margin: 0 auto;
    width: 100%;
    box-sizing: border-box;
  }

  /* ================= HEADER ================= */
  .vq-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
    flex-wrap: wrap;
    padding-bottom: 0.15rem;
  }

  .vq-kicker {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .vq-kicker-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.72rem;
    font-weight: 800;
    color: #D00F09;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    background: #FEF2F2;
    padding: 0.25rem 0.65rem;
    border-radius: 6px;
    border: 1px solid #FECACA;
  }

  .vq-kicker-badge i {
    font-size: 0.75rem;
  }

  .vq-muni-tag {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    font-size: 0.72rem;
    font-weight: 700;
    color: #475569;
    background: #F1F5F9;
    padding: 0.25rem 0.65rem;
    border-radius: 6px;
    border: 1px solid #E2E8F0;
  }

  .vq-muni-tag i {
    color: #D00F09;
    font-size: 0.7rem;
  }

  .vq-header-actions {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .vq-refresh-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
    padding: 0.45rem 0.95rem;
    border-radius: 8px;
    background: #FFFFFF;
    border: 1px solid #CBD5E1;
    color: #334155;
    font-size: 0.78rem;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.18s cubic-bezier(0.4, 0, 0.2, 1);
    font-family: inherit;
    box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);
  }

  .vq-refresh-btn:hover:not(:disabled) {
    background: #F8FAFC;
    border-color: #94A3B8;
    color: #0F172A;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(15, 23, 42, 0.08);
  }

  .vq-refresh-btn:disabled {
    opacity: 0.65;
    cursor: not-allowed;
  }

  /* ================= ALERT BANNER ================= */
  .vq-alert-banner {
    display: flex;
    align-items: center;
    gap: 0.8rem;
    padding: 0.9rem 1.25rem;
    background: #FEF2F2;
    border: 1px solid #FECACA;
    border-radius: 12px;
    color: #991B1B;
    font-size: 0.88rem;
  }

  .vq-alert-icon {
    font-size: 1.1rem;
    color: #DC2626;
  }

  .vq-alert-text {
    flex: 1;
  }

  .vq-alert-close {
    background: transparent;
    border: none;
    color: #991B1B;
    cursor: pointer;
    font-size: 1.1rem;
    padding: 0.2rem;
  }

  /* ================= METRICS GRID (COMPACT / SMALL) ================= */
  .vq-metrics-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 0.75rem;
  }

  .vq-metric-card {
    background: #FFFFFF;
    border-radius: 10px;
    border: 1px solid #E2E8F0;
    padding: 0.65rem 0.95rem;
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
    cursor: pointer;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 0 1px 3px rgba(15, 23, 42, 0.02);
    position: relative;
    overflow: hidden;
  }

  .vq-metric-card:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 14px rgba(15, 23, 42, 0.06);
    border-color: #CBD5E1;
  }

  .vq-metric-card.active-card {
    border-color: #D00F09;
    box-shadow: 0 0 0 1.5px rgba(208, 15, 9, 0.2), 0 4px 14px rgba(15, 23, 42, 0.06);
  }

  .vq-metric-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.15rem;
  }

  .vq-metric-icon-wrap {
    width: 26px;
    height: 26px;
    border-radius: 7px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.78rem;
  }

  .vq-metric-icon-wrap.pending {
    background: #FFFBEB;
    color: #D97706;
  }

  .vq-metric-icon-wrap.corrections {
    background: #FEF2F2;
    color: #DC2626;
  }

  .vq-metric-icon-wrap.approved {
    background: #ECFDF5;
    color: #10B981;
  }

  .vq-metric-icon-wrap.total {
    background: #EFF6FF;
    color: #2563EB;
  }

  .vq-metric-status {
    font-size: 0.62rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    padding: 0.12rem 0.45rem;
    border-radius: 999px;
  }

  .vq-metric-status.pending {
    background: #FFFBEB;
    color: #B45309;
  }

  .vq-metric-status.corrections {
    background: #FEF2F2;
    color: #B91C1C;
  }

  .vq-metric-status.approved {
    background: #ECFDF5;
    color: #047857;
  }

  .vq-metric-status.total {
    background: #F1F5F9;
    color: #475569;
  }

  .vq-metric-value {
    font-size: 1.45rem;
    font-weight: 850;
    color: #0F172A;
    line-height: 1.1;
    letter-spacing: -0.02em;
  }

  .vq-metric-label {
    font-size: 0.72rem;
    font-weight: 700;
    color: #64748B;
  }

  /* ================= TOOLBAR ================= */
  .vq-toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
    flex-wrap: wrap;
  }

  .vq-filter-pills {
    display: flex;
    gap: 0.4rem;
    background: #E2E8F0;
    padding: 0.3rem;
    border-radius: 12px;
  }

  .vq-pill {
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
    padding: 0.5rem 0.95rem;
    border-radius: 9px;
    border: none;
    background: transparent;
    font-size: 0.82rem;
    font-weight: 700;
    color: #475569;
    cursor: pointer;
    transition: all 0.15s ease;
    font-family: inherit;
  }

  .vq-pill:hover:not(.active) {
    color: #0F172A;
    background: rgba(255, 255, 255, 0.6);
  }

  .vq-pill.active {
    background: #FFFFFF;
    color: #0F172A;
    box-shadow: 0 1px 4px rgba(15, 23, 42, 0.08);
  }

  .vq-pill-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
  }

  .vq-pill-dot.pending {
    background: #F59E0B;
  }

  .vq-pill-dot.corrections {
    background: #EF4444;
  }

  .vq-pill-dot.approved {
    background: #10B981;
  }

  .vq-pill-badge {
    background: #F1F5F9;
    padding: 0.15rem 0.45rem;
    border-radius: 999px;
    font-size: 0.72rem;
    color: #64748B;
    font-weight: 800;
  }

  .vq-pill.active .vq-pill-badge {
    background: #0F172A;
    color: #FFFFFF;
  }

  .vq-search-box {
    position: relative;
    display: flex;
    align-items: center;
    min-width: 320px;
  }

  .vq-search-box i {
    position: absolute;
    left: 1rem;
    color: #94A3B8;
    font-size: 0.95rem;
    pointer-events: none;
  }

  .vq-search-box input {
    width: 100%;
    padding: 0.62rem 2.2rem 0.62rem 2.6rem;
    border-radius: 10px;
    border: 1px solid #CBD5E1;
    background: #FFFFFF;
    font-size: 0.85rem;
    color: #0F172A;
    outline: none;
    font-family: inherit;
    transition: border-color 0.15s, box-shadow 0.15s;
  }

  .vq-search-box input:focus {
    border-color: #D00F09;
    box-shadow: 0 0 0 3px rgba(208, 15, 9, 0.12);
  }

  .vq-search-clear {
    position: absolute;
    right: 0.75rem;
    background: transparent;
    border: none;
    color: #94A3B8;
    cursor: pointer;
    font-size: 0.85rem;
    padding: 0.2rem;
  }

  .vq-search-clear:hover {
    color: #0F172A;
  }

  /* ================= TABLE / LIST CONTAINER ================= */
  .vq-table-container {
    background: #FFFFFF;
    border-radius: 16px;
    border: 1px solid #E2E8F0;
    overflow: hidden;
    box-shadow: 0 4px 18px rgba(15, 23, 42, 0.04);
    display: flex;
    flex-direction: column;
  }

  .vq-row {
    display: grid;
    grid-template-columns: 56px 1.4fr 1.1fr 0.8fr auto;
    align-items: center;
    gap: 1.25rem;
    padding: 1.15rem 1.5rem;
    border-bottom: 1px solid #F1F5F9;
    transition: background-color 0.15s ease;
  }

  .vq-row:last-child {
    border-bottom: none;
  }

  .vq-row:hover {
    background-color: #F8FAFC;
  }

  .vq-avatar {
    width: 48px;
    height: 48px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 850;
    font-size: 1rem;
    letter-spacing: -0.02em;
    user-select: none;
  }

  .vq-avatar.pending {
    background: linear-gradient(135deg, #FDE68A, #F59E0B);
    color: #78350F;
  }

  .vq-avatar.changes {
    background: linear-gradient(135deg, #FECACA, #EF4444);
    color: #7F1D1D;
  }

  .vq-avatar.verified {
    background: linear-gradient(135deg, #A7F3D0, #10B981);
    color: #064E3B;
  }

  .vq-cell-main {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    min-width: 0;
  }

  .vq-status-row {
    display: flex;
    align-items: center;
    gap: 0.6rem;
  }

  .vq-status-tag {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.2rem 0.55rem;
    border-radius: 999px;
    font-size: 0.68rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .vq-status-tag.pending {
    background: #FFFBEB;
    color: #B45309;
    border: 1px solid #FDE68A;
  }

  .vq-status-tag.changes {
    background: #FEF2F2;
    color: #B91C1C;
    border: 1px solid #FECACA;
  }

  .vq-status-tag.approved {
    background: #ECFDF5;
    color: #047857;
    border: 1px solid #A7F3D0;
  }

  .vq-status-pulse {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: currentColor;
  }

  .vq-ref-tag {
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    font-size: 0.72rem;
    font-weight: 700;
    color: #64748B;
    background: #F1F5F9;
    padding: 0.15rem 0.45rem;
    border-radius: 4px;
  }

  .vq-resident-name {
    margin: 0;
    font-size: 1.05rem;
    font-weight: 800;
    color: #0F172A;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .vq-location-meta {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    color: #64748B;
    font-size: 0.78rem;
    font-weight: 600;
  }

  .vq-location-meta i {
    color: #D00F09;
    font-size: 0.72rem;
  }

  .vq-cell-contact {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
    font-size: 0.8rem;
    color: #334155;
    min-width: 0;
  }

  .vq-contact-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .vq-contact-item i {
    color: #94A3B8;
    width: 14px;
    font-size: 0.75rem;
  }

  .vq-contact-item .truncate {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .vq-cell-time {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
  }

  .vq-time-label {
    font-size: 0.65rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #94A3B8;
  }

  .vq-cell-time time {
    font-size: 0.82rem;
    font-weight: 700;
    color: #0F172A;
  }

  .vq-time-sub {
    font-size: 0.72rem;
    color: #64748B;
  }

  .vq-cell-action {
    display: flex;
    justify-content: flex-end;
  }

  .vq-review-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.55rem;
    padding: 0.6rem 1.05rem;
    background: #0F172A;
    color: #FFFFFF;
    border: none;
    border-radius: 9px;
    font-size: 0.82rem;
    font-weight: 750;
    cursor: pointer;
    transition: all 0.15s ease;
    font-family: inherit;
    white-space: nowrap;
  }

  .vq-review-btn:hover {
    background: #D00F09;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(208, 15, 9, 0.28);
  }

  .vq-review-btn i {
    font-size: 0.75rem;
    transition: transform 0.15s ease;
  }

  .vq-review-btn:hover i {
    transform: translateX(2px);
  }

  /* ================= EMPTY & LOADING STATES ================= */
  .vq-empty-state {
    padding: 4.5rem 1.5rem;
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }

  .vq-empty-icon-wrap {
    width: 60px;
    height: 60px;
    border-radius: 16px;
    background: #F1F5F9;
    color: #64748B;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.6rem;
    margin-bottom: 1rem;
    box-shadow: 0 4px 12px rgba(15, 23, 42, 0.05);
  }

  .vq-empty-state h3 {
    font-size: 1.25rem;
    font-weight: 800;
    color: #0F172A;
    margin: 0 0 0.4rem;
  }

  .vq-empty-state p {
    color: #64748B;
    font-size: 0.88rem;
    max-width: 26rem;
    margin: 0 0 1.25rem;
    line-height: 1.5;
  }

  .vq-empty-action {
    padding: 0.55rem 1.2rem;
    border-radius: 8px;
    border: 1px solid #CBD5E1;
    background: #FFFFFF;
    font-weight: 700;
    font-size: 0.82rem;
    color: #334155;
    cursor: pointer;
    font-family: inherit;
  }

  .vq-empty-action:hover {
    background: #F8FAFC;
    color: #0F172A;
  }

  .vq-loading-state {
    padding: 4.5rem 1rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.8rem;
    color: #64748B;
    font-size: 0.88rem;
    font-weight: 600;
  }

  .vq-spinner {
    width: 28px;
    height: 28px;
    border: 3px solid #E2E8F0;
    border-top-color: #D00F09;
    border-radius: 50%;
    animation: vqSpin 0.75s linear infinite;
  }

  @keyframes vqSpin {
    to {
      transform: rotate(360deg);
    }
  }

  /* ================= TOAST ================= */
  .vq-toast {
    position: fixed;
    right: 1.5rem;
    bottom: 1.5rem;
    z-index: 999999;
    padding: 0.85rem 1.25rem;
    border-radius: 12px;
    background: #0F172A;
    color: #FFFFFF;
    font-weight: 750;
    font-size: 0.85rem;
    box-shadow: 0 12px 36px rgba(15, 23, 42, 0.28);
    display: flex;
    align-items: center;
    gap: 0.65rem;
    animation: vqSlideIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  }

  /* ================= MODAL DOSSIER ================= */
  .vq-modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(15, 23, 42, 0.72);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 99999999 !important;
    padding: 1.5rem;
    box-sizing: border-box;
    font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  }

  .vq-modal-card {
    background: #FFFFFF;
    width: min(100%, 1020px);
    max-height: 90vh;
    border-radius: 20px;
    box-shadow: 0 32px 80px -12px rgba(15, 23, 42, 0.42);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    border: 1px solid #E2E8F0;
    animation: vqScaleUp 0.24s cubic-bezier(0.16, 1, 0.3, 1);
  }

  @keyframes vqScaleUp {
    from {
      opacity: 0;
      transform: scale(0.96);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }

  @keyframes vqSlideIn {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .vq-modal-header {
    padding: 1.35rem 1.8rem;
    border-bottom: 1px solid #F1F5F9;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    background: #FAFAFA;
  }

  .vq-modal-header-info {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }

  .vq-modal-kicker {
    display: flex;
    align-items: center;
    gap: 0.6rem;
  }

  .vq-modal-ref {
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    font-size: 0.75rem;
    font-weight: 750;
    color: #475569;
    background: #E2E8F0;
    padding: 0.15rem 0.5rem;
    border-radius: 5px;
  }

  .vq-modal-title {
    font-size: 1.55rem;
    font-weight: 850;
    color: #0F172A;
    margin: 0;
    letter-spacing: -0.01em;
  }

  .vq-modal-sub {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    color: #64748B;
    font-size: 0.82rem;
    font-weight: 600;
  }

  .vq-modal-sub i {
    color: #D00F09;
    font-size: 0.75rem;
  }

  .vq-modal-close {
    width: 38px;
    height: 38px;
    border-radius: 50%;
    background: rgba(0, 0, 0, 0.04);
    border: none;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.15rem;
    color: #64748B;
    cursor: pointer;
    transition: all 0.15s;
  }

  .vq-modal-close:hover {
    background: rgba(0, 0, 0, 0.08);
    color: #0F172A;
  }

  .vq-modal-body {
    padding: 1.8rem;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 1.8rem;
  }

  .vq-modal-alert {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.85rem 1.15rem;
    border-radius: 10px;
    background: #FEF2F2;
    border: 1px solid #FECACA;
    color: #B91C1C;
    font-size: 0.88rem;
    font-weight: 600;
  }

  .vq-dossier-section {
    display: flex;
    flex-direction: column;
    gap: 0.85rem;
  }

  .vq-dossier-heading {
    font-size: 0.95rem;
    font-weight: 800;
    color: #1E293B;
    margin: 0;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .vq-dossier-heading i {
    color: #D00F09;
  }

  /* Facts Grid */
  .vq-facts-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    background: #F8FAFC;
    border-radius: 12px;
    border: 1px solid #E2E8F0;
    overflow: hidden;
  }

  .vq-fact-item {
    padding: 0.95rem 1.15rem;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    border-right: 1px solid #E2E8F0;
  }

  .vq-fact-item:last-child {
    border-right: none;
  }

  .vq-fact-item small {
    font-size: 0.68rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #64748B;
  }

  .vq-fact-item strong {
    font-size: 0.88rem;
    color: #0F172A;
    overflow-wrap: anywhere;
  }

  /* Evidence Grid */
  .vq-evidence-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
  }

  .vq-evidence-subtitle {
    margin: 0.2rem 0 0;
    font-size: 0.78rem;
    color: #64748B;
  }

  .vq-evidence-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1.15rem;
  }

  .vq-evidence-card {
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .vq-evidence-preview {
    aspect-ratio: 4 / 3;
    border-radius: 12px;
    border: 1.5px solid #E2E8F0;
    background: #F1F5F9;
    overflow: hidden;
    position: relative;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
  }

  .vq-evidence-preview:hover {
    border-color: #D00F09;
    box-shadow: 0 8px 20px rgba(15, 23, 42, 0.1);
  }

  .vq-evidence-preview img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
    transition: transform 0.2s ease;
  }

  .vq-evidence-preview:hover img {
    transform: scale(1.03);
  }

  .vq-evidence-hover-hint {
    position: absolute;
    inset: 0;
    background: rgba(15, 23, 42, 0.45);
    color: #FFFFFF;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.35rem;
    font-size: 0.8rem;
    font-weight: 750;
    opacity: 0;
    transition: opacity 0.15s ease;
  }

  .vq-evidence-preview:hover .vq-evidence-hover-hint {
    opacity: 1;
  }

  .vq-evidence-missing {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.45rem;
    color: #94A3B8;
    font-size: 0.78rem;
    font-weight: 600;
  }

  .vq-evidence-missing i {
    font-size: 1.6rem;
  }

  .vq-evidence-caption {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.8rem;
    font-weight: 800;
    color: #334155;
    padding: 0 0.2rem;
  }

  .vq-evidence-zoom-btn {
    background: transparent;
    border: none;
    color: #64748B;
    cursor: pointer;
    font-size: 0.85rem;
    padding: 0.2rem;
    transition: color 0.15s;
  }

  .vq-evidence-zoom-btn:hover {
    color: #D00F09;
  }

  /* Timeline */
  .vq-timeline {
    display: flex;
    flex-direction: column;
    gap: 0.8rem;
    padding-left: 0.5rem;
  }

  .vq-timeline-item {
    display: flex;
    gap: 0.85rem;
    align-items: flex-start;
  }

  .vq-timeline-node {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #D00F09;
    margin-top: 0.4rem;
    flex-shrink: 0;
    box-shadow: 0 0 0 3px rgba(208, 15, 9, 0.2);
  }

  .vq-timeline-content {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
  }

  .vq-timeline-title {
    display: flex;
    align-items: center;
    gap: 0.6rem;
  }

  .vq-timeline-title strong {
    font-size: 0.85rem;
    color: #0F172A;
    text-transform: capitalize;
  }

  .vq-timeline-title small {
    color: #64748B;
    font-size: 0.75rem;
  }

  .vq-timeline-notes {
    margin: 0;
    font-size: 0.82rem;
    color: #991B1B;
    background: #FEF2F2;
    padding: 0.4rem 0.65rem;
    border-radius: 6px;
    border: 1px solid #FECACA;
  }

  /* Correction Box */
  .vq-correction-box {
    background: #FFFBEB;
    border: 1.5px solid #FDE68A;
    border-radius: 12px;
    padding: 1.25rem;
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
  }

  .vq-correction-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: #B45309;
    font-size: 0.9rem;
    font-weight: 800;
  }

  .vq-correction-help {
    margin: 0;
    font-size: 0.8rem;
    color: #78350F;
    line-height: 1.4;
  }

  .vq-correction-textarea {
    width: 100%;
    min-height: 95px;
    padding: 0.8rem;
    border-radius: 8px;
    border: 1px solid #FCD34D;
    background: #FFFFFF;
    font-size: 0.88rem;
    color: #0F172A;
    font-family: inherit;
    resize: vertical;
    outline: none;
    box-sizing: border-box;
  }

  .vq-correction-textarea:focus {
    border-color: #D97706;
    box-shadow: 0 0 0 3px rgba(217, 119, 6, 0.15);
  }

  .vq-correction-meta {
    display: flex;
    justify-content: flex-end;
    font-size: 0.72rem;
    font-weight: 700;
  }

  .vq-correction-meta .text-muted {
    color: #92400E;
  }

  .vq-correction-meta .text-valid {
    color: #047857;
  }

  /* Modal Footer */
  .vq-modal-footer {
    padding: 1.25rem 1.8rem;
    border-top: 1px solid #F1F5F9;
    display: flex;
    justify-content: flex-end;
    align-items: center;
    gap: 0.85rem;
    background: #FAFAFA;
  }

  .vq-btn-cancel,
  .vq-btn-secondary {
    padding: 0.75rem 1.4rem;
    border-radius: 10px;
    font-size: 0.85rem;
    font-weight: 750;
    cursor: pointer;
    transition: all 0.15s;
    font-family: inherit;
  }

  .vq-btn-cancel {
    background: #FFFFFF;
    border: 1px solid #CBD5E1;
    color: #475569;
  }

  .vq-btn-cancel:hover:not(:disabled) {
    background: #F8FAFC;
    color: #0F172A;
  }

  .vq-btn-secondary {
    background: #FFFFFF;
    border: 1px solid #CBD5E1;
    color: #334155;
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
  }

  .vq-btn-secondary:hover:not(:disabled) {
    background: #FFFBEB;
    border-color: #FCD34D;
    color: #B45309;
  }

  .vq-btn-danger {
    padding: 0.75rem 1.5rem;
    border-radius: 10px;
    background: #DC2626;
    color: #FFFFFF;
    border: none;
    font-size: 0.85rem;
    font-weight: 750;
    cursor: pointer;
    transition: all 0.15s;
    font-family: inherit;
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    box-shadow: 0 4px 12px rgba(220, 38, 38, 0.25);
  }

  .vq-btn-danger:hover:not(:disabled) {
    background: #B91C1C;
    transform: translateY(-1px);
    box-shadow: 0 6px 16px rgba(220, 38, 38, 0.35);
  }

  .vq-btn-danger:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }

  .vq-btn-approve {
    padding: 0.75rem 1.6rem;
    border-radius: 10px;
    background: linear-gradient(135deg, #10B981 0%, #059669 100%);
    color: #FFFFFF;
    border: none;
    font-size: 0.85rem;
    font-weight: 750;
    cursor: pointer;
    transition: all 0.18s;
    font-family: inherit;
    display: inline-flex;
    align-items: center;
    gap: 0.55rem;
    box-shadow: 0 4px 14px rgba(16, 185, 129, 0.3);
  }

  .vq-btn-approve:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 6px 18px rgba(16, 185, 129, 0.4);
  }

  .vq-btn-approve:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  /* ================= FULL-SCREEN ZOOM OVERLAY ================= */
  .vq-zoom-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(15, 23, 42, 0.88);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    z-index: 999999999 !important;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2rem;
    box-sizing: border-box;
    font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  }

  .vq-zoom-container {
    background: #0F172A;
    border-radius: 16px;
    overflow: hidden;
    max-width: 90vw;
    max-height: 90vh;
    display: flex;
    flex-direction: column;
    box-shadow: 0 32px 80px rgba(0, 0, 0, 0.6);
    border: 1px solid rgba(255, 255, 255, 0.15);
  }

  .vq-zoom-header {
    padding: 0.85rem 1.25rem;
    background: rgba(255, 255, 255, 0.05);
    display: flex;
    justify-content: space-between;
    align-items: center;
    color: #FFFFFF;
    font-weight: 750;
    font-size: 0.9rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }

  .vq-zoom-close {
    background: rgba(255, 255, 255, 0.1);
    border: none;
    color: #FFFFFF;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    font-size: 1rem;
    transition: background 0.15s;
  }

  .vq-zoom-close:hover {
    background: #D00F09;
  }

  .vq-zoom-body {
    padding: 1rem;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: auto;
  }

  .vq-zoom-body img {
    max-width: 82vw;
    max-height: 78vh;
    object-fit: contain;
    border-radius: 8px;
  }

  /* ================= RESPONSIVE BREAKPOINTS ================= */
  @media (max-width: 1100px) {
    .vq-metrics-grid {
      grid-template-columns: repeat(2, 1fr);
    }
    .vq-row {
      grid-template-columns: 48px 1fr 1fr auto;
    }
    .vq-cell-time {
      display: none;
    }
    .vq-facts-grid {
      grid-template-columns: repeat(2, 1fr);
    }
    .vq-fact-item:nth-child(2) {
      border-right: none;
    }
    .vq-fact-item:nth-child(1),
    .vq-fact-item:nth-child(2) {
      border-bottom: 1px solid #E2E8F0;
    }
  }

  @media (max-width: 768px) {
    .vq-page {
      padding: 1rem;
    }
    .vq-metrics-grid {
      grid-template-columns: 1fr;
    }
    .vq-toolbar {
      flex-direction: column;
      align-items: stretch;
    }
    .vq-filter-pills {
      overflow-x: auto;
    }
    .vq-search-box {
      min-width: 100%;
    }
    .vq-row {
      grid-template-columns: 44px 1fr;
      gap: 0.8rem;
    }
    .vq-cell-contact {
      display: none;
    }
    .vq-cell-action {
      grid-column: 1 / -1;
      width: 100%;
    }
    .vq-review-btn {
      width: 100%;
      justify-content: center;
    }
    .vq-evidence-grid {
      grid-template-columns: 1fr;
    }
    .vq-facts-grid {
      grid-template-columns: 1fr;
    }
    .vq-fact-item {
      border-right: none;
      border-bottom: 1px solid #E2E8F0;
    }
    .vq-fact-item:last-child {
      border-bottom: none;
    }
  }
`;
