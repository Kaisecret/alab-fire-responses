"use client";

import { useCallback, useEffect, useState } from "react";

import {
  getCachedPhotoOrOriginal,
  preloadPhotos,
  useCachedPhoto,
} from "../_lib/local-photo-cache";
import { PhotoLightbox } from "./photo-lightbox";
import { ProvincialReportDetail } from "./provincial-report-detail";


interface BackupRequest {
  id: string;
  fireReportId: string;
  referenceNumber: string;
  municipalityName: string;
  barangay: string | null;
  requestedByName: string;
  reason: string | null;
  requestedFiretrucks: number;
  requestedPersonnel: number;
  forwardedAt: string | null;
  forwardedAutomatically: boolean;
  provincialAcknowledgedAt: string | null;
  alarmLevel: number | null;
  photos: string[];
}

const POLL_INTERVAL_MS = 10_000;
/*
 * Only the second through the fourth are the province's to declare. The first
 * is the municipality's own response to its own report, and the fifth is
 * Region VI's, which this system does not reach.
 */
const DECLARABLE_LEVELS: Array<{ level: number; label: string; summons: string }> = [
  { level: 2, label: "2nd", summons: "The 2 municipalities nearest the fire" },
  { level: 3, label: "3rd", summons: "Every municipality within 35 km" },
  { level: 4, label: "4th", summons: "Every municipality in Antique" },
];

const ORDINALS: Record<number, string> = {
  1: "1st",
  2: "2nd",
  3: "3rd",
  4: "4th",
  5: "5th",
};

