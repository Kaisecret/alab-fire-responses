"use client";

import { useEffect, useRef, useState } from "react";
import { EmergencyAlertCard } from "./emergency-alert-card";
import { useProvincialBarangayAlerts } from "./use-provincial-barangay-alerts";

const styles = `
  .pbga-dialog { margin:auto; inset:0; padding:0; border:0; border-radius:22px; width:calc(100% - 2rem); max-width:470px; max-height:calc(100dvh - 2rem); overflow:visible; background:transparent; }
  .pbga-dialog .eac-card { max-height:calc(100dvh - 2rem); }
  .pbga-dialog::backdrop { background:rgba(69,6,3,.62); backdrop-filter:blur(6px); }
  .pbga-note { margin:0; padding:.7rem .85rem; border:1px solid #FECACA; border-radius:12px; background:#FEF2F2; color:#7F1D1D; font-size:.8rem; line-height:1.5; }
  .pbga-incidents { margin:0; padding-left:1.1rem; color:#334155; font-size:.78rem; line-height:1.65; }
  .pbga-error { margin:0; color:#B91C1C; font-size:.8rem; font-weight:700; }
`;

export function ProvincialBarangayAlert() {
  const { alerts, acknowledge } = useProvincialBarangayAlerts();
  const active = alerts.find(alert => !alert.acknowledgedAt);
  const activeId = active?.id;
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const busyRef = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

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
      if (manage) window.location.assign(`/provincial-bfp/assistance-requests?barangayAlert=${encodeURIComponent(active.id)}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to acknowledge this alert.");
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  if (!active) return null;

  return <>
    <style>{styles}</style>
    <dialog ref={dialogRef} className="pbga-dialog" role="alertdialog" aria-modal="true" aria-labelledby="pbga-title" aria-describedby="pbga-description"
      onCancel={event => { event.preventDefault(); void answer(false); }}>
      <EmergencyAlertCard
        theme={{ primary: "#DC2626", dark: "#991B1B", soft: "#FEF2F2", softBorder: "#FECACA" }}
        titleId="pbga-title" title="Multiple Active Incidents" subtitle="Provincial coordination required" heroBadge="fa-tower-broadcast"
        code={{ label: "Affected barangay", value: active.barangay }}
        facts={[
          { icon: "fa-city", label: "Municipality", value: active.municipalityName },
          { icon: "fa-fire", label: "Active incidents", value: String(active.incidentCount) },
        ]}
        actions={[
          { label: busy ? "Working..." : "Acknowledge", icon: "fa-circle-check", variant: "secondary", disabled: busy, autoFocus: true, onClick: () => answer(false) },
          { label: "Manage Coordination", icon: "fa-arrow-right", variant: "primary", disabled: busy, onClick: () => answer(true) },
        ]}>
        <p id="pbga-description" className="pbga-note">Three or more active incidents in one barangay. Coordinate support from the nearest municipality for each dispatched incident.</p>
        <ul className="pbga-incidents">{active.incidents.map(incident => <li key={incident.id}>{incident.referenceNumber} · {incident.status.replaceAll("_", " ")} · {incident.dispatched ? "Municipal units dispatched" : "Waiting for municipal dispatch"}</li>)}</ul>
        {alerts.filter(alert => !alert.acknowledgedAt).length > 1 && <p className="pbga-note">More barangay alerts are waiting for acknowledgment.</p>}
        {error && <p className="pbga-error" role="alert">{error}</p>}
      </EmergencyAlertCard>
    </dialog>
  </>;
}
