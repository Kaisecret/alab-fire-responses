"use client";

import { municipalTabFetch as fetch } from "../../lib/auth/municipal-tab-fetch";

import { useEffect, useMemo, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";

import { MunicipalGisIncidentModal, type DensityEvidencePayload } from "./municipal-gis-incident-modal";
import { MunicipalIncident, useMunicipalIncidentFeed } from "./use-municipal-incident-feed";
import { densityRiskClass } from "../../lib/fire-reports/building-density-presentation";
import type { WaterSource } from "../../lib/water-sources/types";

const DEFAULT_MAP_CENTER: [number, number] = [10.75, 121.94];
const TERMINAL_STATUSES = new Set(["RESOLVED", "REJECTED", "FALSE_REPORT", "DUPLICATE", "CLOSED"]);
const MUNICIPAL_CENTERS: Record<string, [number, number]> = {
  "Anini-y": [10.431, 121.926], Barbaza: [11.195, 122.037], Belison: [10.837, 121.961], Bugasong: [11.044, 122.064], Caluya: [11.934, 121.548], Culasi: [11.445, 122.057], "Tobias Fornier": [10.515, 121.932], Hamtic: [10.704, 121.982], "Laua-an": [11.186, 122.111], Libertad: [11.774, 121.92], Pandan: [11.718, 122.093], Patnongon: [10.918, 122.004], "San Jose de Buenavista": [10.744, 121.942], "San Remigio": [10.82, 122.08], Sebaste: [11.625, 122.095], Sibalom: [10.79, 122.028], Tibiao: [11.289, 122.048], Valderrama: [11.009, 122.047],
};

type IncidentCluster = { key: string; latitude: number; longitude: number; incidents: MunicipalIncident[]; activeCount: number };

type StationMarker = {
  id: string;
  stationName: string;
  latitude: number;
  longitude: number;
  status: string;
};

function escapeHtml(value: string | number) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/** What the map is showing: everything, only what is live, or only the archive. */
type MapView = "ALL" | "ACTIVE" | "HISTORY";

/**
 * How far a station is drawn as covering.
 *
 * Not a promise about response time, which depends on the road and the hour.
 * It is a reading aid: a barangay outside every ring is one no station is
 * close to, and that is worth seeing on the map rather than working out.
 */
const STATION_COVERAGE_METERS = 3_000;

export function clusterIncidents(incidents: MunicipalIncident[]): IncidentCluster[] {
  const clusters = new Map<string, IncidentCluster>();
  incidents.forEach((incident) => {
    if (!Number.isFinite(incident.latitude) || !Number.isFinite(incident.longitude)) return;
    const key = `${incident.latitude.toFixed(5)}:${incident.longitude.toFixed(5)}`;
    const current = clusters.get(key) ?? { key, latitude: incident.latitude, longitude: incident.longitude, incidents: [], activeCount: 0 };
    current.incidents.push(incident);
    if (!TERMINAL_STATUSES.has(incident.status)) current.activeCount += 1;
    clusters.set(key, current);
  });
  return Array.from(clusters.values());
}

const styles = `
  .mbfp-ops-root{min-height:100dvh;padding:clamp(1rem,2vw,1.75rem);background:#eef5fd;color:#0f172a}.mbfp-ops-workspace{width:min(100%,1440px);margin:0 auto}.mbfp-ops-toolbar{display:flex;align-items:end;justify-content:space-between;gap:1rem;margin-bottom:1rem}.mbfp-ops-eyebrow{display:inline-flex;align-items:center;gap:.5rem;margin:0 0 .35rem;color:#b91c1c;font-size:.73rem;font-weight:800;letter-spacing:.09em;text-transform:uppercase}.mbfp-ops-eyebrow:before{width:.55rem;height:.55rem;border-radius:999px;background:#dc2626;box-shadow:0 0 0 4px rgba(220,38,38,.12);content:""}.mbfp-ops-title{margin:0;font-size:clamp(1.75rem,3vw,2.75rem);line-height:1;letter-spacing:-.045em;font-weight:800}.mbfp-ops-subtitle{max-width:64ch;margin:.55rem 0 0;color:#5f718d;font-size:.96rem;line-height:1.55}.mbfp-ops-tools{display:flex;align-items:center;justify-content:flex-end;gap:.75rem;flex-wrap:wrap}.mbfp-ops-live{display:grid;grid-template-columns:auto 1fr;column-gap:.5rem;align-items:center;min-height:2.75rem;color:#0f766e;font-size:.86rem;font-weight:750}.mbfp-ops-live small{grid-column:2;color:#64748b;font-size:.66rem;font-weight:700}.mbfp-ops-live-dot{width:.5rem;height:.5rem;border-radius:999px;background:#10b981;box-shadow:0 0 0 0 rgba(16,185,129,.38);animation:mbfp-ops-pulse 1.9s ease-out infinite}.mbfp-ops-refresh{display:inline-flex;align-items:center;justify-content:center;gap:.55rem;min-height:2.8rem;padding:.65rem .9rem;border:1px solid #cfdced;border-radius:10px;background:#fff;color:#25354f;font:inherit;font-size:.88rem;font-weight:750;cursor:pointer;box-shadow:0 8px 20px rgba(42,68,110,.07)}.mbfp-ops-refresh:hover:not(:disabled){border-color:#94a3b8;background:#f8fafc}.mbfp-ops-refresh:disabled{color:#94a3b8;cursor:wait}.mbfp-ops-map-shell{position:relative;overflow:hidden;min-height:min(680px,calc(100dvh - 225px));border:1px solid #d7e3f1;border-radius:18px;background:#dbeafe;box-shadow:0 22px 48px rgba(54,78,110,.14)}.mbfp-ops-map{width:100%;min-height:min(680px,calc(100dvh - 225px))}.mbfp-ops-map .leaflet-control-zoom a{width:2.25rem;height:2.25rem;line-height:2.1rem;color:#1e293b;border-color:#d7e3f1}.mbfp-ops-marker-wrapper{background:transparent;border:0}.mbfp-ops-marker-ring{position:relative;display:grid;width:58px;height:58px;place-items:center;border:1px solid rgba(220,38,38,.42);border-radius:999px;background:rgba(254,242,242,.45);box-shadow:0 0 0 8px rgba(220,38,38,.1)}.mbfp-ops-marker-ring.density-critical{border-color:#7f1d1d;background:rgba(254,226,226,.78);box-shadow:0 0 0 11px rgba(220,38,38,.2)}.mbfp-ops-marker-ring.density-warning{border-color:#c2410c;background:rgba(255,237,213,.75);box-shadow:0 0 0 10px rgba(234,88,12,.16)}.mbfp-ops-marker-ring.is-history{border-color:rgba(71,85,105,.4);background:rgba(241,245,249,.65);box-shadow:0 0 0 8px rgba(71,85,105,.1)}.mbfp-ops-fire-marker{display:grid;width:32px;height:32px;place-items:center;border:2px solid #fff;border-radius:50% 50% 50% 0;background:#dc2626;box-shadow:0 5px 12px rgba(153,27,27,.48);transform:rotate(-45deg)}.is-history .mbfp-ops-fire-marker{background:#64748b;box-shadow:0 5px 12px rgba(51,65,85,.35)}.mbfp-ops-fire-marker i{color:#fff;font-size:.82rem;transform:rotate(45deg)}.mbfp-ops-marker-count{position:absolute;right:-1px;top:-1px;display:grid;min-width:20px;height:20px;padding:0 4px;place-items:center;border:2px solid #fff;border-radius:999px;background:#0f172a;color:#fff;font:800 11px/1 Arial,sans-serif}.mbfp-ops-density-legend{position:absolute;z-index:420;left:1rem;bottom:1rem;max-width:250px;padding:.7rem .8rem;border:1px solid rgba(255,255,255,.85);border-radius:10px;background:rgba(255,255,255,.93);color:#334155;font-size:.72rem;line-height:1.4;box-shadow:0 8px 22px rgba(15,23,42,.16)}.mbfp-ops-density-legend strong{display:block;color:#991b1b}.mbfp-ops-empty{position:absolute;z-index:420;left:50%;top:50%;width:min(31rem,calc(100% - 2rem));padding:1.1rem 1.25rem;border:1px solid rgba(255,255,255,.8);border-radius:14px;background:rgba(255,255,255,.94);color:#334155;text-align:center;transform:translate(-50%,-50%);box-shadow:0 18px 42px rgba(45,65,89,.18)}.mbfp-ops-empty strong{display:block;margin-bottom:.32rem;color:#0f172a;font-size:1rem}.mbfp-ops-empty p{margin:0;font-size:.9rem;line-height:1.45}.mbfp-ops-map-loading{position:absolute;inset:0;background:linear-gradient(105deg,#d9e5f1 20%,#edf4fb 38%,#d9e5f1 55%);background-size:220% 100%;animation:mbfp-ops-shimmer 1.35s linear infinite}.mbfp-ops-footnote{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:1rem;align-items:center;margin-top:.8rem;color:#61718a;font-size:.85rem;line-height:1.45}.mbfp-ops-summary{display:inline-flex;align-items:baseline;gap:.55rem;color:#1e293b}.mbfp-ops-summary strong{color:#dc2626;font-size:1.08rem}.mbfp-ops-error{color:#b91c1c;font-weight:700}.mbfp-ops-queue-link{color:#b91c1c;font-weight:800;text-decoration:none}.mbfp-ops-queue-link:hover{text-decoration:underline}
  .mbfp-gis-modal-backdrop{position:fixed;top:0;left:0;right:0;bottom:0;inset:0;width:100vw;height:100vh;z-index:99999999 !important;display:grid;padding:clamp(.75rem,3vw,2rem);place-items:center;background:rgba(15,23,42,.72);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);box-sizing:border-box;animation:fadeIn .2s cubic-bezier(.16,1,.3,1)}.mbfp-gis-modal{display:flex;overflow:hidden;width:min(100%,880px);max-height:min(850px,calc(100dvh - 2rem));flex-direction:column;border:1px solid rgba(255,255,255,.7);border-radius:22px;background:#fff;box-shadow:0 30px 80px rgba(15,23,42,.34)}.mbfp-gis-modal-header{display:flex;align-items:start;justify-content:space-between;gap:1rem;padding:1.25rem 1.4rem;border-bottom:1px solid #e5edf6}.mbfp-gis-modal-kicker{margin:0 0 .25rem;color:#dc2626;font-size:.68rem;font-weight:850;letter-spacing:.08em;text-transform:uppercase}.mbfp-gis-modal-header h2{margin:0;color:#15213a;font-size:1.25rem;letter-spacing:-.025em}.mbfp-gis-modal-close{display:grid;width:2.3rem;height:2.3rem;flex:0 0 auto;place-items:center;border:1px solid #dbe4ef;border-radius:10px;background:#fff;color:#475569;cursor:pointer}.mbfp-gis-modal-close:hover{border-color:#fca5a5;color:#dc2626}.mbfp-gis-modal-selector{display:flex;overflow:auto;gap:.55rem;padding:.75rem 1.35rem;border-bottom:1px solid #e5edf6;background:#f8fafc}.mbfp-gis-modal-selector button{min-width:185px;padding:.68rem .78rem;border:1px solid #dbe4ef;border-radius:10px;background:#fff;color:#475569;text-align:left;cursor:pointer}.mbfp-gis-modal-selector button.is-selected{border-color:#ef4444;background:#fff5f5;color:#991b1b}.mbfp-gis-modal-selector strong,.mbfp-gis-modal-selector span{display:block}.mbfp-gis-modal-selector strong{font-size:.78rem}.mbfp-gis-modal-selector span{margin-top:.25rem;font-size:.7rem}.mbfp-gis-modal-body{overflow:auto;padding:1.2rem 1.4rem 1.5rem}.mbfp-gis-modal-loading,.mbfp-gis-modal-error{margin:1.25rem;padding:1rem;border-radius:12px;background:#f8fafc;color:#475569}.mbfp-gis-modal-error{background:#fff1f2;color:#b91c1c}.mbfp-gis-modal-hero{display:grid;grid-template-columns:auto 1fr;gap:.7rem;align-items:center;padding:1rem;border:1px solid #fecaca;border-radius:14px;background:linear-gradient(120deg,#fff5f5,#fffafa)}.mbfp-gis-modal-fire{display:grid;width:42px;height:42px;place-items:center;border-radius:13px;background:#dc2626;color:#fff;box-shadow:0 10px 20px rgba(220,38,38,.24)}.mbfp-gis-modal-hero strong{margin-right:.55rem;color:#17213a}.mbfp-gis-status{display:inline-flex;padding:.26rem .5rem;border-radius:999px;background:#dcfce7;color:#047857;font-size:.68rem;font-weight:850;text-transform:uppercase}.mbfp-gis-status.status-resolved,.mbfp-gis-status.status-closed{background:#e2e8f0;color:#475569}.mbfp-gis-modal-hero p{grid-column:2;margin:0;color:#64748b;font-size:.76rem}.mbfp-gis-facts{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.65rem;margin-top:1rem}.mbfp-gis-facts article{min-width:0;padding:.72rem .78rem;border:1px solid #e1e8f0;border-radius:11px;background:#f8fafc}.mbfp-gis-facts span{display:block;margin-bottom:.22rem;color:#64748b;font-size:.66rem;font-weight:800;letter-spacing:.045em;text-transform:uppercase}.mbfp-gis-facts strong{display:block;overflow-wrap:anywhere;color:#24314a;font-size:.86rem;line-height:1.35}.mbfp-gis-modal-section{margin-top:1rem;padding-top:1rem;border-top:1px solid #e8eef5}.mbfp-gis-modal-section h3{margin:0 0 .55rem;color:#23314a;font-size:.9rem}.mbfp-gis-modal-section>p{margin:0;padding:.8rem;border-left:3px solid #ef4444;border-radius:0 9px 9px 0;background:#f8fafc;color:#475569;font-size:.84rem;line-height:1.5}.mbfp-gis-timeline{display:grid;gap:.75rem;margin:0;padding:0;list-style:none}.mbfp-gis-timeline li{display:grid;grid-template-columns:16px 1fr;gap:.62rem}.mbfp-gis-timeline li>span{width:10px;height:10px;margin:4px 0 0;border:2px solid #fff;border-radius:999px;background:#dc2626;box-shadow:0 0 0 2px #fecaca}.mbfp-gis-timeline strong,.mbfp-gis-timeline small{display:block}.mbfp-gis-timeline strong{color:#26354f;font-size:.82rem}.mbfp-gis-timeline small{margin-top:.15rem;color:#64748b;font-size:.72rem}.mbfp-gis-timeline p{margin:.3rem 0 0;color:#52627d;font-size:.78rem;line-height:1.4}.mbfp-gis-photo-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:.7rem}.mbfp-gis-photo-link{overflow:hidden;border:1px solid #e1e8f0;border-radius:10px;color:#b91c1c;font-size:.75rem;font-weight:800;text-decoration:none}.mbfp-gis-photo-link img{display:block;width:100%;height:120px;object-fit:cover}.mbfp-gis-photo-link span{display:block;padding:.6rem}
  .mbfp-ops-toolbar{align-items:center;margin-bottom:.75rem}.mbfp-ops-title{font-size:clamp(1.5rem,2.4vw,2.2rem);line-height:1.05}.mbfp-ops-refresh{min-height:2.55rem;padding:.55rem .8rem;font-size:.82rem}.mbfp-gis-modal{width:min(100%,720px);max-height:min(700px,calc(100dvh - 4rem));border-radius:18px}.mbfp-gis-modal-header{padding:1rem 1.1rem}.mbfp-gis-modal-selector{padding:.6rem 1.1rem}.mbfp-gis-modal-body{padding:1rem 1.1rem 1.2rem}.mbfp-gis-modal-loading,.mbfp-gis-modal-error{margin:1rem}.mbfp-gis-modal-hero{padding:.85rem}.mbfp-gis-facts{gap:.5rem;margin-top:.75rem}.mbfp-gis-facts article{padding:.6rem .68rem}.mbfp-gis-modal-section{margin-top:.75rem;padding-top:.75rem}
  /* Operational furniture: what the municipality is holding, how to filter it,
     and what the symbols on the map mean. */
  .mbfp-ops-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:.6rem;margin-bottom:.7rem}
  .mbfp-ops-stat{display:flex;flex-direction:column;gap:.1rem;padding:.7rem .85rem;border:1px solid #d7e3f1;border-left-width:3px;border-radius:11px;background:#fff;box-shadow:0 1px 3px rgba(15,23,42,.04)}
  .mbfp-ops-stat.is-active{border-left-color:#dc2626}
  .mbfp-ops-stat.is-resolved{border-left-color:#64748b}
  .mbfp-ops-stat.is-stations{border-left-color:#2563eb}
  .mbfp-ops-stat.is-sites{border-left-color:#0f766e}
  .mbfp-ops-stat-num{font-size:1.5rem;font-weight:900;line-height:1;color:#0f172a;font-variant-numeric:tabular-nums}
  .mbfp-ops-stat.is-active .mbfp-ops-stat-num{color:#dc2626}
  .mbfp-ops-stat-label{font-size:.66rem;font-weight:800;letter-spacing:.04em;text-transform:uppercase;color:#64748b}

  .mbfp-ops-controls{display:flex;align-items:center;justify-content:space-between;gap:.75rem;flex-wrap:wrap;margin-bottom:.7rem}
  .mbfp-ops-segmented{display:inline-flex;padding:.2rem;border:1px solid #d7e3f1;border-radius:10px;background:#fff;gap:.15rem}
  .mbfp-ops-segment{padding:.4rem .9rem;border:0;border-radius:8px;background:transparent;color:#64748b;font:inherit;font-size:.8rem;font-weight:750;cursor:pointer;transition:background .15s ease,color .15s ease}
  .mbfp-ops-segment:hover{color:#0f172a}
  .mbfp-ops-segment.is-on{background:#0f172a;color:#fff}
  .mbfp-ops-segment:focus-visible{outline:2px solid #dc2626;outline-offset:2px}
  .mbfp-ops-layer-toggle{display:inline-flex;align-items:center;gap:.45rem;padding:.45rem .8rem;border:1px solid #d7e3f1;border-radius:10px;background:#fff;color:#334155;font-size:.8rem;font-weight:700;cursor:pointer}
  .mbfp-ops-layer-toggle i{color:#2563eb;font-size:.78rem}
  .mbfp-ops-layer-toggle input{accent-color:#2563eb;cursor:pointer}

  /* A station and the ground it can reach. */
  .mbfp-ops-station-pin{display:grid;width:30px;height:30px;place-items:center;border:2px solid #fff;border-radius:9px;background:#2563eb;color:#fff;font-size:.72rem;box-shadow:0 4px 10px rgba(37,99,235,.42)}
  .mbfp-ops-station-pin.is-inactive{background:#94a3b8;box-shadow:0 4px 10px rgba(100,116,139,.32)}
  .mbfp-ops-water-pin{display:grid;width:32px;height:32px;place-items:center;border:2px solid #fff;border-radius:50% 50% 50% 0;background:#0f766e;color:#fff;font-size:.73rem;box-shadow:0 5px 12px rgba(15,118,110,.38);transform:rotate(-45deg)}
  .mbfp-ops-water-pin i{transform:rotate(45deg)}
  .mbfp-ops-water-pin.is-source{background:#0891b2}
  .mbfp-water-popup{min-width:220px;color:#26354f;font:13px/1.45 'Plus Jakarta Sans',sans-serif}.mbfp-water-popup__kind{display:block;margin-bottom:4px;color:#0f766e;font-size:10px;font-weight:850;letter-spacing:.07em;text-transform:uppercase}.mbfp-water-popup strong{display:block;margin-bottom:7px;color:#0f172a;font-size:13px}.mbfp-water-popup dl{display:grid;grid-template-columns:auto 1fr;gap:4px 10px;margin:0}.mbfp-water-popup dt{color:#64748b}.mbfp-water-popup dd{margin:0;text-align:right;font-weight:700}.mbfp-water-popup__origin{margin:8px 0 0;padding-top:7px;border-top:1px solid #e2e8f0;color:#64748b;font-size:10px}

  /* The key stays up: marker colours meant nothing until an incident was opened. */
  .mbfp-ops-legend{position:absolute;z-index:420;left:1rem;bottom:1rem;display:grid;gap:.34rem;max-width:250px;padding:.7rem .8rem;border:1px solid rgba(255,255,255,.85);border-radius:10px;background:rgba(255,255,255,.94);color:#334155;font-size:.72rem;line-height:1.3;box-shadow:0 8px 22px rgba(15,23,42,.16)}
  .mbfp-ops-legend-row{display:flex;align-items:center;gap:.45rem}
  .mbfp-ops-key{width:.7rem;height:.7rem;flex-shrink:0;border-radius:3px}
  .mbfp-ops-key.key-active{background:#dc2626}
  .mbfp-ops-key.key-history{background:#64748b}
  .mbfp-ops-key.key-station{background:#2563eb}
  .mbfp-ops-key.key-water-source{background:#0f766e}
  .mbfp-ops-key.key-density{background:#ef4444;opacity:.45;border:1px solid #b91c1c}

  @media(max-width:720px){.mbfp-ops-controls{align-items:stretch;flex-direction:column}.mbfp-ops-segmented{justify-content:stretch}.mbfp-ops-segment{flex:1}.mbfp-ops-legend{left:.6rem;bottom:.6rem;font-size:.68rem}}

  @keyframes fadeIn{from{opacity:0}to{opacity:1}}@keyframes mbfp-ops-pulse{0%{box-shadow:0 0 0 0 rgba(16,185,129,.38)}75%,100%{box-shadow:0 0 0 7px rgba(16,185,129,0)}}@keyframes mbfp-ops-shimmer{to{background-position:-220% 0}}@media(max-width:720px){.mbfp-ops-root{padding:1rem}.mbfp-ops-toolbar{align-items:stretch;flex-direction:column}.mbfp-ops-tools{justify-content:space-between}.mbfp-ops-refresh{flex:1}.mbfp-ops-map-shell,.mbfp-ops-map{min-height:min(520px,calc(100dvh - 265px))}.mbfp-ops-footnote{grid-template-columns:1fr;gap:.35rem}.mbfp-gis-modal-backdrop{padding:.5rem}.mbfp-gis-modal{max-height:calc(100dvh - 1rem);border-radius:17px}.mbfp-gis-modal-header,.mbfp-gis-modal-body{padding-left:1rem;padding-right:1rem}.mbfp-gis-facts{grid-template-columns:1fr}.mbfp-gis-modal-hero{grid-template-columns:auto 1fr}.mbfp-gis-modal-hero p{grid-column:1/-1}}@media(prefers-reduced-motion:reduce){.mbfp-ops-live-dot,.mbfp-ops-map-loading{animation:none}}
`;

/**
 * The stations this municipality can send, and how far each reaches.
 *
 * The map showed where fires had been and nothing of what there is to fight
 * them with. A commander reading it could not see which barangays sit far from
 * every station, which is the thing the map is best placed to answer.
 */
function drawStations(
  L: typeof import("leaflet"),
  layer: import("leaflet").LayerGroup,
  stations: StationMarker[],
) {
  layer.clearLayers();
  stations.forEach((station) => {
    if (!Number.isFinite(station.latitude) || !Number.isFinite(station.longitude)) return;
    const point: [number, number] = [station.latitude, station.longitude];
    const inactive = station.status !== "ACTIVE";

    L.circle(point, {
      radius: STATION_COVERAGE_METERS,
      color: inactive ? "#94a3b8" : "#1d4ed8",
      weight: 1,
      dashArray: "5 6",
      fillColor: inactive ? "#94a3b8" : "#2563eb",
      fillOpacity: 0.05,
      interactive: false,
    }).addTo(layer);

    L.marker(point, {
      icon: L.divIcon({
        className: "mbfp-ops-marker-wrapper",
        html: `<span class="mbfp-ops-station-pin ${inactive ? "is-inactive" : ""}"><i class="fa-solid fa-truck-fast" aria-hidden="true"></i></span>`,
        iconSize: [34, 34],
        iconAnchor: [17, 17],
      }),
    })
      .bindTooltip(
        `<strong>${station.stationName}</strong><br/>${inactive ? "Inactive" : "Active"} · covers ${STATION_COVERAGE_METERS / 1000} km`,
        { direction: "top", offset: [0, -14] },
      )
      .addTo(layer);
  });
}

function drawWaterSources(
  L: typeof import("leaflet"),
  map: import("leaflet").Map,
  layer: import("leaflet").LayerGroup,
  sources: WaterSource[],
  waterSourceId: string,
) {
  layer.clearLayers();
  sources.forEach((source) => {
    if (!Number.isFinite(source.latitude) || !Number.isFinite(source.longitude)) return;
    const point: [number, number] = [source.latitude, source.longitude];
    const isHydrant = source.sourceKind === "FIRE_HYDRANT";
    const marker = L.marker(point, {
      icon: L.divIcon({
        className: "mbfp-ops-marker-wrapper",
        html: `<span class="mbfp-ops-water-pin ${isHydrant ? "" : "is-source"}"><i class="fa-solid ${isHydrant ? "fa-fire-extinguisher" : "fa-droplet"}" aria-hidden="true"></i></span>`,
        iconSize: [36, 36],
        iconAnchor: [18, 31],
      }),
    }).bindPopup(
      `<section class="mbfp-water-popup"><span class="mbfp-water-popup__kind">${isHydrant ? "Fire hydrant" : "Water source"}</span><strong>${escapeHtml(source.exactLocation)}</strong><dl><dt>Type / color</dt><dd>${escapeHtml(source.typeColor)}</dd><dt>Quantity</dt><dd>${escapeHtml(source.quantity)}</dd><dt>Coordinates</dt><dd>${source.latitude.toFixed(6)}, ${source.longitude.toFixed(6)}</dd></dl><p class="mbfp-water-popup__origin">${source.recordOrigin === "BFP_LOCATOR_CHART_2018" ? "BFP locator chart · 2018" : "Municipal entry"}</p></section>`,
      { maxWidth: 300 },
    );
    marker.addTo(layer);
    if (source.id === waterSourceId) {
      map.setView(point, 17, { animate: false });
      marker.openPopup();
    }
  });
}

function drawIncidents(L: typeof import("leaflet"), map: import("leaflet").Map, layer: import("leaflet").LayerGroup, clusters: IncidentCluster[], municipality: string, onSelectIncident: (incidents: MunicipalIncident[]) => void, view: MapView = "ALL") {
  layer.clearLayers();
  const points: [number, number][] = [];
  clusters
    .filter((cluster) => (view === "ACTIVE" ? cluster.activeCount > 0 : view === "HISTORY" ? cluster.activeCount === 0 : true))
    .forEach((cluster) => {
    const point: [number, number] = [cluster.latitude, cluster.longitude];
    points.push(point);
    const historyOnly = cluster.activeCount === 0;
    const densityIncident = cluster.incidents.find((incident) => incident.detectedBuildingDensity === "DENSE_CLUSTER_DETECTED");
    const riskClass = densityRiskClass(densityIncident?.detectedBuildingDensity, densityIncident?.buildingDensityConfidence);
    const count = cluster.incidents.length > 1 ? `<b class="mbfp-ops-marker-count">${cluster.incidents.length}</b>` : "";
    const marker = L.marker(point, { icon: L.divIcon({ className: "mbfp-ops-marker-wrapper", html: `<span class="mbfp-ops-marker-ring ${historyOnly ? "is-history" : ""} ${riskClass}"><span class="mbfp-ops-fire-marker"><i class="fa-solid fa-fire" aria-hidden="true"></i></span>${count}</span>`, iconSize: [58, 58], iconAnchor: [29, 48] }) });
    marker.on("click", () => onSelectIncident(cluster.incidents));
    marker.addTo(layer);
  });
  if (points.length === 1) map.setView(points[0], 15, { animate: false });
  else if (points.length > 1) map.fitBounds(L.latLngBounds(points), { padding: [72, 72], maxZoom: 15, animate: false });
  else map.setView(MUNICIPAL_CENTERS[municipality] || DEFAULT_MAP_CENTER, 13, { animate: false });
}

export function MunicipalGisOperationsMap() {
  const { municipality, incidents, loading, refreshing, error, refresh } = useMunicipalIncidentFeed({ includeHistory: true });
  const clusters = useMemo(() => clusterIncidents(incidents), [incidents]);
  const mapElement = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const layerRef = useRef<import("leaflet").LayerGroup | null>(null);
  const densityLayerRef = useRef<import("leaflet").LayerGroup | null>(null);
  const leafletRef = useRef<typeof import("leaflet") | null>(null);
  const clustersRef = useRef(clusters);
  const municipalityRef = useRef(municipality);
  const [selectedIncidents, setSelectedIncidents] = useState<MunicipalIncident[] | null>(null);
  const [selectedIncidentId, setSelectedIncidentId] = useState("");
  const [densityEvidence, setDensityEvidence] = useState<DensityEvidencePayload | null>(null);
  const [densityLoading, setDensityLoading] = useState(false);
  const [densityError, setDensityError] = useState("");
  const [mapReady, setMapReady] = useState(false);
  const [stations, setStations] = useState<StationMarker[]>([]);
  const [waterSources, setWaterSources] = useState<WaterSource[]>([]);
  const [waterSourceId] = useState(() => typeof window === "undefined" ? "" : new URLSearchParams(window.location.search).get("waterSource") ?? "");
  const [view, setView] = useState<MapView>("ALL");
  const [showStations, setShowStations] = useState(true);
  const [showWaterSources, setShowWaterSources] = useState(true);
  const stationLayerRef = useRef<import("leaflet").LayerGroup | null>(null);
  const waterSourceLayerRef = useRef<import("leaflet").LayerGroup | null>(null);
  const viewRef = useRef<MapView>(view);
  const onSelectRef = useRef<(clusterReports: MunicipalIncident[]) => void>((clusterReports) => {
    setSelectedIncidents(clusterReports);
    setSelectedIncidentId(clusterReports[0]?.id ?? "");
  });

  useEffect(() => {
    clustersRef.current = clusters;
    municipalityRef.current = municipality;
    viewRef.current = view;
    if (leafletRef.current && mapRef.current && layerRef.current) drawIncidents(leafletRef.current, mapRef.current, layerRef.current, clusters, municipality, (clusterReports) => onSelectRef.current(clusterReports), view);
  }, [clusters, municipality, view]);

  // The stations this municipality can send. They change rarely, so this is
  // read once rather than polled alongside the incidents.
  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      try {
        const response = await fetch("/api/municipal-bfp/stations", { cache: "no-store", signal: controller.signal });
        if (!response.ok) return;
        const body = await response.json();
        if (!controller.signal.aborted) setStations(Array.isArray(body.stations) ? body.stations : []);
      } catch {
        // A map without its stations is still a map of the incidents.
      }
    })();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/municipal-bfp/water-sources", { cache: "no-store", signal: controller.signal })
      .then(async (response) => response.ok ? response.json() : Promise.reject(new Error("Water source layer unavailable")))
      .then((body) => { if (!controller.signal.aborted) setWaterSources(Array.isArray(body.sources) ? body.sources : []); })
      .catch(() => { /* Incident operations remain usable without the supporting layer. */ });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const L = leafletRef.current;
    const map = mapRef.current;
    if (!L || !map || !mapReady) return;
    if (!stationLayerRef.current) stationLayerRef.current = L.layerGroup().addTo(map);
    if (showStations) {
      drawStations(L, stationLayerRef.current, stations);
      if (!map.hasLayer(stationLayerRef.current)) stationLayerRef.current.addTo(map);
    } else {
      map.removeLayer(stationLayerRef.current);
    }
  }, [stations, showStations, mapReady]);

  useEffect(() => {
    const L = leafletRef.current;
    const map = mapRef.current;
    if (!L || !map || !mapReady) return;
    if (!waterSourceLayerRef.current) waterSourceLayerRef.current = L.layerGroup().addTo(map);
    if (showWaterSources) {
      drawWaterSources(L, map, waterSourceLayerRef.current, waterSources, waterSourceId);
      if (!map.hasLayer(waterSourceLayerRef.current)) waterSourceLayerRef.current.addTo(map);
    } else {
      map.removeLayer(waterSourceLayerRef.current);
    }
  }, [mapReady, showWaterSources, waterSourceId, waterSources]);

  useEffect(() => {
    let disposed = false;
    let map: import("leaflet").Map | null = null;
    void (async () => {
      const L = await import("leaflet");
      if (disposed || !mapElement.current) return;
      map = L.map(mapElement.current, { zoomControl: false, attributionControl: true }).setView(DEFAULT_MAP_CENTER, 10);
      L.control.zoom({ position: "bottomright" }).addTo(map);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "© OpenStreetMap contributors", maxZoom: 19 }).addTo(map);
      const incidentLayer = L.layerGroup().addTo(map);
      leafletRef.current = L; mapRef.current = map; layerRef.current = incidentLayer;
      drawIncidents(L, map, incidentLayer, clustersRef.current, municipalityRef.current, (clusterReports) => onSelectRef.current(clusterReports));
      setMapReady(true);
    })();
    return () => { disposed = true; layerRef.current = null; densityLayerRef.current = null; stationLayerRef.current = null; waterSourceLayerRef.current = null; leafletRef.current = null; mapRef.current = null; map?.remove(); };
  }, []);

  useEffect(() => {
    const L = leafletRef.current;
    const map = mapRef.current;
    if (!selectedIncidentId || !L || !map) return;
    const controller = new AbortController();
    setDensityLoading(true);
    setDensityEvidence(null);
    setDensityError("");
    if (densityLayerRef.current) map.removeLayer(densityLayerRef.current);
    densityLayerRef.current = null;
    void (async () => {
      try {
        const response = await fetch(`/api/municipal-bfp/incidents/${selectedIncidentId}/building-density`, { cache: "no-store", signal: controller.signal });
        const payload = (await response.json()) as DensityEvidencePayload & { error?: string };
        if (!response.ok) throw new Error(payload.error || "Unable to load mapped building-density evidence.");
        if (controller.signal.aborted) return;
        const group = L.layerGroup().addTo(map);
        L.circle([payload.incident.latitude, payload.incident.longitude], {
          radius: payload.assessment.radiusMeters,
          color: payload.assessment.status === "DENSE_CLUSTER_DETECTED" ? "#dc2626" : "#64748b",
          weight: 2,
          dashArray: "6 5",
          fillOpacity: 0.06,
        }).addTo(group);
        L.geoJSON(payload.evidence as Parameters<typeof L.geoJSON>[0], {
          style: { color: "#b91c1c", weight: 2, fillColor: "#ef4444", fillOpacity: 0.28 },
        }).addTo(group);
        densityLayerRef.current = group;
        setDensityEvidence(payload);
      } catch (caught) {
        if (!controller.signal.aborted) {
          console.warn("Building-density overlay unavailable", caught);
          setDensityError(caught instanceof Error ? caught.message : "Mapped building-density evidence is unavailable.");
        }
      } finally {
        if (!controller.signal.aborted) setDensityLoading(false);
      }
    })();
    return () => controller.abort();
  }, [selectedIncidentId, mapReady]);

  function closeIncident() {
    if (densityLayerRef.current && mapRef.current) mapRef.current.removeLayer(densityLayerRef.current);
    densityLayerRef.current = null;
    setDensityEvidence(null);
    setDensityError("");
    setSelectedIncidentId("");
    setSelectedIncidents(null);
  }

  const stationName = municipality || "your assigned municipality";

  // Counted from the same feed the map draws, so the numbers and the pins can
  // never disagree.
  const activeCount = useMemo(
    () => incidents.filter((incident) => !TERMINAL_STATUSES.has(incident.status)).length,
    [incidents],
  );
  const resolvedCount = incidents.length - activeCount;
  const activeStationCount = useMemo(
    () => stations.filter((station) => station.status === "ACTIVE").length,
    [stations],
  );

  return <main className="mbfp-ops-root"><style>{styles}</style><section className="mbfp-ops-workspace" aria-labelledby="municipal-gis-heading">
    <header className="mbfp-ops-toolbar">
      <div>
        <p className="mbfp-ops-eyebrow">Municipal fire operations</p>
        <h1 id="municipal-gis-heading" className="mbfp-ops-title">GIS incident map</h1>
      </div>
      <div className="mbfp-ops-tools">
        <button className="mbfp-ops-refresh" type="button" onClick={() => void refresh(true)} disabled={refreshing}>
          <i className="fa-solid fa-rotate-right" aria-hidden="true" />{refreshing ? "Refreshing map" : "Live refresh"}
        </button>
      </div>
    </header>

    {/* What the municipality is holding right now, above the map that shows
        where it is. The counts come from the same feed the pins do. */}
    <div className="mbfp-ops-stats">
      <article className="mbfp-ops-stat is-active">
        <span className="mbfp-ops-stat-num">{activeCount}</span>
        <span className="mbfp-ops-stat-label">Active now</span>
      </article>
      <article className="mbfp-ops-stat is-resolved">
        <span className="mbfp-ops-stat-num">{resolvedCount}</span>
        <span className="mbfp-ops-stat-label">Resolved</span>
      </article>
      <article className="mbfp-ops-stat is-stations">
        <span className="mbfp-ops-stat-num">{activeStationCount}</span>
        <span className="mbfp-ops-stat-label">Active stations</span>
      </article>
      <article className="mbfp-ops-stat is-sites">
        <span className="mbfp-ops-stat-num">{waterSources.length}</span>
        <span className="mbfp-ops-stat-label">Water sources</span>
      </article>
    </div>

    <div className="mbfp-ops-controls">
      <div className="mbfp-ops-segmented" role="group" aria-label="Which incidents to show">
        {([["ALL", "All"], ["ACTIVE", "Active"], ["HISTORY", "History"]] as Array<[MapView, string]>).map(([key, label]) => (
          <button
            key={key}
            type="button"
            className={`mbfp-ops-segment${view === key ? " is-on" : ""}`}
            onClick={() => setView(key)}
            aria-pressed={view === key}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="mbfp-ops-tools">
        <label className="mbfp-ops-layer-toggle"><input type="checkbox" checked={showWaterSources} onChange={(event) => setShowWaterSources(event.target.checked)} /><i className="fa-solid fa-droplet" aria-hidden="true" />Water sources</label>
        <label className="mbfp-ops-layer-toggle"><input type="checkbox" checked={showStations} onChange={(event) => setShowStations(event.target.checked)} /><i className="fa-solid fa-truck-fast" aria-hidden="true" />Stations and coverage</label>
      </div>
    </div>
    <div className="mbfp-ops-map-shell"><div ref={mapElement} className="mbfp-ops-map" aria-label="Municipal incident map" />{!mapReady && <div className="mbfp-ops-map-loading" aria-label="Loading municipal incident map" />}<aside className="mbfp-ops-legend" aria-label="What the map symbols mean">
      <span className="mbfp-ops-legend-row"><i className="mbfp-ops-key key-active" aria-hidden="true" />Active incident</span>
      <span className="mbfp-ops-legend-row"><i className="mbfp-ops-key key-history" aria-hidden="true" />Resolved or closed</span>
      {showStations && <span className="mbfp-ops-legend-row"><i className="mbfp-ops-key key-station" aria-hidden="true" />Station · {STATION_COVERAGE_METERS / 1000} km reach</span>}
      {showWaterSources && <span className="mbfp-ops-legend-row"><i className="mbfp-ops-key key-water-source" aria-hidden="true" />Hydrant or water source</span>}
      {densityEvidence && <span className="mbfp-ops-legend-row"><i className="mbfp-ops-key key-density" aria-hidden="true" />Mapped structures near the fire</span>}
    </aside>{!loading && !error && incidents.length === 0 && (!showWaterSources || waterSources.length === 0) && <div className="mbfp-ops-empty" role="status"><strong>No incidents have been reported in your assigned municipality</strong><p>The map is centered on {stationName}. New resident alerts appear automatically.</p></div>}
      {!loading && !error && incidents.length > 0 && view === "ACTIVE" && activeCount === 0 && <div className="mbfp-ops-empty" role="status"><strong>Nothing is burning right now</strong><p>Every incident in {stationName} is resolved or closed. Switch to History to see them.</p></div>}</div>
    <footer className="mbfp-ops-footnote"><span className="mbfp-ops-summary"><strong>{incidents.length}</strong>{incidents.length === 1 ? "municipality-scoped report" : "municipality-scoped reports"} across {clusters.length} reported {clusters.length === 1 ? "location" : "locations"} for {stationName}.</span>{error ? <span className="mbfp-ops-error" role="alert">{error}</span> : <a className="mbfp-ops-queue-link" href="/municipal-bfp/active-incidents">Open active incident queue</a>}</footer>
  </section>{selectedIncidents && <MunicipalGisIncidentModal incidents={selectedIncidents} onClose={closeIncident} onSelectedIncidentChange={setSelectedIncidentId} densityEvidence={densityEvidence} densityLoading={densityLoading} densityError={densityError} />}</main>;
}
