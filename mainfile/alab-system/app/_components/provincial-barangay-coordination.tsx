"use client";

import { useSearchParams } from "next/navigation";
import { useRef, useState, type ReactNode } from "react";
import type { BarangayAlert, BarangayAlertIncident, BarangayResourceCommand } from "../../lib/intermunicipality/barangay-alert-types";
import { BARANGAY_CLUSTER_SIZE, groupByBarangay } from "../../lib/intermunicipality/barangay-clusters";
import { FireCommandHeader } from "./fire-command-header";
import { StatCards } from "./municipal-stat-cards";
import { useProvincialBarangayAlerts } from "./use-provincial-barangay-alerts";

const styles = `
  .pbc-section { --pbc-primary:#DC2626; --pbc-text:#0F172A; --pbc-muted:#64748B; --pbc-border:#E2E8F0; --pbc-soft:#F8FAFC; display:flex; flex-direction:column; gap:1rem; padding:12px 1.5rem 3rem; min-height:100%; background:#F8FAFC; color:var(--pbc-text); font-family:'Plus Jakarta Sans',-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif; }
  .pbc-section > [role="tablist"] { align-self:flex-start; }
  .pbc-section-head { display:flex; align-items:center; gap:.65rem; }
  .pbc-section-icon { display:grid; place-items:center; width:32px; height:32px; flex-shrink:0; border-radius:8px; background:#FEF2F2; border:1px solid #FECACA; color:var(--pbc-primary); font-size:.85rem; }
  .pbc-section-head h2 { margin:0; font-size:.98rem; font-weight:800; letter-spacing:-.01em; }
  .pbc-section-head p { margin:2px 0 0; color:var(--pbc-muted); font-size:.76rem; font-weight:500; }
  .pbc-card { min-width:0; padding:1.1rem 1.15rem; background:#fff; border:1px solid var(--pbc-border); border-radius:16px; box-shadow:0 1px 4px rgba(15,23,42,.04); scroll-margin-top:100px; }
  .pbc-card.highlighted { border-color:#2563EB; box-shadow:0 0 0 3px rgba(37,99,235,.12); }
  .pbc-card-header { display:flex; align-items:flex-start; justify-content:space-between; gap:.8rem; flex-wrap:wrap; }
  .pbc-card-title { display:flex; align-items:center; gap:.75rem; min-width:0; }
  .pbc-card-icon { display:grid; place-items:center; width:44px; height:44px; flex-shrink:0; border-radius:12px; background:linear-gradient(135deg,#EF4444,#B91C1C); color:#fff; font-size:1.05rem; box-shadow:0 6px 14px rgba(220,38,38,.25); }
  .pbc-card h3 { margin:0; font-size:1.05rem; font-weight:850; letter-spacing:-.01em; }
  .pbc-place { margin:.15rem 0 0; color:var(--pbc-muted); font-size:.75rem; display:flex; align-items:center; gap:.35rem; }
  .pbc-card-meta { display:flex; align-items:center; flex-wrap:wrap; gap:.4rem; }
  .pbc-metric { display:inline-flex; align-items:center; gap:.35rem; padding:.3rem .6rem; border:1px solid var(--pbc-border); border-radius:8px; background:var(--pbc-soft); color:#334155; font-size:.72rem; font-weight:750; }
  .pbc-metric i { color:var(--pbc-muted); font-size:.72rem; }
  .pbc-metric strong { color:var(--pbc-text); font-weight:850; font-variant-numeric:tabular-nums; }
  .pbc-badge { display:inline-flex; align-items:center; gap:.3rem; padding:.3rem .6rem; border-radius:8px; font-size:.7rem; font-weight:750; background:#FFF7ED; color:#9A3412; border:1px solid #FED7AA; }
  .pbc-badge.seen { background:#ECFDF5; color:#065F46; border-color:#A7F3D0; }
  .pbc-barangays { margin:.9rem 0 0; padding:0; list-style:none; display:flex; flex-wrap:wrap; gap:.4rem; }
  .pbc-barangays li { display:inline-flex; align-items:center; gap:.35rem; padding:.28rem .65rem; border:1px solid var(--pbc-border); border-radius:999px; background:var(--pbc-soft); color:#334155; font-size:.72rem; font-weight:700; }
  .pbc-barangays li i { color:var(--pbc-muted); font-size:.68rem; }
  .pbc-barangays li.cluster { border-color:#FECACA; background:#FEF2F2; color:#991B1B; }
  .pbc-barangays li.cluster i { color:var(--pbc-primary); }
  .pbc-body { display:grid; grid-template-columns:minmax(0,1.15fr) minmax(280px,.85fr); align-items:start; gap:1.1rem; margin-top:1.1rem; padding-top:1.1rem; border-top:1px solid #F1F5F9; }
  .pbc-lists { display:grid; gap:.6rem; min-width:0; }
  .pbc-list-title { margin:0; display:flex; align-items:center; gap:.45rem; color:#475569; font-size:.7rem; font-weight:800; text-transform:uppercase; letter-spacing:.05em; }
  .pbc-list-title i { color:#059669; }
  .pbc-list { margin:0; padding:0; list-style:none; display:grid; gap:.5rem; }
  .pbc-incident { display:flex; gap:.7rem; padding:.7rem .8rem; border:1px solid var(--pbc-border); border-radius:12px; background:#fff; transition:border-color .15s ease, background .15s ease; }
  .pbc-incident.selected { border-color:#FCA5A5; background:#FFF7F7; box-shadow:inset 3px 0 0 var(--pbc-primary); }
  .pbc-incident-icon { display:grid; place-items:center; width:34px; height:34px; flex-shrink:0; border-radius:10px; background:#FEF2F2; color:var(--pbc-primary); font-size:.85rem; }
  .pbc-incident-icon.waiting { background:#F1F5F9; color:#64748B; }
  .pbc-incident-main { min-width:0; flex:1; }
  .pbc-incident-head { display:flex; justify-content:space-between; align-items:center; gap:.45rem; flex-wrap:wrap; font-size:.8rem; }
  .pbc-incident-head strong { word-break:break-word; font-weight:800; }
  .pbc-meta { margin:.3rem 0 0; display:flex; flex-wrap:wrap; gap:.25rem .8rem; color:var(--pbc-muted); font-size:.72rem; }
  .pbc-meta span { display:inline-flex; align-items:center; gap:.3rem; }
  .pbc-meta i { font-size:.68rem; }
  .pbc-status { display:inline-flex; align-items:center; padding:.15rem .5rem; border-radius:999px; font-size:.64rem; font-weight:800; white-space:nowrap; background:#F1F5F9; color:#475569; border:1px solid #E2E8F0; }
  .pbc-status.blue { background:#EFF6FF; color:#1D4ED8; border-color:#BFDBFE; }
  .pbc-status.amber { background:#FFFBEB; color:#B45309; border-color:#FDE68A; }
  .pbc-status.emerald { background:#ECFDF5; color:#047857; border-color:#A7F3D0; }
  .pbc-status.red { background:#FEF2F2; color:#B91C1C; border-color:#FECACA; }
  .pbc-command-list { margin:.55rem 0 0; padding:.5rem 0 0; list-style:none; display:grid; gap:.35rem; border-top:1px dashed var(--pbc-border); }
  .pbc-command-list li { display:flex; flex-wrap:wrap; align-items:center; justify-content:space-between; gap:.4rem; font-size:.72rem; color:#334155; }
  .pbc-command-list li > span { display:inline-flex; align-items:center; gap:.35rem; }
  .pbc-command-list li > span i { color:#2563EB; font-size:.7rem; }
  .pbc-waiting { border:1px dashed #CBD5E1; border-radius:12px; background:#fff; }
  .pbc-waiting summary { display:flex; align-items:center; gap:.5rem; padding:.65rem .8rem; cursor:pointer; color:#475569; font-size:.75rem; font-weight:750; list-style:none; }
  .pbc-waiting summary::-webkit-details-marker { display:none; }
  .pbc-waiting summary .pbc-chevron { margin-left:auto; transition:transform .15s ease; font-size:.7rem; }
  .pbc-waiting[open] summary .pbc-chevron { transform:rotate(180deg); }
  .pbc-waiting .pbc-list { padding:0 .6rem .6rem; }
  .pbc-form { position:sticky; top:88px; display:grid; align-content:start; gap:.75rem; min-width:0; padding:1rem; border:1px solid var(--pbc-border); border-radius:14px; background:var(--pbc-soft); }
  .pbc-form-head { display:flex; align-items:center; gap:.6rem; }
  .pbc-form-icon { display:grid; place-items:center; width:34px; height:34px; flex-shrink:0; border-radius:10px; background:#EFF6FF; color:#2563EB; font-size:.85rem; }
  .pbc-form-head h4 { margin:0; font-size:.88rem; font-weight:850; }
  .pbc-form-head p { margin:.1rem 0 0; color:var(--pbc-muted); font-size:.7rem; }
  .pbc-field { display:grid; gap:.35rem; min-width:0; }
  .pbc-field label { display:flex; align-items:center; gap:.35rem; color:#475569; font-size:.7rem; font-weight:800; }
  .pbc-field label i { color:#94A3B8; font-size:.68rem; }
  .pbc-field input,.pbc-field select { box-sizing:border-box; width:100%; min-width:0; min-height:42px; padding:.5rem .65rem; border:1px solid #CBD5E1; border-radius:9px; background:#fff; color:var(--pbc-text); font:inherit; font-size:.78rem; }
  .pbc-field input:disabled,.pbc-field select:disabled { opacity:.6; cursor:not-allowed; }
  .pbc-resources { display:grid; grid-template-columns:1fr 1fr; gap:.65rem; }
  .pbc-note { margin:0; display:flex; gap:.45rem; padding:.6rem .75rem; border-radius:9px; background:#FFF7ED; border:1px solid #FED7AA; color:#9A3412; font-size:.74rem; line-height:1.5; }
  .pbc-note i { margin-top:.2rem; }
  .pbc-hint { margin:0; color:var(--pbc-muted); font-size:.68rem; line-height:1.5; }
  .pbc-button { min-height:44px; padding:.55rem .85rem; border:1px solid var(--pbc-primary); border-radius:10px; background:var(--pbc-primary); color:#fff; display:inline-flex; align-items:center; justify-content:center; gap:.45rem; font:inherit; font-size:.8rem; font-weight:800; cursor:pointer; box-shadow:0 6px 14px rgba(220,38,38,.2); transition:background .15s ease; }
  .pbc-button:hover:not(:disabled) { background:#B91C1C; }
  .pbc-button:disabled { opacity:.5; cursor:not-allowed; box-shadow:none; }
  .pbc-button.secondary { background:#fff; border-color:#CBD5E1; color:#334155; box-shadow:none; }
  .pbc-button.secondary:hover:not(:disabled) { background:#F1F5F9; }
  .pbc-button:focus-visible,.pbc-field input:focus-visible,.pbc-field select:focus-visible,.pbc-waiting summary:focus-visible { outline:2px solid #0F172A; outline-offset:2px; }
  .pbc-error { margin:0; color:#B91C1C; font-size:.75rem; font-weight:700; }
  .pbc-success { margin:0; color:#166534; font-size:.75rem; font-weight:700; }
  .pbc-empty { display:grid; justify-items:center; gap:.35rem; padding:3rem 1.5rem; border:1px solid var(--pbc-border); border-radius:16px; background:#fff; color:var(--pbc-muted); font-size:.8rem; line-height:1.5; text-align:center; }
  .pbc-empty-icon { display:grid; place-items:center; width:52px; height:52px; margin-bottom:.4rem; border-radius:50%; background:#ECFDF5; color:#059669; font-size:1.25rem; }
  .pbc-empty strong { color:#1E293B; font-size:.95rem; }
  @media(max-width:860px) { .pbc-body { grid-template-columns:1fr; } .pbc-form { position:static; } }
  @media(max-width:760px) { .pbc-section { padding:12px 1rem 2.5rem; } .pbc-card { padding:.95rem; } }
`;

