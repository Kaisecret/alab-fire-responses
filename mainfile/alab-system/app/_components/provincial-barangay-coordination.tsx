"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { BarangayAlert, BarangayAlertIncident, BarangayResourceCommand } from "../../lib/intermunicipality/barangay-alert-types";
import { BARANGAY_CLUSTER_SIZE, groupByBarangay } from "../../lib/intermunicipality/barangay-clusters";
import { FireCommandHeader } from "./fire-command-header";
import { StatCards } from "./municipal-stat-cards";
import { showSuccessToast } from "./success-toast";
import { useProvincialBarangayAlerts } from "./use-provincial-barangay-alerts";

const styles = `
  .pbc-section { --pbc-primary:#DC2626; --pbc-text:#0F172A; --pbc-muted:#64748B; --pbc-border:#E2E8F0; --pbc-soft:#F8FAFC; display:flex; flex-direction:column; gap:1rem; padding:12px 1.5rem 3rem; min-height:100%; background:#F8FAFC; color:var(--pbc-text); font-family:'Plus Jakarta Sans',-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif; }
  .pbc-section > [role="tablist"] { align-self:flex-start; }

  .pbc-card { min-width:0; overflow:hidden; background:#fff; border:1px solid var(--pbc-border); border-radius:18px; box-shadow:0 4px 16px rgba(15,23,42,.05),0 1px 3px rgba(15,23,42,.03); scroll-margin-top:100px; }
  .pbc-card.highlighted { border-color:#93C5FD; box-shadow:0 0 0 3px rgba(37,99,235,.12),0 4px 16px rgba(15,23,42,.05); }
  .pbc-hero { display:flex; align-items:flex-start; justify-content:space-between; gap:1rem; flex-wrap:wrap; padding:1.15rem 1.25rem 1rem; background:radial-gradient(120% 140% at 0% 0%,#FEE2E2 0%,#FFF5F5 45%,#fff 100%); border-bottom:1px solid #FDE8E8; }
  .pbc-hero-main { display:flex; align-items:center; gap:.85rem; min-width:0; }
  .pbc-card-icon { position:relative; display:grid; place-items:center; width:52px; height:52px; flex-shrink:0; border-radius:15px; background:linear-gradient(135deg,#EF4444,#B91C1C); color:#fff; font-size:1.2rem; box-shadow:0 10px 22px rgba(220,38,38,.28); }
  .pbc-card-icon::after { content:""; position:absolute; inset:-5px; border-radius:19px; border:2px solid rgba(239,68,68,.35); animation:pbcPulse 2.2s ease-out infinite; }
  .pbc-eyebrow { display:inline-flex; align-items:center; gap:.35rem; color:#B91C1C; font-size:.66rem; font-weight:800; letter-spacing:.06em; text-transform:uppercase; }
  .pbc-hero h3 { margin:.1rem 0 0; font-size:1.25rem; font-weight:850; letter-spacing:-.02em; }
  .pbc-place { margin:.2rem 0 0; display:flex; flex-wrap:wrap; align-items:center; gap:.3rem .8rem; color:var(--pbc-muted); font-size:.75rem; }
  .pbc-place span { display:inline-flex; align-items:center; gap:.3rem; }
  .pbc-badge { display:inline-flex; align-items:center; gap:.35rem; padding:.35rem .7rem; border-radius:999px; font-size:.7rem; font-weight:800; background:#FFF7ED; color:#9A3412; border:1px solid #FED7AA; }
  .pbc-badge.seen { background:#ECFDF5; color:#065F46; border-color:#A7F3D0; }
  .pbc-barangays { width:100%; margin:.2rem 0 0; padding:0; list-style:none; display:flex; flex-wrap:wrap; gap:.4rem; }
  .pbc-barangays li { display:inline-flex; align-items:center; gap:.35rem; padding:.3rem .7rem; border:1px solid var(--pbc-border); border-radius:999px; background:rgba(255,255,255,.85); color:#334155; font-size:.72rem; font-weight:700; }
  .pbc-barangays li i { color:var(--pbc-muted); font-size:.68rem; }
  .pbc-barangays li.cluster { border-color:#FECACA; background:#FEF2F2; color:#991B1B; }
  .pbc-barangays li.cluster i { color:var(--pbc-primary); }

  .pbc-toolbar { display:flex; align-items:center; justify-content:space-between; gap:.75rem; flex-wrap:wrap; padding:.85rem 1.25rem; }
  .pbc-segments { display:inline-flex; gap:.2rem; padding:.25rem; border:1px solid var(--pbc-border); border-radius:12px; background:var(--pbc-soft); }
  .pbc-segment { display:inline-flex; align-items:center; gap:.4rem; min-height:2.3rem; padding:.4rem .85rem; border:0; border-radius:9px; background:transparent; color:#52627a; font:inherit; font-size:.78rem; font-weight:800; cursor:pointer; }
  .pbc-segment:hover { color:#172033; }
  .pbc-segment[aria-pressed="true"] { background:#fff; color:#B42318; box-shadow:0 2px 8px rgba(15,23,42,.08); }
  .pbc-segment-count { display:inline-grid; place-items:center; min-width:1.3rem; height:1.3rem; padding:0 .35rem; border-radius:999px; background:#E2E8F0; color:#334155; font-size:.66rem; font-weight:800; }
  .pbc-segment[aria-pressed="true"] .pbc-segment-count { background:#FEE2E2; color:#B42318; }
  .pbc-toolbar-hint { display:inline-flex; align-items:center; gap:.4rem; color:var(--pbc-muted); font-size:.72rem; }

  .pbc-grid { margin:0; padding:0 1.25rem 1.25rem; list-style:none; display:grid; grid-template-columns:repeat(auto-fill,minmax(260px,1fr)); gap:.8rem; }
  .pbc-tile { display:flex; flex-direction:column; gap:.55rem; min-width:0; padding:.95rem; border:1px solid var(--pbc-border); border-radius:14px; background:#fff; transition:transform .15s ease, box-shadow .15s ease, border-color .15s ease; }
  .pbc-tile.ready:hover { transform:translateY(-2px); border-color:#FECACA; box-shadow:0 8px 26px rgba(15,23,42,.08); }
  .pbc-tile.waiting { background:var(--pbc-soft); }
  .pbc-tile-top { display:flex; align-items:center; justify-content:space-between; gap:.5rem; }
  .pbc-tile-icon { display:grid; place-items:center; width:36px; height:36px; border-radius:11px; background:#FEF2F2; color:var(--pbc-primary); font-size:.9rem; }
  .pbc-tile.waiting .pbc-tile-icon { background:#E2E8F0; color:#64748B; }
  .pbc-tile-ref { font-size:.86rem; font-weight:850; letter-spacing:-.01em; word-break:break-word; }
  .pbc-meta { margin:0; display:flex; flex-wrap:wrap; gap:.25rem .8rem; color:var(--pbc-muted); font-size:.73rem; }
  .pbc-meta span { display:inline-flex; align-items:center; gap:.3rem; }
  .pbc-meta i { font-size:.68rem; }
  .pbc-status { display:inline-flex; align-items:center; padding:.18rem .55rem; border-radius:999px; font-size:.64rem; font-weight:800; white-space:nowrap; background:#F1F5F9; color:#475569; border:1px solid #E2E8F0; }
  .pbc-status.blue { background:#EFF6FF; color:#1D4ED8; border-color:#BFDBFE; }
  .pbc-status.amber { background:#FFFBEB; color:#B45309; border-color:#FDE68A; }
  .pbc-status.emerald { background:#ECFDF5; color:#047857; border-color:#A7F3D0; }
  .pbc-status.red { background:#FEF2F2; color:#B91C1C; border-color:#FECACA; }
  .pbc-command-list { margin:0; padding:.5rem 0 0; list-style:none; display:grid; gap:.35rem; border-top:1px dashed var(--pbc-border); }
  .pbc-command-list li { display:flex; flex-wrap:wrap; align-items:center; justify-content:space-between; gap:.4rem; font-size:.72rem; color:#334155; }
  .pbc-command-list li > span { display:inline-flex; align-items:center; gap:.35rem; }
  .pbc-command-list li > span i { color:#2563EB; font-size:.7rem; }
  .pbc-tile-action { margin-top:auto; display:inline-flex; align-items:center; justify-content:center; gap:.45rem; min-height:40px; padding:.5rem .8rem; border:1px solid var(--pbc-primary); border-radius:10px; background:var(--pbc-primary); color:#fff; font:inherit; font-size:.78rem; font-weight:800; cursor:pointer; box-shadow:0 6px 14px rgba(220,38,38,.18); transition:background .15s ease; }
  .pbc-tile-action:hover:not(:disabled) { background:#B91C1C; }
  .pbc-tile-action:disabled { border-color:#E2E8F0; background:#F1F5F9; color:#64748B; box-shadow:none; cursor:not-allowed; }
  .pbc-empty-row { margin:0 1.25rem 1.25rem; padding:1.4rem; border:1px dashed #CBD5E1; border-radius:14px; color:var(--pbc-muted); font-size:.8rem; text-align:center; }

  .pbc-modal { width:min(560px,calc(100% - 2rem)); max-height:calc(100dvh - 2rem); margin:auto; padding:0; border:0; border-radius:22px; background:transparent; overflow:visible; }
  body.pbc-scroll-locked { overflow:hidden; }
  .pbc-modal::backdrop { background:rgba(15,23,42,.55); backdrop-filter:blur(6px); }
  .pbc-modal[open] .pbc-modal-card { animation:pbcRise .2s ease-out both; }
  .pbc-modal-card { display:flex; flex-direction:column; max-height:calc(100dvh - 2rem); overflow:hidden; border-radius:22px; background:#fff; box-shadow:0 30px 70px rgba(15,23,42,.35); font-family:'Plus Jakarta Sans',-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif; color:#0F172A; }
  .pbc-modal-head { display:flex; align-items:center; gap:.8rem; padding:1.1rem 1.2rem; background:linear-gradient(135deg,#DC2626,#991B1B); color:#fff; }
  .pbc-modal-icon { display:grid; place-items:center; width:44px; height:44px; flex-shrink:0; border-radius:13px; background:rgba(255,255,255,.18); font-size:1.05rem; }
  .pbc-modal-head h4 { margin:0; font-size:1.05rem; font-weight:850; }
  .pbc-modal-head p { margin:.15rem 0 0; color:rgba(255,255,255,.85); font-size:.75rem; }
  .pbc-modal-close { margin-left:auto; display:grid; place-items:center; width:36px; height:36px; flex-shrink:0; border:0; border-radius:50%; background:rgba(255,255,255,.16); color:#fff; cursor:pointer; }
  .pbc-modal-close:hover:not(:disabled) { background:rgba(255,255,255,.28); }
  .pbc-modal-body { display:grid; gap:1rem; padding:1.15rem 1.2rem; overflow-y:auto; overscroll-behavior:contain; }
  .pbc-step-title { margin:0 0 .5rem; display:flex; align-items:center; gap:.45rem; color:#475569; font-size:.72rem; font-weight:800; text-transform:uppercase; letter-spacing:.05em; }
  .pbc-step-title span { display:inline-grid; place-items:center; width:1.35rem; height:1.35rem; border-radius:50%; background:#FEE2E2; color:#B42318; font-size:.68rem; }
  .pbc-choices { margin:0; padding:0; border:0; display:grid; gap:.45rem; max-height:248px; overflow-y:auto; overscroll-behavior:contain; }
  .pbc-choice { position:relative; display:flex; align-items:center; gap:.7rem; padding:.7rem .8rem; border:1.5px solid #E2E8F0; border-radius:13px; background:#fff; cursor:pointer; transition:border-color .15s ease, background .15s ease; }
  .pbc-choice:hover { border-color:#FCA5A5; }
  .pbc-choice.checked { border-color:#DC2626; background:#FFF5F5; box-shadow:0 0 0 3px rgba(220,38,38,.1); }
  .pbc-choice.taken { cursor:not-allowed; opacity:.6; }
  .pbc-choice input { position:absolute; opacity:0; pointer-events:none; }
  .pbc-choice:has(input:focus-visible) { outline:2px solid #0F172A; outline-offset:2px; }
  .pbc-choice-icon { display:grid; place-items:center; width:36px; height:36px; flex-shrink:0; border-radius:10px; background:#EFF6FF; color:#2563EB; font-size:.85rem; }
  .pbc-choice.checked .pbc-choice-icon { background:#DC2626; color:#fff; }
  .pbc-choice-text { display:grid; min-width:0; }
  .pbc-choice-text strong { font-size:.84rem; font-weight:800; }
  .pbc-choice-text small { color:#64748B; font-size:.7rem; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .pbc-choice-meta { margin-left:auto; display:grid; justify-items:end; gap:.15rem; font-size:.78rem; font-weight:800; white-space:nowrap; }
  .pbc-choice-meta em { font-style:normal; padding:.1rem .45rem; border-radius:999px; background:#ECFDF5; color:#047857; font-size:.62rem; font-weight:800; }
  .pbc-choice-meta em.taken { background:#FFF7ED; color:#9A3412; }
  .pbc-resources { display:grid; grid-template-columns:1fr 1fr; gap:.75rem; }
  .pbc-stepper-field { display:grid; gap:.4rem; }
  .pbc-stepper-field label { display:flex; align-items:center; gap:.4rem; color:#475569; font-size:.74rem; font-weight:800; }
  .pbc-stepper-field label i { color:#94A3B8; }
  .pbc-stepper { display:grid; grid-template-columns:42px 1fr 42px; align-items:center; border:1px solid #CBD5E1; border-radius:12px; background:#fff; overflow:hidden; }
  .pbc-stepper button { height:44px; border:0; background:#F8FAFC; color:#334155; cursor:pointer; font-size:.8rem; }
  .pbc-stepper button:hover:not(:disabled) { background:#FEE2E2; color:#B42318; }
  .pbc-stepper button:disabled { color:#CBD5E1; cursor:not-allowed; }
  .pbc-stepper input { width:100%; min-width:0; height:44px; border:0; border-inline:1px solid #E2E8F0; text-align:center; font:inherit; font-size:1rem; font-weight:850; color:#0F172A; -moz-appearance:textfield; }
  .pbc-stepper input::-webkit-outer-spin-button,.pbc-stepper input::-webkit-inner-spin-button { -webkit-appearance:none; margin:0; }
  .pbc-modal-foot { display:flex; justify-content:flex-end; gap:.6rem; padding:.9rem 1.2rem; border-top:1px solid #F1F5F9; background:#F8FAFC; }
  .pbc-note { margin:0; display:flex; gap:.45rem; padding:.6rem .75rem; border-radius:10px; background:#FFF7ED; border:1px solid #FED7AA; color:#9A3412; font-size:.74rem; line-height:1.5; }
  .pbc-note i { margin-top:.2rem; }
  .pbc-hint { margin:0; display:flex; align-items:center; gap:.4rem; color:#64748B; font-size:.7rem; line-height:1.5; }
  .pbc-button { min-height:44px; padding:.55rem 1rem; border:1px solid #DC2626; border-radius:11px; background:#DC2626; color:#fff; display:inline-flex; align-items:center; justify-content:center; gap:.45rem; font:inherit; font-size:.8rem; font-weight:800; cursor:pointer; box-shadow:0 6px 14px rgba(220,38,38,.2); transition:background .15s ease; }
  .pbc-button:hover:not(:disabled) { background:#B91C1C; }
  .pbc-button:disabled { opacity:.5; cursor:not-allowed; box-shadow:none; }
  .pbc-button.secondary { background:#fff; border-color:#CBD5E1; color:#334155; box-shadow:none; }
  .pbc-button.secondary:hover:not(:disabled) { background:#F1F5F9; }
  .pbc-button:focus-visible,.pbc-segment:focus-visible,.pbc-tile-action:focus-visible,.pbc-stepper button:focus-visible,.pbc-stepper input:focus-visible,.pbc-modal-close:focus-visible { outline:2px solid #0F172A; outline-offset:2px; }
  .pbc-error { margin:0; color:#B91C1C; font-size:.76rem; font-weight:700; }
  .pbc-empty { display:grid; justify-items:center; gap:.35rem; padding:3rem 1.5rem; border:1px solid var(--pbc-border); border-radius:18px; background:#fff; color:var(--pbc-muted); font-size:.8rem; line-height:1.5; text-align:center; box-shadow:0 4px 16px rgba(15,23,42,.05); }
  .pbc-empty-icon { display:grid; place-items:center; width:56px; height:56px; margin-bottom:.4rem; border-radius:50%; background:#ECFDF5; color:#059669; font-size:1.3rem; }
  .pbc-empty strong { color:#1E293B; font-size:.95rem; }
  @keyframes pbcPulse { 0% { opacity:.9; transform:scale(.92); } 80%,100% { opacity:0; transform:scale(1.18); } }
  @keyframes pbcRise { from { opacity:0; transform:translateY(12px) scale(.98); } to { opacity:1; transform:none; } }
  @media(prefers-reduced-motion:reduce) { .pbc-card-icon::after,.pbc-modal[open] .pbc-modal-card { animation:none; } .pbc-tile { transition:none; } }
  @media(max-width:760px) { .pbc-section { padding:12px 1rem 2.5rem; } .pbc-hero,.pbc-toolbar { padding-inline:1rem; } .pbc-grid { padding:0 1rem 1rem; } }
  @media(max-width:480px) { .pbc-resources { grid-template-columns:1fr; } .pbc-modal-foot { flex-direction:column-reverse; } .pbc-modal-foot .pbc-button { width:100%; } .pbc-segments { width:100%; } .pbc-segment { flex:1; justify-content:center; padding-inline:.5rem; } }
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

type Filter = "ready" | "waiting" | "all";
const ACTIVE_COMMANDS = ["REQUESTED", "ACCEPTED", "PARTIALLY_ACCEPTED"];
const FILTERS: Array<{ id: Filter; label: string; icon: string }> = [
  { id: "ready", label: "Ready", icon: "fa-truck-fast" },
  { id: "waiting", label: "Waiting", icon: "fa-hourglass-half" },
  { id: "all", label: "All", icon: "fa-layer-group" },
];

function alertSince(value: string) {
  const at = new Date(value);
  return Number.isNaN(at.getTime()) ? null : at.toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function MunicipalCoordinationCard({ alert, highlighted, submitCommand }: {
  alert: BarangayAlert;
  highlighted: boolean;
  submitCommand: (command: BarangayResourceCommand) => Promise<void>;
}) {
  const [filter, setFilter] = useState<Filter | null>(null);
  // The incident open in the Send support popup; empty while it is closed.
  const [incidentId, setIncidentId] = useState("");
  const [municipalityId, setMunicipalityId] = useState("");
  const [trucks, setTrucks] = useState("1");
  const [personnel, setPersonnel] = useState("0");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const busyRef = useRef(false);
  const dialogRef = useRef<HTMLDialogElement | null>(null);

  // Only dispatched incidents can receive support, so the board opens on them.
  const ready = alert.incidents.filter(row => row.dispatched);
  const waiting = alert.incidents.filter(row => !row.dispatched);
  const activeFilter = filter ?? (ready.length > 0 ? "ready" : "all");
  const shown = activeFilter === "ready" ? ready : activeFilter === "waiting" ? waiting : [...ready, ...waiting];
  const counts: Record<Filter, number> = { ready: ready.length, waiting: waiting.length, all: alert.incidents.length };
  const barangays = groupByBarangay(alert.incidents);
  const since = alertSince(alert.openedAt);
  const prefix = `pbc-${alert.id}`;

  const incident = alert.incidents.find(row => row.id === incidentId);
  const candidates = [...(incident?.nearbyMunicipalities ?? [])].sort((a, b) => a.distanceMeters - b.distanceMeters);
  const alreadyAsked = (id: string) => !!incident?.commands.some(command => command.recipientMunicipalityId === id && ACTIVE_COMMANDS.includes(command.status));
  const recipient = candidates.find(row => row.municipalityId === municipalityId && !alreadyAsked(row.municipalityId))
    ?? candidates.find(row => !alreadyAsked(row.municipalityId));
  const canSend = !!incident?.dispatched && !!recipient && !busy;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!incidentId || !dialog) return;
    if (!dialog.open) dialog.showModal();
    // The page behind the popup stays still, without jumping when its scrollbar hides.
    const body = document.body;
    const scrollbar = window.innerWidth - document.documentElement.clientWidth;
    body.classList.add("pbc-scroll-locked");
    if (scrollbar > 0) body.style.paddingRight = `${scrollbar}px`;
    return () => {
      if (dialog.open) dialog.close();
      body.classList.remove("pbc-scroll-locked");
      body.style.paddingRight = "";
    };
  }, [incidentId]);

  const openSupport = (row: BarangayAlertIncident) => {
    setIncidentId(row.id);
    setMunicipalityId("");
    setTrucks("1");
    setPersonnel("0");
    setError("");
  };
  const closeSupport = () => {
    if (!busyRef.current) setIncidentId("");
  };

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
    try {
      await submitCommand({ alertId: alert.id, fireReportId: incident.id, recipientMunicipalityId: recipient.municipalityId, requestedFiretrucks, requestedPersonnel });
      showSuccessToast(`Resource command sent to ${recipient.municipalityName} for ${incident.referenceNumber}.`);
      setIncidentId("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to send this resource command.");
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  const stepper = (id: string, label: string, icon: string, value: string, change: (next: string) => void) => {
    const current = Number(value) || 0;
    return <div className="pbc-stepper-field">
      <label htmlFor={`${prefix}-${id}`}><i className={`fa-solid ${icon}`} aria-hidden="true" />{label}</label>
      <div className="pbc-stepper">
        <button type="button" aria-label={`Fewer ${label.toLowerCase()}`} disabled={busy || current <= 0} onClick={() => change(String(Math.max(0, current - 1)))}><i className="fa-solid fa-minus" aria-hidden="true" /></button>
        <input id={`${prefix}-${id}`} type="number" min="0" max="500" step="1" required inputMode="numeric" value={value} disabled={busy} onChange={event => change(event.target.value)} />
        <button type="button" aria-label={`More ${label.toLowerCase()}`} disabled={busy || current >= 500} onClick={() => change(String(Math.min(500, current + 1)))}><i className="fa-solid fa-plus" aria-hidden="true" /></button>
      </div>
    </div>;
  };

  const tile = (row: BarangayAlertIncident) => <li key={row.id} data-incident={row.id} className={`pbc-tile ${row.dispatched ? "ready" : "waiting"}`}>
    <div className="pbc-tile-top">
      <span className="pbc-tile-icon" aria-hidden="true"><i className={`fa-solid ${row.dispatched ? "fa-fire" : "fa-hourglass-half"}`} /></span>
      <span className={`pbc-status ${REPORT_TONES[row.status] ?? "slate"}`}>{readable(row.status)}</span>
    </div>
    <strong className="pbc-tile-ref">{row.referenceNumber}</strong>
    <p className="pbc-meta">
      <span><i className="fa-solid fa-fire-flame-simple" aria-hidden="true" />{row.fireType ? readable(row.fireType) : "Fire incident"}</span>
      <span><i className="fa-solid fa-location-dot" aria-hidden="true" />{row.barangay ?? "Unknown barangay"}</span>
    </p>
    {row.commands.length > 0 && <ul className="pbc-command-list" aria-label={`Assistance for ${row.referenceNumber}`}>{row.commands.map(command => <li key={command.id}>
      <span><i className="fa-solid fa-handshake-angle" aria-hidden="true" />{command.recipientMunicipalityName}</span>
      <strong className={`pbc-status ${COMMAND_TONES[command.status] ?? "slate"}`}>{readable(command.status)}</strong>
    </li>)}</ul>}
    <button type="button" className="pbc-tile-action" disabled={!row.dispatched} onClick={() => openSupport(row)}>
      <i className={`fa-solid ${row.dispatched ? "fa-paper-plane" : "fa-hourglass-half"}`} aria-hidden="true" />
      {row.dispatched ? "Send support" : "Waiting for dispatch"}
    </button>
  </li>;

  return <article id={`incident-cluster-${alert.id}`} className={`pbc-card${highlighted ? " highlighted" : ""}`} aria-labelledby={`${prefix}-title`}>
    <div className="pbc-hero">
      <div className="pbc-hero-main">
        <span className="pbc-card-icon" aria-hidden="true"><i className="fa-solid fa-city" /></span>
        <div>
          <span className="pbc-eyebrow"><i className="fa-solid fa-tower-broadcast" aria-hidden="true" />Multiple incident alert</span>
          <h3 id={`${prefix}-title`}>{alert.municipalityName}</h3>
          <p className="pbc-place">
            <span><i className="fa-solid fa-fire" aria-hidden="true" />{plural(alert.incidentCount, "active report")}</span>
            <span><i className="fa-solid fa-map-location-dot" aria-hidden="true" />{plural(barangays.length, "barangay")}</span>
            {since && <span><i className="fa-regular fa-clock" aria-hidden="true" />{`Since ${since}`}</span>}
          </p>
        </div>
      </div>
      <span className={`pbc-badge${alert.acknowledgedAt ? " seen" : ""}`}><i className={`fa-solid ${alert.acknowledgedAt ? "fa-circle-check" : "fa-bell"}`} aria-hidden="true" />{alert.acknowledgedAt ? "Acknowledged" : "Needs acknowledgment"}</span>
      <ul className="pbc-barangays" aria-label="Active reports by barangay">
        {barangays.map(group => {
          const cluster = !!group.barangay && group.incidents.length >= BARANGAY_CLUSTER_SIZE;
          return <li key={group.barangay ?? "unknown"} className={cluster ? "cluster" : undefined}>
            <i className={`fa-solid ${cluster ? "fa-triangle-exclamation" : "fa-location-dot"}`} aria-hidden="true" />
            {`${group.barangay ?? "Unknown barangay"} · ${plural(group.incidents.length, "report")}`}
          </li>;
        })}
      </ul>
    </div>
    <div className="pbc-toolbar">
      <div className="pbc-segments" role="group" aria-label="Show incidents">
        {FILTERS.map(option => <button key={option.id} type="button" data-filter={option.id} aria-pressed={activeFilter === option.id} className="pbc-segment" onClick={() => setFilter(option.id)}>
          <i className={`fa-solid ${option.icon}`} aria-hidden="true" />{option.label}<span className="pbc-segment-count">{counts[option.id]}</span>
        </button>)}
      </div>
      <span className="pbc-toolbar-hint"><i className="fa-solid fa-circle-info" aria-hidden="true" />Support opens once the municipality dispatches its units.</span>
    </div>
    {shown.length > 0
      ? <ul className="pbc-grid" aria-label={`${FILTERS.find(option => option.id === activeFilter)?.label} incidents`}>{shown.map(tile)}</ul>
      : <p className="pbc-empty-row">{activeFilter === "ready" ? "No incident is dispatched yet." : "No incident is waiting for verification or dispatch."}</p>}

    {incident && <dialog ref={dialogRef} className="pbc-modal" aria-labelledby={`${prefix}-modal-title`} onCancel={event => { event.preventDefault(); closeSupport(); }}>
      <form className="pbc-modal-card" onSubmit={send} aria-label={`Send support to ${incident.referenceNumber}`}>
        <header className="pbc-modal-head">
          <span className="pbc-modal-icon" aria-hidden="true"><i className="fa-solid fa-truck-fast" /></span>
          <div>
            <h4 id={`${prefix}-modal-title`}>Send support</h4>
            <p>{`${incident.referenceNumber} · ${incident.barangay ?? "Unknown barangay"}, ${alert.municipalityName}`}</p>
          </div>
          <button type="button" className="pbc-modal-close" aria-label="Close" disabled={busy} onClick={closeSupport}><i className="fa-solid fa-xmark" aria-hidden="true" /></button>
        </header>
        <div className="pbc-modal-body">
          <section>
            <h5 className="pbc-step-title"><span>1</span>Choose the helping municipality</h5>
            {candidates.length > 0
              ? <fieldset className="pbc-choices" aria-label="Receiving municipality, nearest first">
                {candidates.map((row, index) => {
                  const asked = alreadyAsked(row.municipalityId);
                  const checked = recipient?.municipalityId === row.municipalityId;
                  return <label key={row.municipalityId} className={`pbc-choice${checked ? " checked" : ""}${asked ? " taken" : ""}`}>
                    <input type="radio" name={`${prefix}-recipient`} value={row.municipalityId} checked={checked} disabled={busy || asked} onChange={event => setMunicipalityId(event.target.value)} />
                    <span className="pbc-choice-icon" aria-hidden="true"><i className="fa-solid fa-building-shield" /></span>
                    <span className="pbc-choice-text"><strong>{row.municipalityName}</strong><small>{row.stationName}</small></span>
                    <span className="pbc-choice-meta">{distanceLabel(row.distanceMeters)}{asked ? <em className="taken">Already asked</em> : index === 0 && <em>Nearest</em>}</span>
                  </label>;
                })}
              </fieldset>
              : <p className="pbc-note"><i className="fa-solid fa-circle-info" aria-hidden="true" />No eligible nearby BFP station is available for this incident.</p>}
            {candidates.length > 0 && !recipient && <p className="pbc-note"><i className="fa-solid fa-circle-info" aria-hidden="true" />Every nearby municipality already has an active command for this incident.</p>}
          </section>
          <section>
            <h5 className="pbc-step-title"><span>2</span>Resources to send</h5>
            <div className="pbc-resources">
              {stepper("trucks", "Firetrucks", "fa-truck-moving", trucks, setTrucks)}
              {stepper("personnel", "Personnel", "fa-people-group", personnel, setPersonnel)}
            </div>
          </section>
          <p className="pbc-hint"><i className="fa-solid fa-ruler" aria-hidden="true" />Distances are straight-line from the incident to each BFP station.</p>
          {error && <p className="pbc-error" role="alert">{error}</p>}
        </div>
        <footer className="pbc-modal-foot">
          <button type="button" className="pbc-button secondary" disabled={busy} onClick={closeSupport}>Cancel</button>
          <button type="submit" className="pbc-button" disabled={!canSend}><i className="fa-solid fa-paper-plane" aria-hidden="true" />{busy ? "Sending command..." : "Send Resource Command"}</button>
        </footer>
      </form>
    </dialog>}
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
    {error && <div><p className="pbc-error" role="alert">{error}</p><button type="button" className="pbc-button secondary" disabled={checking} onClick={() => void refresh()}>Retry sync</button></div>}
    {alerts.map(alert => <MunicipalCoordinationCard key={alert.id} alert={alert} highlighted={alert.id === highlightedId} submitCommand={submitCommand} />)}
    {alerts.length === 0 && <div className="pbc-empty">
      <span className="pbc-empty-icon" aria-hidden="true"><i className={`fa-solid ${loading ? "fa-spinner fa-spin" : "fa-shield-halved"}`} /></span>
      <strong>{loading ? "Checking active fire reports..." : error ? "Current alerts could not be loaded." : "No municipality has three or more active fire reports."}</strong>
      {!loading && !error && <span>The alarm sounds and this tab fills in when one does.</span>}
    </div>}
  </section>;
}
