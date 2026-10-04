"use client";

import { useSearchParams } from "next/navigation";
import { useRef, useState } from "react";
import type { BarangayAlert, BarangayResourceCommand } from "../../lib/intermunicipality/barangay-alert-types";
import { useProvincialBarangayAlerts } from "./use-provincial-barangay-alerts";

const styles = `
  .pbc-section { --pbc-primary:#DC2626; --pbc-text:#0F172A; --pbc-muted:#64748B; --pbc-border:#E2E8F0; --pbc-soft:#F8FAFC; display:grid; gap:.85rem; color:var(--pbc-text); }
  .pbc-heading { display:flex; align-items:center; justify-content:space-between; gap:.8rem; flex-wrap:wrap; }
  .pbc-heading-main { display:flex; align-items:center; gap:.7rem; min-width:0; }
  .pbc-heading-icon { width:38px; height:38px; flex:none; display:grid; place-items:center; border:1px solid #FECACA; border-radius:11px; background:#FEF2F2; color:var(--pbc-primary); }
  .pbc-heading h2 { margin:0; font-size:1rem; font-weight:850; letter-spacing:-.02em; }
  .pbc-heading p { margin:.2rem 0 0; color:var(--pbc-muted); font-size:.76rem; line-height:1.5; }
  .pbc-live { display:inline-flex; align-items:center; gap:.35rem; color:#166534; font-size:.7rem; font-weight:750; }
  .pbc-live i { font-size:.4rem; }
  .pbc-live.delayed { color:#B91C1C; }
  .pbc-card { min-width:0; padding:1.1rem; background:rgba(255,255,255,.88); border:1px solid var(--pbc-border); border-radius:16px; box-shadow:0 4px 16px rgba(15,23,42,.03); scroll-margin-top:100px; }
  .pbc-card.highlighted { border-color:#2563EB; box-shadow:0 0 0 3px rgba(37,99,235,.12); }
  .pbc-card-header { display:flex; align-items:flex-start; justify-content:space-between; gap:.7rem; flex-wrap:wrap; }
  .pbc-card h3 { margin:0; font-size:.97rem; font-weight:850; }
  .pbc-place { margin:.2rem 0 0; color:var(--pbc-muted); font-size:.76rem; }
  .pbc-badge { display:inline-flex; align-items:center; gap:.3rem; padding:.25rem .55rem; border-radius:7px; font-size:.67rem; font-weight:750; background:#FFF7ED; color:#9A3412; border:1px solid #FED7AA; }
  .pbc-badge.seen { background:#ECFDF5; color:#065F46; border-color:#A7F3D0; }
  .pbc-stats { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:.6rem; margin:1rem 0; }
  .pbc-stat { padding:.65rem .8rem; border:1px solid var(--pbc-border); border-radius:10px; background:var(--pbc-soft); }
  .pbc-stat strong { display:block; font-size:1.2rem; font-weight:850; font-variant-numeric:tabular-nums; }
  .pbc-stat span { display:block; margin-top:.15rem; color:var(--pbc-muted); font-size:.67rem; font-weight:700; }
  .pbc-body { display:grid; grid-template-columns:minmax(0,1fr) minmax(0,1fr); gap:1.1rem; }
  .pbc-list { margin:0; padding:0; list-style:none; display:grid; align-content:start; gap:.65rem; }
  .pbc-incident { padding:.75rem .85rem; border:1px solid var(--pbc-border); border-radius:10px; background:var(--pbc-soft); }
  .pbc-incident-head { display:flex; justify-content:space-between; align-items:center; gap:.45rem; flex-wrap:wrap; font-size:.77rem; }
  .pbc-incident-head strong { word-break:break-word; }
  .pbc-status { color:#334155; font-size:.66rem; font-weight:750; }
  .pbc-incident p { margin:.3rem 0 0; font-size:.72rem; line-height:1.5; color:var(--pbc-muted); }
  .pbc-command-list { margin:.5rem 0 0; padding:0; list-style:none; display:grid; gap:.3rem; }
  .pbc-command-list li { display:flex; flex-wrap:wrap; justify-content:space-between; gap:.4rem; border-top:1px solid var(--pbc-border); padding-top:.35rem; font-size:.7rem; color:#334155; }
  .pbc-form { display:grid; align-content:start; gap:.7rem; min-width:0; }
  .pbc-field { display:grid; gap:.35rem; min-width:0; }
  .pbc-field label { color:#475569; font-size:.68rem; font-weight:800; }
  .pbc-field input,.pbc-field select { box-sizing:border-box; width:100%; min-width:0; min-height:42px; padding:.5rem .65rem; border:1px solid #CBD5E1; border-radius:8px; background:#fff; color:var(--pbc-text); font:inherit; font-size:.76rem; }
  .pbc-field input:disabled,.pbc-field select:disabled { opacity:.6; cursor:not-allowed; }
  .pbc-resources { display:grid; grid-template-columns:1fr 1fr; gap:.65rem; }
  .pbc-note { margin:0; padding:.6rem .75rem; border-radius:8px; background:#FFF7ED; border:1px solid #FED7AA; color:#9A3412; font-size:.74rem; line-height:1.5; }
  .pbc-hint { margin:0; color:var(--pbc-muted); font-size:.68rem; line-height:1.5; }
  .pbc-button { min-height:42px; padding:.55rem .85rem; border:1px solid var(--pbc-primary); border-radius:8px; background:var(--pbc-primary); color:#fff; display:inline-flex; align-items:center; justify-content:center; gap:.4rem; font:inherit; font-size:.77rem; font-weight:750; cursor:pointer; transition:background .15s ease; }
  .pbc-button:hover:not(:disabled) { background:#B91C1C; }
  .pbc-button:disabled { opacity:.5; cursor:not-allowed; }
  .pbc-button.secondary { background:#fff; border-color:#CBD5E1; color:#334155; }
  .pbc-button.secondary:hover:not(:disabled) { background:#F1F5F9; }
  .pbc-button:focus-visible,.pbc-field input:focus-visible,.pbc-field select:focus-visible { outline:2px solid #0F172A; outline-offset:2px; }
  .pbc-error { margin:0; color:#B91C1C; font-size:.75rem; font-weight:700; }
  .pbc-success { margin:0; color:#166534; font-size:.75rem; font-weight:700; }
  .pbc-empty { padding:1.1rem; border:1px solid var(--pbc-border); border-radius:14px; background:#fff; color:var(--pbc-muted); font-size:.78rem; line-height:1.5; }
  @media(max-width:760px) { .pbc-body { grid-template-columns:1fr; } .pbc-card { padding:.9rem; } }
  @media(max-width:380px) { .pbc-stats { gap:.35rem; } .pbc-stat { padding:.55rem; } .pbc-stat span { font-size:.62rem; } }
`;