type Tone = "slate" | "blue" | "amber" | "emerald" | "red";

const REPORT_TONES: Record<string, Tone> = {
  VERIFIED: "blue", CONFIRMED: "blue", FIRETRUCK_DISPATCHED: "blue", DISPATCHED: "blue",
  RESPONDING: "amber", RESPONDER_ARRIVED: "emerald", ON_SCENE: "emerald",
};
const COMMAND_TONES: Record<string, Tone> = {
  REQUESTED: "amber", ACCEPTED: "emerald", PARTIALLY_ACCEPTED: "blue", REJECTED: "red",
};

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
    <span className={`pbc-incident-icon${row.dispatched ? "" : " waiting"}`} aria-hidden="true"><i className={`fa-solid ${row.dispatched ? "fa-fire" : "fa-hourglass-half"}`} /></span>
    <div className="pbc-incident-main">
      <div className="pbc-incident-head"><strong>{row.referenceNumber}</strong><span className={`pbc-status ${REPORT_TONES[row.status] ?? "slate"}`}>{readable(row.status)}</span></div>
      <p className="pbc-meta">
        <span><i className="fa-solid fa-fire-flame-simple" aria-hidden="true" />{row.fireType ? readable(row.fireType) : "Fire incident"}</span>
        <span><i className="fa-solid fa-location-dot" aria-hidden="true" />{row.barangay ?? "Unknown barangay"}</span>
      </p>
      {row.commands.length > 0 && <ul className="pbc-command-list" aria-label={`Assistance for ${row.referenceNumber}`}>{row.commands.map(command => <li key={command.id}>
        <span><i className="fa-solid fa-handshake-angle" aria-hidden="true" />{command.recipientMunicipalityName}</span>
        <strong className={`pbc-status ${COMMAND_TONES[command.status] ?? "slate"}`}>{readable(command.status)}</strong>
      </li>)}</ul>}
    </div>
  </li>;

  return <article id={`incident-cluster-${alert.id}`} className={`pbc-card${highlighted ? " highlighted" : ""}`} aria-labelledby={`${prefix}-title`}>
    <div className="pbc-card-header">
      <div className="pbc-card-title">
        <span className="pbc-card-icon" aria-hidden="true"><i className="fa-solid fa-city" /></span>
        <div><h3 id={`${prefix}-title`}>{alert.municipalityName}</h3><p className="pbc-place"><i className="fa-solid fa-map-location-dot" aria-hidden="true" />{`${plural(barangays.length, "barangay")} with active reports`}</p></div>
      </div>
      <div className="pbc-card-meta">
        <span className="pbc-metric" title="Active reports"><i className="fa-solid fa-fire" aria-hidden="true" /><strong>{alert.incidentCount}</strong> active</span>
        <span className="pbc-metric" title="Ready for support"><i className="fa-solid fa-truck-fast" aria-hidden="true" /><strong>{ready.length}</strong> ready</span>
        <span className="pbc-metric" title="Resource commands"><i className="fa-solid fa-paper-plane" aria-hidden="true" /><strong>{commandCount}</strong> {commandCount === 1 ? "command" : "commands"}</span>
        <span className={`pbc-badge${alert.acknowledgedAt ? " seen" : ""}`}><i className={`fa-solid ${alert.acknowledgedAt ? "fa-circle-check" : "fa-bell"}`} aria-hidden="true" />{alert.acknowledgedAt ? "Acknowledged" : "Needs acknowledgment"}</span>
      </div>
    </div>
    <ul className="pbc-barangays" aria-label="Active reports by barangay">
      {barangays.map(group => {
        const cluster = !!group.barangay && group.incidents.length >= BARANGAY_CLUSTER_SIZE;
        return <li key={group.barangay ?? "unknown"} className={cluster ? "cluster" : undefined}>
          <i className={`fa-solid ${cluster ? "fa-triangle-exclamation" : "fa-location-dot"}`} aria-hidden="true" />
          {`${group.barangay ?? "Unknown barangay"} · ${plural(group.incidents.length, "report")}`}
        </li>;
      })}
    </ul>
    <div className="pbc-body">
      <div className="pbc-lists">
        <h4 className="pbc-list-title"><i className="fa-solid fa-truck-fast" aria-hidden="true" />{`Ready for support · ${ready.length}`}</h4>
        {ready.length > 0
          ? <ul className="pbc-list" aria-label="Dispatched incidents ready for support">{ready.map(incidentRow)}</ul>
          : <p className="pbc-hint">No incident is dispatched yet. Support opens after the municipality dispatches its units.</p>}
        {waiting.length > 0 && <details className="pbc-waiting">
          <summary><i className="fa-solid fa-hourglass-half" aria-hidden="true" />{`${waiting.length} waiting for verification or dispatch`}<i className="fa-solid fa-chevron-down pbc-chevron" aria-hidden="true" /></summary>
          <ul className="pbc-list" aria-label="Incidents waiting for verification or dispatch">{waiting.map(incidentRow)}</ul>
        </details>}
      </div>
      <form className="pbc-form" onSubmit={send} aria-label={`Coordinate support for ${alert.municipalityName}`}>
        <div className="pbc-form-head">
          <span className="pbc-form-icon" aria-hidden="true"><i className="fa-solid fa-paper-plane" /></span>
          <div><h4>Send support</h4><p>Order the nearest municipality to help</p></div>
        </div>
        <div className="pbc-field"><label htmlFor={`${prefix}-incident`}><i className="fa-solid fa-fire" aria-hidden="true" />Incident to support</label><select id={`${prefix}-incident`} value={incident?.id ?? ""} disabled={busy} onChange={event => { setIncidentId(event.target.value); setMunicipalityId(""); setError(""); setSuccess(""); }}>{[...ready, ...waiting].map(row => <option key={row.id} value={row.id}>{`${row.referenceNumber} · ${row.barangay ?? "Unknown barangay"} · ${row.dispatched ? "Ready" : "Waiting for dispatch"}`}</option>)}</select></div>
        <div className="pbc-field"><label htmlFor={`${prefix}-municipality`}><i className="fa-solid fa-building-shield" aria-hidden="true" />Receiving municipality · nearest first</label><select id={`${prefix}-municipality`} value={recipient?.municipalityId ?? ""} disabled={busy || !incident?.dispatched || candidates.length === 0} onChange={event => { setMunicipalityId(event.target.value); setError(""); setSuccess(""); }}>{candidates.length === 0 && <option value="">No eligible nearby municipality</option>}{candidates.map((row, index) => <option key={row.municipalityId} value={row.municipalityId}>{row.municipalityName} · {distanceLabel(row.distanceMeters)}{index === 0 ? " · Nearest" : ""}</option>)}</select><p className="pbc-hint">Approximate straight-line distance from the incident to the BFP station.</p></div>
        {!incident?.dispatched && <p className="pbc-note"><i className="fa-solid fa-hourglass-half" aria-hidden="true" />Waiting for municipal dispatch. Support commands become available after the municipality dispatches its units.</p>}
        {incident?.dispatched && candidates.length === 0 && <p className="pbc-note"><i className="fa-solid fa-circle-info" aria-hidden="true" />No eligible nearby BFP station is available for this incident.</p>}
        {existingCommand && <p className="pbc-note"><i className="fa-solid fa-circle-info" aria-hidden="true" />A resource command is already active for this municipality. Track its status in the incident list.</p>}
        <div className="pbc-resources">
          <div className="pbc-field"><label htmlFor={`${prefix}-trucks`}><i className="fa-solid fa-truck-moving" aria-hidden="true" />Firetrucks</label><input id={`${prefix}-trucks`} type="number" min="0" max="500" step="1" required inputMode="numeric" value={trucks} disabled={!incident?.dispatched || busy} onChange={event => setTrucks(event.target.value)} /></div>
          <div className="pbc-field"><label htmlFor={`${prefix}-personnel`}><i className="fa-solid fa-people-group" aria-hidden="true" />Personnel</label><input id={`${prefix}-personnel`} type="number" min="0" max="500" step="1" required inputMode="numeric" value={personnel} disabled={!incident?.dispatched || busy} onChange={event => setPersonnel(event.target.value)} /></div>
        </div>
        <button type="submit" className="pbc-button" disabled={!canSend}><i className="fa-solid fa-truck-fast" aria-hidden="true" />{busy ? "Sending command..." : "Send Resource Command"}</button>
        {error && <p className="pbc-error" role="alert">{error}</p>}
        {success && <p className="pbc-success" role="status">{success}</p>}
      </form>
    </div>
  </article>;
}

