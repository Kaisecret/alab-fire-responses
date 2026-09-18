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
  .pap-wrap { display: flex; flex-direction: column; gap: 0.85rem; }
  /* Each card is one escalation. The rail down its left edge carries the
     alarm it is standing at, so a screenful reads at a glance. */
  .pap-card {
    position: relative;
    background: #FFFFFF;
    border: 1px solid #E6EDF5;
    border-radius: 16px;
    padding: 1.15rem 1.25rem 1.25rem 1.5rem;
    box-shadow: 0 1px 2px rgba(16, 32, 56, 0.04), 0 8px 24px -16px rgba(16, 32, 56, 0.28);
    overflow: hidden;
    transition: box-shadow 0.18s ease, border-color 0.18s ease;
  }
  .pap-card:hover {
    border-color: #D6E2EF;
    box-shadow: 0 1px 2px rgba(16, 32, 56, 0.05), 0 14px 32px -18px rgba(16, 32, 56, 0.38);
  }
  .pap-card::before {
    content: '';
    position: absolute;
    inset: 0 auto 0 0;
    width: 4px;
    background: #CBD5E1;
  }
  .pap-card.level-2::before { background: linear-gradient(180deg, #FBBF24, #F59E0B); }
  .pap-card.level-3::before { background: linear-gradient(180deg, #FB923C, #EA580C); }
  .pap-card.level-4::before { background: linear-gradient(180deg, #F87171, #DC2626); }

  .pap-top {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
    flex-wrap: wrap;
  }
  .pap-identity { display: flex; align-items: flex-start; gap: 0.8rem; min-width: 0; }
  .pap-crest {
    width: 40px;
    height: 40px;
    border-radius: 11px;
    display: grid;
    place-items: center;
    flex-shrink: 0;
    background: #FEF2F2;
    color: #DC2626;
    font-size: 1rem;
  }
  .pap-ref {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 0.9rem;
    font-weight: 800;
    color: #0F172A;
    letter-spacing: -0.01em;
  }
  .pap-where { font-size: 0.86rem; font-weight: 700; color: #1E293B; margin-top: 2px; }
  .pap-who { font-size: 0.76rem; color: #64748B; margin-top: 2px; }

  /* What was asked for, as countable facts rather than a run-on line. */
  .pap-asks { display: flex; gap: 0.4rem; flex-wrap: wrap; margin-top: 0.6rem; }
  .pap-ask {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.25rem 0.55rem;
    border-radius: 7px;
    background: #F1F5F9;
    border: 1px solid #E2E8F0;
    font-size: 0.74rem;
    font-weight: 700;
    color: #334155;
  }
  .pap-ask i { color: #94A3B8; font-size: 0.7rem; }

  .pap-badges { display: flex; gap: 0.45rem; flex-wrap: wrap; flex-shrink: 0; }
  .pap-auto {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    font-size: 0.66rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    padding: 0.3rem 0.6rem;
    border-radius: 8px;
    background: #FFF7ED;
    border: 1px solid #FED7AA;
    color: #9A3412;
    white-space: nowrap;
  }
  /* The alarm currently standing, coloured by how far it reaches. */
  .pap-current {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.72rem;
    font-weight: 800;
    padding: 0.32rem 0.7rem;
    border-radius: 8px;
    border: 1px solid;
    white-space: nowrap;
  }
  .pap-current.level-2 { background: #FFFBEB; border-color: #FDE68A; color: #B45309; }
  .pap-current.level-3 { background: #FFF7ED; border-color: #FED7AA; color: #C2410C; }
  .pap-current.level-4 { background: #FEF2F2; border-color: #FECACA; color: #B91C1C; }

  .pap-reason {
    margin-top: 0.9rem;
    border-left: 3px solid #CBD5E1;
    background: #F8FAFC;
    border: 1px solid #E2E8F0;
    border-radius: 8px;
    padding: 0.7rem 0.85rem;
    font-size: 0.83rem;
    color: #334155;
    line-height: 1.55;
  }
  .pap-declare {
    margin-top: 1.1rem;
    padding-top: 0.95rem;
    border-top: 1px dashed #E2E8F0;
  }
  .pap-label {
    display: block;
    font-size: 0.68rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: #475569;
    margin-bottom: 0.5rem;
  }
  /* A ladder: each rung is a wider call for help than the one below it. */
  .pap-levels { display: flex; flex-direction: column; gap: 0.35rem; }
  .pap-level {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    width: 100%;
    text-align: left;
    padding: 0.6rem 0.85rem;
    border-radius: 10px;
    border: 1px solid #E2E8F0;
    background: #FFFFFF;
    color: #334155;
    cursor: pointer;
    transition: border-color 0.15s ease, background 0.15s ease, transform 0.15s ease;
  }
  .pap-level-ord {
    display: grid;
    place-items: center;
    width: 30px;
    height: 30px;
    flex-shrink: 0;
    border-radius: 8px;
    background: #F1F5F9;
    color: #475569;
    font-size: 0.74rem;
    font-weight: 800;
    transition: background 0.15s ease, color 0.15s ease;
  }
  .pap-level-who { font-size: 0.78rem; font-weight: 600; color: #64748B; }
  .pap-level-go {
    margin-left: auto;
    font-size: 0.7rem;
    color: #CBD5E1;
    flex-shrink: 0;
  }
  .pap-level:hover:not(:disabled) {
    border-color: #FCA5A5;
    background: #FFFBFB;
    transform: translateX(2px);
  }
  .pap-level:hover:not(:disabled) .pap-level-ord { background: #FEE2E2; color: #B91C1C; }
  .pap-level:hover:not(:disabled) .pap-level-who { color: #7F1D1D; }
  .pap-level:hover:not(:disabled) .pap-level-go { color: #DC2626; }
  /* A level already passed is history, not a choice. */
  .pap-level:disabled { opacity: 0.5; cursor: default; background: #F8FAFC; }
  .pap-level:disabled .pap-level-go { visibility: hidden; }
  .pap-level:focus-visible { outline: 2px solid #0F172A; outline-offset: 2px; }
  .pap-level-done {
    margin-left: auto;
    font-size: 0.66rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #94A3B8;
    flex-shrink: 0;
  }

  @media (prefers-reduced-motion: reduce) {
    .pap-level:hover:not(:disabled) { transform: none; }
  }
  .pap-err {
    display: flex;
    align-items: flex-start;
    gap: 0.45rem;
    margin-top: 0.7rem;
    padding: 0.6rem 0.75rem;
    border-radius: 9px;
    background: #FEF2F2;
    border: 1px solid #FECACA;
    font-size: 0.76rem;
    color: #B91C1C;
    font-weight: 600;
    line-height: 1.45;
  }
  .pap-photos-head {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.66rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: #475569;
    margin: 0.9rem 0 0.5rem;
  }
  .pap-photos { display: flex; gap: 0.55rem; flex-wrap: wrap; }
  .pap-photo {
    position: relative;
    width: 96px;
    height: 96px;
    border-radius: 10px;
    overflow: hidden;
    border: 1px solid #E2E8F0;
    background: #F1F5F9;
    padding: 0;
    cursor: zoom-in;
    transition: transform 0.16s ease, box-shadow 0.16s ease, border-color 0.16s ease;
  }
  .pap-photo img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .pap-photo::after {
    content: '\f00e';
    font-family: 'Font Awesome 6 Free';
    font-weight: 900;
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    color: #FFFFFF;
    background: rgba(15, 23, 42, 0.45);
    opacity: 0;
    transition: opacity 0.16s ease;
  }
  .pap-photo:hover { transform: translateY(-2px); border-color: #CBD5E1; box-shadow: 0 6px 16px rgba(15,23,42,0.14); }
  .pap-photo:hover::after, .pap-photo:focus-visible::after { opacity: 1; }
  .pap-photo:focus-visible { outline: 2px solid #0F172A; outline-offset: 2px; }
  .pap-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    padding: 3rem 1.25rem;
    text-align: center;
    color: #64748B;
    font-size: 0.85rem;
    background: #FFFFFF;
    border: 1px dashed #E2E8F0;
    border-radius: 16px;
  }
  .pap-empty-icon {
    display: grid;
    place-items: center;
    width: 52px;
    height: 52px;
    border-radius: 50%;
    background: #F1F5F9;
    color: #94A3B8;
    font-size: 1.25rem;
  }
  .pap-empty strong { display: block; color: #0F172A; font-size: 0.95rem; }
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

            <div className="pap-declare">
              <span className="pap-label">
                {request.alarmLevel ? "Raise the alarm to" : "Declare an alarm level"}
              </span>
              <div className="pap-levels">
                {DECLARABLE_LEVELS.map((entry) => {
                  const passed = entry.level <= (request.alarmLevel ?? 0);
                  return (
                    <button
                      key={entry.level}
                      type="button"
                      className="pap-level"
                      // A level only ever goes up: the fire does not get smaller.
                      disabled={busyId === request.id || passed}
                      onClick={() => void declare(request, entry.level)}
                      title={entry.summons}
                    >
                      <span className="pap-level-ord">{entry.label}</span>
                      <span className="pap-level-who">{entry.summons}</span>
                      {passed
                        ? <span className="pap-level-done">Declared</span>
                        : <i className="fa-solid fa-arrow-right pap-level-go" />}
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
