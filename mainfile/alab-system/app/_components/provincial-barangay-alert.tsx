"use client";

import { useEffect, useRef, useState } from "react";
import { BARANGAY_CLUSTER_SIZE, groupByBarangay } from "../../lib/intermunicipality/barangay-clusters";
import { useAlarmSiren } from "./alarm-siren";
import { EmergencyAlertCard } from "./emergency-alert-card";
import { useProvincialBarangayAlerts } from "./use-provincial-barangay-alerts";

// The popup names a few reports; the coordination screen lists them all.
const LISTED_INCIDENTS = 5;

const styles = `
  .pbga-dialog { margin:auto; inset:0; padding:0; border:0; border-radius:22px; width:calc(100% - 2rem); max-width:470px; max-height:calc(100dvh - 2rem); overflow:visible; background:transparent; }
  .pbga-dialog .eac-card { max-height:calc(100dvh - 2rem); }
  .pbga-dialog::backdrop { background:rgba(69,6,3,.62); backdrop-filter:blur(6px); }
  .pbga-note { margin:0; padding:.7rem .85rem; border:1px solid #FECACA; border-radius:12px; background:#FEF2F2; color:#7F1D1D; font-size:.8rem; line-height:1.5; }
  .pbga-note.muted { border-color:#E2E8F0; background:#F1F5F9; color:#475569; font-weight:700; }
  .pbga-incidents { margin:0; padding-left:1.1rem; color:#334155; font-size:.78rem; line-height:1.65; }
  .pbga-more { margin:0; color:#64748B; font-size:.76rem; font-weight:700; }
  .pbga-error { margin:0; color:#B91C1C; font-size:.8rem; font-weight:700; }
`;

/**
 * Sounds the new-report siren on every provincial page once a municipality has
 * three or more active reports, until the duty officer answers it.
 */
export function ProvincialBarangayAlert() {
  const { alerts, acknowledge } = useProvincialBarangayAlerts();
  const active = alerts.find(alert => !alert.acknowledgedAt);
  const activeId = active?.id;
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const busyRef = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const { audioBlocked } = useAlarmSiren(!!active);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!activeId || !dialog) return;
    const previouslyFocused = document.activeElement;
    dialog.showModal();
    dialog.querySelector<HTMLButtonElement>("[autofocus]")?.focus();
    return () => {
      dialog.close();
      if (previouslyFocused instanceof HTMLElement && previouslyFocused.isConnected) previouslyFocused.focus();
    };
  }, [activeId]);

  const answer = async (manage: boolean) => {
    if (!active || busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError("");
    try {
      await acknowledge(active);
      if (manage) window.location.assign(`/provincial-bfp/incident-clusters?alert=${encodeURIComponent(active.id)}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to acknowledge this alert.");
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  if (!active) return null;

  const barangays = groupByBarangay(active.incidents);
  const cluster = barangays.find(group => group.barangay && group.incidents.length >= BARANGAY_CLUSTER_SIZE);
  const hidden = active.incidents.length - LISTED_INCIDENTS;

  return <>
    <style>{styles}</style>
    <dialog ref={dialogRef} className="pbga-dialog" role="alertdialog" aria-modal="true" aria-labelledby="pbga-title" aria-describedby="pbga-description"
      onCancel={event => { event.preventDefault(); void answer(false); }}>
      <EmergencyAlertCard
        theme={{ primary: "#DC2626", dark: "#991B1B", soft: "#FEF2F2", softBorder: "#FECACA" }}
        titleId="pbga-title" title="Multiple Fire Reports" subtitle="Provincial coordination required" heroBadge="fa-tower-broadcast"
        code={{ label: "Affected municipality", value: active.municipalityName }}
        facts={[
          { icon: "fa-fire", label: "Active reports", value: String(active.incidentCount) },
          cluster
            ? { icon: "fa-location-dot", label: "Barangay cluster", value: `${cluster.barangay} (${cluster.incidents.length})` }
            : { icon: "fa-location-dot", label: "Barangays", value: String(barangays.length) },
        ]}
        actions={[
          { label: busy ? "Working..." : "Acknowledge", icon: "fa-circle-check", variant: "secondary", disabled: busy, autoFocus: true, onClick: () => answer(false) },
          { label: "Open Coordination", icon: "fa-arrow-right", variant: "primary", disabled: busy, onClick: () => answer(true) },
        ]}>
        <p id="pbga-description" className="pbga-note">Three or more active fire reports in one municipality. Coordinate support from the nearest municipality for each dispatched incident.</p>
        <ul className="pbga-incidents">{active.incidents.slice(0, LISTED_INCIDENTS).map(incident => <li key={incident.id}>{incident.referenceNumber} · {incident.barangay ?? "Unknown barangay"} · {incident.dispatched ? "Units dispatched" : "Waiting for dispatch"}</li>)}</ul>
        {hidden > 0 && <p className="pbga-more">+{hidden} more on the coordination screen</p>}
        {alerts.filter(alert => !alert.acknowledgedAt).length > 1 && <p className="pbga-note">More municipalities are waiting for acknowledgment.</p>}
        {audioBlocked && <p className="pbga-note muted"><i className="fa-solid fa-volume-xmark" aria-hidden="true" /> Click anywhere to enable the alarm sound</p>}
        {error && <p className="pbga-error" role="alert">{error}</p>}
      </EmergencyAlertCard>
    </dialog>
  </>;
}
