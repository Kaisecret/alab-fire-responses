"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { EmergencyAlertCard } from "./emergency-alert-card";
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
/*
 * The province declares the second through the fourth. The first is the
 * municipality's own response, raised by the report itself, and the fifth
 * belongs to Region VI, which is outside this system.
 */
const DECLARABLE_LEVELS: Array<{ level: number; label: string; summons: string }> = [
  { level: 2, label: "2nd", summons: "The 2 municipalities nearest the fire" },
  { level: 3, label: "3rd", summons: "Every municipality within 35 km" },
  { level: 4, label: "4th", summons: "Every municipality in the province" },
];

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
  .pba-note { display: flex; align-items: center; gap: 0.5rem; padding: 0.55rem 0.75rem; border-radius: 11px; background: #FFF7ED; color: #9A3412; font-size: 0.74rem; font-weight: 700; }
  .pba-reason { padding: 0.7rem 0.85rem; border: 1px solid #FECACA; border-radius: 12px; background: #FEF2F2; color: #7F1D1D; font-size: 0.82rem; line-height: 1.5; }
  .pba-label { display: flex; align-items: center; gap: 0.4rem; margin-bottom: 0.45rem; color: #475569; font-size: 0.64rem; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; }
  .pba-levels { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0.45rem; }
  .pba-level {
    display: grid;
    justify-items: center;
    gap: 0.15rem;
    padding: 0.6rem 0.4rem;
    border: 1.5px solid #E2E8F0;
    border-radius: 12px;
    background: #FFFFFF;
    color: #334155;
    font: inherit;
    cursor: pointer;
    transition: border-color 0.15s ease, background 0.15s ease, color 0.15s ease;
  }
  .pba-level strong { font-size: 0.86rem; font-weight: 850; }
  .pba-level small { font-size: 0.6rem; font-weight: 700; color: #94A3B8; }
  .pba-level:hover:not(:disabled) { border-color: #DC2626; color: #991B1B; background: #FEF2F2; }
  .pba-level:disabled { opacity: 0.45; cursor: not-allowed; }
  .pba-level:focus-visible { outline: 2px solid #0F172A; outline-offset: 2px; }
  .pba-err { font-size: 0.78rem; color: #B91C1C; font-weight: 700; }
  .pba-photos { display: flex; gap: 0.45rem; overflow-x: auto; padding-bottom: 0.15rem; }
  .pba-photo {
    flex: 0 0 auto;
    width: 72px;
    height: 72px;
    padding: 0;
    border: 1px solid #E2E8F0;
    border-radius: 12px;
    overflow: hidden;
    background: #F1F5F9;
    cursor: zoom-in;
    transition: transform 0.16s ease, box-shadow 0.16s ease;
  }
  .pba-photo img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .pba-photo:hover { transform: translateY(-2px); box-shadow: 0 6px 16px rgba(15,23,42,0.14); }
  .pba-photo:focus-visible { outline: 2px solid #0F172A; outline-offset: 2px; }
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
        <EmergencyAlertCard
          theme={{ primary: "#DC2626", dark: "#991B1B", soft: "#FEF2F2", softBorder: "#FECACA" }}
          titleId="pba-title"
          title="Backup Request Escalated"
          subtitle={`${active.municipalityName} needs more support`}
          heroBadge="fa-tower-broadcast"
          code={{ label: "Report code", value: active.referenceNumber }}
          facts={[
            { icon: "fa-city", label: "Municipality", value: active.municipalityName },
            { icon: "fa-location-dot", label: "Barangay", value: active.barangay || "Not specified" },
            { icon: "fa-user-shield", label: "Requested by", value: active.requestedByName },
            ...(active.alarmLevel ? [{ icon: "fa-bell", label: "Current alarm", value: `${ORDINALS[active.alarmLevel]} alarm` }] : []),
            ...(active.requestedFiretrucks > 0 ? [{ icon: "fa-truck-droplet", label: "Firetrucks", value: String(active.requestedFiretrucks) }] : []),
            ...(active.requestedPersonnel > 0 ? [{ icon: "fa-people-group", label: "Personnel", value: String(active.requestedPersonnel) }] : []),
          ]}
          actions={[
            {
              label: busy ? "Working..." : pending.length > 1 ? `Acknowledge all ${pending.length}` : "Acknowledge",
              icon: "fa-circle-check",
              variant: "secondary",
              disabled: busy,
              autoFocus: true,
              onClick: () => void acknowledge(),
            },
            { label: "Open Request", icon: "fa-arrow-right", variant: "primary", disabled: busy, onClick: () => void openRequest() },
          ]}
        >
          {pending.length > 1 && <div className="pba-note"><i className="fa-solid fa-layer-group" aria-hidden="true" />{pending.length - 1} more waiting after this one</div>}
          {active.forwardedAutomatically && <div className="pba-note"><i className="fa-regular fa-clock" aria-hidden="true" />Auto-escalated: no municipal response in time</div>}
          {active.reason && <div className="pba-reason">{active.reason}</div>}
          {active.photos?.length > 0 && <div>
            <span className="pba-label"><i className="fa-solid fa-camera" aria-hidden="true" />From the scene ({active.photos.length})</span>
            <div className="pba-photos">
              {active.photos.map((photo, index) => <button key={photo} type="button" className="pba-photo" onClick={() => setPhotoIndex(index)} title="View photo">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo} alt={`Scene photograph ${index + 1} from the responder`} />
              </button>)}
            </div>
          </div>}
          <div>
            <span className="pba-label">{active.alarmLevel ? "Raise the alarm to" : "Declare an alarm level"}</span>
            <div className="pba-levels">
              {DECLARABLE_LEVELS.map((entry) => <button
                key={entry.level}
                type="button"
                className="pba-level"
                // A level only ever goes up: the fire does not get smaller.
                disabled={busy || entry.level <= (active.alarmLevel ?? 0)}
                onClick={() => void declare(entry.level)}
                title={entry.summons}
              >
                <strong>{entry.label}</strong>
                <small>Alarm</small>
              </button>)}
            </div>
          </div>
          {error && <div className="pba-err">{error}</div>}
        </EmergencyAlertCard>
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
