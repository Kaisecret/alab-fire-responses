"use client";

import { useSearchParams } from "next/navigation";
import { useRef, useState } from "react";
import type { BarangayAlert, BarangayAlertIncident, BarangayResourceCommand } from "../../lib/intermunicipality/barangay-alert-types";
import { BARANGAY_CLUSTER_SIZE, groupByBarangay } from "../../lib/intermunicipality/barangay-clusters";
import { FireCommandHeader } from "./fire-command-header";
import { useProvincialBarangayAlerts } from "./use-provincial-barangay-alerts";

const styles = `
  .pbc-section { --pbc-primary:#DC2626; --pbc-text:#0F172A; --pbc-muted:#64748B; --pbc-border:#E2E8F0; --pbc-soft:#F8FAFC; display:grid; gap:1rem; padding:12px 1.5rem 3rem; color:var(--pbc-text); font-family:'Plus Jakarta Sans',-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif; }
  .pbc-intro { margin:0; color:var(--pbc-muted); font-size:.8rem; line-height:1.5; }
  .pbc-card { min-width:0; padding:1.1rem; background:#fff; border:1px solid var(--pbc-border); border-radius:16px; box-shadow:0 4px 16px rgba(15,23,42,.03); scroll-margin-top:100px; }
  .pbc-card.highlighted { border-color:#2563EB; box-shadow:0 0 0 3px rgba(37,99,235,.12); }
  .pbc-card-header { display:flex; align-items:flex-start; justify-content:space-between; gap:.7rem; flex-wrap:wrap; }
  .pbc-card h3 { margin:0; font-size:1.05rem; font-weight:850; letter-spacing:-.01em; }
  .pbc-place { margin:.2rem 0 0; color:var(--pbc-muted); font-size:.76rem; }
  .pbc-badge { display:inline-flex; align-items:center; gap:.3rem; padding:.25rem .55rem; border-radius:7px; font-size:.67rem; font-weight:750; background:#FFF7ED; color:#9A3412; border:1px solid #FED7AA; }
  .pbc-badge.seen { background:#ECFDF5; color:#065F46; border-color:#A7F3D0; }
  .pbc-barangays { margin:.8rem 0 0; padding:0; list-style:none; display:flex; flex-wrap:wrap; gap:.4rem; }
  .pbc-barangays li { padding:.25rem .6rem; border:1px solid var(--pbc-border); border-radius:999px; background:var(--pbc-soft); color:#334155; font-size:.7rem; font-weight:700; }
  .pbc-barangays li.cluster { border-color:#FECACA; background:#FEF2F2; color:#991B1B; }
  .pbc-stats { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:.6rem; margin:1rem 0; }
  .pbc-stat { padding:.65rem .8rem; border:1px solid var(--pbc-border); border-radius:10px; background:var(--pbc-soft); }
  .pbc-stat strong { display:block; font-size:1.2rem; font-weight:850; font-variant-numeric:tabular-nums; }
  .pbc-stat span { display:block; margin-top:.15rem; color:var(--pbc-muted); font-size:.67rem; font-weight:700; }
  .pbc-body { display:grid; grid-template-columns:minmax(0,1.15fr) minmax(280px,.85fr); align-items:start; gap:1.1rem; }
  .pbc-lists { display:grid; gap:.65rem; min-width:0; }
  .pbc-list-title { margin:0; color:#475569; font-size:.7rem; font-weight:800; text-transform:uppercase; letter-spacing:.04em; }
  .pbc-list { margin:0; padding:0; list-style:none; display:grid; gap:.5rem; }
  .pbc-incident { padding:.65rem .8rem; border:1px solid var(--pbc-border); border-radius:10px; background:var(--pbc-soft); }
  .pbc-incident.selected { border-color:#FCA5A5; background:#FEF2F2; }
  .pbc-incident-head { display:flex; justify-content:space-between; align-items:center; gap:.45rem; flex-wrap:wrap; font-size:.77rem; }
  .pbc-incident-head strong { word-break:break-word; }
  .pbc-status { color:#334155; font-size:.66rem; font-weight:750; }
  .pbc-incident p { margin:.25rem 0 0; font-size:.72rem; line-height:1.5; color:var(--pbc-muted); }
  .pbc-command-list { margin:.5rem 0 0; padding:0; list-style:none; display:grid; gap:.3rem; }
  .pbc-command-list li { display:flex; flex-wrap:wrap; justify-content:space-between; gap:.4rem; border-top:1px solid var(--pbc-border); padding-top:.35rem; font-size:.7rem; color:#334155; }
  .pbc-waiting { border:1px dashed #CBD5E1; border-radius:10px; padding:.55rem .75rem; background:#fff; }
  .pbc-waiting summary { cursor:pointer; color:#475569; font-size:.74rem; font-weight:750; }
  .pbc-waiting[open] summary { margin-bottom:.55rem; }
  .pbc-form { position:sticky; top:88px; display:grid; align-content:start; gap:.7rem; min-width:0; padding:.9rem; border:1px solid var(--pbc-border); border-radius:12px; background:var(--pbc-soft); }
  .pbc-form-title { margin:0; font-size:.82rem; font-weight:850; }
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
  .pbc-button:focus-visible,.pbc-field input:focus-visible,.pbc-field select:focus-visible,.pbc-waiting summary:focus-visible { outline:2px solid #0F172A; outline-offset:2px; }
  .pbc-error { margin:0; color:#B91C1C; font-size:.75rem; font-weight:700; }
  .pbc-success { margin:0; color:#166534; font-size:.75rem; font-weight:700; }
  .pbc-empty { display:grid; justify-items:center; gap:.35rem; padding:3rem 1.5rem; border:1px solid var(--pbc-border); border-radius:16px; background:#fff; color:var(--pbc-muted); font-size:.8rem; line-height:1.5; text-align:center; }
  .pbc-empty i { display:grid; place-items:center; width:48px; height:48px; border-radius:50%; background:#F1F5F9; color:#94A3B8; font-size:1.2rem; }
  .pbc-empty strong { color:#1E293B; font-size:.95rem; }
  @media(max-width:860px) { .pbc-body { grid-template-columns:1fr; } .pbc-form { position:static; } }
  @media(max-width:760px) { .pbc-section { padding:12px 1rem 2.5rem; } .pbc-card { padding:.9rem; } }
  @media(max-width:380px) { .pbc-stats { gap:.35rem; } .pbc-stat { padding:.55rem; } .pbc-stat span { font-size:.62rem; } }
`;

