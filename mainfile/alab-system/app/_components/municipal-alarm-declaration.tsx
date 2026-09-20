"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { municipalTabFetch } from "../../lib/auth/municipal-tab-fetch";
import type { AccountNotification } from "../../lib/notifications/types";
import { ensureAlertTone, getMunicipalAlarmAction, selectPendingMunicipalAlarm } from "../../lib/municipal-bfp/alarm-alert.mjs";

const POLL_INTERVAL_MS = 5_000;
const ORDINAL: Record<number, string> = { 2: "Second", 3: "Third", 4: "Fourth" };

function startAlarmTone(context: AudioContext): () => void {
  const gain = context.createGain();
  gain.gain.value = 0.0001;
  gain.connect(context.destination);
  const oscillator = context.createOscillator();
  oscillator.type = "sawtooth";
  oscillator.connect(gain);
  oscillator.frequency.setValueAtTime(660, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.14, context.currentTime + 0.05);
  let high = false;
  const timer = window.setInterval(() => {
    high = !high;
    oscillator.frequency.setValueAtTime(high ? 960 : 660, context.currentTime + 0.02);
  }, 460);
  oscillator.start();
  return () => {
    window.clearInterval(timer);
    try {
      const at = context.currentTime;
      gain.gain.cancelScheduledValues(at);
      gain.gain.setValueAtTime(gain.gain.value, at);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.12);
      oscillator.stop(at + 0.15);
    } catch {
      // The oscillator was already stopped.
    }
  };
}

const styles = `
  .mad-backdrop { position: fixed; inset: 0; z-index: 100004; display: grid; place-items: center; padding: 1rem; background: rgba(69, 6, 3, .64); backdrop-filter: blur(7px); }
  .mad-card { width: min(100%, 500px); overflow: hidden; border: 1px solid #FECACA; border-radius: 18px; background: #fff; box-shadow: 0 30px 70px -16px rgba(69, 6, 3, .58); font-family: 'Plus Jakarta Sans', sans-serif; }
  .mad-head { display: flex; gap: .8rem; align-items: center; padding: 1.15rem 1.25rem; color: #fff; background: linear-gradient(135deg, #991B1B, #DC2626); }
  .mad-icon { display: grid; place-items: center; width: 44px; height: 44px; flex: 0 0 auto; border: 1px solid rgba(255,255,255,.32); border-radius: 12px; background: rgba(255,255,255,.16); font-size: 1.05rem; animation: madPulse 1s ease-in-out infinite; }
  .mad-title { font-size: 1.02rem; font-weight: 850; }
  .mad-sub { margin-top: 2px; font-size: .76rem; opacity: .94; }
  .mad-body { display: grid; gap: .85rem; padding: 1.15rem 1.25rem; }
  .mad-ref { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: .94rem; font-weight: 850; color: #991B1B; }
  .mad-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: .75rem 1rem; }
  .mad-key { display: block; color: #64748B; font-size: .64rem; font-weight: 800; letter-spacing: .06em; text-transform: uppercase; }
  .mad-value { margin-top: 3px; color: #0F172A; font-size: .85rem; font-weight: 750; line-height: 1.45; }
  .mad-called { padding: .7rem .8rem; border: 1px solid #FED7AA; border-radius: 10px; background: #FFF7ED; color: #9A3412; font-size: .78rem; line-height: 1.5; }
  .mad-note { color: #64748B; font-size: .73rem; line-height: 1.5; }
  .mad-error { padding: .6rem .75rem; border: 1px solid #FECACA; border-radius: 8px; background: #FEF2F2; color: #B91C1C; font-size: .76rem; font-weight: 650; }
  .mad-foot { display: flex; justify-content: flex-end; padding: .9rem 1.25rem; border-top: 1px solid #E2E8F0; background: #F8FAFC; }
  .mad-action { min-height: 44px; padding: .65rem 1.1rem; border: 0; border-radius: 9px; background: linear-gradient(135deg, #B91C1C, #EF4444); color: #fff; box-shadow: 0 4px 14px rgba(185,28,28,.28); cursor: pointer; font: inherit; font-size: .82rem; font-weight: 800; }
  .mad-action:disabled { cursor: not-allowed; opacity: .62; }
  .mad-action:focus-visible { outline: 3px solid #0F172A; outline-offset: 3px; }
  @keyframes madPulse { 50% { transform: scale(1.1); } }
  @media (prefers-reduced-motion: reduce) { .mad-icon { animation: none; } }
  @media (max-width: 480px) { .mad-grid { grid-template-columns: 1fr; } .mad-action { width: 100%; } }
`;

