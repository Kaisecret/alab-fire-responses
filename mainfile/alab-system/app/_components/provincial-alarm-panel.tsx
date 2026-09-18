"use client";

import { useCallback, useEffect, useState } from "react";

import { PhotoLightbox } from "./photo-lightbox";

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
  { level: 2, label: "2nd", summons: "The municipality nearest the fire" },
  { level: 3, label: "3rd", summons: "Every municipality within 25 km" },
  { level: 4, label: "4th", summons: "Every municipality in the province" },
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
    grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
    gap: 0.75rem;
    align-items: stretch;
  }
  @media (max-width: 768px) {
    .pap-wrap { grid-template-columns: 1fr; }
  }

  /* Ultra-sleek Frosted Glassmorphism Tactical Card */
  .pap-card {
    position: relative;
    background: rgba(255, 255, 255, 0.75);
    backdrop-filter: blur(20px) saturate(180%);
    -webkit-backdrop-filter: blur(20px) saturate(180%);
    border: 1px solid rgba(255, 255, 255, 0.9);
    border-radius: 16px;
    padding: 0.85rem 1.05rem;
    box-shadow:
      0 10px 30px 0 rgba(15, 23, 42, 0.05),
      0 1px 3px 0 rgba(15, 23, 42, 0.03),
      inset 0 1px 1px 0 rgba(255, 255, 255, 0.95);
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    gap: 0.65rem;
    overflow: hidden;
    transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.2s ease;
  }
  .pap-card:hover {
    transform: translateY(-2px);
    border-color: rgba(255, 255, 255, 1);
    box-shadow:
      0 14px 36px -4px rgba(15, 23, 42, 0.09),
      0 2px 6px 0 rgba(15, 23, 42, 0.04),
      inset 0 1px 1px 0 rgba(255, 255, 255, 1);
  }

  /* Completely remove the yellow bar on the left */
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
    gap: 0.65rem;
    flex-wrap: wrap;
  }
  .pap-identity {
    display: flex;
    align-items: flex-start;
    gap: 0.65rem;
    min-width: 0;
  }
  .pap-crest {
    width: 32px;
    height: 32px;
    border-radius: 9px;
    display: grid;
    place-items: center;
    flex-shrink: 0;
    background: linear-gradient(135deg, rgba(254, 242, 242, 0.95) 0%, rgba(254, 226, 226, 0.8) 100%);
    color: #DC2626;
    font-size: 0.88rem;
    border: 1px solid rgba(254, 202, 202, 0.85);
    box-shadow: 0 2px 8px rgba(220, 38, 38, 0.12);
  }
  .pap-ref {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 0.8rem;
    font-weight: 850;
    color: #0F172A;
    letter-spacing: -0.01em;
    line-height: 1.2;
  }
  .pap-where {
    font-size: 0.76rem;
    font-weight: 750;
    color: #1E293B;
    margin-top: 1px;
    display: flex;
    align-items: center;
    gap: 0.3rem;
  }
  .pap-who {
    font-size: 0.68rem;
    color: #64748B;
    margin-top: 1px;
    font-weight: 500;
  }

  .pap-asks {
    display: flex;
    gap: 0.35rem;
    flex-wrap: wrap;
    margin-top: 0.35rem;
  }
  .pap-ask {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    padding: 0.16rem 0.45rem;
    border-radius: 6px;
    background: rgba(241, 245, 249, 0.7);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    border: 1px solid rgba(226, 232, 240, 0.75);
    font-size: 0.66rem;
    font-weight: 700;
    color: #334155;
  }
  .pap-ask i { font-size: 0.65rem; color: #64748B; }

  .pap-badges {
    display: flex;
    gap: 0.35rem;
    flex-wrap: wrap;
    align-items: center;
    justify-content: flex-end;
    flex-shrink: 0;
  }
  .pap-auto {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    font-size: 0.64rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    padding: 0.22rem 0.55rem;
    border-radius: 999px;
    background: rgba(255, 247, 237, 0.85);
    border: 1px solid rgba(254, 215, 170, 0.8);
    color: #C2410C;
    white-space: nowrap;
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
  }

  /* Glassmorphism alarm status badge - NO YELLOW */
  .pap-current {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    font-size: 0.68rem;
    font-weight: 800;
    padding: 0.24rem 0.65rem;
    border-radius: 999px;
    border: 1px solid;
    white-space: nowrap;
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.03);
  }
  .pap-current.level-2 {
    background: rgba(239, 68, 68, 0.07);
    border-color: rgba(239, 68, 68, 0.22);
    color: #DC2626;
  }
  .pap-current.level-3 {
    background: rgba(234, 88, 12, 0.08);
    border-color: rgba(234, 88, 12, 0.26);
    color: #C2410C;
  }
  .pap-current.level-4 {
    background: rgba(220, 38, 38, 0.12);
    border-color: rgba(220, 38, 38, 0.32);
    color: #991B1B;
  }

  .pap-reason {
    margin-top: 0.35rem;
    border-left: 2.5px solid #94A3B8;
    background: rgba(248, 250, 252, 0.65);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    border-top: 1px solid rgba(226, 232, 240, 0.6);
    border-right: 1px solid rgba(226, 232, 240, 0.6);
    border-bottom: 1px solid rgba(226, 232, 240, 0.6);
    border-radius: 8px;
    padding: 0.45rem 0.65rem;
    font-size: 0.72rem;
    color: #334155;
    line-height: 1.4;
  }

  .pap-photos-head {
    display: flex;
    align-items: center;
    gap: 0.3rem;
    font-size: 0.62rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: #64748B;
    margin: 0.45rem 0 0.3rem;
  }
  .pap-photos {
    display: flex;
    gap: 0.4rem;
    flex-wrap: wrap;
  }
  .pap-photo {
    position: relative;
    width: 46px;
    height: 46px;
    border-radius: 8px;
    overflow: hidden;
    border: 1px solid rgba(255, 255, 255, 0.9);
    background: rgba(241, 245, 249, 0.6);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    box-shadow: 0 2px 6px rgba(15, 23, 42, 0.04);
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
    background: rgba(248, 250, 252, 0.7);
    color: #94A3B8;
    font-size: 0.95rem;
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
  .pap-photo:hover { transform: translateY(-1.5px); border-color: rgba(255, 255, 255, 1); box-shadow: 0 4px 12px rgba(15,23,42,0.12); }
  .pap-photo:hover::after, .pap-photo:focus-visible::after { opacity: 1; }
  .pap-photo:focus-visible { outline: 2px solid #0F172A; outline-offset: 2px; }

  .pap-declare {
    margin-top: 0.45rem;
    padding-top: 0.55rem;
    border-top: 1px solid rgba(226, 232, 240, 0.6);
  }
  .pap-label {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 0.65rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: #64748B;
    margin-bottom: 0.4rem;
  }

  /* 3-column glassmorphism tactical ladder */
  .pap-levels {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.45rem;
  }
  @media (max-width: 600px) {
    .pap-levels { grid-template-columns: 1fr; }
  }

  .pap-level {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    gap: 0.35rem;
    width: 100%;
    text-align: left;
    padding: 0.5rem 0.65rem;
    border-radius: 10px;
    border: 1px solid rgba(226, 232, 240, 0.85);
    background: rgba(255, 255, 255, 0.55);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    color: #334155;
    cursor: pointer;
    transition: all 0.16s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
    box-shadow: 0 1px 3px rgba(15, 23, 42, 0.02), inset 0 1px 1px rgba(255, 255, 255, 0.85);
  }
  .pap-level-top-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    gap: 0.3rem;
  }
  .pap-level-ord {
    font-size: 0.74rem;
    font-weight: 850;
    color: #0F172A;
    letter-spacing: -0.01em;
  }
  .pap-level-who {
    font-size: 0.66rem;
    font-weight: 550;
    color: #64748B;
    line-height: 1.3;
  }
  .pap-level-go {
    font-size: 0.66rem;
    color: #94A3B8;
    flex-shrink: 0;
    transition: transform 0.15s ease, color 0.15s ease;
  }

  /* Frosted Mint/Emerald Glass for Standing - ZERO YELLOW */
  .pap-level.standing {
    background: rgba(236, 253, 245, 0.65);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border: 1px solid rgba(52, 211, 153, 0.45);
    box-shadow: 0 4px 14px rgba(16, 185, 129, 0.08), inset 0 1px 1px rgba(255, 255, 255, 0.95);
  }
  .pap-level.standing .pap-level-ord {
    color: #065F46;
  }
  .pap-level.standing .pap-level-who {
    color: #047857;
    font-weight: 600;
  }

  /* Actionable hover */
  .pap-level:hover:not(:disabled) {
    border-color: rgba(220, 38, 38, 0.4);
    background: rgba(255, 255, 255, 0.92);
    box-shadow: 0 4px 14px rgba(220, 38, 38, 0.12), inset 0 1px 1px rgba(255, 255, 255, 1);
    transform: translateY(-1.5px);
  }
  .pap-level:hover:not(:disabled) .pap-level-ord { color: #DC2626; }
  .pap-level:hover:not(:disabled) .pap-level-who { color: #0F172A; }
  .pap-level:hover:not(:disabled) .pap-level-go { color: #DC2626; transform: translateX(2px); }

  .pap-level:disabled {
    cursor: default;
  }
  .pap-level:disabled:not(.standing) {
    opacity: 0.6;
    background: rgba(248, 250, 252, 0.5);
    border-color: rgba(226, 232, 240, 0.6);
  }
  .pap-level:disabled .pap-level-go { visibility: hidden; }
  .pap-level:focus-visible { outline: 2px solid #0F172A; outline-offset: 2px; }

  .pap-level-done {
    font-size: 0.58rem;
    font-weight: 850;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: #047857;
    background: rgba(209, 250, 229, 0.85);
    border: 1px solid rgba(110, 231, 183, 0.85);
    padding: 0.08rem 0.4rem;
    border-radius: 999px;
    flex-shrink: 0;
    backdrop-filter: blur(6px);
    -webkit-backdrop-filter: blur(6px);
  }

  @media (prefers-reduced-motion: reduce) {
    .pap-level:hover:not(:disabled) { transform: none; }
  }
  .pap-err {
    display: flex;
    align-items: flex-start;
    gap: 0.4rem;
    margin-top: 0.45rem;
    padding: 0.45rem 0.6rem;
    border-radius: 8px;
    background: rgba(254, 242, 242, 0.85);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    border: 1px solid rgba(254, 202, 202, 0.8);
    font-size: 0.72rem;
    color: #B91C1C;
    font-weight: 600;
    line-height: 1.4;
  }
  .pap-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.35rem;
    padding: 1.8rem 1.25rem;
    text-align: center;
    color: #64748B;
    font-size: 0.8rem;
    background: rgba(255, 255, 255, 0.65);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border: 1px dashed rgba(203, 213, 225, 0.8);
    border-radius: 14px;
  }
  .pap-empty-icon {
    display: grid;
    place-items: center;
    width: 38px;
    height: 38px;
    border-radius: 50%;
    background: rgba(241, 245, 249, 0.8);
    color: #94A3B8;
    font-size: 1rem;
    margin-bottom: 0.15rem;
  }
  .pap-empty strong { display: block; color: #0F172A; font-size: 0.88rem; }
`;

/**
 * Backup requests that have reached the province, and the alarm level it can
 * declare on each. The level is what summons further municipalities, so it is
 * the province's decision alone.
 */
export function ProvincialAlarmPanel() {
  const [requests, setRequests] = useState<BackupRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [viewer, setViewer] = useState<{ requestId: string; index: number } | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/provincial-bfp/backup-requests", { cache: "no-store" });
      if (!res.ok) return;
      const body = await res.json();
      setRequests(Array.isArray(body.backupRequests) ? body.backupRequests : []);
    } catch {
      // Keep whatever is already on screen.
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
                <div className="pap-identity">
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
                </div>
                <div className="pap-badges">
                  {request.forwardedAutomatically && (
                    <span className="pap-auto">
                      <i className="fa-regular fa-clock" /> Auto-escalated
                    </span>
                  )}
                  {request.alarmLevel && (
                    <span className={`pap-current level-${request.alarmLevel}`}>
                      <i className="fa-solid fa-bell" /> {ORDINALS[request.alarmLevel]} alarm standing
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
                      <button
                        key={photo || index}
                        type="button"
                        className="pap-photo"
                        onClick={() => setViewer({ requestId: request.id, index })}
                        title="View photo"
                      >
                        {photo ? (
                          <img
                            src={photo}
                            alt={`Scene photograph ${index + 1} from responder`}
                            onError={(e) => {
                              (e.currentTarget as HTMLElement).style.display = 'none';
                            }}
                          />
                        ) : null}
                        <div className="pap-photo-placeholder">
                          <i className="fa-solid fa-camera" />
                        </div>
                      </button>
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
                  const passed = entry.level <= (request.alarmLevel ?? 0);
                  const isCurrent = entry.level === (request.alarmLevel ?? 0);
                  return (
                    <button
                      key={entry.level}
                      type="button"
                      className={`pap-level ${isCurrent ? 'standing' : ''}`}
                      disabled={busyId === request.id || passed}
                      onClick={() => void declare(request, entry.level)}
                      title={entry.summons}
                    >
                      <div className="pap-level-top-row">
                        <span className="pap-level-ord">{entry.label} Alarm</span>
                        {passed ? (
                          <span className="pap-level-done">{isCurrent ? "STANDING" : "DECLARED"}</span>
                        ) : busyId === request.id ? (
                          <i className="fa-solid fa-circle-notch fa-spin pap-level-go" />
                        ) : (
                          <i className="fa-solid fa-arrow-right pap-level-go" />
                        )}
                      </div>
                      <span className="pap-level-who">{entry.summons}</span>
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

      {viewer && (() => {
        const request = requests.find((item) => item.id === viewer.requestId);
        if (!request?.photos?.length) return null;
        return (
          <PhotoLightbox
            photos={request.photos}
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