function readable(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/^./, letter => letter.toUpperCase());
}

function distanceLabel(meters: number) {
  return meters >= 1000 ? `${(meters / 1000).toFixed(1)} km` : `${Math.round(meters)} m`;
}

function plural(count: number, word: string) {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

function MunicipalCoordinationCard({ alert, highlighted, submitCommand }: {
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
  // Only dispatched incidents can receive support, so they lead the list and the form.
  const ready = alert.incidents.filter(row => row.dispatched);
  const waiting = alert.incidents.filter(row => !row.dispatched);
  const incident = alert.incidents.find(row => row.id === incidentId) ?? ready[0] ?? alert.incidents[0];
  const candidates = [...(incident?.nearbyMunicipalities ?? [])].sort((a, b) => a.distanceMeters - b.distanceMeters);
  const recipient = candidates.find(row => row.municipalityId === municipalityId) ?? candidates[0];
  const existingCommand = incident?.commands.some(command => command.recipientMunicipalityId === recipient?.municipalityId
    && ["REQUESTED", "ACCEPTED", "PARTIALLY_ACCEPTED"].includes(command.status));
  const canSend = !!incident?.dispatched && !!recipient && !existingCommand && !busy;
  const prefix = `pbc-${alert.id}`;
  const commandCount = alert.incidents.reduce((count, row) => count + row.commands.length, 0);
  const barangays = groupByBarangay(alert.incidents);

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

  const incidentRow = (row: BarangayAlertIncident) => <li key={row.id} className={`pbc-incident${row.id === incident?.id ? " selected" : ""}`}>
    <div className="pbc-incident-head"><strong>{row.referenceNumber}</strong><span className="pbc-status">{readable(row.status)}</span></div>
    <p>{`${row.fireType ? readable(row.fireType) : "Fire incident"} · ${row.barangay ?? "Unknown barangay"}`}</p>
    {row.commands.length > 0 && <ul className="pbc-command-list" aria-label={`Assistance for ${row.referenceNumber}`}>{row.commands.map(command => <li key={command.id}><span>{command.recipientMunicipalityName}</span><strong>{readable(command.status)}</strong></li>)}</ul>}
  </li>;

  return <article id={`incident-cluster-${alert.id}`} className={`pbc-card${highlighted ? " highlighted" : ""}`} aria-labelledby={`${prefix}-title`}>
    <div className="pbc-card-header">
      <div><h3 id={`${prefix}-title`}>{alert.municipalityName}</h3><p className="pbc-place"><i className="fa-solid fa-location-dot" aria-hidden="true" /> {`${plural(barangays.length, "barangay")} with active reports`}</p></div>
      <span className={`pbc-badge${alert.acknowledgedAt ? " seen" : ""}`}><i className={`fa-solid ${alert.acknowledgedAt ? "fa-circle-check" : "fa-bell"}`} aria-hidden="true" />{alert.acknowledgedAt ? "Acknowledged" : "Needs acknowledgment"}</span>
    </div>
    <ul className="pbc-barangays" aria-label="Active reports by barangay">
      {barangays.map(group => <li key={group.barangay ?? "unknown"} className={group.barangay && group.incidents.length >= BARANGAY_CLUSTER_SIZE ? "cluster" : undefined}>
        {`${group.barangay ?? "Unknown barangay"} · ${plural(group.incidents.length, "report")}`}
      </li>)}
    </ul>
    <div className="pbc-stats" aria-label="Current coordination totals">
      <div className="pbc-stat"><strong>{alert.incidentCount}</strong><span>Active reports</span></div>
      <div className="pbc-stat"><strong>{ready.length}</strong><span>Ready for support</span></div>
      <div className="pbc-stat"><strong>{commandCount}</strong><span>Resource commands</span></div>
    </div>
    <div className="pbc-body">
      <div className="pbc-lists">
        <h4 className="pbc-list-title">{`Ready for support · ${ready.length}`}</h4>
        {ready.length > 0
          ? <ul className="pbc-list" aria-label="Dispatched incidents ready for support">{ready.map(incidentRow)}</ul>
          : <p className="pbc-hint">No incident is dispatched yet. Support opens after the municipality dispatches its units.</p>}
        {waiting.length > 0 && <details className="pbc-waiting">
          <summary>{`${waiting.length} waiting for verification or dispatch`}</summary>
          <ul className="pbc-list" aria-label="Incidents waiting for verification or dispatch">{waiting.map(incidentRow)}</ul>
        </details>}
      </div>
      <form className="pbc-form" onSubmit={send} aria-label={`Coordinate support for ${alert.municipalityName}`}>
        <h4 className="pbc-form-title">Send support</h4>
        <div className="pbc-field"><label htmlFor={`${prefix}-incident`}>Incident to support</label><select id={`${prefix}-incident`} value={incident?.id ?? ""} disabled={busy} onChange={event => { setIncidentId(event.target.value); setMunicipalityId(""); setError(""); setSuccess(""); }}>{[...ready, ...waiting].map(row => <option key={row.id} value={row.id}>{`${row.referenceNumber} · ${row.barangay ?? "Unknown barangay"} · ${row.dispatched ? "Ready" : "Waiting for dispatch"}`}</option>)}</select></div>
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

/**
 * The Multiple Incidents screen: every municipality with three or more active
 * fire reports, and the form that sends support from its nearest neighbours.
 */
export function ProvincialBarangayCoordination() {
  const { alerts, loading, checking, error, lastCheckedAt, refresh, submitCommand } = useProvincialBarangayAlerts();
  const searchParams = useSearchParams();
  const highlightedId = searchParams.get("alert");

  return <section className="pbc-section" aria-labelledby="pbc-heading" aria-busy={loading}>
    <style>{styles}</style>
    <FireCommandHeader slotId="provincial-fire-command-header" headingId="pbc-heading" title="Multiple Incident Coordination" icon="fa-fire-flame-curved" live checking={checking} lastCheckedAt={lastCheckedAt} error={error || null} />
    <p className="pbc-intro">Municipalities with three or more active fire reports. Send support from the nearest municipality to each dispatched incident.</p>
    {error && <div><p className="pbc-error" role="alert">{error}</p><button type="button" className="pbc-button secondary" disabled={checking} onClick={() => void refresh()}>Retry sync</button></div>}
    {alerts.map(alert => <MunicipalCoordinationCard key={alert.id} alert={alert} highlighted={alert.id === highlightedId} submitCommand={submitCommand} />)}
    {alerts.length === 0 && <div className="pbc-empty">
      <i className="fa-solid fa-fire-flame-curved" aria-hidden="true" />
      <strong>{loading ? "Checking active fire reports..." : error ? "Current alerts could not be loaded." : "No municipality has three or more active fire reports."}</strong>
      {!loading && !error && <span>The alarm sounds and this screen fills in when one does.</span>}
    </div>}
  </section>;
}
