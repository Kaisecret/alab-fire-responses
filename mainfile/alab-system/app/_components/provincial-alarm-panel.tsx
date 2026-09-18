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
    grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
    gap: 0.85rem;
    align-items: stretch;
  }
  @media (max-width: 768px) {
    .pap-wrap { grid-template-columns: 1fr; }
  }

  /* Compact tactical escalation card */
  .pap-card {
    position: relative;
    background: #FFFFFF;
    border: 1px solid #E2E8F0;
    border-radius: 14px;
    padding: 1rem 1.2rem;
    box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);
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
    box-shadow: 0 6px 20px -4px rgba(15, 23, 42, 0.1);
  }
  .pap-card::before {
    content: '';
    position: absolute;
    inset: 0 auto 0 0;
    width: 4px;
    background: #CBD5E1;
  }
  .pap-card.level-2::before { background: linear-gradient(180deg, #F59E0B, #D97706); }
  .pap-card.level-3::before { background: linear-gradient(180deg, #F97316, #EA580C); }
  .pap-card.level-4::before { background: linear-gradient(180deg, #EF4444, #DC2626); }

  .pap-top {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 0.75rem;
    flex-wrap: wrap;
  }
  .pap-identity {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    min-width: 0;
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
  }
  .pap-ref {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 0.85rem;
    font-weight: 800;
    color: #0F172A;
    letter-spacing: -0.01em;
  }
  .pap-where {
    font-size: 0.82rem;
    font-weight: 750;
    color: #1E293B;
    margin-top: 1px;
  }
  .pap-who {
    font-size: 0.73rem;
    color: #64748B;
    margin-top: 1px;
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
    gap: 0.3rem;
    padding: 0.2rem 0.5rem;
    border-radius: 6px;
    background: #F8FAFC;
    border: 1px solid #E2E8F0;
    font-size: 0.72rem;
    font-weight: 700;
    color: #334155;
  }
  .pap-ask i { color: #64748B; font-size: 0.68rem; }

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
    font-size: 0.65rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    padding: 0.22rem 0.55rem;
    border-radius: 6px;
    background: #FFF7ED;
    border: 1px solid #FED7AA;
    color: #9A3412;
    white-space: nowrap;
  }
  .pap-current {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    font-size: 0.68rem;
    font-weight: 800;
    padding: 0.25rem 0.6rem;
    border-radius: 6px;
    border: 1px solid;
    white-space: nowrap;
  }
  .pap-current.level-2 { background: #FFFBEB; border-color: #FDE68A; color: #B45309; }
  .pap-current.level-3 { background: #FFF7ED; border-color: #FED7AA; color: #C2410C; }
  .pap-current.level-4 { background: #FEF2F2; border-color: #FECACA; color: #B91C1C; }

  .pap-reason {
    margin-top: 0.4rem;
    border-left: 3px solid #CBD5E1;
    background: #F8FAFC;
    border: 1px solid #E2E8F0;
    border-radius: 8px;
    padding: 0.5rem 0.7rem;
    font-size: 0.78rem;
    color: #334155;
    line-height: 1.45;
  }

  .pap-photos-head {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    font-size: 0.65rem;
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
    width: 62px;
    height: 62px;
    border-radius: 8px;
    overflow: hidden;
    border: 1px solid #E2E8F0;
    background: #F1F5F9;
    padding: 0;
    cursor: zoom-in;
    transition: transform 0.16s ease, box-shadow 0.16s ease, border-color 0.16s ease;
  }
  .pap-photo img { width: 100%; height: 100%; object-fit: cover; display: block; }
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
  .pap-photo:hover { transform: translateY(-1px); border-color: #CBD5E1; box-shadow: 0 4px 10px rgba(15,23,42,0.12); }
  .pap-photo:hover::after, .pap-photo:focus-visible::after { opacity: 1; }
  .pap-photo:focus-visible { outline: 2px solid #0F172A; outline-offset: 2px; }

  .pap-declare {
    margin-top: 0.5rem;
    padding-top: 0.65rem;
    border-top: 1px solid #F1F5F9;
  }
  .pap-label {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 0.66rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #64748B;
    margin-bottom: 0.45rem;
  }
  /* Horizontal compact 3-rung ladder */
  .pap-levels {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.4rem;
  }
  @media (max-width: 500px) {
    .pap-levels { grid-template-columns: 1fr; }
  }

  .pap-level {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.25rem;
    width: 100%;
    text-align: left;
    padding: 0.45rem 0.6rem;
    border-radius: 8px;
    border: 1px solid #E2E8F0;
    background: #FFFFFF;
    color: #334155;
    cursor: pointer;
    transition: border-color 0.15s ease, background 0.15s ease, transform 0.15s ease, box-shadow 0.15s ease;
    position: relative;
  }
  .pap-level-top-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    gap: 0.35rem;
  }
  .pap-level-ord {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0.1rem 0.35rem;
    border-radius: 5px;
    background: #F1F5F9;
    color: #334155;
    font-size: 0.68rem;
    font-weight: 800;
    line-height: 1.2;
    transition: background 0.15s ease, color 0.15s ease;
  }
  .pap-level-who {
    font-size: 0.69rem;
    font-weight: 600;
    color: #64748B;
    line-height: 1.25;
    white-space: normal;
    overflow: hidden;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
  }
  .pap-level-go {
    font-size: 0.65rem;
    color: #94A3B8;
    flex-shrink: 0;
    transition: color 0.15s ease, transform 0.15s ease;
  }
  .pap-level:hover:not(:disabled) {
    border-color: #DC2626;
    background: #FFFDFD;
    box-shadow: 0 2px 8px rgba(220, 38, 38, 0.12);
    transform: translateY(-1px);
  }
  .pap-level:hover:not(:disabled) .pap-level-ord { background: #FEE2E2; color: #B91C1C; }
  .pap-level:hover:not(:disabled) .pap-level-who { color: #0F172A; }
  .pap-level:hover:not(:disabled) .pap-level-go { color: #DC2626; transform: translateX(2px); }

  .pap-level:disabled {
    opacity: 0.7;
    cursor: default;
    background: #F8FAFC;
    border-color: #E2E8F0;
  }
  .pap-level:disabled .pap-level-go { visibility: hidden; }
  .pap-level:focus-visible { outline: 2px solid #0F172A; outline-offset: 2px; }
  .pap-level-done {
    font-size: 0.62rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: #059669;
    background: #ECFDF5;
    border: 1px solid #A7F3D0;
    padding: 0.08rem 0.35rem;
    border-radius: 4px;
    flex-shrink: 0;
  }

  @media (prefers-reduced-motion: reduce) {
    .pap-level:hover:not(:disabled) { transform: none; }
  }
  .pap-err {
    display: flex;
    align-items: flex-start;
    gap: 0.45rem;
    margin-top: 0.5rem;
    padding: 0.5rem 0.65rem;
    border-radius: 8px;
    background: #FEF2F2;
    border: 1px solid #FECACA;
    font-size: 0.74rem;
    color: #B91C1C;
    font-weight: 600;
    line-height: 1.4;
  }
  .pap-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.4rem;
    padding: 2.2rem 1.25rem;
    text-align: center;
    color: #64748B;
    font-size: 0.82rem;
    background: #FFFFFF;
    border: 1px dashed #E2E8F0;
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
    font-size: 1.1rem;
    margin-bottom: 0.2rem;
  }
  .pap-empty strong { display: block; color: #0F172A; font-size: 0.9rem; }
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
                      {request.municipalityName}
                      {request.barangay ? ` · ${request.barangay}` : ""}
                    </div>
                    <div className="pap-who">Requested by {request.requestedByName}</div>
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
                        key={photo}
                        type="button"
                        className="pap-photo"
                        onClick={() => setViewer({ requestId: request.id, index })}
                        title="View photo"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={photo} alt={`Scene photograph ${index + 1} from the responder`} />
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
                      className="pap-level"
                      disabled={busyId === request.id || passed}
                      onClick={() => void declare(request, entry.level)}
                      title={entry.summons}
                    >
                      <div className="pap-level-top-row">
                        <span className="pap-level-ord">{entry.label} Alarm</span>
                        {passed ? (
                          <span className="pap-level-done">{isCurrent ? "Standing" : "Declared"}</span>
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
