"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { municipalTabFetch } from "../../lib/auth/municipal-tab-fetch";
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
  status: "PENDING_MUNICIPAL" | "FORWARDED_PROVINCIAL" | "RESOLVED" | "CANCELLED";
  autoForwardAt: string;
  acknowledgedAt: string | null;
  photos: string[];
}

const POLL_INTERVAL_MS = 5_000;

/** Rising two-tone call, distinct from the incident siren. */
function startBackupTone(context: AudioContext): () => void {
  const master = context.createGain();
  master.gain.value = 0.0001;
  master.connect(context.destination);

  const oscillator = context.createOscillator();
  oscillator.type = "square";
  oscillator.connect(master);

  const now = context.currentTime;
  oscillator.frequency.setValueAtTime(740, now);
  master.gain.exponentialRampToValueAtTime(0.13, now + 0.05);

  let step = 0;
  const timer = window.setInterval(() => {
    step += 1;
    oscillator.frequency.setValueAtTime(step % 2 === 0 ? 740 : 1040, context.currentTime + 0.02);
  }, 400);

  oscillator.start();

  return () => {
    window.clearInterval(timer);
    try {
      const stopAt = context.currentTime;
      master.gain.cancelScheduledValues(stopAt);
      master.gain.setValueAtTime(master.gain.value, stopAt);
      master.gain.exponentialRampToValueAtTime(0.0001, stopAt + 0.12);
      oscillator.stop(stopAt + 0.15);
    } catch {
      // Already stopped.
    }
  };
}

const styles = `
  .mba-backdrop {
    position: fixed;
    inset: 0;
    z-index: 100002;
    display: grid;
    place-items: center;
    padding: 1rem;
    background: rgba(69, 6, 3, 0.6);
    backdrop-filter: blur(6px);
  }
  .mba-card {
    width: 100%;
    max-width: 460px;
    background: #FFFFFF;
    border-radius: 16px;
    overflow: hidden;
    box-shadow: 0 28px 60px -12px rgba(69, 6, 3, 0.5);
    font-family: 'Plus Jakarta Sans', sans-serif;
  }
  .mba-head {
    background: linear-gradient(135deg, #B45309, #EA580C);
    color: #FFFFFF;
    padding: 1.15rem 1.25rem;
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }
  .mba-icon {
    width: 42px;
    height: 42px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.2);
    display: grid;
    place-items: center;
    font-size: 1.1rem;
    flex-shrink: 0;
  }
  .mba-title { font-size: 1.02rem; font-weight: 800; }
  .mba-sub { font-size: 0.76rem; opacity: 0.94; margin-top: 2px; }
  .mba-body { padding: 1.15rem 1.25rem; display: flex; flex-direction: column; gap: 0.85rem; }
  .mba-ref { font-family: monospace; font-size: 0.95rem; font-weight: 800; color: #9A3412; }
  .mba-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.75rem 1rem; }
  .mba-key {
    display: block;
    font-size: 0.64rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: #475569;
  }
  .mba-val { font-size: 0.86rem; font-weight: 700; color: #0F172A; margin-top: 3px; line-height: 1.5; }
  .mba-reason {
    background: #FFFBEB;
    border: 1px solid #FDE68A;
    border-radius: 8px;
    padding: 0.7rem 0.85rem;
    font-size: 0.83rem;
    color: #92400E;
    line-height: 1.55;
  }
  .mba-countdown {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.8rem;
    font-weight: 700;
    color: #B45309;
    background: #FFF7ED;
    border: 1px solid #FED7AA;
    border-radius: 8px;
    padding: 0.65rem 0.85rem;
  }
  .mba-countdown.is-elapsed { color: #7F1D1D; background: #FEF2F2; border-color: #FECACA; }
  .mba-foot {
    padding: 0.9rem 1.25rem;
    background: #F8FAFC;
    border-top: 1px solid #E2E8F0;
    display: flex;
    gap: 0.6rem;
    justify-content: flex-end;
    flex-wrap: wrap;
  }
  .mba-btn {
    padding: 0.6rem 1.15rem;
    border-radius: 8px;
    font-size: 0.82rem;
    font-weight: 700;
    cursor: pointer;
    border: 1px solid #CBD5E1;
    background: #FFFFFF;
    color: #334155;
  }
  .mba-btn.primary {
    border: none;
    background: linear-gradient(135deg, #B45309, #EA580C);
    color: #FFFFFF;
    box-shadow: 0 2px 10px rgba(180, 83, 9, 0.35);
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
  }
  .mba-btn:disabled { opacity: 0.6; cursor: not-allowed; }
  .mba-btn:focus-visible { outline: 2px solid #0F172A; outline-offset: 2px; }
  .mba-err { font-size: 0.78rem; color: #B91C1C; font-weight: 600; }
  .mba-photos-head {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.64rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: #475569;
    margin-bottom: 0.5rem;
  }
  .mba-photos { display: flex; gap: 0.5rem; flex-wrap: wrap; }
  .mba-photo {
    position: relative;
    width: 88px;
    height: 88px;
    border-radius: 10px;
    overflow: hidden;
    border: 1px solid #E2E8F0;
    background: #F1F5F9;
    padding: 0;
    cursor: zoom-in;
    transition: transform 0.16s ease, box-shadow 0.16s ease, border-color 0.16s ease;
  }
  .mba-photo img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .mba-photo::after {
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
  .mba-photo:hover { transform: translateY(-2px); border-color: #CBD5E1; box-shadow: 0 6px 16px rgba(15,23,42,0.14); }
  .mba-photo:hover::after, .mba-photo:focus-visible::after { opacity: 1; }
  .mba-photo:focus-visible { outline: 2px solid #0F172A; outline-offset: 2px; }

  @media (max-width: 480px) {
    .mba-grid { grid-template-columns: 1fr; }
    .mba-foot { flex-direction: column-reverse; }
    .mba-btn { width: 100%; }
  }
`;

