"use client";

import { createPortal } from "react-dom";

import {
  fireTruckOwnershipLabels,
  fireTruckStatusDescriptions,
  fireTruckStatusLabels,
  formatAcquired,
  formatGallons,
} from "../../lib/fire-trucks/presentation";
import type { FireTruck } from "../../lib/fire-trucks/types";
import { useDialogFocus } from "./use-dialog-focus";

export const fireTruckDialogStyles = `
  .truck-dialog-backdrop { position:fixed; inset:0; z-index:99999999; display:grid; place-items:center; padding:clamp(.75rem,3vw,2rem); background:rgba(15,23,42,.72); backdrop-filter:blur(8px); -webkit-backdrop-filter:blur(8px); font-family:'Plus Jakarta Sans',sans-serif; color:#172033; }
  .truck-dialog-backdrop * { box-sizing:border-box; }
  .truck-dialog { width:min(640px,100%); max-height:calc(100dvh - 2rem); overflow:auto; background:#fff; border:1px solid #e4e7ec; border-radius:16px; box-shadow:0 30px 80px rgba(15,23,42,.34); }
  .truck-dialog__head { display:flex; justify-content:space-between; gap:1rem; padding:1.2rem 1.35rem; border-bottom:1px solid #e4e7ec; }
  .truck-dialog__eyebrow { margin:0 0 .3rem; color:#b42318; font-size:.68rem; font-weight:850; letter-spacing:.08em; text-transform:uppercase; }
  .truck-dialog__head h2 { margin:0; font-size:1.15rem; letter-spacing:-.02em; line-height:1.35; }
  .truck-dialog__head p { margin:.3rem 0 0; color:#667085; font-size:.76rem; }
  .truck-dialog__close { width:44px; height:44px; flex:0 0 44px; border:1px solid #e4e7ec; border-radius:10px; background:#fff; color:#475467; cursor:pointer; }
  .truck-dialog__close:hover { border-color:#fca5a5; color:#b42318; }
  .truck-dialog__close:focus-visible, .truck-dialog button:focus-visible, .truck-dialog input:focus-visible, .truck-dialog select:focus-visible, .truck-dialog textarea:focus-visible { outline:3px solid rgba(37,99,235,.35); outline-offset:2px; }
  .truck-dialog__body { padding:1.15rem 1.35rem 1.35rem; }
  .truck-dialog__hero { display:grid; grid-template-columns:auto minmax(0,1fr) auto; gap:1rem; align-items:center; padding:1rem 1.1rem; border:1px solid #fecaca; border-radius:16px; background:linear-gradient(120deg,#fff5f5 0%,#ffffff 75%); box-shadow:0 12px 26px -20px rgba(180,35,24,.6); }
  .truck-dialog__hero.is-down { border-color:#e4e7ec; background:linear-gradient(120deg,#f8fafc 0%,#ffffff 75%); box-shadow:0 12px 26px -20px rgba(15,23,42,.35); }
  .truck-dialog__icon { display:grid; width:54px; height:54px; place-items:center; border-radius:15px; background:linear-gradient(135deg,#ef4444,#b42318); color:#fff; font-size:1.35rem; box-shadow:0 12px 22px -10px rgba(180,35,24,.75); }
  .truck-dialog__hero.is-down .truck-dialog__icon { background:linear-gradient(135deg,#64748b,#334155); box-shadow:0 12px 22px -12px rgba(15,23,42,.6); }
  .truck-dialog__hero-text { min-width:0; display:grid; gap:.25rem; justify-items:start; }
  .truck-dialog__hero-text strong { font-size:1rem; line-height:1.3; }
  .truck-dialog__hero-text small { color:#667085; font-size:.76rem; }
  .truck-dialog__capacity { display:grid; justify-items:end; gap:.1rem; padding-left:1rem; border-left:1px solid #fde2e2; }
  .truck-dialog__hero.is-down .truck-dialog__capacity { border-left-color:#e4e7ec; }
  .truck-dialog__capacity b { font-size:1.35rem; font-weight:850; line-height:1.1; letter-spacing:-.02em; font-variant-numeric:tabular-nums; }
  .truck-dialog__capacity small { color:#667085; font-size:.68rem; font-weight:750; text-transform:uppercase; letter-spacing:.05em; }
  .truck-dialog__facts { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:.7rem; margin-top:1rem; }
  .truck-dialog__fact { display:flex; align-items:flex-start; gap:.7rem; min-width:0; padding:.8rem .85rem; border:1px solid #e1e8f0; border-radius:12px; background:#ffffff; box-shadow:0 6px 16px -14px rgba(15,23,42,.45); }
  .truck-dialog__fact.is-wide { grid-column:1 / -1; }
  .truck-dialog__fact-icon { flex:0 0 auto; display:grid; width:34px; height:34px; place-items:center; border-radius:10px; font-size:.85rem; }
  .truck-dialog__fact-icon.red { background:#fef2f2; color:#b42318; }
  .truck-dialog__fact-icon.blue { background:#eff6ff; color:#1d4ed8; }
  .truck-dialog__fact-icon.amber { background:#fffbeb; color:#b45309; }
  .truck-dialog__fact-icon.green { background:#ecfdf3; color:#067647; }
  .truck-dialog__fact-icon.violet { background:#f5f3ff; color:#6d28d9; }
  .truck-dialog__fact-text { min-width:0; display:grid; gap:.15rem; }
  .truck-dialog__fact-text > span { color:#64748b; font-size:.64rem; font-weight:800; letter-spacing:.05em; text-transform:uppercase; }
  .truck-dialog__fact-text strong { overflow-wrap:anywhere; color:#1e293b; font-size:.88rem; line-height:1.35; }
  .truck-dialog__fact-text small { color:#667085; font-size:.7rem; }
  .truck-dialog__fact-text strong.is-missing { color:#94a3b8; font-weight:700; }
  .truck-dialog__remarks { margin-top:1rem; padding:.8rem .9rem; border-left:3px solid #b42318; border-radius:0 9px 9px 0; background:#fff5f5; color:#7a271a; font-size:.82rem; line-height:1.5; }
  .truck-dialog__remarks span { display:block; margin-bottom:.2rem; color:#b42318; font-size:.66rem; font-weight:850; letter-spacing:.06em; text-transform:uppercase; }
  .truck-dialog__origin { display:inline-flex; align-items:center; gap:.45rem; margin-top:1rem; padding:.42rem .65rem; border-radius:8px; background:#f2f4f7; color:#475467; font-size:.72rem; font-weight:750; }
  .truck-status { display:inline-flex; align-items:center; gap:.3rem; width:max-content; padding:.24rem .55rem; border-radius:999px; font-size:.68rem; font-weight:800; }
  .truck-status::before { content:""; width:6px; height:6px; border-radius:50%; background:currentColor; }
  .truck-status.is-serviceable { background:#ecfdf3; color:#067647; }
  .truck-status.is-unserviceable { background:#fffaeb; color:#b54708; }
  .truck-status.is-for_ber { background:#fef3f2; color:#b42318; }
  .truck-status.is-ber { background:#f2f4f7; color:#475467; }
  @media (max-width:520px) {
    .truck-dialog__facts { grid-template-columns:1fr; }
    .truck-dialog__hero { grid-template-columns:auto minmax(0,1fr); }
    .truck-dialog__capacity { grid-column:1 / -1; justify-items:start; padding:.6rem 0 0; border-left:0; border-top:1px solid #fde2e2; }
    .truck-dialog__hero.is-down .truck-dialog__capacity { border-top-color:#e4e7ec; }
  }
`;