const styles = `
  .pap-wrap {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
    gap: 0.85rem;
    align-items: stretch;
  }
  @media (max-width: 768px) {
    .pap-wrap { grid-template-columns: 1fr; }
  }

  /* Professional BFP Command-Center Incident Card */
  .pap-card {
    position: relative;
    background: #FFFFFF;
    border: 1px solid #E2E8F0;
    border-radius: 14px;
    padding: 1rem 1.15rem;
    box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04), 0 4px 12px rgba(15, 23, 42, 0.02);
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    gap: 0.75rem;
    overflow: hidden;
    transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
  }
  .pap-card:hover {
    transform: translateY(-2px);
    border-color: #CBD5E1;
    box-shadow: 0 8px 24px -4px rgba(15, 23, 42, 0.08);
  }

  /* Ensure no yellow bar */
  .pap-card::before {
    display: none;
    content: '';
  }
  .pap-card.level-2::before { display: none; }
  .pap-card.level-3::before { display: none; }
  .pap-card.level-4::before { display: none; }

  .pap-top {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 0.75rem;
    flex-wrap: wrap;
  }
  /* The identity block is the card's handle: it holds what an officer reads
     first, so it is what they press to read the rest. Stripped back from the
     button defaults and given its own affordance instead. */
  .pap-identity {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    min-width: 0;
    flex: 1 1 auto;
    appearance: none;
    border: 0;
    background: transparent;
    padding: 0.3rem;
    margin: -0.3rem;
    border-radius: 10px;
    font: inherit;
    text-align: left;
    color: inherit;
    cursor: pointer;
    transition: background 0.15s ease;
  }
  .pap-identity:hover { background: rgba(15, 23, 42, 0.035); }
  .pap-identity:focus-visible { outline: 2px solid #DC2626; outline-offset: 2px; }
  .pap-open-hint {
    align-self: center;
    margin-left: auto;
    font-size: 0.72rem;
    color: #CBD5E1;
    flex-shrink: 0;
    transition: color 0.15s ease, transform 0.15s ease;
  }
  .pap-identity:hover .pap-open-hint { color: #DC2626; transform: translate(1px, -1px); }

  @media (prefers-reduced-motion: reduce) {
    .pap-identity:hover .pap-open-hint { transform: none; }
  }
  .pap-crest {
    width: 36px;
    height: 36px;
    border-radius: 10px;
    display: grid;
    place-items: center;
    flex-shrink: 0;
    background: #FEF2F2;
    color: #DC2626;
    font-size: 0.95rem;
    border: 1px solid #FECACA;
    box-shadow: 0 2px 6px rgba(220, 38, 38, 0.08);
  }
  .pap-ref {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 0.86rem;
    font-weight: 850;
    color: #0F172A;
    letter-spacing: -0.01em;
    line-height: 1.2;
  }
  .pap-where {
    font-size: 0.8rem;
    font-weight: 750;
    color: #1E293B;
    margin-top: 1px;
    display: flex;
    align-items: center;
    gap: 0.32rem;
  }
  .pap-who {
    font-size: 0.72rem;
    color: #64748B;
    margin-top: 2px;
    font-weight: 500;
  }

  .pap-asks {
    display: flex;
    gap: 0.35rem;
    flex-wrap: wrap;
    margin-top: 0.45rem;
  }
  .pap-ask {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.2rem 0.5rem;
    border-radius: 6px;
    background: #F8FAFC;
    border: 1px solid #E2E8F0;
    font-size: 0.7rem;
    font-weight: 750;
    color: #334155;
  }
  .pap-ask i { font-size: 0.68rem; color: #64748B; }

  .pap-badges {
    display: flex;
    gap: 0.4rem;
    flex-wrap: wrap;
    align-items: center;
    justify-content: flex-end;
    flex-shrink: 0;
  }
  .pap-auto {
    display: inline-flex;
    align-items: center;
    gap: 0.32rem;
    font-size: 0.66rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    padding: 0.24rem 0.6rem;
    border-radius: 999px;
    background: #FFF7ED;
    border: 1px solid #FED7AA;
    color: #C2410C;
    white-space: nowrap;
  }

  /* Emergency status badge - Restrained BFP aesthetic */
  .pap-current {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    font-size: 0.7rem;
    font-weight: 800;
    padding: 0.26rem 0.65rem;
    border-radius: 999px;
    border: 1px solid;
    white-space: nowrap;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
  }
  .pap-current.level-2 {
    background: #FEF2F2;
    border-color: #FECACA;
    color: #DC2626;
  }
  .pap-current.level-3 {
    background: #FFF7ED;
    border-color: #FED7AA;
    color: #C2410C;
  }
  .pap-current.level-4 {
    background: #7F1D1D;
    border-color: #991B1B;
    color: #FFFFFF;
  }

  /* Upper-right standing badge requested in emerald highlight with pulsing dot */
  .pap-upper-standing {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    font-size: 0.68rem;
    font-weight: 850;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: #065F46;
    background: #ECFDF5;
    border: 1.5px solid #10B981;
    padding: 0.22rem 0.62rem;
    border-radius: 999px;
    box-shadow: 0 1px 3px rgba(16, 185, 129, 0.15);
    white-space: nowrap;
  }
  .pap-standing-pulse {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #10B981;
    display: inline-block;
    box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7);
    animation: papPulse 1.8s infinite;
  }
  @keyframes papPulse {
    0% {
      transform: scale(0.95);
      box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7);
    }
    70% {
      transform: scale(1);
      box-shadow: 0 0 0 5px rgba(16, 185, 129, 0);
    }
    100% {
      transform: scale(0.95);
      box-shadow: 0 0 0 0 rgba(16, 185, 129, 0);
    }
  }

  .pap-level-standing-check {
    color: #10B981;
    font-size: 0.78rem;
    flex-shrink: 0;
  }


  .pap-reason {
    margin-top: 0.45rem;
    border-left: 3px solid #DC2626;
    background: #F8FAFC;
    border-top: 1px solid #E2E8F0;
    border-right: 1px solid #E2E8F0;
    border-bottom: 1px solid #E2E8F0;
    border-radius: 8px;
    padding: 0.45rem 0.7rem;
    font-size: 0.74rem;
    color: #334155;
    line-height: 1.45;
  }

  .pap-photos-head {
    display: flex;
    align-items: center;
    gap: 0.32rem;
    font-size: 0.66rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #475569;
    margin: 0.5rem 0 0.35rem;
  }
  .pap-photos {
    display: flex;
    gap: 0.45rem;
    flex-wrap: wrap;
  }
  .pap-photo {
    position: relative;
    width: 48px;
    height: 48px;
    border-radius: 8px;
    overflow: hidden;
    border: 1px solid #CBD5E1;
    background: #F1F5F9;
    padding: 0;
    cursor: zoom-in;
    transition: transform 0.16s ease, box-shadow 0.16s ease, border-color 0.16s ease;
  }
  .pap-photo img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .pap-photo-placeholder {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #F8FAFC;
    color: #94A3B8;
    font-size: 1rem;
  }
  .pap-photo::after {
    content: '\\f00e';
    font-family: 'Font Awesome 6 Free';
    font-weight: 900;
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    color: #FFFFFF;
    background: rgba(15, 23, 42, 0.45);
    opacity: 0;
    font-size: 0.75rem;
    transition: opacity 0.16s ease;
  }
  .pap-photo:hover { transform: translateY(-1.5px); border-color: #94A3B8; box-shadow: 0 4px 12px rgba(15,23,42,0.12); }
  .pap-photo:hover::after, .pap-photo:focus-visible::after { opacity: 1; }
  .pap-photo:focus-visible { outline: 2px solid #0F172A; outline-offset: 2px; }

  .pap-declare {
    margin-top: 0.55rem;
    padding-top: 0.65rem;
    border-top: 1px solid #F1F5F9;
  }
  .pap-label {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 0.68rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #475569;
    margin-bottom: 0.45rem;
  }

  /* Clear Step-based Escalation Component */
  .pap-levels {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.55rem;
  }
  @media (max-width: 600px) {
    .pap-levels { grid-template-columns: 1fr; }
  }

  .pap-level {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.35rem;
    width: 100%;
    text-align: left;
    padding: 0.72rem 0.85rem;
    border-radius: 10px;
    border: 1.5px solid #E2E8F0;
    background: #FFFFFF;
    color: #1E293B;
    cursor: pointer;
    transition: all 0.18s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
    box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);
  }
  .pap-level-top-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    gap: 0.4rem;
  }
  .pap-level-ord {
    font-size: 0.82rem;
    font-weight: 850;
    color: #0F172A;
    letter-spacing: -0.01em;
    white-space: nowrap;
  }
  .pap-level-go {
    font-size: 0.72rem;
    color: #94A3B8;
    flex-shrink: 0;
    transition: transform 0.15s ease, color 0.15s ease;
  }
  .pap-level-check-current {
    font-size: 0.95rem;
    color: #059669;
    flex-shrink: 0;
  }
  .pap-level-check-passed {
    font-size: 0.82rem;
    color: #94A3B8;
    flex-shrink: 0;
  }

  /* Standing level immediately visible with emerald highlight */
  .pap-level.standing {
    background: linear-gradient(145deg, #ECFDF5 0%, #D1FAE5 100%) !important;
    border: 1.5px solid #10B981 !important;
    box-shadow: 0 2px 10px rgba(16, 185, 129, 0.18) !important;
    cursor: default;
    opacity: 1 !important;
  }
  .pap-level.standing .pap-level-ord {
    color: #065F46 !important;
    font-weight: 850;
  }

  /* Passed / superseded alarm level */
  .pap-level.passed {
    background: #F8FAFC !important;
    border: 1.5px solid #E2E8F0 !important;
    cursor: default;
    opacity: 1 !important;
  }
  .pap-level.passed .pap-level-ord {
    color: #64748B !important;
    font-weight: 750;
  }

  /* Future escalation options hover state */
  .pap-level:hover:not(:disabled) {
    border-color: #DC2626;
    background: #FFF7F7;
    box-shadow: 0 4px 14px rgba(220, 38, 38, 0.14);
    transform: translateY(-2px);
  }
  .pap-level:hover:not(:disabled) .pap-level-ord { color: #DC2626; }
  .pap-level:hover:not(:disabled) .pap-level-go { color: #DC2626; transform: translateX(2px); }

  .pap-level:disabled {
    cursor: default;
  }
  .pap-level:disabled:not(.standing):not(.passed) {
    opacity: 0.65;
    background: #F8FAFC;
    border-color: #E2E8F0;
  }
  .pap-level:disabled .pap-level-go { visibility: hidden; }
  .pap-level:focus-visible { outline: 2px solid #0F172A; outline-offset: 2px; }

  /* Premium High-Contrast DECLARED Status Badge */
  .pap-level-done {
    display: inline-flex;
    align-items: center;
    gap: 0.32rem;
    font-size: 0.66rem;
    font-weight: 850;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: #FFFFFF;
    background: #10B981;
    border: 1px solid #059669;
    padding: 0.22rem 0.58rem;
    border-radius: 6px;
    box-shadow: 0 1px 4px rgba(16, 185, 129, 0.32);
    flex-shrink: 0;
  }
  .pap-level-done.is-passed {
    color: #475569;
    background: #F1F5F9;
    border: 1px solid #CBD5E1;
    box-shadow: none;
    font-weight: 800;
  }
  .pap-level-done i {
    font-size: 0.68rem;
  }

  @media (prefers-reduced-motion: reduce) {
    .pap-level:hover:not(:disabled) { transform: none; }
  }
  .pap-err {
    display: flex;
    align-items: flex-start;
    gap: 0.4rem;
    margin-top: 0.45rem;
    padding: 0.45rem 0.65rem;
    border-radius: 8px;
    background: #FEF2F2;
    border: 1px solid #FECACA;
    font-size: 0.72rem;
    color: #B91C1C;
    font-weight: 600;
    line-height: 1.4;
  }
  .pap-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.4rem;
    padding: 2.5rem 1.5rem;
    text-align: center;
    color: #64748B;
    font-size: 0.82rem;
    background: #FFFFFF;
    border: 1px dashed #CBD5E1;
    border-radius: 14px;
  }
  .pap-empty-icon {
    display: grid;
    place-items: center;
    width: 44px;
    height: 44px;
    border-radius: 50%;
    background: #F1F5F9;
    color: #94A3B8;
    font-size: 1.15rem;
    margin-bottom: 0.2rem;
  }
  .pap-empty strong { display: block; color: #0F172A; font-size: 0.9rem; }
`;

