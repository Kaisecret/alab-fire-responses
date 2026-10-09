"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { municipalTabFetch } from "../../lib/auth/municipal-tab-fetch";
import { EmergencyAlertCard } from "./emergency-alert-card";
import { showSuccessToast } from "./success-toast";

type StationCard = {
  id: string;
  name: string;
  head: string | null;
  distanceMeters: number;
  activePersonnelCount: number;
  status: "AVAILABLE" | "BUSY" | "ON_THIS_FIRE" | "NO_CREW";
  selectable: boolean;
  recommended: boolean;
};

type LocalBackupRequest = {
  id: string;
  fireReportId: string;
  referenceNumber: string;
  barangay: string | null;
  requestedByName: string;
  reason: string | null;
  requestedStationIds: string[];
  createdAt: string;
  stations: StationCard[];
};

const POLL_INTERVAL_MS = 5_000;

const STATUS_LABEL: Record<StationCard["status"], string> = {
  AVAILABLE: "Available",
  BUSY: "On another fire",
  ON_THIS_FIRE: "On this fire",
  NO_CREW: "No crew on duty",
};

/** Short two-note chime, softer than the province backup siren. */
function startLocalTone(context: AudioContext): () => void {
  const master = context.createGain();
  master.gain.value = 0.0001;
  master.connect(context.destination);
  const oscillator = context.createOscillator();
  oscillator.type = "triangle";
  oscillator.connect(master);
  oscillator.frequency.setValueAtTime(660, context.currentTime);
  master.gain.exponentialRampToValueAtTime(0.12, context.currentTime + 0.05);
  let step = 0;
  const timer = window.setInterval(() => {
    step += 1;
    oscillator.frequency.setValueAtTime(step % 2 === 0 ? 660 : 880, context.currentTime + 0.02);
  }, 520);
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
  .mlb-backdrop { position:fixed; inset:0; z-index:100001; display:grid; place-items:center; padding:1rem; background:rgba(15,23,42,.55); backdrop-filter:blur(6px); }
  .mlb-reason { background:#FFFBEB; border:1px solid #FDE68A; border-radius:10px; padding:.7rem .85rem; font-size:.83rem; color:#92400E; line-height:1.55; }
  .mlb-head { display:flex; align-items:center; justify-content:space-between; gap:.5rem; font-size:.72rem; font-weight:800; letter-spacing:.06em; text-transform:uppercase; color:#475569; }
  .mlb-list { display:grid; gap:.5rem; margin:0; padding:0; list-style:none; }
  .mlb-station { display:flex; align-items:center; gap:.75rem; padding:.7rem .8rem; border:1.5px solid #E2E8F0; border-radius:14px; background:#fff; cursor:pointer; transition:border-color .15s ease, background .15s ease; }
  .mlb-station:hover { border-color:#93C5FD; }
  .mlb-station.is-picked { border-color:#2563EB; background:#EFF6FF; }
  .mlb-station.is-off { cursor:not-allowed; opacity:.55; background:#F8FAFC; }
  .mlb-station input { width:18px; height:18px; accent-color:#2563EB; flex:none; }
  .mlb-main { flex:1; min-width:0; display:grid; gap:.12rem; }
  .mlb-name { font-size:.88rem; font-weight:800; color:#0F172A; }
  .mlb-meta { font-size:.74rem; color:#64748B; font-weight:600; }
  .mlb-tags { display:flex; flex-wrap:wrap; gap:.3rem; justify-content:flex-end; }
  .mlb-tag { padding:.18rem .5rem; border-radius:999px; font-size:.64rem; font-weight:800; white-space:nowrap; background:#F1F5F9; color:#475569; }
  .mlb-tag.ok { background:#DCFCE7; color:#166534; }
  .mlb-tag.busy { background:#FEF3C7; color:#92400E; }
  .mlb-tag.rec { background:#DBEAFE; color:#1D4ED8; }
  .mlb-tag.asked { background:#EDE9FE; color:#5B21B6; }
  .mlb-note { font-size:.76rem; color:#475569; line-height:1.5; }
  .mlb-err { font-size:.78rem; color:#B91C1C; font-weight:700; }
`;

/**
 * Raises a responder's request for another station from this town. The
 * officer sends the ticked stations into the same response or declines; it
 * never forwards to the province.
 */
export function MunicipalLocalBackupAlarm() {
  const [requests, setRequests] = useState<LocalBackupRequest[]>([]);
  const [picked, setPicked] = useState<{ requestId: string; ids: string[] } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const contextRef = useRef<AudioContext | null>(null);
  const stopToneRef = useRef<(() => void) | null>(null);

  const load = useCallback(async () => {
    if (document.visibilityState !== "visible") return;
    try {
      const res = await municipalTabFetch("/api/municipal-bfp/local-backup-requests", { cache: "no-store" });
      if (!res.ok) {
        console.error("Local backup poll refused", res.status);
        return;
      }
      const body = await res.json();
      setRequests(Array.isArray(body.localBackupRequests) ? body.localBackupRequests : []);
    } catch (cause) {
      console.error("Local backup poll failed", cause);
    }
  }, []);

  useEffect(() => {
    const initial = window.setTimeout(() => void load(), 0);
    const poll = window.setInterval(() => void load(), POLL_INTERVAL_MS);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(poll);
    };
  }, [load]);

  const active = requests[0];

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
        stopToneRef.current = startLocalTone(context);
      } catch {
        // A browser that refuses audio still shows the card.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [active]);

  useEffect(() => () => stopToneRef.current?.(), []);

  // The responder's own picks, until the officer changes them.
  const selectable = new Set(active?.stations.filter((s) => s.selectable).map((s) => s.id) ?? []);
  const selected = picked && picked.requestId === active?.id
    ? picked.ids
    : (active?.requestedStationIds ?? []).filter((id) => selectable.has(id));

  const toggle = (stationId: string) => {
    if (!active || !selectable.has(stationId)) return;
    const next = selected.includes(stationId) ? selected.filter((id) => id !== stationId) : [...selected, stationId];
    setPicked({ requestId: active.id, ids: next });
  };

  const answer = useCallback(async (action: "SEND" | "DECLINE") => {
    if (!active) return;
    setBusy(true);
    setError(null);
    try {
      const res = await municipalTabFetch("/api/municipal-bfp/local-backup-requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId: active.id, action, stationIds: selected }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Unable to answer that request.");
      stopToneRef.current?.();
      stopToneRef.current = null;
      setPicked(null);
      showSuccessToast(action === "DECLINE"
        ? "Local backup request declined."
        : selected.length === 1 ? "Station sent to the fire." : `${selected.length} stations sent to the fire.`);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Something went wrong.");
      await load();
    } finally {
      setBusy(false);
    }
  }, [active, selected, load]);

  if (!active) return null;

  const sendLabel = selected.length === 1
    ? `Send ${active.stations.find((s) => s.id === selected[0])?.name ?? "station"}`
    : `Send ${selected.length} stations`;

  return (
    <>
      <style>{styles}</style>
      <div className="mlb-backdrop" role="alertdialog" aria-modal="true" aria-labelledby="mlb-title">
        <EmergencyAlertCard
          theme={{ primary: "#2563EB", dark: "#1D4ED8", soft: "#EFF6FF", softBorder: "#BFDBFE" }}
          titleId="mlb-title"
          title="Local backup requested"
          subtitle={`${active.requestedByName} needs another station from your town`}
          heroBadge="fa-truck-moving"
          code={{ label: "Report code", value: active.referenceNumber }}
          facts={[
            { icon: "fa-location-dot", label: "Barangay", value: active.barangay || "Not specified" },
            { icon: "fa-user-shield", label: "Requested by", value: active.requestedByName },
          ]}
          actions={[
            { label: "Decline", icon: "fa-xmark", variant: "secondary", disabled: busy, onClick: () => void answer("DECLINE") },
            {
              label: busy ? "Sending..." : sendLabel,
              icon: "fa-truck-fast",
              variant: "primary",
              disabled: busy || selected.length === 0,
              autoFocus: true,
              onClick: () => void answer("SEND"),
            },
          ]}
        >
          {active.reason && <div className="mlb-reason">{active.reason}</div>}
          <div className="mlb-head">
            <span>Your stations</span>
            <span>{selected.length} ticked</span>
          </div>
          <ul className="mlb-list">
            {active.stations.map((station) => {
              const isPicked = selected.includes(station.id);
              const tagClass = station.status === "AVAILABLE" ? "ok" : station.status === "BUSY" ? "busy" : "";
              return (
                <li key={station.id}>
                  <label className={`mlb-station${isPicked ? " is-picked" : ""}${station.selectable ? "" : " is-off"}`}>
                    <input
                      type="checkbox"
                      checked={isPicked}
                      disabled={!station.selectable || busy}
                      onChange={() => toggle(station.id)}
                    />
                    <span className="mlb-main">
                      <span className="mlb-name">{station.name}</span>
                      <span className="mlb-meta">
                        {[station.head, `${(station.distanceMeters / 1000).toFixed(1)} km away`, `${station.activePersonnelCount} on duty`]
                          .filter(Boolean).join(" · ")}
                      </span>
                    </span>
                    <span className="mlb-tags">
                      {active.requestedStationIds.includes(station.id) && <span className="mlb-tag asked">Asked for</span>}
                      {station.recommended && <span className="mlb-tag rec">Nearest</span>}
                      <span className={`mlb-tag ${tagClass}`}>{STATUS_LABEL[station.status]}</span>
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
          <p className="mlb-note">Sending adds the ticked stations and their crew to this response. It does not call the province.</p>
          {error && <div className="mlb-err" role="alert">{error}</div>}
        </EmergencyAlertCard>
      </div>
    </>
  );
}