function readable(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/^./, letter => letter.toUpperCase());
}

function distanceLabel(meters: number) {
  return meters >= 1000 ? `${(meters / 1000).toFixed(1)} km` : `${Math.round(meters)} m`;
}

function BarangayCoordinationCard({ alert, highlighted, submitCommand }: {
  alert: BarangayAlert;
  highlighted: boolean;
  submitCommand: (command: BarangayResourceCommand) => Promise<void>;
}) {
  const [incidentId, setIncidentId] = useState("");
  const [municipalityId, setMunicipalityId] = useState("");
  const [trucks, setTrucks] = useState("1");
  const [personnel, setPersonnel] = useState("0");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const busyRef = useRef(false);
  const incident = alert.incidents.find(row => row.id === incidentId) ?? alert.incidents[0];
  const candidates = [...(incident?.nearbyMunicipalities ?? [])].sort((a, b) => a.distanceMeters - b.distanceMeters);
  const recipient = candidates.find(row => row.municipalityId === municipalityId) ?? candidates[0];
  const existingCommand = incident?.commands.some(command => command.recipientMunicipalityId === recipient?.municipalityId
    && ["REQUESTED", "ACCEPTED", "PARTIALLY_ACCEPTED"].includes(command.status));
  const canSend = !!incident?.dispatched && !!recipient && !existingCommand && !busy;
  const prefix = `pbc-${alert.id}`;
  const commandCount = alert.incidents.reduce((count, row) => count + row.commands.length, 0);

  const send = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSend || busyRef.current || !incident || !recipient) return;
    const requestedFiretrucks = Number(trucks);
    const requestedPersonnel = Number(personnel);
    if (!Number.isSafeInteger(requestedFiretrucks) || !Number.isSafeInteger(requestedPersonnel)
      || requestedFiretrucks < 0 || requestedPersonnel < 0 || requestedFiretrucks > 500 || requestedPersonnel > 500 || requestedFiretrucks + requestedPersonnel === 0) {
      setError("Request at least one resource, using whole numbers from 0 to 500.");
      return;
    }
    busyRef.current = true;
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      await submitCommand({ alertId: alert.id, fireReportId: incident.id, recipientMunicipalityId: recipient.municipalityId, requestedFiretrucks, requestedPersonnel });
      setSuccess(`Resource command sent to ${recipient.municipalityName}.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to send this resource command.");
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  return <article id={`barangay-alert-${alert.id}`} className={`pbc-card${highlighted ? " highlighted" : ""}`} aria-labelledby={`${prefix}-title`}>
    <div className="pbc-card-header">
      <div><h3 id={`${prefix}-title`}>{alert.barangay}</h3><p className="pbc-place"><i className="fa-solid fa-location-dot" aria-hidden="true" /> {alert.municipalityName}</p></div>
      <span className={`pbc-badge${alert.acknowledgedAt ? " seen" : ""}`}><i className={`fa-solid ${alert.acknowledgedAt ? "fa-circle-check" : "fa-bell"}`} aria-hidden="true" />{alert.acknowledgedAt ? "Acknowledged" : "Needs acknowledgment"}</span>
    </div>
    <div className="pbc-stats" aria-label="Current coordination totals">
      <div className="pbc-stat"><strong>{alert.incidentCount}</strong><span>Active incidents</span></div>
      <div className="pbc-stat"><strong>{alert.incidents.filter(row => row.dispatched).length}</strong><span>Municipal dispatches</span></div>
      <div className="pbc-stat"><strong>{commandCount}</strong><span>Resource commands</span></div>
    </div>
    <div className="pbc-body">
      <ul className="pbc-list" aria-label="Active incidents and assistance status">
        {alert.incidents.map(row => <li key={row.id} className="pbc-incident">
          <div className="pbc-incident-head"><strong>{row.referenceNumber}</strong><span className="pbc-status">{readable(row.status)}</span></div>
          <p>{row.fireType ? readable(row.fireType) : "Fire incident"} · {row.dispatched ? "Municipal units dispatched" : "Waiting for municipal dispatch"}</p>
          {row.commands.length > 0 && <ul className="pbc-command-list" aria-label={`Assistance for ${row.referenceNumber}`}>{row.commands.map(command => <li key={command.id}><span>{command.recipientMunicipalityName}</span><strong>{readable(command.status)}</strong></li>)}</ul>}
        </li>)}
      </ul>
      <form className="pbc-form" onSubmit={send} aria-label={`Coordinate support for ${alert.barangay}`}>
        <div className="pbc-field"><label htmlFor={`${prefix}-incident`}>Incident to support</label><select id={`${prefix}-incident`} value={incident?.id ?? ""} disabled={busy} onChange={event => { setIncidentId(event.target.value); setMunicipalityId(""); setError(""); setSuccess(""); }}>{alert.incidents.map(row => <option key={row.id} value={row.id}>{row.referenceNumber} · {readable(row.status)}</option>)}</select></div>
        <div className="pbc-field"><label htmlFor={`${prefix}-municipality`}>Receiving municipality · nearest first</label><select id={`${prefix}-municipality`} value={recipient?.municipalityId ?? ""} disabled={busy || !incident?.dispatched || candidates.length === 0} onChange={event => { setMunicipalityId(event.target.value); setError(""); setSuccess(""); }}>{candidates.length === 0 && <option value="">No eligible nearby municipality</option>}{candidates.map((row, index) => <option key={row.municipalityId} value={row.municipalityId}>{row.municipalityName} · {distanceLabel(row.distanceMeters)}{index === 0 ? " · Nearest" : ""}</option>)}</select><p className="pbc-hint">Approximate straight-line distance from the incident to the BFP station.</p></div>
        {!incident?.dispatched && <p className="pbc-note">Waiting for municipal dispatch. Support commands become available after the municipality dispatches its units.</p>}
        {incident?.dispatched && candidates.length === 0 && <p className="pbc-note">No eligible nearby BFP station is available for this incident.</p>}
        {existingCommand && <p className="pbc-note">A resource command is already active for this municipality. Track its status in the incident list.</p>}
        <div className="pbc-resources">
          <div className="pbc-field"><label htmlFor={`${prefix}-trucks`}>Firetrucks</label><input id={`${prefix}-trucks`} type="number" min="0" max="500" step="1" required inputMode="numeric" value={trucks} disabled={!incident?.dispatched || busy} onChange={event => setTrucks(event.target.value)} /></div>
          <div className="pbc-field"><label htmlFor={`${prefix}-personnel`}>Personnel</label><input id={`${prefix}-personnel`} type="number" min="0" max="500" step="1" required inputMode="numeric" value={personnel} disabled={!incident?.dispatched || busy} onChange={event => setPersonnel(event.target.value)} /></div>
        </div>
        <button type="submit" className="pbc-button" disabled={!canSend}><i className="fa-solid fa-truck-fast" aria-hidden="true" />{busy ? "Sending command..." : "Send Resource Command"}</button>
        {error && <p className="pbc-error" role="alert">{error}</p>}
        {success && <p className="pbc-success" role="status">{success}</p>}
      </form>
    </div>
  </article>;
}

export function ProvincialBarangayCoordination() {
  const { alerts, loading, checking, error, lastCheckedAt, refresh, submitCommand } = useProvincialBarangayAlerts();
  const searchParams = useSearchParams();
  const highlightedId = searchParams.get("barangayAlert");

  return <section className="pbc-section" aria-labelledby="pbc-heading" aria-busy={loading}>
    <style>{styles}</style>
    <div className="pbc-heading">
      <div className="pbc-heading-main"><span className="pbc-heading-icon" aria-hidden="true"><i className="fa-solid fa-fire-flame-curved" /></span><div><h2 id="pbc-heading">Barangay incident coordination</h2><p>Three or more active incidents in one barangay. Assign nearby municipal support.</p></div></div>
      <span className={`pbc-live${error ? " delayed" : ""}`}><i className="fa-solid fa-circle" aria-hidden="true" />{error ? "Sync delayed" : checking ? "Syncing..." : lastCheckedAt ? "Live · every 5 seconds" : "Connecting..."}</span>
    </div>
    {error && <div><p className="pbc-error" role="alert">{error}</p><button type="button" className="pbc-button secondary" disabled={checking} onClick={() => void refresh()}>Retry sync</button></div>}
    {alerts.map(alert => <BarangayCoordinationCard key={alert.id} alert={alert} highlighted={alert.id === highlightedId} submitCommand={submitCommand} />)}
    {alerts.length === 0 && <div className="pbc-empty">{loading ? "Checking active barangay incidents..." : error ? "Current barangay alerts could not be loaded." : "No barangay currently has three or more active incidents."}</div>}
  </section>;
}
