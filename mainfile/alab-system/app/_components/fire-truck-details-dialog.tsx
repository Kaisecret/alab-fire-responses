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
  .truck-dialog__hero { display:grid; grid-template-columns:auto 1fr; gap:.9rem; align-items:center; padding:1rem; border:1px solid #fecaca; border-radius:14px; background:linear-gradient(120deg,#fff5f5,#fffafa); }
  .truck-dialog__hero.is-down { border-color:#e4e7ec; background:#f8fafc; }
  .truck-dialog__icon { display:grid; width:46px; height:46px; place-items:center; border-radius:13px; background:#b42318; color:#fff; font-size:1.15rem; box-shadow:0 10px 20px rgba(180,35,24,.24); }
  .truck-dialog__hero.is-down .truck-dialog__icon { background:#475467; box-shadow:none; }
  .truck-dialog__hero strong { display:block; font-size:.95rem; }
  .truck-dialog__hero span { display:block; margin-top:.2rem; color:#667085; font-size:.75rem; }
  .truck-dialog__facts { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:.65rem; margin-top:1rem; }
  .truck-dialog__fact { min-width:0; padding:.75rem .8rem; border:1px solid #e1e8f0; border-radius:11px; background:#f8fafc; }
  .truck-dialog__fact span { display:block; margin-bottom:.22rem; color:#64748b; font-size:.66rem; font-weight:800; letter-spacing:.045em; text-transform:uppercase; }
  .truck-dialog__fact strong { display:block; overflow-wrap:anywhere; color:#24314a; font-size:.86rem; line-height:1.35; }
  .truck-dialog__fact small { display:block; margin-top:.2rem; color:#667085; font-size:.7rem; }
  .truck-dialog__remarks { margin-top:1rem; padding:.8rem .9rem; border-left:3px solid #b42318; border-radius:0 9px 9px 0; background:#fff5f5; color:#7a271a; font-size:.82rem; line-height:1.5; }
  .truck-dialog__remarks span { display:block; margin-bottom:.2rem; color:#b42318; font-size:.66rem; font-weight:850; letter-spacing:.06em; text-transform:uppercase; }
  .truck-dialog__origin { display:inline-flex; align-items:center; gap:.45rem; margin-top:1rem; padding:.42rem .65rem; border-radius:8px; background:#f2f4f7; color:#475467; font-size:.72rem; font-weight:750; }
  .truck-status { display:inline-flex; align-items:center; gap:.3rem; width:max-content; padding:.24rem .55rem; border-radius:999px; font-size:.68rem; font-weight:800; }
  .truck-status::before { content:""; width:6px; height:6px; border-radius:50%; background:currentColor; }
  .truck-status.is-serviceable { background:#ecfdf3; color:#067647; }
  .truck-status.is-unserviceable { background:#fffaeb; color:#b54708; }
  .truck-status.is-for_ber { background:#fef3f2; color:#b42318; }
  .truck-status.is-ber { background:#f2f4f7; color:#475467; }
  @media (max-width:520px) { .truck-dialog__facts { grid-template-columns:1fr; } }
`;

export function FireTruckStatusPill({ status }: { status: FireTruck["operationalStatus"] }) {
  return <span className={`truck-status is-${status.toLowerCase()}`}>{fireTruckStatusLabels[status]}</span>;
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
            <span className="truck-dialog__icon"><i className="fa-solid fa-truck-moving" aria-hidden="true" /></span>
            <div>
              <FireTruckStatusPill status={truck.operationalStatus} />
              <strong>{fireTruckStatusDescriptions[truck.operationalStatus]}</strong>
              <span>{formatGallons(truck.capacityGallons)} water capacity</span>
            </div>
          </section>
          <div className="truck-dialog__facts">
            <article className="truck-dialog__fact"><span>Station</span><strong>{truck.stationName}</strong></article>
            <article className="truck-dialog__fact"><span>Municipality</span><strong>{truck.municipalityName}</strong>{truck.incomeClass && <small>{truck.incomeClass} class municipality</small>}</article>
            <article className="truck-dialog__fact"><span>Water capacity</span><strong>{formatGallons(truck.capacityGallons)}</strong></article>
            <article className="truck-dialog__fact"><span>Year model</span><strong>{truck.manufacturedYear ?? "Not recorded"}</strong></article>
            <article className="truck-dialog__fact"><span>Acquired</span><strong>{formatAcquired(truck)}</strong>{exact && truck.acquiredLabel && <small>Inventory entry: {truck.acquiredLabel}</small>}</article>
            <article className="truck-dialog__fact"><span>Ownership</span><strong>{fireTruckOwnershipLabels[truck.ownership]}</strong></article>
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
