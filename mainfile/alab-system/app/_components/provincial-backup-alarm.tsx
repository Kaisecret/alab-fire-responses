"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

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

const POLL_INTERVAL_MS = 5_000;
const ALARM_LEVELS = [1, 2, 3, 4, 5];

const ORDINALS: Record<number, string> = {
  1: "1st",
  2: "2nd",
  3: "3rd",
  4: "4th",
  5: "5th",
};

/**
 * A slower, deeper sweep than the municipal call. The province hears this only
 * for requests a municipality could not absorb, so it should not be mistaken
 * for the station-level tone.
 */
function startProvincialTone(context: AudioContext): () => void {
  const master = context.createGain();
  master.gain.value = 0.0001;
  master.connect(context.destination);

  const oscillator = context.createOscillator();
  oscillator.type = "sawtooth";
  oscillator.connect(master);

  const now = context.currentTime;
  oscillator.frequency.setValueAtTime(320, now);
  master.gain.exponentialRampToValueAtTime(0.12, now + 0.06);

  // A rising sweep, repeated: unmistakably an escalation rather than a chirp.
  const timer = window.setInterval(() => {
    const at = context.currentTime;
    oscillator.frequency.cancelScheduledValues(at);
    oscillator.frequency.setValueAtTime(320, at);
    oscillator.frequency.linearRampToValueAtTime(620, at + 0.55);
  }, 900);

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
  .pba-backdrop {
    position: fixed;
    inset: 0;
    z-index: 100002;
    display: grid;
    place-items: center;
    padding: 1rem;
    background: rgba(69, 6, 3, 0.62);
    backdrop-filter: blur(6px);
    -webkit-backdrop-filter: blur(6px);
  }
  .pba-card {
    width: 100%;
    max-width: 480px;
    max-height: calc(100vh - 2rem);
    display: flex;
    flex-direction: column;
    background: #FFFFFF;
    border-radius: 16px;
    overflow: hidden;
    box-shadow: 0 28px 60px -12px rgba(69, 6, 3, 0.5);
    font-family: 'Plus Jakarta Sans', sans-serif;
  }
  .pba-head {
    background: linear-gradient(135deg, #991B1B, #DC2626);
    color: #FFFFFF;
    padding: 1.15rem 1.25rem;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex-shrink: 0;
  }
  .pba-icon {
    width: 42px;
    height: 42px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.2);
    display: grid;
    place-items: center;
    font-size: 1.1rem;
    flex-shrink: 0;
  }
  .pba-title { font-size: 1.02rem; font-weight: 800; }
  .pba-sub { font-size: 0.76rem; opacity: 0.94; margin-top: 2px; }
  .pba-body {
    padding: 1.15rem 1.25rem;
    display: flex;
    flex-direction: column;
    gap: 0.85rem;
    overflow-y: auto;
    overscroll-behavior: contain;
    flex: 1 1 auto;
    min-height: 0;
  }
  .pba-ref { font-family: monospace; font-size: 0.95rem; font-weight: 800; color: #991B1B; }
  .pba-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.75rem 1rem; }
  .pba-key {
    display: block;
    font-size: 0.64rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: #475569;
  }
  .pba-val { font-size: 0.86rem; font-weight: 700; color: #0F172A; margin-top: 3px; line-height: 1.5; }
  .pba-reason {
    background: #FEF2F2;
    border: 1px solid #FECACA;
    border-radius: 8px;
    padding: 0.7rem 0.85rem;
    font-size: 0.83rem;
    color: #7F1D1D;
    line-height: 1.55;
  }
  .pba-auto {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.72rem;
    font-weight: 700;
    color: #9A3412;
    background: #FFF7ED;
    border: 1px solid #FED7AA;
    border-radius: 8px;
    padding: 0.6rem 0.8rem;
  }
  .pba-declare { border-top: 1px solid #E2E8F0; padding-top: 0.9rem; }
  .pba-label {
    display: block;
    font-size: 0.66rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: #475569;
    margin-bottom: 0.5rem;
  }
  .pba-levels { display: flex; gap: 0.5rem; flex-wrap: wrap; }
  .pba-level {
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
  .pba-level:hover:not(:disabled) { border-color: #DC2626; color: #991B1B; background: #FEF2F2; }
  .pba-level:disabled { opacity: 0.45; cursor: not-allowed; }
  .pba-level:focus-visible { outline: 2px solid #0F172A; outline-offset: 2px; }
  .pba-queue {
    font-size: 0.74rem;
    font-weight: 700;
    color: #9A3412;
    background: #FFF7ED;
    border: 1px solid #FED7AA;
    border-radius: 8px;
    padding: 0.5rem 0.75rem;
  }
  .pba-foot {
    padding: 0.9rem 1.25rem;
    background: #F8FAFC;
    border-top: 1px solid #E2E8F0;
    display: flex;
    gap: 0.6rem;
    justify-content: flex-end;
    flex-wrap: wrap;
    flex-shrink: 0;
  }
  .pba-btn {
    padding: 0.6rem 1.15rem;
    border-radius: 8px;
    font-size: 0.82rem;
    font-weight: 700;
    cursor: pointer;
    border: 1px solid #CBD5E1;
    background: #FFFFFF;
    color: #334155;
    text-decoration: none;
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
  }
  .pba-btn.primary {
    border: none;
    background: linear-gradient(135deg, #991B1B, #DC2626);
    color: #FFFFFF;
    box-shadow: 0 2px 10px rgba(153, 27, 27, 0.35);
  }
  .pba-btn:disabled { opacity: 0.6; cursor: not-allowed; }
  .pba-btn:focus-visible { outline: 2px solid #0F172A; outline-offset: 2px; }
  .pba-err { font-size: 0.78rem; color: #B91C1C; font-weight: 600; }
  .pba-photos-head {
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
  .pba-photos { display: flex; gap: 0.5rem; flex-wrap: wrap; }
  .pba-photo {
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
  .pba-photo img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .pba-photo:hover { transform: translateY(-2px); border-color: #CBD5E1; box-shadow: 0 6px 16px rgba(15,23,42,0.14); }
  .pba-photo:focus-visible { outline: 2px solid #0F172A; outline-offset: 2px; }

  @media (max-width: 480px) {
    .pba-grid { grid-template-columns: 1fr; }
    .pba-foot { flex-direction: column-reverse; }
    .pba-btn { width: 100%; justify-content: center; }
  }
`;

/**
 * Raises a backup request that a municipality has escalated to the province.
 * It mirrors the municipal alarm on purpose: the province is the last stop, so
 * a forwarded request has to interrupt whatever page the duty officer is on
 * rather than wait to be found on the assistance screen.
 */
export function ProvincialBackupAlarm() {
  const [requests, setRequests] = useState<BackupRequest[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [photoIndex, setPhotoIndex] = useState<number | null>(null);

  const contextRef = useRef<AudioContext | null>(null);
  const stopToneRef = useRef<(() => void) | null>(null);
  const markedOnScreenRef = useRef<string | null>(null);

  /*
   * The request the assistance screen is currently showing, if any. This reads
   * the address bar rather than useSearchParams, which would force the whole
   * provincial shell under a Suspense boundary it does not have.
   */
  const pathname = usePathname();
  const [search, setSearch] = useState("");

  // The address bar is outside React, so it is read on navigation rather than
  // during render, which would differ between the server and the browser.
  useEffect(() => {
    const sync = () => setSearch(window.location.search);
    sync();
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, [pathname]);

  const onScreenRequestId =
    pathname === "/provincial-bfp/assistance-requests"
      ? new URLSearchParams(search).get("request")
      : null;

  const load = useCallback(async () => {
    if (document.visibilityState !== "visible") return;
    try {
      const res = await fetch("/api/provincial-bfp/backup-requests", { cache: "no-store" });
      if (!res.ok) {
        // A refused poll is worth saying out loud: this alarm is the only thing
        // telling the province a municipality has run out of resources.
        console.error("Provincial backup poll refused", res.status);
        return;
      }
      const body = await res.json();
      setRequests(Array.isArray(body.backupRequests) ? body.backupRequests : []);
    } catch (cause) {
      console.error("Provincial backup poll failed", cause);
    }
  }, []);

  useEffect(() => {
    // Deferred so the first load does not set state during the effect body.
    const initial = window.setTimeout(() => void load(), 0);
    const poll = window.setInterval(() => void load(), POLL_INTERVAL_MS);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(poll);
    };
  }, [load]);

  /*
   * A request being read on screen is not an unheard one. The officer who
   * opened it from the alarm, or who walked to it themselves, was being
   * alarmed about the very thing in front of them on every poll and every
   * refresh, so a request open in the page is never raised again here.
   */
  const pending = requests.filter(
    (request) => !request.provincialAcknowledgedAt && request.id !== onScreenRequestId,
  );
  const active = pending[0];
  const activeId = active?.id ?? null;

  // Reading a request counts as seeing it, even when the page was reached by
  // hand rather than through the alarm. Recorded once: the poll rebuilds the
  // list every few seconds, and this must not follow it with a PATCH each time.
  useEffect(() => {
    if (!onScreenRequestId) return;
    if (markedOnScreenRef.current === onScreenRequestId) return;
    const unseen = requests.some(
      (request) => request.id === onScreenRequestId && !request.provincialAcknowledgedAt,
    );
    if (!unseen) return;

    markedOnScreenRef.current = onScreenRequestId;
    void fetch("/api/provincial-bfp/backup-requests", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ backupRequestId: onScreenRequestId }),
    }).catch(() => {
      // Let a later poll try again rather than leaving it silently unseen.
      markedOnScreenRef.current = null;
    });
  }, [onScreenRequestId, requests]);

  /*
   * Keyed on the request's identity rather than the object, which the poll
   * replaces every few seconds: depending on the object re-ran this constantly
   * and left the tone resting on a guard rather than on the request actually
   * having changed.
   */
  useEffect(() => {
    if (!activeId) {
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
        stopToneRef.current = startProvincialTone(context);
      } catch {
        // A browser that refuses audio still shows the dialog.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [activeId]);

  useEffect(() => () => stopToneRef.current?.(), []);

  // The dialog holds the page still while it is up.
  useEffect(() => {
    if (!activeId) return;
    document.body.classList.add("pba-scroll-locked");
    return () => document.body.classList.remove("pba-scroll-locked");
  }, [activeId]);

  /*
   * Acknowledging clears every request the dialog is showing, not only the one
   * on top. Marking them one at a time handed the officer the next request the
   * instant they dismissed the last, siren and all, so a station with two
   * escalations could not be silenced at all. The dialog says how many are
   * behind, so dismissing it is an answer about all of them.
   */
  const acknowledge = useCallback(async () => {
    if (pending.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      const results = await Promise.all(
        pending.map((request) =>
          fetch("/api/provincial-bfp/backup-requests", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ backupRequestId: request.id }),
          }),
        ),
      );
      const refused = results.find((res) => !res.ok);
      if (refused) {
        const body = await refused.json().catch(() => ({}));
        throw new Error(body.error || "Unable to acknowledge that request.");
      }
      stopToneRef.current?.();
      stopToneRef.current = null;
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }, [pending, load]);

  /*
   * Opening the request is seeing it. Navigating without recording that left
   * the request unacknowledged on the server, so the shell on the next page
   * polled, found it still pending, and raised the same alarm again: the
   * officer was followed from page to page by a request they were in the
   * middle of reading. The acknowledgement goes in before the navigation,
   * and a failure to record it does not trap them on this dialog.
   */
  const openRequest = useCallback(async () => {
    if (!active) return;
    const target = `/provincial-bfp/assistance-requests?request=${active.id}`;
    const alreadyThere = window.location.pathname + window.location.search === target;
    setBusy(true);
    setError(null);
    try {
      // Opening answers for the whole dialog, exactly as dismissing it does,
      // or the requests queued behind would ring the moment the page settled.
      await Promise.all(
        pending.map((request) =>
          fetch("/api/provincial-bfp/backup-requests", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ backupRequestId: request.id }),
          }),
        ),
      );
    } catch {
      // Still open it: reading the request matters more than the bookkeeping.
    } finally {
      stopToneRef.current?.();
      stopToneRef.current = null;
      if (alreadyThere) {
        /*
         * Navigating to the address already showing does nothing, which left
         * the dialog frozen on "Working..." with every control disabled. The
         * officer is on the request; refresh the list and let it close.
         */
        await load();
        setBusy(false);
      } else {
        window.location.assign(target);
      }
    }
  }, [active, pending, load]);

  const declare = useCallback(async (alarmLevel: number) => {
    if (!active) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/provincial-bfp/backup-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fireReportId: active.fireReportId,
          backupRequestId: active.id,
          alarmLevel,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Unable to declare that alarm level.");
      }
      // Declaring is itself an acknowledgement: the province has acted.
      await fetch("/api/provincial-bfp/backup-requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ backupRequestId: active.id }),
      }).catch(() => undefined);
      stopToneRef.current?.();
      stopToneRef.current = null;
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }, [active, load]);

  if (!active) return null;

  return (
    <>
      <style>{`body.pba-scroll-locked { overflow: hidden; } ${styles}`}</style>
      <div className="pba-backdrop" role="alertdialog" aria-modal="true" aria-labelledby="pba-title">
        <div className="pba-card">
          <div className="pba-head">
            <span className="pba-icon" aria-hidden="true">
              <i className="fa-solid fa-tower-broadcast" />
            </span>
            <div>
              <div className="pba-title" id="pba-title">Backup escalated to the province</div>
              <div className="pba-sub">
                {active.municipalityName} needs support it cannot raise alone
              </div>
            </div>
          </div>

          <div className="pba-body">
            <div className="pba-ref">{active.referenceNumber}</div>

            {pending.length > 1 && (
              <div className="pba-queue">
                {pending.length - 1} further request{pending.length - 1 > 1 ? "s" : ""} waiting behind this one
              </div>
            )}

            {active.forwardedAutomatically && (
              <div className="pba-auto">
                <i className="fa-regular fa-clock" />
                Escalated automatically: the municipality did not respond in time
              </div>
            )}

            <div className="pba-grid">
              <div>
                <span className="pba-key">Municipality</span>
                <div className="pba-val">{active.municipalityName}</div>
              </div>
              <div>
                <span className="pba-key">Barangay</span>
                <div className="pba-val">{active.barangay || "Not specified"}</div>
              </div>
              <div>
                <span className="pba-key">Requested by</span>
                <div className="pba-val">{active.requestedByName}</div>
              </div>
              {active.alarmLevel && (
                <div>
                  <span className="pba-key">Current alarm</span>
                  <div className="pba-val">{ORDINALS[active.alarmLevel]} alarm</div>
                </div>
              )}
              {active.requestedFiretrucks > 0 && (
                <div>
                  <span className="pba-key">Firetrucks</span>
                  <div className="pba-val">{active.requestedFiretrucks}</div>
                </div>
              )}
              {active.requestedPersonnel > 0 && (
                <div>
                  <span className="pba-key">Personnel</span>
                  <div className="pba-val">{active.requestedPersonnel}</div>
                </div>
              )}
            </div>

            {active.reason && <div className="pba-reason">{active.reason}</div>}

            {active.photos?.length > 0 && (
              <div>
                <div className="pba-photos-head">
                  <i className="fa-solid fa-camera" />
                  From the scene ({active.photos.length})
                </div>
                <div className="pba-photos">
                  {active.photos.map((photo, index) => (
                    <button
                      key={photo}
                      type="button"
                      className="pba-photo"
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

            <div className="pba-declare">
              <span className="pba-label">
                {active.alarmLevel ? "Raise the alarm to" : "Declare an alarm level"}
              </span>
              <div className="pba-levels">
                {ALARM_LEVELS.map((level) => (
                  <button
                    key={level}
                    type="button"
                    className="pba-level"
                    // A level only ever goes up: the fire does not get smaller.
                    disabled={busy || level <= (active.alarmLevel ?? 0)}
                    onClick={() => void declare(level)}
                  >
                    {ORDINALS[level]}
                  </button>
                ))}
              </div>
            </div>

            {error && <div className="pba-err">{error}</div>}
          </div>

          <div className="pba-foot">
            <button
              type="button"
              className="pba-btn"
              disabled={busy}
              onClick={() => void acknowledge()}
              autoFocus
            >
              {busy
                ? "Working..."
                : pending.length > 1
                  ? `Acknowledge all ${pending.length}`
                  : "Acknowledge"}
            </button>
            <button
              type="button"
              className="pba-btn primary"
              disabled={busy}
              onClick={() => void openRequest()}
            >
              <i className="fa-solid fa-arrow-up-right-from-square" />
              Open the request
            </button>
          </div>
        </div>
      </div>

      {photoIndex !== null && (
        <PhotoLightbox
          photos={active.photos ?? []}
          index={photoIndex}
          onIndexChange={setPhotoIndex}
          onClose={() => setPhotoIndex(null)}
          caption={`${active.referenceNumber} · ${active.municipalityName}`}
        />
      )}
    </>
  );
}
