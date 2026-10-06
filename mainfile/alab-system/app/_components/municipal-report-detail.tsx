"use client";

import { municipalTabFetch } from "../../lib/auth/municipal-tab-fetch";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { BfpDataLoader } from "./bfp-data-loader";
import type {
  MunicipalReportDetail as MunicipalReportDetailType,
  MunicipalDispatchRecord,
  MunicipalDispatchRecipient,
  MunicipalTimelineEvent,
} from "../../lib/municipal-bfp/reports/types";
import {
  formatPhilippineDateTime,
  formatMinutes,
  getFireTypeLabel,
  getStatusLabel,
  getSeverityLabel,
} from "../../lib/municipal-bfp/reports/formatters";

interface MunicipalReportDetailProps {
  reportId: string;
  onClose: () => void;
}

export function MunicipalReportDetail({ reportId, onClose }: MunicipalReportDetailProps) {
  const [report, setReport] = useState<MunicipalReportDetailType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activePhoto, setActivePhoto] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  const [retryCount, setRetryCount] = useState(0);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const handleDownloadPdf = useCallback(async () => {
    if (downloading) return;
    setDownloading(true);
    setDownloadError(null);

    try {
      const res = await municipalTabFetch("/api/municipal-bfp/reports/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dataset: "INCIDENT_DOSSIER",
          format: "PDF",
          scope: "ALL_MATCHING",
          reportId,
          filters: { page: 1, pageSize: 25, period: "ALL" },
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Unable to generate this incident report.");
      }

      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition");
      const match = disposition?.match(/filename="?([^"]+)"?/);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = match?.[1] || "alab-incident-report.pdf";
      document.body.appendChild(link);
      link.click();
      window.setTimeout(() => window.URL.revokeObjectURL(url), 1000);
      document.body.removeChild(link);
    } catch (cause) {
      setDownloadError(cause instanceof Error ? cause.message : "Download failed. Please retry.");
    } finally {
      setDownloading(false);
    }
  }, [downloading, reportId]);

  useEffect(() => {
    let isMounted = true;
    municipalTabFetch(`/api/municipal-bfp/reports/${encodeURIComponent(reportId)}`, {
      cache: "no-store",
    })
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || "Failed to load report details.");
        }
        return res.json();
      })
      .then((data) => {
        if (isMounted) {
          setReport(data.report);
          setLoading(false);
          setError(null);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Failed to load report details.");
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [reportId, retryCount]);

  const handleRetry = useCallback(() => {
    setLoading(true);
    setError(null);
    setRetryCount((c) => c + 1);
  }, []);

  // Keyboard navigation: Escape key closes
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (activePhoto) {
          setActivePhoto(null);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, activePhoto]);


  if (typeof document === "undefined") return null;

  const statusLook = STATUS_LOOK[report?.status ?? ""] ?? STATUS_LOOK.DEFAULT;
  const dangerIcon = report ? DANGER_ICONS[report.severity] ?? "fa-circle-question" : "";
  const accuracy = report?.locationAccuracyMeters ? ` ±${report.locationAccuracyMeters} m` : "";

  /*
   * Rendered into document.body: the page content area animates transform and
   * sets will-change, which makes it a containing block for fixed positioning.
   * Inside it the overlay could not cover the sidebar or header.
   */
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-detail-title"
      ref={dialogRef}
      className="mrd-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <style>{detailStyles}</style>
      <div className="mrd-panel">
        {/* Header: what, where, when, at a glance */}
        <header className="mrd-head">
          <div className="mrd-head-main">
            <div className="mrd-title-row">
              <span className="mrd-head-icon" aria-hidden="true">
                <i className={`fa-solid ${report ? FIRE_TYPE_ICONS[report.fireType] ?? "fa-fire" : "fa-fire"}`} />
              </span>
              <div className="mrd-title-text">
                <h2 id="report-detail-title">{report ? report.referenceNumber : "Loading…"}</h2>
                {report && (
                  <p className="mrd-sub">
                    <span><i className="fa-solid fa-location-dot" aria-hidden="true" />{report.barangay}, {report.municipalityName}</span>
                    <span><i className="fa-regular fa-clock" aria-hidden="true" />{formatPhilippineDateTime(report.submittedAt)}</span>
                  </p>
                )}
              </div>
            </div>
            {report && (
              <div className="mrd-chips">
                <span className="mrd-chip mrd-chip-status" style={{ background: statusLook.bg, color: statusLook.fg }}>
                  <i className={`fa-solid ${statusLook.icon}`} aria-hidden="true" />{getStatusLabel(report.status)}
                </span>
                <span className={`mrd-chip mrd-chip-danger ${report.severity}`}>
                  <i className={`fa-solid ${dangerIcon}`} aria-hidden="true" />{getSeverityLabel(report.severity)} danger
                </span>
                <span className="mrd-chip">
                  <i className={`fa-solid ${FIRE_TYPE_ICONS[report.fireType] ?? "fa-fire"}`} aria-hidden="true" />{getFireTypeLabel(report.fireType)}
                </span>
                <span className="mrd-chip mrd-chip-source">
                  <i className={`fa-solid ${report.reportSource === "ALAB_APP" ? "fa-mobile-screen-button" : "fa-phone"}`} aria-hidden="true" />
                  {report.reportSource === "ALAB_APP" ? "Resident App" : "Phone Call"}
                </span>
                {report.recordRole === "ASSISTING" && (
                  <span className="mrd-chip mrd-chip-assist"><i className="fa-solid fa-handshake-angle" aria-hidden="true" />Assisting</span>
                )}
              </div>
            )}
          </div>
          <button type="button" className="mrd-close" onClick={onClose} aria-label="Close dialog">
            <i className="fa-solid fa-xmark" aria-hidden="true" />
          </button>
        </header>

        <div className="mrd-body">
          {loading && <BfpDataLoader size="sm" minHeight="200px" title="Loading incident details…" />}

          {error && (
            <div className="mrd-error" role="alert">
              <i className="fa-solid fa-triangle-exclamation" aria-hidden="true" />
              <p>{error}</p>
              <button type="button" onClick={handleRetry}>Retry</button>
            </div>
          )}

          {report && !loading && (
            <>
              {/* Response timing */}
              <section className="mrd-times" aria-label="Response timing">
                <TimeTile icon="fa-stopwatch" label="Response Started" minutes={report.timeToResponseMinutes} at={report.responseStartedAt} empty="Not recorded" />
                <TimeTile icon="fa-flag-checkered" label="Recorded Arrival" minutes={report.timeToArrivalMinutes} at={report.recordedArrivalAt} empty="Not recorded" />
                <TimeTile icon="fa-circle-check" label="Resolution Time" minutes={report.timeToResolutionMinutes} at={report.resolvedAt} empty="In progress" />
              </section>

              {/* Reporter */}
              {report.recordRole === "OWNER" ? (
                <section className="mrd-card mrd-card-reporter">
                  <h3><i className="fa-solid fa-user-shield" aria-hidden="true" />Reporter</h3>
                  <div className="mrd-facts">
                    <Fact icon="fa-user" label="Name">{report.reporterName || "Civilian Resident"}</Fact>
                    <Fact icon="fa-phone" label="Phone">
                      {report.reporterPhone ? <a className="mrd-tel" href={`tel:${report.reporterPhone}`}>{report.reporterPhone}</a> : "Not on record"}
                    </Fact>
                    <Fact icon="fa-location-crosshairs" label="Location fix">{`${report.locationMethod || "GPS"}${accuracy}`}</Fact>
                    {report.nearestLandmark && <Fact icon="fa-landmark" label="Landmark">{report.nearestLandmark}</Fact>}
                  </div>
                </section>
              ) : (
                <div className="mrd-assist-note">
                  <i className="fa-solid fa-shield-halved" aria-hidden="true" />
                  Assisting record. Caller details stay with the owning municipality.
                </div>
              )}

              {/* Location */}
              <section className="mrd-card">
                <h3><i className="fa-solid fa-map-location-dot" aria-hidden="true" />Incident Location</h3>
                <div className="mrd-facts">
                  <Fact icon="fa-location-dot" label="Barangay">
                    {report.barangay}
                    {report.addressLabel && report.addressLabel !== report.barangay ? <small>{report.addressLabel}</small> : null}
                  </Fact>
                  <Fact icon="fa-crosshairs" label="Coordinates"><span className="mrd-num">{report.latitude.toFixed(5)}, {report.longitude.toFixed(5)}</span></Fact>
                  <Fact icon="fa-truck-fast" label="Dispatch">{report.latestDispatchSummary || "No active dispatch"}</Fact>
                </div>
                {report.description && (
                  <p className="mrd-notes"><i className="fa-regular fa-note-sticky" aria-hidden="true" />{report.description}</p>
                )}
              </section>

              {/* Dispatches & responders */}
              {report.dispatches && report.dispatches.length > 0 && (
                <section className="mrd-card">
                  <h3><i className="fa-solid fa-truck-medical" aria-hidden="true" />Stations &amp; Responders</h3>
                  <ul className="mrd-stations">
                    {report.dispatches.map((d: MunicipalDispatchRecord) => (
                      <li key={d.id}>
                        <div className="mrd-station-row">
                          <span className="mrd-station-icon" aria-hidden="true"><i className="fa-solid fa-building-shield" /></span>
                          <strong>{d.stationName}</strong>
                          <span className="mrd-station-time"><i className="fa-regular fa-clock" aria-hidden="true" />{formatPhilippineDateTime(d.dispatchedAt)}</span>
                        </div>
                        {d.recipients && d.recipients.length > 0 && (
                          <div className="mrd-crew">
                            {d.recipients.map((r: MunicipalDispatchRecipient) => (
                              <span key={r.userId} className={`mrd-crew-chip ${r.onSceneAt ? "is-on-scene" : ""}`}>
                                <span className="mrd-avatar" aria-hidden="true">{initials(r.name)}</span>
                                {r.name}
                                <em>{r.onSceneAt ? "On scene" : humanize(r.status)}</em>
                              </span>
                            ))}
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {/* Operational Timeline */}
              {report.timeline && report.timeline.length > 0 && (
                <section className="mrd-card">
                  <h3><i className="fa-solid fa-timeline" aria-hidden="true" />Operational Timeline</h3>
                  <ol className="mrd-timeline">
                    {report.timeline.map((event: MunicipalTimelineEvent, idx: number) => {
                      const look = STATUS_LOOK[event.stage] ?? STATUS_LOOK.DEFAULT;
                      const latest = idx === report.timeline.length - 1;
                      return (
                        <li key={idx} className={latest ? "is-latest" : ""}>
                          <span className="mrd-tl-dot" aria-hidden="true"><i className={`fa-solid ${look.icon}`} /></span>
                          <div className="mrd-tl-body">
                            <div className="mrd-tl-head">
                              <strong>{getStatusLabel(event.stage)}</strong>
                              <time dateTime={event.timestamp}>{formatPhilippineDateTime(event.timestamp)}</time>
                            </div>
                            {event.notes && <p>{event.notes}</p>}
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                </section>
              )}

              {/* Photos */}
              {report.photos && report.photos.length > 0 && (
                <section className="mrd-card">
                  <h3><i className="fa-solid fa-camera" aria-hidden="true" />Incident Photos ({report.photos.length})</h3>
                  <div className="mrd-photos">
                    {report.photos.map((url: string, idx: number) => (
                      <button key={idx} type="button" onClick={() => setActivePhoto(url)} aria-label={`Open photo ${idx + 1}`}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={url} alt={`Incident Photo ${idx + 1}`} />
                        <span aria-hidden="true"><i className="fa-solid fa-expand" /></span>
                      </button>
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </div>

        <footer className="mrd-foot">
          {report ? (
            <div className="mrd-foot-left">
              <button type="button" className="mrd-btn mrd-btn-pdf" onClick={handleDownloadPdf} disabled={downloading}>
                <i className={`fa-solid ${downloading ? "fa-circle-notch fa-spin" : "fa-file-pdf"}`} aria-hidden="true" />
                {downloading ? "Preparing…" : "Download PDF"}
              </button>
              {downloadError && <span className="mrd-foot-error" role="alert">{downloadError}</span>}
            </div>
          ) : (
            <div />
          )}
          <button type="button" className="mrd-btn" onClick={onClose}>Close</button>
        </footer>
      </div>

      {/* Full Photo Lightbox Modal */}
      {activePhoto && (
        <div className="mrd-lightbox" onClick={() => setActivePhoto(null)}>
          <div className="mrd-lightbox-inner">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={activePhoto} alt="Full size incident photo" />
            <button type="button" onClick={() => setActivePhoto(null)} aria-label="Close photo">
              <i className="fa-solid fa-xmark" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}
    </div>, document.body,
  );
}

function TimeTile({ icon, label, minutes, at, empty }: { icon: string; label: string; minutes: number | null; at: string | null; empty: string }) {
  const recorded = minutes !== null && minutes !== undefined && !Number.isNaN(minutes);
  return (
    <div className={`mrd-time ${recorded ? "" : "is-empty"}`}>
      <span className="mrd-time-icon" aria-hidden="true"><i className={`fa-solid ${icon}`} /></span>
      <div>
        <span className="mrd-time-label">{label}</span>
        <strong>{recorded ? formatMinutes(minutes) : empty}</strong>
        {recorded && at && <small>{formatPhilippineDateTime(at)}</small>}
      </div>
    </div>
  );
}

function Fact({ icon, label, children }: { icon: string; label: string; children: React.ReactNode }) {
  return (
    <div className="mrd-fact">
      <span className="mrd-fact-icon" aria-hidden="true"><i className={`fa-solid ${icon}`} /></span>
      <div>
        <span className="mrd-fact-label">{label}</span>
        <span className="mrd-fact-value">{children}</span>
      </div>
    </div>
  );
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("");
}

function humanize(value: string) {
  const text = value.replace(/_/g, " ").toLowerCase();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

const STATUS_LOOK: Record<string, { icon: string; bg: string; fg: string }> = {
  SUBMITTED: { icon: "fa-hourglass-half", bg: "#FEF3C7", fg: "#92400E" },
  PENDING_VERIFICATION: { icon: "fa-hourglass-half", bg: "#FEF3C7", fg: "#92400E" },
  UNDER_VERIFICATION: { icon: "fa-magnifying-glass", bg: "#FEF3C7", fg: "#92400E" },
  NEEDS_MORE_INFO: { icon: "fa-circle-question", bg: "#FEF3C7", fg: "#92400E" },
  VERIFIED: { icon: "fa-shield-halved", bg: "#DC2626", fg: "#FFFFFF" },
  CONFIRMED: { icon: "fa-shield-halved", bg: "#DC2626", fg: "#FFFFFF" },
  RESPONDING: { icon: "fa-person-running", bg: "#EA580C", fg: "#FFFFFF" },
  FIRETRUCK_DISPATCHED: { icon: "fa-truck-fast", bg: "#EA580C", fg: "#FFFFFF" },
  RESPONDER_ARRIVED: { icon: "fa-helmet-safety", bg: "#2563EB", fg: "#FFFFFF" },
  UNDER_CONTROL: { icon: "fa-fire-extinguisher", bg: "#2563EB", fg: "#FFFFFF" },
  RESOLVED: { icon: "fa-circle-check", bg: "#059669", fg: "#FFFFFF" },
  CLOSED: { icon: "fa-circle-check", bg: "#059669", fg: "#FFFFFF" },
  FALSE_REPORT: { icon: "fa-circle-xmark", bg: "#F1F5F9", fg: "#475569" },
  REJECTED: { icon: "fa-circle-xmark", bg: "#F1F5F9", fg: "#475569" },
  DUPLICATE: { icon: "fa-clone", bg: "#F1F5F9", fg: "#475569" },
  DEFAULT: { icon: "fa-circle-dot", bg: "#F1F5F9", fg: "#475569" },
};

const DANGER_ICONS: Record<string, string> = {
  LOW: "fa-temperature-low",
  MODERATE: "fa-triangle-exclamation",
  HIGH: "fa-fire",
  CRITICAL: "fa-fire-flame-curved",
  UNKNOWN: "fa-circle-question",
};

const FIRE_TYPE_ICONS: Record<string, string> = {
  HOUSE_BUILDING: "fa-house-fire",
  GRASS: "fa-seedling",
  FOREST: "fa-tree",
  VEHICLE: "fa-car-burst",
  OTHER: "fa-trash-can",
};

const detailStyles = `
  .mrd-overlay { position:fixed; inset:0; z-index:9999; display:flex; align-items:center; justify-content:center; padding:1rem; background:rgba(15,23,42,.6); backdrop-filter:blur(4px); font-family:'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif; }
  .mrd-panel { width:100%; max-width:800px; max-height:92vh; display:flex; flex-direction:column; overflow:hidden; border-radius:16px; background:#fff; box-shadow:0 24px 48px -12px rgba(15,23,42,.35), 0 8px 16px -8px rgba(15,23,42,.18); }
  .mrd-panel ::selection { background:#FECACA; color:#7F1D1D; }

  .mrd-head { display:flex; align-items:flex-start; justify-content:space-between; gap:1rem; padding:1.15rem 1.35rem 1rem; border-bottom:1px solid #E2E8F0; background:linear-gradient(180deg,#FFF7F6,#FFFFFF); }
  .mrd-head-main { min-width:0; display:flex; flex-direction:column; gap:.75rem; }
  .mrd-title-row { display:flex; align-items:center; gap:.8rem; }
  .mrd-head-icon { flex:none; width:2.75rem; height:2.75rem; display:grid; place-items:center; border-radius:.85rem; background:#E23632; color:#fff; font-size:1.15rem; box-shadow:0 6px 14px rgba(226,54,50,.28); }
  .mrd-title-text { min-width:0; }
  .mrd-title-text h2 { margin:0; color:#0F172A; font-size:1.2rem; font-weight:800; letter-spacing:-.01em; font-variant-numeric:tabular-nums; overflow-wrap:anywhere; }
  .mrd-sub { display:flex; flex-wrap:wrap; gap:.25rem .9rem; margin:.2rem 0 0; color:#64748B; font-size:.8rem; font-weight:600; }
  .mrd-sub span { display:inline-flex; align-items:center; gap:.35rem; }
  .mrd-sub i { color:#94A3B8; font-size:.75rem; }
  .mrd-chips { display:flex; flex-wrap:wrap; gap:.4rem; }
  .mrd-chip { display:inline-flex; align-items:center; gap:.38rem; padding:.3rem .6rem; border:1px solid #E2E8F0; border-radius:999px; background:#F8FAFC; color:#334155; font-size:.74rem; font-weight:750; line-height:1.2; }
  .mrd-chip i { font-size:.72rem; }
  .mrd-chip-status { border-color:transparent; font-weight:800; }
  .mrd-chip-danger.LOW { border-color:#86EFAC; background:#F0FDF4; color:#15803D; }
  .mrd-chip-danger.MODERATE { border-color:#FCD34D; background:#FFFBEB; color:#B45309; }
  .mrd-chip-danger.HIGH { border-color:#FDBA74; background:#FFF7ED; color:#C2410C; }
  .mrd-chip-danger.CRITICAL { border-color:#F87171; background:#FEF2F2; color:#991B1B; }
  .mrd-chip-source { border-color:#BFDBFE; background:#EFF6FF; color:#1D4ED8; }
  .mrd-chip-assist { border-color:#FED7AA; background:#FFF7ED; color:#C2410C; }
  .mrd-close { flex:none; width:2.25rem; height:2.25rem; display:grid; place-items:center; border:0; border-radius:50%; background:#F1F5F9; color:#475569; font-size:1rem; cursor:pointer; transition:background-color .15s ease, color .15s ease; }
  .mrd-close:hover { background:#E2E8F0; color:#0F172A; }

  .mrd-body { flex:1; overflow-y:auto; display:flex; flex-direction:column; gap:1rem; padding:1.15rem 1.35rem 1.35rem; background:#F8FAFC; scrollbar-width:thin; scrollbar-color:#CBD5E1 transparent; }
  .mrd-error { display:flex; align-items:center; gap:.65rem; padding:.85rem 1rem; border:1px solid #FECACA; border-radius:12px; background:#FEF2F2; color:#991B1B; font-size:.86rem; font-weight:650; }
  .mrd-error p { flex:1; margin:0; }
  .mrd-error button { border:0; border-radius:8px; padding:.4rem .8rem; background:#DC2626; color:#fff; font:inherit; font-size:.78rem; font-weight:750; cursor:pointer; }

  .mrd-times { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:.75rem; }
  .mrd-time { display:flex; align-items:flex-start; gap:.7rem; padding:.85rem .9rem; border:1px solid #E2E8F0; border-radius:12px; background:#fff; }
  .mrd-time-icon { flex:none; width:2.2rem; height:2.2rem; display:grid; place-items:center; border-radius:.7rem; background:#ECFDF5; color:#047857; font-size:.9rem; }
  .mrd-time.is-empty .mrd-time-icon { background:#F1F5F9; color:#94A3B8; }
  .mrd-time > div { min-width:0; display:flex; flex-direction:column; gap:.1rem; }
  .mrd-time-label { color:#64748B; font-size:.68rem; font-weight:800; text-transform:uppercase; letter-spacing:.04em; }
  .mrd-time strong { color:#0F172A; font-size:1.05rem; font-weight:800; font-variant-numeric:tabular-nums; }
  .mrd-time.is-empty strong { color:#94A3B8; font-size:.9rem; font-weight:700; }
  .mrd-time small { color:#64748B; font-size:.72rem; font-weight:600; }

  .mrd-card { padding:1rem 1.1rem; border:1px solid #E2E8F0; border-radius:12px; background:#fff; }
  .mrd-card h3 { display:flex; align-items:center; gap:.5rem; margin:0 0 .85rem; color:#0F172A; font-size:.9rem; font-weight:800; letter-spacing:-.005em; }
  .mrd-card h3 i { width:1.75rem; height:1.75rem; display:grid; place-items:center; border-radius:.55rem; background:#FFF1F2; color:#E23632; font-size:.78rem; }
  .mrd-card-reporter { border-color:#E9D5FF; }
  .mrd-card-reporter h3 i { background:#F3E8FF; color:#7E22CE; }
  .mrd-card-reporter .mrd-fact-icon { background:#FAF5FF; color:#7E22CE; }

  .mrd-facts { display:grid; grid-template-columns:repeat(auto-fit,minmax(200px,1fr)); gap:.8rem 1rem; }
  .mrd-fact { display:flex; align-items:flex-start; gap:.6rem; min-width:0; }
  .mrd-fact-icon { flex:none; width:2rem; height:2rem; display:grid; place-items:center; border-radius:.6rem; background:#F8FAFC; color:#64748B; font-size:.8rem; }
  .mrd-fact > div { min-width:0; display:flex; flex-direction:column; gap:.1rem; }
  .mrd-fact-label { color:#64748B; font-size:.68rem; font-weight:750; text-transform:uppercase; letter-spacing:.035em; }
  .mrd-fact-value { color:#0F172A; font-size:.86rem; font-weight:700; line-height:1.35; overflow-wrap:anywhere; }
  .mrd-fact-value small { display:block; color:#64748B; font-size:.76rem; font-weight:600; }
  .mrd-num { font-variant-numeric:tabular-nums; }
  .mrd-tel { color:#1D4ED8; text-decoration:none; font-variant-numeric:tabular-nums; }
  .mrd-tel:hover { text-decoration:underline; text-underline-offset:3px; }
  .mrd-notes { display:flex; gap:.55rem; margin:.9rem 0 0; padding-top:.85rem; border-top:1px solid #F1F5F9; color:#334155; font-size:.84rem; line-height:1.5; white-space:pre-wrap; }
  .mrd-notes i { margin-top:.2rem; color:#94A3B8; }
  .mrd-assist-note { display:flex; align-items:center; gap:.6rem; padding:.85rem 1rem; border:1px solid #FED7AA; border-radius:12px; background:#FFF7ED; color:#9A3412; font-size:.82rem; font-weight:650; }

  .mrd-stations { list-style:none; display:flex; flex-direction:column; gap:.6rem; margin:0; padding:0; }
  .mrd-stations li { padding:.75rem .8rem; border-radius:10px; background:#F8FAFC; }
  .mrd-station-row { display:flex; align-items:center; gap:.6rem; flex-wrap:wrap; }
  .mrd-station-icon { width:1.9rem; height:1.9rem; display:grid; place-items:center; border-radius:.55rem; background:#fff; color:#E23632; font-size:.8rem; box-shadow:0 1px 2px rgba(15,23,42,.06); }
  .mrd-station-row strong { flex:1; min-width:0; color:#0F172A; font-size:.86rem; }
  .mrd-station-time { display:inline-flex; align-items:center; gap:.35rem; color:#64748B; font-size:.74rem; font-weight:650; }
  .mrd-crew { display:flex; flex-wrap:wrap; gap:.4rem; margin-top:.6rem; }
  .mrd-crew-chip { display:inline-flex; align-items:center; gap:.4rem; padding:.22rem .55rem .22rem .22rem; border:1px solid #E2E8F0; border-radius:999px; background:#fff; color:#334155; font-size:.74rem; font-weight:700; }
  .mrd-crew-chip em { font-style:normal; color:#B45309; font-weight:750; }
  .mrd-crew-chip.is-on-scene em { color:#047857; }
  .mrd-avatar { width:1.45rem; height:1.45rem; display:grid; place-items:center; border-radius:50%; background:#FEF3C7; color:#92400E; font-size:.6rem; font-weight:850; }
  .mrd-crew-chip.is-on-scene .mrd-avatar { background:#D1FAE5; color:#047857; }

  .mrd-timeline { list-style:none; margin:0; padding:0; }
  .mrd-timeline li { position:relative; display:flex; gap:.75rem; padding-bottom:.9rem; }
  .mrd-timeline li:last-child { padding-bottom:0; }
  .mrd-timeline li::before { content:''; position:absolute; left:.95rem; top:2rem; bottom:.1rem; width:2px; background:#E2E8F0; }
  .mrd-timeline li:last-child::before { display:none; }
  .mrd-tl-dot { position:relative; z-index:1; flex:none; width:1.95rem; height:1.95rem; display:grid; place-items:center; border-radius:50%; background:#F1F5F9; color:#64748B; font-size:.74rem; }
  .mrd-timeline li.is-latest .mrd-tl-dot { background:#E23632; color:#fff; box-shadow:0 0 0 4px rgba(226,54,50,.14); }
  .mrd-tl-body { flex:1; min-width:0; padding-top:.3rem; }
  .mrd-tl-head { display:flex; align-items:baseline; justify-content:space-between; gap:.75rem; flex-wrap:wrap; }
  .mrd-tl-head strong { color:#0F172A; font-size:.84rem; }
  .mrd-tl-head time { color:#64748B; font-size:.74rem; font-weight:600; font-variant-numeric:tabular-nums; }
  .mrd-tl-body p { margin:.2rem 0 0; color:#475569; font-size:.8rem; line-height:1.45; }

  .mrd-photos { display:grid; grid-template-columns:repeat(auto-fill,minmax(110px,1fr)); gap:.5rem; }
  .mrd-photos button { position:relative; aspect-ratio:1; padding:0; overflow:hidden; border:1px solid #E2E8F0; border-radius:10px; background:#0F172A; cursor:pointer; transition:transform .15s ease, box-shadow .15s ease; }
  .mrd-photos button:hover { transform:translateY(-2px); box-shadow:0 6px 14px rgba(15,23,42,.15); }
  .mrd-photos img { width:100%; height:100%; object-fit:cover; display:block; }
  .mrd-photos button span { position:absolute; right:.35rem; bottom:.35rem; width:1.5rem; height:1.5rem; display:grid; place-items:center; border-radius:50%; background:rgba(15,23,42,.72); color:#fff; font-size:.62rem; }

  .mrd-foot { display:flex; align-items:center; justify-content:space-between; gap:.75rem; padding:.85rem 1.35rem; border-top:1px solid #E2E8F0; background:#fff; }
  .mrd-foot-left { display:flex; align-items:center; gap:.6rem; flex-wrap:wrap; min-width:0; }
  .mrd-foot-error { color:#B91C1C; font-size:.76rem; font-weight:650; }
  .mrd-btn { display:inline-flex; align-items:center; gap:.45rem; padding:.55rem 1.1rem; border:1px solid #CBD5E1; border-radius:10px; background:#fff; color:#334155; font:inherit; font-size:.82rem; font-weight:700; cursor:pointer; transition:background-color .15s ease, border-color .15s ease; }
  .mrd-btn:hover { background:#F8FAFC; border-color:#94A3B8; }
  .mrd-btn-pdf { border-color:#E23632; background:#E23632; color:#fff; box-shadow:0 4px 10px rgba(226,54,50,.22); }
  .mrd-btn-pdf:hover { background:#C81E1E; border-color:#C81E1E; }
  .mrd-btn:disabled { cursor:progress; opacity:.75; }
  .mrd-btn:focus-visible, .mrd-close:focus-visible, .mrd-photos button:focus-visible, .mrd-tel:focus-visible { outline:3px solid rgba(226,54,50,.35); outline-offset:2px; }

  .mrd-lightbox { position:fixed; inset:0; z-index:10000; display:flex; align-items:center; justify-content:center; padding:1.5rem; background:rgba(0,0,0,.9); }
  .mrd-lightbox-inner { position:relative; max-width:90vw; max-height:90vh; }
  .mrd-lightbox-inner img { max-width:100%; max-height:90vh; border-radius:10px; object-fit:contain; }
  .mrd-lightbox-inner button { position:absolute; top:-12px; right:-12px; width:2rem; height:2rem; display:grid; place-items:center; border:0; border-radius:50%; background:#DC2626; color:#fff; cursor:pointer; }

  @media (max-width:640px) {
    .mrd-overlay { padding:0; align-items:stretch; }
    .mrd-panel { max-height:none; border-radius:0; }
    .mrd-head, .mrd-body, .mrd-foot { padding-inline:1rem; }
    .mrd-times { gap:.45rem; }
    .mrd-time { flex-direction:column; gap:.45rem; padding:.65rem .6rem; }
    .mrd-time-icon { width:1.8rem; height:1.8rem; font-size:.75rem; }
    .mrd-time-label { font-size:.58rem; }
    .mrd-time strong { font-size:.92rem; }
    .mrd-time.is-empty strong { font-size:.78rem; }
    .mrd-time small { font-size:.62rem; }
  }
`;
