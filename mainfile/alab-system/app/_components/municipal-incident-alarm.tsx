"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useMunicipalIncidentFeed, type MunicipalIncident } from "./use-municipal-incident-feed";
import { getFireTypeLabel, getSeverityLabel } from "../../lib/municipal-bfp/reports/formatters";

/*
 * Incidents that still need a duty officer to look at them. Anything already
 * being worked (dispatched, on scene, resolved) must not raise the alarm again.
 */
const ALARM_STATUSES = new Set([
  "SUBMITTED",
  "PENDING_VERIFICATION",
  "UNDER_VERIFICATION",
  "VERIFIED",
  "CONFIRMED",
]);

/** Acknowledged ids live per tab, so a page change does not re-ring the alarm. */
const ACK_KEY = "alab_acknowledged_incident_alarms";

function readAcknowledged(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = sessionStorage.getItem(ACK_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

function writeAcknowledged(ids: Set<string>): void {
  try {
    sessionStorage.setItem(ACK_KEY, JSON.stringify([...ids]));
  } catch {
    // A full or blocked storage must never stop the alarm from being dismissed.
  }
}

/**
 * Two-tone emergency siren, synthesised rather than loaded, so the alarm needs
 * no audio asset and starts instantly. Returns a stop function.
 */
function startSiren(context: AudioContext): () => void {
  const master = context.createGain();
  master.gain.value = 0.0001;
  master.connect(context.destination);

  const oscillator = context.createOscillator();
  oscillator.type = "sawtooth";
  oscillator.connect(master);

  // Alternate between two pitches, the way a fire alarm sweeps.
  const LOW = 620;
  const HIGH = 880;
  const STEP_SECONDS = 0.55;

  const now = context.currentTime;
  oscillator.frequency.setValueAtTime(LOW, now);
  master.gain.exponentialRampToValueAtTime(0.16, now + 0.05);

  let step = 0;
  const schedule = () => {
    const at = context.currentTime + 0.02;
    step += 1;
    oscillator.frequency.setValueAtTime(step % 2 === 0 ? LOW : HIGH, at);
  };
  const timer = window.setInterval(schedule, STEP_SECONDS * 1000);

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
  .mia-backdrop {
    position: fixed;
    inset: 0;
    z-index: 100001;
    display: grid;
    place-items: center;
    padding: 1rem;
    background: rgba(69, 6, 3, 0.55);
    backdrop-filter: blur(6px);
    animation: miaFade 0.18s ease-out both;
  }

  .mia-card {
    width: 100%;
    max-width: 440px;
    background: #FFFFFF;
    border-radius: 16px;
    overflow: hidden;
    box-shadow: 0 28px 60px -12px rgba(69, 6, 3, 0.5);
    font-family: 'Plus Jakarta Sans', sans-serif;
    animation: miaPop 0.22s cubic-bezier(0.16, 1, 0.3, 1) both;
  }

  .mia-head {
    background: linear-gradient(135deg, #D00F09, #EF4444);
    color: #FFFFFF;
    padding: 1.1rem 1.25rem;
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .mia-siren {
    width: 42px;
    height: 42px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.18);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.15rem;
    flex-shrink: 0;
    animation: miaPulse 1s ease-in-out infinite;
  }

  .mia-title { font-size: 1.02rem; font-weight: 800; letter-spacing: -0.01em; }
  .mia-sub { font-size: 0.76rem; opacity: 0.92; margin-top: 2px; }

  .mia-body { padding: 1.15rem 1.25rem; display: flex; flex-direction: column; gap: 0.85rem; }

  .mia-ref {
    font-family: monospace;
    font-size: 0.95rem;
    font-weight: 800;
    color: #991B1B;
  }

  .mia-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.6rem 1rem;
  }

  .mia-key {
    display: block;
    font-size: 0.64rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: #64748B;
  }

  .mia-val { font-size: 0.85rem; font-weight: 700; color: #0F172A; margin-top: 2px; }

  .mia-more {
    font-size: 0.76rem;
    font-weight: 700;
    color: #B45309;
    background: #FFFBEB;
    border: 1px solid #FDE68A;
    border-radius: 8px;
    padding: 0.5rem 0.7rem;
  }

  .mia-muted {
    font-size: 0.72rem;
    color: #64748B;
    line-height: 1.45;
  }

  .mia-foot {
    padding: 0.9rem 1.25rem;
    background: #F8FAFC;
    border-top: 1px solid #E2E8F0;
    display: flex;
    gap: 0.6rem;
    justify-content: flex-end;
  }

  .mia-btn {
    padding: 0.58rem 1.2rem;
    border-radius: 8px;
    font-size: 0.82rem;
    font-weight: 700;
    cursor: pointer;
    border: 1px solid #CBD5E1;
    background: #FFFFFF;
    color: #334155;
  }

  .mia-btn.primary {
    border: none;
    background: linear-gradient(135deg, #D00F09, #EF4444);
    color: #FFFFFF;
    box-shadow: 0 2px 10px rgba(208, 15, 9, 0.35);
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
  }

  .mia-btn:focus-visible {
    outline: 2px solid #0F172A;
    outline-offset: 2px;
  }

  @keyframes miaFade { from { opacity: 0; } to { opacity: 1; } }
  @keyframes miaPop { from { opacity: 0; transform: translateY(10px) scale(0.98); } to { opacity: 1; transform: none; } }
  @keyframes miaPulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.12); } }

  @media (prefers-reduced-motion: reduce) {
    .mia-backdrop, .mia-card, .mia-siren { animation: none; }
  }

  @media (max-width: 480px) {
    .mia-grid { grid-template-columns: 1fr; }
    .mia-foot { flex-direction: column-reverse; }
    .mia-btn { width: 100%; }
  }
`;

/**
 * Raises a blocking alarm on every municipal page when an unattended report
 * arrives. The siren keeps sounding until a duty officer acknowledges it.
 */
export function MunicipalIncidentAlarm() {
  const { incidents } = useMunicipalIncidentFeed();
  const [acknowledged, setAcknowledged] = useState<Set<string>>(() => readAcknowledged());
  const [audioBlocked, setAudioBlocked] = useState(false);

  const contextRef = useRef<AudioContext | null>(null);
  const stopSirenRef = useRef<(() => void) | null>(null);

  const pending = useMemo(
    () => incidents.filter((incident) => ALARM_STATUSES.has(incident.status) && !acknowledged.has(incident.id)),
    [incidents, acknowledged],
  );
  const active: MunicipalIncident | undefined = pending[0];

  const stopSiren = useCallback(() => {
    stopSirenRef.current?.();
    stopSirenRef.current = null;
  }, []);

  // The siren runs for as long as an unacknowledged report is on screen.
  useEffect(() => {
    if (!active) {
      stopSiren();
      return;
    }
    if (stopSirenRef.current) return;

    let cancelled = false;
    const run = async () => {
      try {
        type WindowWithAudio = Window & { webkitAudioContext?: typeof AudioContext };
        const AudioCtor = window.AudioContext ?? (window as WindowWithAudio).webkitAudioContext;
        if (!AudioCtor) {
          setAudioBlocked(true);
          return;
        }
        contextRef.current ??= new AudioCtor();
        const context = contextRef.current;
        // Browsers suspend audio until the page has been interacted with.
        if (context.state === "suspended") await context.resume();
        if (context.state !== "running") {
          setAudioBlocked(true);
          return;
        }
        if (cancelled) return;
        setAudioBlocked(false);
        stopSirenRef.current = startSiren(context);
      } catch {
        setAudioBlocked(true);
      }
    };
    void run();

    return () => {
      cancelled = true;
    };
  }, [active, stopSiren]);

  // A blocked siren starts as soon as the officer touches the page.
  useEffect(() => {
    if (!audioBlocked || !active) return;
    const prime = () => {
      void contextRef.current?.resume().then(() => setAudioBlocked(false)).catch(() => {});
    };
    window.addEventListener("pointerdown", prime, { once: true });
    window.addEventListener("keydown", prime, { once: true });
    return () => {
      window.removeEventListener("pointerdown", prime);
      window.removeEventListener("keydown", prime);
    };
  }, [audioBlocked, active]);

  useEffect(() => () => stopSirenRef.current?.(), []);

  const acknowledge = useCallback((incidentId: string) => {
    stopSiren();
    setAcknowledged((current) => {
      const next = new Set(current).add(incidentId);
      writeAcknowledged(next);
      return next;
    });
  }, [stopSiren]);

  if (!active) return null;

  const proceed = () => {
    acknowledge(active.id);
    window.location.href = `/municipal-bfp/active-incidents?incident=${encodeURIComponent(active.id)}`;
  };

  return (
    <>
      <style>{styles}</style>
      <div className="mia-backdrop" role="alertdialog" aria-modal="true" aria-labelledby="mia-title">
        <div className="mia-card">
          <div className="mia-head">
            <span className="mia-siren" aria-hidden="true">
              <i className="fa-solid fa-bell" />
            </span>
            <div>
              <div className="mia-title" id="mia-title">New Fire Report Received</div>
              <div className="mia-sub">
                {pending.length > 1 ? `${pending.length} reports awaiting action` : "Awaiting duty officer action"}
              </div>
            </div>
          </div>

          <div className="mia-body">
            <div className="mia-ref">{active.referenceNumber}</div>

            <div className="mia-grid">
              <div>
                <span className="mia-key">Barangay</span>
                <div className="mia-val">{active.barangay || "Not specified"}</div>
              </div>
              <div>
                <span className="mia-key">Fire Type</span>
                <div className="mia-val">{getFireTypeLabel(active.fireType)}</div>
              </div>
              <div>
                <span className="mia-key">Level of Danger</span>
                <div className="mia-val">{getSeverityLabel(active.calculatedSeverity || "UNKNOWN")}</div>
              </div>
              <div>
                <span className="mia-key">Intake</span>
                <div className="mia-val">
                  {active.reportSource === "ALAB_APP" ? "ALAB Mobile App" : "Emergency Call"}
                </div>
              </div>
            </div>

            {pending.length > 1 && (
              <div className="mia-more">
                {pending.length - 1} more report{pending.length - 1 > 1 ? "s" : ""} will follow after this one.
              </div>
            )}

            {audioBlocked && (
              <div className="mia-muted">
                The alarm tone is waiting for this browser to allow sound. Click anywhere to enable it.
              </div>
            )}
          </div>

          <div className="mia-foot">
            <button type="button" className="mia-btn" onClick={() => acknowledge(active.id)}>
              Acknowledge
            </button>
            <button type="button" className="mia-btn primary" onClick={proceed} autoFocus>
              <i className="fa-solid fa-arrow-right" /> Proceed to Incident
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
