"use client";

import { fireTruckOwnershipLabels, formatAcquired, formatGallons } from "../../lib/fire-trucks/presentation";
import type { FireTruck } from "../../lib/fire-trucks/types";
import { FireTruckStatusPill } from "./fire-truck-details-dialog";

export const fireTruckCardStyles = `
  .truck-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(270px,1fr)); gap:calc(.75rem + 5px); }
  .truck-card { appearance:none; width:100%; padding:0; text-align:left; font:inherit; cursor:pointer; display:flex; flex-direction:column; min-height:238px; color:inherit; background:#fff; border:1px solid #e4e7ec; border-radius:12px; overflow:hidden; transition:border-color .18s, transform .18s, box-shadow .18s; touch-action:manipulation; -webkit-tap-highlight-color:transparent; }
  .truck-card:hover { border-color:#fca5a5; transform:translateY(-2px); box-shadow:0 10px 28px rgba(15,23,42,.08); }
  .truck-card:focus-visible { outline:3px solid rgba(37,99,235,.35); outline-offset:2px; }
  .truck-card__head { display:flex; align-items:center; gap:.75rem; padding:1rem; background:linear-gradient(135deg,#b42318 0%,#e23632 100%); color:#fff; }
  .truck-card.is-down .truck-card__head { background:linear-gradient(135deg,#475467 0%,#667085 100%); }
  .truck-card__icon { width:40px; height:40px; flex:0 0 40px; display:grid; place-items:center; border-radius:10px; background:rgba(255,255,255,.17); }
  .truck-card__title { margin:0; font-size:.9rem; font-weight:800; line-height:1.3; }
  .truck-card__station { margin:.15rem 0 0; font-size:.7rem; opacity:.86; }
  .truck-card__body { display:grid; gap:.55rem; padding:1rem; flex:1; }
  .truck-card__row { display:flex; justify-content:space-between; gap:1rem; font-size:.76rem; }
  .truck-card__row span { color:#667085; }
  .truck-card__row strong { text-align:right; font-weight:750; }
  .truck-card__cue { display:flex; align-items:center; justify-content:space-between; gap:.5rem; margin-top:auto; padding:.7rem 1rem; border-top:1px solid #f0f1f3; color:#b42318; font-size:.73rem; font-weight:800; }
  @media (prefers-reduced-motion:reduce) { .truck-card { transition:none; } .truck-card:hover { transform:none; } }
`;

export function FireTruckCard({
  truck,
  onOpen,
  showMunicipality = false,
}: {
  truck: FireTruck;
  onOpen: (truck: FireTruck) => void;
  showMunicipality?: boolean;
}) {
  const down = truck.operationalStatus !== "SERVICEABLE";
  return (
    <button
      type="button"
      className={`truck-card${down ? " is-down" : ""}`}
      onClick={() => onOpen(truck)}
      aria-label={`Open details for ${truck.make}, ${truck.stationName}`}
    >
      <div className="truck-card__head">
        <span className="truck-card__icon"><i className="fa-solid fa-truck-moving" aria-hidden="true" /></span>
        <div>
          <p className="truck-card__title">{truck.make}</p>
          <p className="truck-card__station">{showMunicipality ? `${truck.stationName} · ${truck.municipalityName}` : truck.stationName}</p>
        </div>
      </div>
      <div className="truck-card__body">
        <div className="truck-card__row"><span>Water capacity</span><strong>{formatGallons(truck.capacityGallons)}</strong></div>
        <div className="truck-card__row"><span>Year model</span><strong>{truck.manufacturedYear ?? "Not recorded"}</strong></div>
        <div className="truck-card__row"><span>Acquired</span><strong>{formatAcquired(truck)}</strong></div>
        <div className="truck-card__row"><span>Ownership</span><strong>{fireTruckOwnershipLabels[truck.ownership]}</strong></div>
        <FireTruckStatusPill status={truck.operationalStatus} />
      </div>
      <span className="truck-card__cue">View details <i className="fa-solid fa-arrow-right" aria-hidden="true" /></span>
    </button>
  );
}