const STORAGE_CACHE_KEY = "alab_provincial_backup_requests_cache";

/**
 * Thumbnail rendering with persistent local caching to prevent reloading or flickering on refresh.
 */
function ScenePhotoThumbnail({
  photo,
  index,
  onClick,
}: {
  photo: string;
  index: number;
  onClick: () => void;
}) {
  const cachedUrl = useCachedPhoto(photo);
  const [failed, setFailed] = useState(false);

  return (
    <button
      type="button"
      className="pap-photo"
      onClick={onClick}
      title="View photo"
    >
      {cachedUrl && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={cachedUrl}
          alt={`Scene photograph ${index + 1} from responder`}
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
        />
      ) : null}
      <div className="pap-photo-placeholder">
        <i className="fa-solid fa-camera" />
      </div>
    </button>
  );
}

/**
 * Backup requests that have reached the province, and the alarm level it can
 * declare on each. The level is what summons further municipalities, so it is
 * the province's decision alone.
 */
export function ProvincialAlarmPanel() {
  const [requests, setRequests] = useState<BackupRequest[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = localStorage.getItem(STORAGE_CACHE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          preloadPhotos(parsed.flatMap((r: BackupRequest) => r.photos || []));
          return parsed;
        }
      }
    } catch {
      // Ignore parse failure and fetch from network
    }
    return [];
  });
  const [loading, setLoading] = useState(() => requests.length === 0);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [viewer, setViewer] = useState<{ requestId: string; index: number } | null>(null);
  /** The incident whose full report is open, if any. */
  const [openReportId, setOpenReportId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/provincial-bfp/backup-requests", { cache: "no-store" });
      if (!res.ok) return;
      const body = await res.json();
      const fresh: BackupRequest[] = Array.isArray(body.backupRequests) ? body.backupRequests : [];
      setRequests(fresh);
      try {
        localStorage.setItem(STORAGE_CACHE_KEY, JSON.stringify(fresh));
      } catch {
        // Quota exceeded or disabled
      }
      preloadPhotos(fresh.flatMap((r) => r.photos || []));
    } catch {
      // Keep whatever is already on screen or in local cache.
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Deferred so the first load does not set state during the effect body.
    const initial = window.setTimeout(() => void load(), 0);
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, POLL_INTERVAL_MS);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(timer);
    };
  }, [load]);

  const declare = useCallback(async (request: BackupRequest, alarmLevel: number) => {
    setBusyId(request.id);
    setError(null);
    try {
      const res = await fetch("/api/provincial-bfp/backup-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fireReportId: request.fireReportId,
          backupRequestId: request.id,
          alarmLevel,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Unable to declare that alarm level.");
      }
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Something went wrong.");
    } finally {
      setBusyId(null);
    }
  }, [load]);

  if (loading) return null;

  return (
    <>
      <style>{styles}</style>
      <div className="pap-wrap">
        {requests.length === 0 && (
          <div className="pap-empty">
            <span className="pap-empty-icon" aria-hidden="true">
              <i className="fa-solid fa-tower-broadcast" />
            </span>
            <strong>Nothing has been escalated</strong>
            <span>A backup request appears here when a municipality cannot absorb it alone.</span>
          </div>
        )}

        {requests.map((request) => (
          <div className={`pap-card${request.alarmLevel ? ` level-${request.alarmLevel}` : ""}`} key={request.id}>
            <div>
              <div className="pap-top">
                {/* The identity block is what an officer reads first, so it is
                    what they press to read the rest of the report. */}
                <button
                  type="button"
                  className="pap-identity"
                  onClick={() => setOpenReportId(request.fireReportId)}
                  aria-label={`Open the full report for ${request.referenceNumber}`}
                >
                  <span className="pap-crest" aria-hidden="true">
                    <i className="fa-solid fa-fire" />
                  </span>
                  <div style={{ minWidth: 0 }}>
                    <div className="pap-ref">{request.referenceNumber}</div>
                    <div className="pap-where">
                      <i className="fa-solid fa-location-dot" style={{ color: '#DC2626', fontSize: '0.78rem' }} />
                      {request.municipalityName}
                      {request.barangay ? ` · ${request.barangay}` : ""}
                    </div>
                    <div className="pap-who">
                      <i className="fa-solid fa-user-shield" style={{ marginRight: '0.25rem', color: '#94A3B8' }} />
                      Requested by {request.requestedByName}
                    </div>
                    {(request.requestedFiretrucks > 0 || request.requestedPersonnel > 0) && (
                      <div className="pap-asks">
                        {request.requestedFiretrucks > 0 && (
                          <span className="pap-ask">
                            <i className="fa-solid fa-truck-fast" />
                            {request.requestedFiretrucks} firetruck{request.requestedFiretrucks > 1 ? "s" : ""}
                          </span>
                        )}
                        {request.requestedPersonnel > 0 && (
                          <span className="pap-ask">
                            <i className="fa-solid fa-user-shield" />
                            {request.requestedPersonnel} personnel
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <span className="pap-open-hint" aria-hidden="true">
                    <i className="fa-solid fa-arrow-up-right-from-square" />
                  </span>
                </button>
                <div className="pap-badges">
                  {request.alarmLevel && (
                    <span className="pap-upper-standing" title={`Current standing alarm: ${ORDINALS[request.alarmLevel]} Alarm`}>
                      <span className="pap-standing-pulse" aria-hidden="true" />
                      STANDING
                    </span>
                  )}
                  {request.forwardedAutomatically && (
                    <span className="pap-auto">
                      <i className="fa-regular fa-clock" /> Auto-escalated
                    </span>
                  )}
                </div>
              </div>

              {request.reason && <div className="pap-reason">{request.reason}</div>}

              {request.photos?.length > 0 && (
                <div>
                  <div className="pap-photos-head">
                    <i className="fa-solid fa-camera" />
                    From the scene ({request.photos.length})
                  </div>
                  <div className="pap-photos">
                    {request.photos.map((photo, index) => (
                      <ScenePhotoThumbnail
                        key={photo || index}
                        photo={photo}
                        index={index}
                        onClick={() => setViewer({ requestId: request.id, index })}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="pap-declare">
              <div className="pap-label">
                <span>{request.alarmLevel ? "Raise Alarm Level" : "Declare Alarm Level"}</span>
                <span style={{ fontSize: "0.62rem", color: "#94A3B8", fontWeight: 600, textTransform: "none" }}>
                  Summons jurisdiction reinforcements
                </span>
              </div>
              <div className="pap-levels">
                {DECLARABLE_LEVELS.map((entry) => {
                  const currentAlarm = Number(request.alarmLevel ?? 0);
                  const isCurrent = entry.level === currentAlarm;
                  const isPassed = entry.level < currentAlarm;
                  const passed = entry.level <= currentAlarm;
                  const isBusy = busyId === request.id;

                  return (
                    <button
                      key={entry.level}
                      type="button"
                      className={`pap-level ${isCurrent ? "standing" : isPassed ? "passed" : ""}`}
                      disabled={isBusy || passed}
                      onClick={() => void declare(request, entry.level)}
                      title={entry.summons}
                    >
                      <div className="pap-level-top-row">
                        <span className="pap-level-ord">{entry.label} Alarm</span>
                        {isCurrent ? (
                          <i className="fa-solid fa-circle-check pap-level-check-current" aria-hidden="true" />
                        ) : isPassed ? (
                          <i className="fa-solid fa-check pap-level-check-passed" aria-hidden="true" />
                        ) : isBusy ? (
                          <i className="fa-solid fa-circle-notch fa-spin pap-level-go" aria-hidden="true" />
                        ) : (
                          <i className="fa-solid fa-arrow-right pap-level-go" aria-hidden="true" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
              {error && busyId === null && (
                <div className="pap-err" role="alert">
                  <i className="fa-solid fa-circle-exclamation" style={{ marginTop: "1px" }} />
                  <span>{error}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {openReportId && (
        <ProvincialReportDetail
          reportId={openReportId}
          onClose={() => setOpenReportId(null)}
        />
      )}

      {viewer && (() => {
        const request = requests.find((item) => item.id === viewer.requestId);
        if (!request?.photos?.length) return null;
        const cachedPhotos = request.photos.map(getCachedPhotoOrOriginal);
        return (
          <PhotoLightbox
            photos={cachedPhotos}
            index={viewer.index}
            onIndexChange={(index) => setViewer({ requestId: viewer.requestId, index })}
            onClose={() => setViewer(null)}
            caption={`${request.referenceNumber} · ${request.municipalityName}`}
          />
        );
      })()}
    </>
  );
}