/**
 * Raises the backup request a responder sent from the field. It sounds until
 * the municipality acknowledges, and shows how long is left before the request
 * forwards itself to the province.
 */
export function MunicipalBackupAlarm() {
  const [requests, setRequests] = useState<BackupRequest[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [photoIndex, setPhotoIndex] = useState<number | null>(null);

  const contextRef = useRef<AudioContext | null>(null);
  const stopToneRef = useRef<(() => void) | null>(null);

  const load = useCallback(async () => {
    if (document.visibilityState !== "visible") return;
    try {
      const res = await municipalTabFetch("/api/municipal-bfp/backup-requests", { cache: "no-store" });
      if (!res.ok) {
        // A refused poll is worth saying out loud: the alarm is the only thing
        // telling this station a responder has called for help.
        console.error("Backup request poll refused", res.status);
        return;
      }
      const body = await res.json();
      setRequests(Array.isArray(body.backupRequests) ? body.backupRequests : []);
    } catch (cause) {
      console.error("Backup request poll failed", cause);
    }
  }, []);

  useEffect(() => {
    // Deferred so the first load does not set state during the effect body.
    const initial = window.setTimeout(() => void load(), 0);
    const poll = window.setInterval(() => void load(), POLL_INTERVAL_MS);
    const tick = window.setInterval(() => setNow(Date.now()), 1000);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(poll);
      window.clearInterval(tick);
    };
  }, [load]);

  /*
   * An unacknowledged request rings whether or not the grace period has run
   * out. Gating on PENDING_MUNICIPAL alone meant a request that auto-forwarded
   * before the next poll was silently escalated past the very station whose
   * responder had called for help: the alarm never sounded, and the crew on
   * scene appeared to have been ignored.
   */
  const active = requests.find(
    (request) =>
      !request.acknowledgedAt &&
      (request.status === "PENDING_MUNICIPAL" || request.status === "FORWARDED_PROVINCIAL"),
  );

  const alreadyForwarded = active?.status === "FORWARDED_PROVINCIAL";

  useEffect(() => {
    if (!active) {
      stopToneRef.current?.();
      stopToneRef.current = null;
      return;
    }
    if (stopToneRef.current) return;

    let cancelled = false;
    void (async () => {
      try {
        type WindowWithAudio = Window & { webkitAudioContext?: typeof AudioContext };
        const AudioCtor = window.AudioContext ?? (window as WindowWithAudio).webkitAudioContext;
        if (!AudioCtor) return;
        contextRef.current ??= new AudioCtor();
        const context = contextRef.current;
        if (context.state === "suspended") await context.resume();
        if (context.state !== "running" || cancelled) return;
        stopToneRef.current = startBackupTone(context);
      } catch {
        // A browser that refuses audio still shows the dialog.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [active]);

  useEffect(() => () => stopToneRef.current?.(), []);

  const act = useCallback(async (backupRequestId: string, action: "ACKNOWLEDGE" | "FORWARD") => {
    setBusy(true);
    setError(null);
    try {
      const res = await municipalTabFetch("/api/municipal-bfp/backup-requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ backupRequestId, action }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Unable to update that backup request.");
      }
      stopToneRef.current?.();
      stopToneRef.current = null;
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }, [load]);

  if (!active) return null;

  const secondsLeft = Math.max(0, Math.round((new Date(active.autoForwardAt).getTime() - now) / 1000));

  return (
    <>
      <style>{styles}</style>
      <div className="mba-backdrop" role="alertdialog" aria-modal="true" aria-labelledby="mba-title">
        <div className="mba-card">
          <div className="mba-head">
            <span className="mba-icon" aria-hidden="true">
              <i className="fa-solid fa-tower-broadcast" />
            </span>
            <div>
              <div className="mba-title" id="mba-title">Responder requested backup</div>
              <div className="mba-sub">{active.requestedByName} is asking for support on scene</div>
            </div>
          </div>

          <div className="mba-body">
            <div className="mba-ref">{active.referenceNumber}</div>

            <div className="mba-grid">
              <div>
                <span className="mba-key">Barangay</span>
                <div className="mba-val">{active.barangay || "Not specified"}</div>
              </div>
              <div>
                <span className="mba-key">Requested by</span>
                <div className="mba-val">{active.requestedByName}</div>
              </div>
              {active.requestedFiretrucks > 0 && (
                <div>
                  <span className="mba-key">Firetrucks</span>
                  <div className="mba-val">{active.requestedFiretrucks}</div>
                </div>
              )}
              {active.requestedPersonnel > 0 && (
                <div>
                  <span className="mba-key">Personnel</span>
                  <div className="mba-val">{active.requestedPersonnel}</div>
                </div>
              )}
            </div>

            {active.reason && <div className="mba-reason">{active.reason}</div>}

            {active.photos?.length > 0 && (
              <div>
                <div className="mba-photos-head">
                  <i className="fa-solid fa-camera" />
                  From the scene ({active.photos.length})
                </div>
                <div className="mba-photos">
                  {active.photos.map((photo, index) => (
                    <button
                      key={photo}
                      type="button"
                      className="mba-photo"
                      onClick={() => setPhotoIndex(index)}
                      title="View photo"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={photo} alt={`Scene photograph ${index + 1} from the responder`} />
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className={`mba-countdown${alreadyForwarded || secondsLeft === 0 ? " is-elapsed" : ""}`} role="status">
              <i className={`fa-solid ${alreadyForwarded ? "fa-tower-broadcast" : "fa-clock"}`} />
              {alreadyForwarded
                ? "Already escalated to the province. Your crew still needs an answer."
                : secondsLeft > 0
                  ? `Forwards to the province in ${secondsLeft}s if not sent on`
                  : "Forwarding to the province now"}
            </div>

            {error && <div className="mba-err">{error}</div>}
          </div>

          <div className="mba-foot">
            <button
              type="button"
              className="mba-btn"
              disabled={busy}
              onClick={() => void act(active.id, "ACKNOWLEDGE")}
            >
              Acknowledge
            </button>
            {!alreadyForwarded && (
              <button
                type="button"
                className="mba-btn primary"
                disabled={busy}
                onClick={() => void act(active.id, "FORWARD")}
                autoFocus
              >
                <i className="fa-solid fa-arrow-up-right-from-square" />
                {busy ? "Working..." : "Forward to Provincial"}
              </button>
            )}
          </div>
        </div>
      </div>

      {photoIndex !== null && (
        <PhotoLightbox
          photos={active.photos ?? []}
          index={photoIndex}
          onIndexChange={setPhotoIndex}
          onClose={() => setPhotoIndex(null)}
          caption={`${active.referenceNumber} · ${active.requestedByName}`}
        />
      )}
    </>
  );
}
