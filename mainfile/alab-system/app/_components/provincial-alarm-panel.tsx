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
  alarmLevel: number | null;
  photos: string[];
}

const POLL_INTERVAL_MS = 10_000;
const ALARM_LEVELS = [1, 2, 3, 4, 5];

const ORDINALS: Record<number, string> = {
  1: "1st",
  2: "2nd",
  3: "3rd",
  4: "4th",
  5: "5th",
};

const styles = `
  .pap-wrap { display: flex; flex-direction: column; gap: 0.85rem; }
  .pap-card {
    background: #FFFFFF;
    border: 1px solid #E2E8F0;
    border-radius: 14px;
    padding: 1.15rem 1.25rem;
    box-shadow: 0 1px 3px rgba(15, 23, 42, 0.05);
  }
  .pap-top {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
    flex-wrap: wrap;
  }
  .pap-ref { font-family: monospace; font-size: 0.92rem; font-weight: 800; color: #0F172A; }
  .pap-meta { font-size: 0.8rem; color: #475569; margin-top: 4px; line-height: 1.5; }
  .pap-auto {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    font-size: 0.68rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    padding: 0.28rem 0.6rem;
    border-radius: 999px;
    background: #FFF7ED;
    border: 1px solid #FED7AA;
    color: #9A3412;
  }
  .pap-current {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    font-size: 0.72rem;
    font-weight: 800;
    padding: 0.3rem 0.7rem;
    border-radius: 999px;
    background: #FEE2E2;
    border: 1px solid #FCA5A5;
    color: #991B1B;
  }
  .pap-reason {
    margin-top: 0.75rem;
    background: #F8FAFC;
    border: 1px solid #E2E8F0;
    border-radius: 8px;
    padding: 0.7rem 0.85rem;
    font-size: 0.83rem;
    color: #334155;
    line-height: 1.55;
  }
  .pap-declare { margin-top: 1rem; }
  .pap-label {
    display: block;
    font-size: 0.68rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: #475569;
    margin-bottom: 0.5rem;
  }
  .pap-levels { display: flex; gap: 0.5rem; flex-wrap: wrap; }
  .pap-level {
    padding: 0.5rem 0.95rem;
    border-radius: 8px;
    border: 1px solid #CBD5E1;
    background: #FFFFFF;
    color: #334155;
    font-size: 0.82rem;
    font-weight: 800;
    cursor: pointer;
    transition: all 0.15s ease;
  }
  .pap-level:hover:not(:disabled) { border-color: #DC2626; color: #991B1B; background: #FEF2F2; }
  .pap-level:disabled { opacity: 0.45; cursor: not-allowed; }
  .pap-level:focus-visible { outline: 2px solid #0F172A; outline-offset: 2px; }
  .pap-err { margin-top: 0.6rem; font-size: 0.78rem; color: #B91C1C; font-weight: 600; }
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
    padding: 2rem 1rem;
    text-align: center;
    color: #64748B;
    font-size: 0.85rem;
  }
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
          <div className="pap-empty">No municipality has escalated a backup request.</div>
        )}

        {requests.map((request) => (
          <div className="pap-card" key={request.id}>
            <div className="pap-top">
              <div>
                <div className="pap-ref">{request.referenceNumber}</div>
                <div className="pap-meta">
                  {request.municipalityName}
                  {request.barangay ? ` · ${request.barangay}` : ""} · requested by {request.requestedByName}
                  {request.requestedFiretrucks > 0 && ` · ${request.requestedFiretrucks} firetruck${request.requestedFiretrucks > 1 ? "s" : ""}`}
                  {request.requestedPersonnel > 0 && ` · ${request.requestedPersonnel} personnel`}
                </div>
              </div>
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                {request.forwardedAutomatically && (
                  <span className="pap-auto">
                    <i className="fa-regular fa-clock" /> Auto-escalated
                  </span>
                )}
                {request.alarmLevel && (
                  <span className="pap-current">
                    <i className="fa-solid fa-bell" /> {ORDINALS[request.alarmLevel]} alarm
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
                {request.alarmLevel ? "Raise to" : "Declare alarm level"}
              </span>
              <div className="pap-levels">
                {ALARM_LEVELS.map((level) => (
                  <button
                    key={level}
                    type="button"
                    className="pap-level"
                    // A level only ever goes up: the fire does not get smaller.
                    disabled={busyId === request.id || level <= (request.alarmLevel ?? 0)}
                    onClick={() => void declare(request, level)}
                  >
                    {ORDINALS[level]}
                  </button>
                ))}
              </div>
              {error && busyId === null && <div className="pap-err">{error}</div>}
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