/**
 * A provincial declaration or direct inter-municipality assistance request
 * needs an operational response, not only a bell in the notification list.
 */
export function MunicipalAlarmDeclaration() {
  const [notifications, setNotifications] = useState<AccountNotification[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [audioBlocked, setAudioBlocked] = useState(false);
  const contextRef = useRef<AudioContext | null>(null);
  const stopToneRef = useRef<(() => void) | null>(null);

  const active = useMemo(
    () => selectPendingMunicipalAlarm(notifications) as AccountNotification | null,
    [notifications],
  );
  const context = active?.context as Record<string, unknown> | undefined;
  const audience = context?.audience === "SUMMONED"
    ? "SUMMONED"
    : context?.audience === "ASSISTANCE"
      ? "ASSISTANCE"
      : "ORIGIN";
  const isAssistance = audience === "ASSISTANCE";
  const alarmLevel = Number(context?.alarmLevel ?? 0);

  const load = useCallback(async () => {
    if (document.visibilityState !== "visible") return;
    try {
      const response = await municipalTabFetch("/api/municipal-bfp/notifications?limit=50", { cache: "no-store" });
      if (!response.ok) return;
      const body = await response.json();
      setNotifications(Array.isArray(body.notifications) ? body.notifications : []);
    } catch {
      // Keep the current alarm visible while a poll is temporarily unavailable.
    }
  }, []);

  useEffect(() => {
    const initial = window.setTimeout(() => void load(), 0);
    const timer = window.setInterval(() => void load(), POLL_INTERVAL_MS);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(timer);
    };
  }, [load]);

  const stopTone = useCallback(() => {
    stopToneRef.current?.();
    stopToneRef.current = null;
  }, []);

  useEffect(() => {
    if (!active) {
      stopTone();
      return;
    }
    if (stopToneRef.current) return;
    let cancelled = false;
    void (async () => {
      try {
        type AudioWindow = Window & { webkitAudioContext?: typeof AudioContext };
        const AudioCtor = window.AudioContext ?? (window as AudioWindow).webkitAudioContext;
        if (!AudioCtor) return setAudioBlocked(true);
        contextRef.current ??= new AudioCtor();
        const startedTone = await ensureAlertTone(
          contextRef.current,
          Boolean(stopToneRef.current),
          startAlarmTone,
          () => cancelled,
        );
        if (cancelled) {
          startedTone?.();
          return;
        }
        if (!startedTone) return setAudioBlocked(true);
        setAudioBlocked(false);
        stopToneRef.current = startedTone;
      } catch {
        setAudioBlocked(true);
      }
    })();
    return () => { cancelled = true; };
  }, [active, stopTone]);

  useEffect(() => {
    if (!audioBlocked || !active) return;
    let cancelled = false;
    const enable = () => void (async () => {
      try {
        const startedTone = await ensureAlertTone(
          contextRef.current,
          Boolean(stopToneRef.current),
          startAlarmTone,
          () => cancelled,
        );
        if (cancelled) {
          startedTone?.();
          return;
        }
        if (startedTone) stopToneRef.current = startedTone;
        setAudioBlocked(!stopToneRef.current);
      } catch {
        setAudioBlocked(true);
      }
    })();
    window.addEventListener("pointerdown", enable, { once: true });
    window.addEventListener("keydown", enable, { once: true });
    return () => {
      cancelled = true;
      window.removeEventListener("pointerdown", enable);
      window.removeEventListener("keydown", enable);
    };
  }, [active, audioBlocked]);

  useEffect(() => () => stopToneRef.current?.(), []);

  const acknowledge = useCallback(async () => {
    if (!active) return;
    const action = getMunicipalAlarmAction(active);
    if (!action) return;
    setBusy(true);
    setError(null);
    try {
      if (action.audience === "SUMMONED") {
        const accepted = await municipalTabFetch(
          `/api/municipal-bfp/assistance-requests/${encodeURIComponent(action.assistanceRequestId)}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(action.assistanceBody),
          },
        );
        if (!accepted.ok) {
          const body = await accepted.json().catch(() => ({}));
          throw new Error(body.error || "Unable to accept the provincial call.");
        }
        const seen = await municipalTabFetch(
          `/api/municipal-bfp/incidents/${encodeURIComponent(action.incidentId)}/observer-acknowledgment`,
          { method: "POST", headers: { "Content-Type": "application/json" } },
        );
        if (!seen.ok) {
          const body = await seen.json().catch(() => ({}));
          throw new Error(body.error || "Unable to acknowledge the incident.");
        }
      }

      const marked = await municipalTabFetch("/api/municipal-bfp/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId: active.id }),
      });
      if (!marked.ok) throw new Error("The alert was acknowledged, but its notification could not be cleared.");
      stopTone();
      window.location.assign(action.destination);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to acknowledge this alert.");
    } finally {
      setBusy(false);
    }
  }, [active, stopTone]);

  if (!active || !context) return null;
  const called = Array.isArray(context.summonedMunicipalities)
    ? context.summonedMunicipalities.filter((name): name is string => typeof name === "string")
    : [];

  return (
    <>
      <style>{styles}</style>
      <div className="mad-backdrop" role="alertdialog" aria-modal="true" aria-labelledby="mad-title">
        <section className="mad-card">
          <header className="mad-head">
            <span className="mad-icon" aria-hidden="true"><i className="fa-solid fa-tower-broadcast" /></span>
            <div>
              <div className="mad-title" id="mad-title">
                {isAssistance ? "Backup assistance requested" : `${ORDINAL[alarmLevel] ?? alarmLevel} alarm declared`}
              </div>
              <div className="mad-sub">
                {isAssistance
                  ? `${String(context.requesterMunicipalityName ?? "A nearby municipality")} is calling your municipality`
                  : audience === "SUMMONED"
                    ? "Provincial BFP is calling your municipality"
                    : "Provincial BFP has acted on your backup request"}
              </div>
            </div>
          </header>

          <div className="mad-body">
            <div className="mad-ref">{String(context.referenceNumber ?? "Incident")}</div>
            <div className="mad-grid">
              <div><span className="mad-key">Incident location</span><div className="mad-value">{String(context.location ?? "Not specified")}</div></div>
              {!isAssistance && <div><span className="mad-key">Alarm level</span><div className="mad-value">{ORDINAL[alarmLevel] ?? alarmLevel} alarm</div></div>}
              {(audience === "SUMMONED" || isAssistance) && Number(context.requestedFiretrucks) > 0 && (
                <div><span className="mad-key">Firetrucks requested</span><div className="mad-value">{Number(context.requestedFiretrucks)}</div></div>
              )}
              {(audience === "SUMMONED" || isAssistance) && Number(context.requestedPersonnel) > 0 && (
                <div><span className="mad-key">Personnel requested</span><div className="mad-value">{Number(context.requestedPersonnel)}</div></div>
              )}
            </div>

            {isAssistance && typeof context.requestNote === "string" && context.requestNote.trim() && (
              <div className="mad-called"><strong>Request note:</strong> {context.requestNote}</div>
            )}

            {audience === "ORIGIN" && (
              <div className="mad-called">
                <strong>Municipalities called:</strong>{" "}
                {called.length > 0 ? called.join(", ") : "No additional municipality was within this alarm's reach."}
              </div>
            )}
            {audioBlocked && <div className="mad-note">Click anywhere to allow the alarm sound in this browser.</div>}
            {error && <div className="mad-error" role="status">{error}</div>}
          </div>

          <footer className="mad-foot">
            <button type="button" className="mad-action" disabled={busy} onClick={() => void acknowledge()} autoFocus>
              <i className={`fa-solid ${audience === "SUMMONED" || isAssistance ? "fa-truck-fast" : "fa-list-check"}`} aria-hidden="true" />{" "}
              {busy
                ? "Working…"
                : audience === "SUMMONED"
                  ? "Acknowledge & Assign BFP"
                  : isAssistance
                    ? "Acknowledge & Respond"
                    : "Acknowledge & View Status"}
            </button>
          </footer>
        </section>
      </div>
    </>
  );
}
