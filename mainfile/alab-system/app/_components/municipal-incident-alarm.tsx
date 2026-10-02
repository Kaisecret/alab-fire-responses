"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { municipalTabFetch } from "../../lib/auth/municipal-tab-fetch";
import { useMunicipalIncidentFeed, type MunicipalIncident } from "./use-municipal-incident-feed";
import { getFireTypeLabel, getSeverityLabel } from "../../lib/municipal-bfp/reports/formatters";
import { EmergencyAlertCard } from "./emergency-alert-card";

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

/*
 * The station's acknowledgement is saved on the report (acknowledgedAt), so a
 * sign-in on any device stays quiet for reports already attended to. This
 * browser copy only bridges the seconds until the next queue refresh, and
 * keeps the alarm dismissed if the save could not reach the server.
 */
const ACK_KEY = "alab_acknowledged_incident_alarms";

function readAcknowledged(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(ACK_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

function writeAcknowledged(ids: Set<string>): void {
  try {
    localStorage.setItem(ACK_KEY, JSON.stringify([...ids]));
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
  .mia-note {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.55rem 0.75rem;
    border-radius: 11px;
    background: #FFFBEB;
    color: #92400E;
    font-size: 0.74rem;
    font-weight: 700;
  }
  .mia-note.muted { background: #F1F5F9; color: #475569; }
  @keyframes miaFade { from { opacity: 0; } to { opacity: 1; } }
  @media (prefers-reduced-motion: reduce) { .mia-backdrop { animation: none; } }
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
    // Only this station's own reports sound the siren. Nearby fires show on
    // the board; a request for help has its own alarm (MunicipalAlarmDeclaration).
    () => incidents.filter((incident) => ALARM_STATUSES.has(incident.status)
      && incident.accessScope !== "OBSERVER"
      && !incident.acknowledgedAt
      && !acknowledged.has(incident.id)),
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
      /*
       * Keep only ids the queue still knows about. Acknowledgements now outlive
       * the tab, so without this the stored list would grow for the life of the
       * browser profile.
       */
      const live = new Set(incidents.map((incident) => incident.id));
      const next = new Set([...current].filter((id) => live.has(id)));
      next.add(incidentId);
      writeAcknowledged(next);
      return next;
    });
    // Save it for the whole station, so other sign-ins and devices stay quiet.
    const incident = incidents.find((item) => item.id === incidentId);
    if (incident?.accessScope !== "OBSERVER") {
      void municipalTabFetch(`/api/municipal-bfp/incidents/${encodeURIComponent(incidentId)}/acknowledge`, { method: "POST", keepalive: true })
        .catch(() => undefined);
    }
  }, [stopSiren, incidents]);

  if (!active) return null;

  const proceed = () => {
    acknowledge(active.id);
    window.location.href = `/municipal-bfp/active-incidents?incident=${encodeURIComponent(active.id)}`;
  };

  return (
    <>
      <style>{styles}</style>
      <div className="mia-backdrop" role="alertdialog" aria-modal="true" aria-labelledby="mia-title">
        <EmergencyAlertCard
          theme={{ primary: "#E5251D", dark: "#C2160F", soft: "#FEF2F1", softBorder: "#FBD5D2" }}
          titleId="mia-title"
          title="New Fire Report Received"
          subtitle={pending.length > 1 ? `${pending.length} reports awaiting action` : "Awaiting duty officer action"}
          code={{ label: "Report code", value: active.referenceNumber }}
          facts={[
            { icon: "fa-location-dot", label: "Barangay", value: active.barangay || "Not specified" },
            { icon: "fa-fire", label: "Fire type", value: getFireTypeLabel(active.fireType) },
            { icon: "fa-triangle-exclamation", label: "Level of danger", value: getSeverityLabel(active.calculatedSeverity || "UNKNOWN") },
            {
              icon: active.reportSource === "ALAB_APP" ? "fa-mobile-screen" : "fa-phone-volume",
              label: "Intake",
              value: active.reportSource === "ALAB_APP" ? "ALAB Mobile App" : "Emergency Call",
            },
          ]}
          actions={[
            { label: "Acknowledge", icon: "fa-circle-check", variant: "secondary", onClick: () => acknowledge(active.id) },
            { label: "Proceed to Incident", icon: "fa-arrow-right", variant: "primary", onClick: proceed, autoFocus: true },
          ]}
        >
          {pending.length > 1 && <div className="mia-note"><i className="fa-solid fa-layer-group" aria-hidden="true" />{pending.length - 1} more waiting after this one</div>}
          {audioBlocked && <div className="mia-note muted"><i className="fa-solid fa-volume-xmark" aria-hidden="true" />Click anywhere to enable the alarm sound</div>}
        </EmergencyAlertCard>
      </div>
    </>
  );
}