export function FireTruckStatusPill({ status }: { status: FireTruck["operationalStatus"] }) {
  return <span className={`truck-status is-${status.toLowerCase()}`}>{fireTruckStatusLabels[status]}</span>;
}

function FactCard({ icon, tone, label, value, note, wide }: { icon: string; tone: string; label: string; value: string | null; note?: string; wide?: boolean }) {
  return (
    <article className={`truck-dialog__fact${wide ? " is-wide" : ""}`}>
      <span className={`truck-dialog__fact-icon ${tone}`} aria-hidden="true"><i className={`fa-solid ${icon}`} /></span>
      <span className="truck-dialog__fact-text">
        <span>{label}</span>
        <strong className={value ? undefined : "is-missing"}>{value ?? "Not recorded"}</strong>
        {note && <small>{note}</small>}
      </span>
    </article>
  );
}

export function FireTruckDetailsDialog({
  truck,
  onClose,
  pageSelector,
}: {
  truck: FireTruck | null;
  onClose: () => void;
  pageSelector: string;
}) {
  useDialogFocus(Boolean(truck), "truck-details-title", onClose, pageSelector);
  if (!truck || typeof document === "undefined") return null;

  const down = truck.operationalStatus !== "SERVICEABLE";
  const exact = truck.acquiredOn && truck.acquiredPrecision;
  return createPortal(
    <div
      className="truck-dialog-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section className="truck-dialog" role="dialog" aria-modal="true" aria-labelledby="truck-details-title">
        <header className="truck-dialog__head">
          <div>
            <p className="truck-dialog__eyebrow">{truck.stationName} · {truck.municipalityName}</p>
            <h2 id="truck-details-title">{truck.make}</h2>
            <p>Fire truck details</p>
          </div>
          <button className="truck-dialog__close" type="button" aria-label="Close fire truck details" onClick={onClose}>
            <i className="fa-solid fa-xmark" aria-hidden="true" />
          </button>
        </header>
        <div className="truck-dialog__body">
          <section className={`truck-dialog__hero${down ? " is-down" : ""}`}>
            <span className="truck-dialog__icon" aria-hidden="true"><i className="fa-solid fa-truck-droplet" /></span>
            <div className="truck-dialog__hero-text">
              <FireTruckStatusPill status={truck.operationalStatus} />
              <strong>{fireTruckStatusDescriptions[truck.operationalStatus]}</strong>
            </div>
            <div className="truck-dialog__capacity">
              <b>{formatGallons(truck.capacityGallons)}</b>
              <small>Water capacity</small>
            </div>
          </section>
          <div className="truck-dialog__facts">
            <FactCard icon="fa-building-shield" tone="red" label="Station" value={truck.stationName} wide />
            <FactCard icon="fa-location-dot" tone="blue" label="Municipality" value={truck.municipalityName} note={truck.incomeClass ? `${truck.incomeClass} class municipality` : undefined} />
            <FactCard icon="fa-calendar" tone="amber" label="Year model" value={truck.manufacturedYear ? String(truck.manufacturedYear) : null} />
            <FactCard icon="fa-calendar-check" tone="green" label="Acquired" value={formatAcquired(truck)} note={exact && truck.acquiredLabel ? `Inventory entry: ${truck.acquiredLabel}` : undefined} />
            <FactCard icon="fa-id-badge" tone="violet" label="Ownership" value={fireTruckOwnershipLabels[truck.ownership]} />
          </div>
          {truck.remarks && <p className="truck-dialog__remarks"><span>Remarks</span>{truck.remarks}</p>}
          <span className="truck-dialog__origin">
            <i className="fa-solid fa-file-shield" aria-hidden="true" />
            {truck.recordOrigin === "BFP_FIRETRUCK_INVENTORY" ? "Provincial fire truck inventory" : "Added by Provincial BFP"}
          </span>
        </div>
      </section>
    </div>,
    document.body,
  );
}