/**
 * The Multiple Incidents tab: every municipality with three or more active
 * fire reports, and the form that sends support from its nearest neighbours.
 */
export function ProvincialBarangayCoordination({ topTabs }: { topTabs?: ReactNode } = {}) {
  const { alerts, loading, checking, error, lastCheckedAt, refresh, submitCommand } = useProvincialBarangayAlerts();
  const searchParams = useSearchParams();
  const highlightedId = searchParams.get("alert");
  const incidents = alerts.flatMap(alert => alert.incidents);
  const totals = {
    reports: alerts.reduce((count, alert) => count + alert.incidentCount, 0),
    ready: incidents.filter(row => row.dispatched).length,
    commands: incidents.reduce((count, row) => count + row.commands.length, 0),
  };

  return <section className="pbc-section" aria-labelledby="pbc-heading" aria-busy={loading}>
    <style>{styles}</style>
    <FireCommandHeader slotId="provincial-fire-command-header" headingId="pbc-heading" title="Multiple Incident Coordination" icon="fa-fire-flame-curved" live checking={checking} lastCheckedAt={lastCheckedAt} error={error || null} />
    <StatCards
      label="Multiple incident totals"
      items={[
        { key: "municipalities", icon: "fa-city", tone: "red", badge: "Alerted", value: alerts.length, label: "Municipalities", description: "Three or more active reports", loading },
        { key: "reports", icon: "fa-fire", tone: "amber", badge: "Active", value: totals.reports, label: "Active Reports", description: "Across alerted municipalities", loading },
        { key: "ready", icon: "fa-truck-fast", tone: "emerald", badge: "Dispatched", value: totals.ready, label: "Ready for Support", description: "Municipal units already sent", loading },
        { key: "commands", icon: "fa-paper-plane", tone: "blue", badge: "Sent", value: totals.commands, label: "Resource Commands", description: "Provincial support orders", loading },
      ]}
    />
    {topTabs}
    <div className="pbc-section-head">
      <span className="pbc-section-icon" aria-hidden="true"><i className="fa-solid fa-tower-broadcast" /></span>
      <div><h2>Municipalities with three or more active fire reports</h2><p>Send support from the nearest municipality to each dispatched incident.</p></div>
    </div>
    {error && <div><p className="pbc-error" role="alert">{error}</p><button type="button" className="pbc-button secondary" disabled={checking} onClick={() => void refresh()}>Retry sync</button></div>}
    {alerts.map(alert => <MunicipalCoordinationCard key={alert.id} alert={alert} highlighted={alert.id === highlightedId} submitCommand={submitCommand} />)}
    {alerts.length === 0 && <div className="pbc-empty">
      <span className="pbc-empty-icon" aria-hidden="true"><i className={`fa-solid ${loading ? "fa-spinner fa-spin" : "fa-shield-halved"}`} /></span>
      <strong>{loading ? "Checking active fire reports..." : error ? "Current alerts could not be loaded." : "No municipality has three or more active fire reports."}</strong>
      {!loading && !error && <span>The alarm sounds and this tab fills in when one does.</span>}
    </div>}
  </section>;
}
