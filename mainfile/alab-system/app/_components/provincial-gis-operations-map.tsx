"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";

import { useProvincialIncidentFeed } from "./use-provincial-incident-feed";
import type { ProvincialIncidentSummary } from "../../lib/intermunicipality/provincial";
import type {
  ProvincialWaterSourceRegistry,
  WaterSource,
} from "../../lib/water-sources/types";

const DEFAULT_PROVINCE_CENTER: [number, number] = [11.18, 122.05];
const TERMINAL_STATUSES = new Set(["RESOLVED", "REJECTED", "FALSE_REPORT", "DUPLICATE", "CLOSED"]);

const MUNICIPAL_CENTERS: Record<string, [number, number]> = {
  "Anini-y": [10.431, 121.926],
  Barbaza: [11.195, 122.037],
  Belison: [10.837, 121.961],
  Bugasong: [11.044, 122.064],
  Caluya: [11.934, 121.548],
  Culasi: [11.445, 122.057],
  "Tobias Fornier": [10.515, 121.932],
  Hamtic: [10.704, 121.982],
  "Laua-an": [11.186, 122.111],
  Libertad: [11.774, 121.92],
  Pandan: [11.718, 122.093],
  Patnongon: [10.918, 122.004],
  "San Jose de Buenavista": [10.744, 121.942],
  "San Remigio": [10.82, 122.08],
  Sebaste: [11.625, 122.095],
  Sibalom: [10.79, 122.028],
  Tibiao: [11.289, 122.048],
  Valderrama: [11.009, 122.047],
};

export type IncidentCluster = {
  key: string;
  latitude: number;
  longitude: number;
  incidents: ProvincialIncidentSummary[];
  activeCount: number;
};

type StationMarker = {
  id: string;
  stationName: string;
  municipalityName: string;
  latitude: number;
  longitude: number;
  status: string;
};

type MapView = "ALL" | "ACTIVE" | "HISTORY";
type MapContentMode = "INCIDENTS" | "WATER_SOURCES";

type FetchLike = (
  input: string,
  init?: RequestInit,
) => Promise<{ ok: boolean; json: () => Promise<unknown> }>;

const STATION_COVERAGE_METERS = 3_000;

export function resolveProvincialMapMode(searchParams: URLSearchParams): MapContentMode {
  return searchParams.get("layer") === "water-sources" || Boolean(searchParams.get("waterSource"))
    ? "WATER_SOURCES"
    : "INCIDENTS";
}

export async function fetchProvincialWaterSources(
  fetcher: FetchLike = fetch,
  signal?: AbortSignal,
): Promise<ProvincialWaterSourceRegistry> {
  const response = await fetcher("/api/provincial-bfp/water-sources", {
    cache: "no-store",
    signal,
  });
  if (!response.ok) throw new Error("Unable to load the provincial water-source layer.");
  const body = await response.json() as Partial<ProvincialWaterSourceRegistry>;
  return {
    municipalities: Array.isArray(body.municipalities) ? body.municipalities : [],
    sources: Array.isArray(body.sources) ? body.sources : [],
  };
}

function resolveIncidentCoordinates(incident: ProvincialIncidentSummary): [number, number] | null {
  if (
    typeof incident.latitude === "number" &&
    typeof incident.longitude === "number" &&
    Number.isFinite(incident.latitude) &&
    Number.isFinite(incident.longitude)
  ) {
    return [incident.latitude, incident.longitude];
  }
  if (incident.originMunicipality && MUNICIPAL_CENTERS[incident.originMunicipality]) {
    return MUNICIPAL_CENTERS[incident.originMunicipality];
  }
  return null;
}

export function clusterProvincialIncidents(incidents: ProvincialIncidentSummary[]): IncidentCluster[] {
  const clusters = new Map<string, IncidentCluster>();
  incidents.forEach((incident) => {
    const coords = resolveIncidentCoordinates(incident);
    if (!coords) return;
    const [lat, lng] = coords;
    const key = `${lat.toFixed(4)}:${lng.toFixed(4)}`;
    const current = clusters.get(key) ?? {
      key,
      latitude: lat,
      longitude: lng,
      incidents: [],
      activeCount: 0,
    };
    current.incidents.push(incident);
    if (!TERMINAL_STATUSES.has(incident.status)) {
      current.activeCount += 1;
    }
    clusters.set(key, current);
  });
  return Array.from(clusters.values());
}

function humanize(val: string | null | undefined): string {
  if (!val) return "Unknown";
  return val
    .toLowerCase()
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function formatDate(val: string | null | undefined): string {
  if (!val) return "Not recorded";
  const date = new Date(val);
  return Number.isNaN(date.getTime())
    ? "Not recorded"
    : new Intl.DateTimeFormat("en-PH", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(date);
}

const styles = `
  .mbfp-ops-root {
    min-height: 100dvh;
    padding: clamp(1rem, 2vw, 1.75rem);
    background: #eef5fd;
    color: #0f172a;
    font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  }
  .mbfp-ops-workspace {
    width: min(100%, 1440px);
    margin: 0 auto;
  }
  .mbfp-ops-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    margin-bottom: 0.85rem;
    flex-wrap: wrap;
  }
  .pbfp-title-group {
    display: flex;
    flex-direction: column;
  }
  .mbfp-ops-eyebrow {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    margin: 0 0 0.35rem;
    color: #b91c1c;
    font-size: 0.73rem;
    font-weight: 800;
    letter-spacing: 0.09em;
    text-transform: uppercase;
  }
  .mbfp-ops-eyebrow:before {
    width: 0.55rem;
    height: 0.55rem;
    border-radius: 999px;
    background: #dc2626;
    box-shadow: 0 0 0 4px rgba(220, 38, 38, 0.16);
    animation: pbfp-live-pulse 1.8s infinite ease-out;
    content: "";
  }
  .mbfp-ops-title {
    margin: 0;
    font-size: clamp(1.6rem, 2.5vw, 2.4rem);
    line-height: 1.05;
    letter-spacing: -0.04em;
    font-weight: 850;
    color: #0f172a;
  }
  .mbfp-ops-tools {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 0.75rem;
    flex-wrap: wrap;
  }
  .mbfp-ops-refresh {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.55rem;
    min-height: 2.65rem;
    padding: 0.55rem 1rem;
    border: 1px solid #cfdced;
    border-radius: 10px;
    background: #ffffff;
    color: #25354f;
    font: inherit;
    font-size: 0.84rem;
    font-weight: 750;
    cursor: pointer;
    box-shadow: 0 6px 16px rgba(42, 68, 110, 0.07);
    transition: all 0.15s ease;
  }
  .mbfp-ops-refresh:hover:not(:disabled) {
    border-color: #94a3b8;
    background: #f8fafc;
    transform: translateY(-1px);
  }
  .mbfp-ops-refresh:disabled {
    color: #94a3b8;
    cursor: wait;
  }

  /* 4 KPI Stat Cards (Crisp Clean White with Colored Accents) */
  .mbfp-ops-stats {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 0.75rem;
    margin-bottom: 0.85rem;
  }
  .mbfp-ops-stat {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    gap: 0.25rem;
    padding: 0.85rem 1.05rem;
    border: 1px solid #d7e3f1;
    border-left-width: 4px;
    border-radius: 12px;
    background: #ffffff;
    box-shadow: 0 4px 14px rgba(15, 23, 42, 0.04);
    transition: transform 0.15s ease, box-shadow 0.15s ease;
  }
  .mbfp-ops-stat:hover {
    transform: translateY(-1px);
    box-shadow: 0 6px 20px rgba(15, 23, 42, 0.07);
  }
  .mbfp-ops-stat.is-active {
    border-left-color: #dc2626;
  }
  .mbfp-ops-stat.is-resolved {
    border-left-color: #64748b;
  }
  .mbfp-ops-stat.is-stations {
    border-left-color: #2563eb;
  }
  .mbfp-ops-stat.is-sites {
    border-left-color: #0f766e;
  }

  .pbfp-stat-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .pbfp-stat-icon-badge {
    width: 28px;
    height: 28px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.82rem;
  }
  .is-active .pbfp-stat-icon-badge {
    background: #fee2e2;
    color: #dc2626;
  }
  .is-resolved .pbfp-stat-icon-badge {
    background: #f1f5f9;
    color: #64748b;
  }
  .is-stations .pbfp-stat-icon-badge {
    background: #dbeafe;
    color: #2563eb;
  }
  .is-sites .pbfp-stat-icon-badge {
    background: #ccfbf1;
    color: #0f766e;
  }

  .mbfp-ops-stat-num {
    font-size: 1.85rem;
    font-weight: 900;
    line-height: 1;
    color: #0f172a;
    font-variant-numeric: tabular-nums;
    letter-spacing: -0.03em;
    margin-top: 0.2rem;
  }
  .mbfp-ops-stat.is-active .mbfp-ops-stat-num {
    color: #dc2626;
  }
  .mbfp-ops-stat-label {
    font-size: 0.68rem;
    font-weight: 800;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: #64748b;
  }

  /* Segmented Controls & Layer Toggles (Clean Crisp White) */
  .mbfp-ops-controls {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    flex-wrap: wrap;
    margin-bottom: 0.85rem;
  }
  .pbfp-controls-left {
    display: flex;
    align-items: center;
    gap: 0.65rem;
    flex-wrap: wrap;
  }
  .mbfp-ops-segmented {
    display: inline-flex;
    padding: 0.22rem;
    border: 1px solid #d7e3f1;
    border-radius: 10px;
    background: #ffffff;
    box-shadow: 0 2px 8px rgba(15, 23, 42, 0.03);
    gap: 0.15rem;
  }
  .mbfp-ops-segment {
    padding: 0.42rem 0.95rem;
    border: 0;
    border-radius: 8px;
    background: transparent;
    color: #64748b;
    font: inherit;
    font-size: 0.82rem;
    font-weight: 750;
    cursor: pointer;
    transition: background 0.15s ease, color 0.15s ease;
  }
  .mbfp-ops-segment:hover {
    color: #0f172a;
  }
  .mbfp-ops-segment.is-on {
    background: #0f172a;
    color: #ffffff;
  }
  .mbfp-ops-segment:focus-visible {
    outline: 2px solid #dc2626;
    outline-offset: 2px;
  }
  .mbfp-ops-mode-switch {
    display: inline-flex;
    gap: 0.2rem;
    padding: 0.28rem;
    border: 1px solid #cbd9e8;
    border-radius: 12px;
    background: #ffffff;
    box-shadow: 0 5px 14px rgba(15, 23, 42, 0.06);
  }
  .mbfp-ops-mode-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.48rem;
    min-height: 2.55rem;
    padding: 0.55rem 1rem;
    border: 0;
    border-radius: 9px;
    background: transparent;
    color: #52627a;
    font: inherit;
    font-size: 0.82rem;
    font-weight: 800;
    cursor: pointer;
  }
  .mbfp-ops-mode-button.is-on {
    background: #0f766e;
    color: #ffffff;
    box-shadow: 0 5px 12px rgba(15, 118, 110, 0.2);
  }
  .mbfp-ops-mode-button:focus-visible {
    outline: 2px solid #0f766e;
    outline-offset: 2px;
  }

  .pbfp-controls-right {
    display: flex;
    align-items: center;
    gap: 0.65rem;
    flex-wrap: wrap;
  }
  .pbfp-jump-select {
    padding: 0.45rem 0.85rem;
    border: 1px solid #d7e3f1;
    border-radius: 10px;
    background: #ffffff;
    color: #334155;
    font: inherit;
    font-size: 0.8rem;
    font-weight: 750;
    cursor: pointer;
    outline: none;
    box-shadow: 0 2px 8px rgba(15, 23, 42, 0.03);
  }
  .pbfp-jump-select:hover {
    border-color: #94a3b8;
  }
  .pbfp-btn-reset-view {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.45rem 0.85rem;
    border: 1px solid #d7e3f1;
    border-radius: 10px;
    background: #ffffff;
    color: #334155;
    font: inherit;
    font-size: 0.8rem;
    font-weight: 750;
    cursor: pointer;
    box-shadow: 0 2px 8px rgba(15, 23, 42, 0.03);
    transition: all 0.15s ease;
  }
  .pbfp-btn-reset-view:hover {
    border-color: #94a3b8;
    background: #f8fafc;
  }
  .mbfp-ops-layer-toggle {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.45rem 0.85rem;
    border: 1px solid #d7e3f1;
    border-radius: 10px;
    background: #ffffff;
    color: #334155;
    font-size: 0.82rem;
    font-weight: 750;
    cursor: pointer;
    box-shadow: 0 2px 8px rgba(15, 23, 42, 0.03);
    user-select: none;
    transition: all 0.15s ease;
  }
  .mbfp-ops-layer-toggle:hover {
    border-color: #94a3b8;
  }
  .mbfp-ops-layer-toggle i {
    color: #2563eb;
    font-size: 0.82rem;
  }
  .mbfp-ops-layer-toggle input {
    accent-color: #2563eb;
    cursor: pointer;
  }

  /* Map Shell */
  .mbfp-ops-map-shell {
    position: relative;
    overflow: hidden;
    min-height: min(680px, calc(100dvh - 230px));
    border: 1px solid #d7e3f1;
    border-radius: 18px;
    background: #dbeafe;
    box-shadow: 0 20px 48px rgba(54, 78, 110, 0.12);
  }
  .mbfp-ops-map {
    width: 100%;
    min-height: min(680px, calc(100dvh - 230px));
  }
  .mbfp-ops-map .leaflet-control-zoom a {
    width: 2.25rem;
    height: 2.25rem;
    line-height: 2.15rem;
    color: #1e293b;
    border-color: #d7e3f1;
  }

  /* Map Markers */
  .mbfp-ops-marker-wrapper {
    background: transparent;
    border: 0;
  }
  .mbfp-ops-marker-ring {
    position: relative;
    display: grid;
    width: 58px;
    height: 58px;
    place-items: center;
    border: 1px solid rgba(220, 38, 38, 0.42);
    border-radius: 999px;
    background: rgba(254, 242, 242, 0.5);
    box-shadow: 0 0 0 8px rgba(220, 38, 38, 0.12);
    animation: pbfp-marker-pulse 2.2s infinite ease-out;
  }
  .mbfp-ops-marker-ring.is-history {
    border-color: rgba(71, 85, 105, 0.4);
    background: rgba(241, 245, 249, 0.65);
    box-shadow: 0 0 0 6px rgba(71, 85, 105, 0.1);
    animation: none;
  }
  .mbfp-ops-fire-marker {
    display: grid;
    width: 32px;
    height: 32px;
    place-items: center;
    border: 2px solid #ffffff;
    border-radius: 50% 50% 50% 0;
    background: #dc2626;
    box-shadow: 0 5px 14px rgba(153, 27, 27, 0.5);
    transform: rotate(-45deg);
    cursor: pointer;
    transition: transform 0.15s ease;
  }
  .mbfp-ops-fire-marker:hover {
    transform: rotate(-45deg) scale(1.08);
  }
  .is-history .mbfp-ops-fire-marker {
    background: #64748b;
    box-shadow: 0 5px 12px rgba(51, 65, 85, 0.35);
  }
  .mbfp-ops-fire-marker i {
    color: #ffffff;
    font-size: 0.84rem;
    transform: rotate(45deg);
  }
  .mbfp-ops-water-pin {
    display: grid;
    width: 46px;
    height: 46px;
    place-items: center;
    border: 3px solid #ffffff;
    border-radius: 50% 50% 50% 0;
    background: #0f766e;
    color: #ffffff;
    font-size: 1rem;
    box-shadow: 0 8px 20px rgba(15, 118, 110, 0.42), 0 0 0 6px rgba(15, 118, 110, 0.13);
    transform: rotate(-45deg);
  }
  .mbfp-ops-water-pin i { transform: rotate(45deg); }
  .mbfp-ops-water-pin.is-source { background: #0891b2; }
  .mbfp-ops-marker-count {
    position: absolute;
    right: -1px;
    top: -1px;
    display: grid;
    min-width: 20px;
    height: 20px;
    padding: 0 4px;
    place-items: center;
    border: 2px solid #ffffff;
    border-radius: 999px;
    background: #0f172a;
    color: #ffffff;
    font: 800 11px/1 Arial, sans-serif;
  }
  .mbfp-ops-station-pin {
    display: grid;
    width: 30px;
    height: 30px;
    place-items: center;
    border: 2px solid #ffffff;
    border-radius: 9px;
    background: #2563eb;
    color: #ffffff;
    font-size: 0.74rem;
    box-shadow: 0 4px 12px rgba(37, 99, 235, 0.45);
    cursor: pointer;
  }
  .mbfp-ops-station-pin.is-inactive {
    background: #94a3b8;
    box-shadow: 0 4px 10px rgba(100, 116, 139, 0.32);
  }

  /* Legend (Crisp White Frosted Glass) */
  .mbfp-ops-legend {
    position: absolute;
    z-index: 420;
    left: 1rem;
    bottom: 1rem;
    display: grid;
    gap: 0.38rem;
    max-width: 260px;
    padding: 0.75rem 0.9rem;
    border: 1px solid rgba(255, 255, 255, 0.85);
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.95);
    color: #334155;
    font-size: 0.74rem;
    line-height: 1.35;
    box-shadow: 0 8px 24px rgba(15, 23, 42, 0.16);
    backdrop-filter: blur(8px);
  }
  .mbfp-ops-legend-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-weight: 650;
  }
  .mbfp-ops-key {
    width: 0.72rem;
    height: 0.72rem;
    flex-shrink: 0;
    border-radius: 3px;
  }
  .mbfp-ops-key.key-active {
    background: #dc2626;
  }
  .mbfp-ops-key.key-history {
    background: #64748b;
  }
  .mbfp-ops-key.key-station {
    background: #2563eb;
  }
  .mbfp-ops-key.key-water-source {
    background: #0f766e;
  }

  /* Empty state */
  .mbfp-ops-empty {
    position: absolute;
    z-index: 420;
    left: 50%;
    top: 50%;
    width: min(31rem, calc(100% - 2rem));
    padding: 1.25rem 1.4rem;
    border: 1px solid rgba(255, 255, 255, 0.9);
    border-radius: 16px;
    background: rgba(255, 255, 255, 0.96);
    color: #334155;
    text-align: center;
    transform: translate(-50%, -50%);
    box-shadow: 0 18px 42px rgba(45, 65, 89, 0.18);
  }
  .mbfp-ops-empty strong {
    display: block;
    margin-bottom: 0.35rem;
    color: #0f172a;
    font-size: 1.05rem;
  }
  .mbfp-ops-empty p {
    margin: 0;
    font-size: 0.9rem;
    line-height: 1.45;
  }
  .mbfp-ops-map-loading {
    position: absolute;
    inset: 0;
    background: linear-gradient(105deg, #d9e5f1 20%, #edf4fb 38%, #d9e5f1 55%);
    background-size: 220% 100%;
    animation: mbfp-ops-shimmer 1.35s linear infinite;
  }

  /* Footnote */
  .mbfp-ops-footnote {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 1rem;
    align-items: center;
    margin-top: 0.85rem;
    color: #61718a;
    font-size: 0.85rem;
    line-height: 1.45;
  }
  .mbfp-ops-summary {
    display: inline-flex;
    align-items: baseline;
    gap: 0.55rem;
    color: #1e293b;
  }
  .mbfp-ops-summary strong {
    color: #dc2626;
    font-size: 1.1rem;
    font-weight: 850;
  }
  .mbfp-ops-error {
    color: #b91c1c;
    font-weight: 700;
  }
  .mbfp-ops-queue-link {
    color: #b91c1c;
    font-weight: 800;
    text-decoration: none;
    transition: all 0.15s ease;
  }
  .mbfp-ops-queue-link:hover {
    text-decoration: underline;
  }

  /* Provincial Modal (Clean Crisp White Architecture) */
  .pbfp-gis-modal-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    inset: 0;
    width: 100vw;
    height: 100vh;
    z-index: 99999999 !important;
    display: grid;
    padding: clamp(0.75rem, 3vw, 2rem);
    place-items: center;
    background: rgba(15, 23, 42, 0.65);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    box-sizing: border-box;
    animation: fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  }
  .pbfp-gis-modal {
    display: flex;
    overflow: hidden;
    width: min(100%, 720px);
    max-height: min(700px, calc(100dvh - 4rem));
    flex-direction: column;
    border: 1px solid rgba(255, 255, 255, 0.7);
    border-radius: 18px;
    background: #ffffff;
    box-shadow: 0 30px 80px rgba(15, 23, 42, 0.3);
  }
  .pbfp-gis-modal-header {
    display: flex;
    align-items: start;
    justify-content: space-between;
    gap: 1rem;
    padding: 1.15rem 1.35rem;
    border-bottom: 1px solid #e5edf6;
  }
  .pbfp-gis-modal-kicker {
    margin: 0 0 0.25rem;
    color: #dc2626;
    font-size: 0.68rem;
    font-weight: 850;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }
  .pbfp-gis-modal-header h2 {
    margin: 0;
    color: #15213a;
    font-size: 1.25rem;
    letter-spacing: -0.025em;
    font-weight: 850;
  }
  .pbfp-gis-modal-close {
    display: grid;
    width: 2.2rem;
    height: 2.2rem;
    flex: 0 0 auto;
    place-items: center;
    border: 1px solid #dbe4ef;
    border-radius: 10px;
    background: #ffffff;
    color: #475569;
    cursor: pointer;
    transition: all 0.15s ease;
  }
  .pbfp-gis-modal-close:hover {
    border-color: #fca5a5;
    color: #dc2626;
  }
  .pbfp-gis-modal-selector {
    display: flex;
    overflow: auto;
    gap: 0.55rem;
    padding: 0.65rem 1.25rem;
    border-bottom: 1px solid #e5edf6;
    background: #f8fafc;
  }
  .pbfp-gis-modal-selector button {
    min-width: 185px;
    padding: 0.65rem 0.78rem;
    border: 1px solid #dbe4ef;
    border-radius: 10px;
    background: #ffffff;
    color: #475569;
    text-align: left;
    cursor: pointer;
  }
  .pbfp-gis-modal-selector button.is-selected {
    border-color: #ef4444;
    background: #fff5f5;
    color: #991b1b;
  }
  .pbfp-gis-modal-selector strong,
  .pbfp-gis-modal-selector span {
    display: block;
  }
  .pbfp-gis-modal-selector strong {
    font-size: 0.78rem;
  }
  .pbfp-gis-modal-selector span {
    margin-top: 0.25rem;
    font-size: 0.7rem;
  }
  .pbfp-gis-modal-body {
    overflow-y: auto;
    padding: 1.15rem 1.35rem 1.4rem;
  }
  .pbfp-gis-modal-hero {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 0.75rem;
    align-items: center;
    padding: 0.95rem 1.05rem;
    border: 1px solid #fecaca;
    border-radius: 14px;
    background: linear-gradient(120deg, #fff5f5, #fffafa);
  }
  .pbfp-gis-modal-fire {
    display: grid;
    width: 42px;
    height: 42px;
    place-items: center;
    border-radius: 12px;
    background: #dc2626;
    color: #ffffff;
    font-size: 1.1rem;
    box-shadow: 0 8px 18px rgba(220, 38, 38, 0.25);
  }
  .pbfp-gis-modal-hero strong {
    margin-right: 0.55rem;
    color: #17213a;
    font-size: 1.05rem;
  }
  .pbfp-gis-status {
    display: inline-flex;
    padding: 0.22rem 0.55rem;
    border-radius: 999px;
    background: #dcfce7;
    color: #047857;
    font-size: 0.68rem;
    font-weight: 850;
    text-transform: uppercase;
  }
  .pbfp-gis-status.status-closed {
    background: #e2e8f0;
    color: #475569;
  }
  .pbfp-gis-modal-hero p {
    grid-column: 2;
    margin: 0.2rem 0 0;
    color: #64748b;
    font-size: 0.76rem;
  }
  .pbfp-gis-facts {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.55rem;
    margin-top: 0.85rem;
  }
  .pbfp-gis-facts article {
    min-width: 0;
    padding: 0.68rem 0.75rem;
    border: 1px solid #e1e8f0;
    border-radius: 11px;
    background: #f8fafc;
  }
  .pbfp-gis-facts span {
    display: block;
    margin-bottom: 0.22rem;
    color: #64748b;
    font-size: 0.66rem;
    font-weight: 800;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }
  .pbfp-gis-facts strong {
    display: block;
    overflow-wrap: anywhere;
    color: #24314a;
    font-size: 0.85rem;
    line-height: 1.35;
  }
  .pbfp-water-modal { width: min(100%, 660px); }
  .pbfp-water-modal .pbfp-gis-modal-kicker { color: #0f766e; }
  .pbfp-water-modal__hero {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 0.9rem;
    align-items: center;
    padding: 1rem;
    border: 1px solid #bfe4dd;
    border-radius: 15px;
    background: #f0fdfa;
  }
  .pbfp-water-modal__icon {
    display: grid;
    width: 52px;
    height: 52px;
    place-items: center;
    border-radius: 16px;
    background: #0f766e;
    color: #ffffff;
    font-size: 1.25rem;
    box-shadow: 0 10px 22px rgba(15, 118, 110, 0.22);
  }
  .pbfp-water-modal__kind {
    margin: 0 0 0.18rem;
    color: #0f766e;
    font-size: 0.7rem;
    font-weight: 850;
    letter-spacing: 0.07em;
    text-transform: uppercase;
  }
  .pbfp-water-modal__location {
    margin: 0;
    color: #132238;
    font-size: 1rem;
    line-height: 1.45;
  }
  .pbfp-water-modal__origin {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    margin-top: 1rem;
    padding: 0.5rem 0.65rem;
    border-radius: 9px;
    background: #f1f5f9;
    color: #64748b;
    font-size: 0.72rem;
    font-weight: 700;
  }
  .pbfp-gis-modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.65rem;
    margin-top: 1.15rem;
    padding-top: 1rem;
    border-top: 1px solid #e5edf6;
  }
  .pbfp-btn-action {
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
    padding: 0.55rem 1rem;
    border-radius: 10px;
    font-size: 0.8rem;
    font-weight: 750;
    text-decoration: none;
    cursor: pointer;
    transition: all 0.15s ease;
  }
  .pbfp-btn-action.secondary {
    background: #f1f5f9;
    border: 1px solid #cbd5e1;
    color: #334155;
  }
  .pbfp-btn-action.secondary:hover {
    background: #e2e8f0;
    color: #0f172a;
  }
  .pbfp-btn-action.primary {
    background: #0f172a;
    border: 1px solid #0f172a;
    color: #ffffff;
  }
  .pbfp-btn-action.primary:hover {
    background: #1e293b;
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  @keyframes pbfp-live-pulse {
    0% {
      box-shadow: 0 0 0 0 rgba(220, 38, 38, 0.4);
    }
    70% {
      box-shadow: 0 0 0 7px rgba(220, 38, 38, 0);
    }
    100% {
      box-shadow: 0 0 0 0 rgba(220, 38, 38, 0);
    }
  }
  @keyframes pbfp-marker-pulse {
    0% {
      box-shadow: 0 0 0 0 rgba(220, 38, 38, 0.45);
    }
    70% {
      box-shadow: 0 0 0 14px rgba(220, 38, 38, 0);
    }
    100% {
      box-shadow: 0 0 0 0 rgba(220, 38, 38, 0);
    }
  }
  @keyframes mbfp-ops-shimmer {
    to { background-position: -220% 0; }
  }

  @media (max-width: 800px) {
    .mbfp-ops-stats {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }
  @media (max-width: 720px) {
    .mbfp-ops-root { padding: 1rem; }
    .mbfp-ops-toolbar { align-items: stretch; flex-direction: column; }
    .mbfp-ops-tools { justify-content: space-between; }
    .mbfp-ops-refresh { flex: 1; }
    .mbfp-ops-controls { align-items: stretch; flex-direction: column; }
    .pbfp-controls-left, .pbfp-controls-right { width: 100%; justify-content: space-between; }
    .mbfp-ops-segmented { justify-content: stretch; }
    .mbfp-ops-segment { flex: 1; }
    .mbfp-ops-map-shell, .mbfp-ops-map { min-height: min(520px, calc(100dvh - 265px)); }
    .mbfp-ops-footnote { grid-template-columns: 1fr; gap: 0.35rem; }
    .pbfp-gis-facts { grid-template-columns: 1fr; }
  }
`;

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
      fillOpacity: 0.06,
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
        `<strong>${station.stationName}</strong><br/>${station.municipalityName} · ${inactive ? "Inactive" : "Active"} coverage (${STATION_COVERAGE_METERS / 1000} km)`,
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
  onSelectSource: (source: WaterSource) => void,
) {
  layer.clearLayers();
  const points: [number, number][] = [];
  sources.forEach((source) => {
    if (!Number.isFinite(source.latitude) || !Number.isFinite(source.longitude)) return;
    const point: [number, number] = [source.latitude, source.longitude];
    points.push(point);
    const isHydrant = source.sourceKind === "FIRE_HYDRANT";
    const marker = L.marker(point, {
      icon: L.divIcon({
        className: "mbfp-ops-marker-wrapper",
        html: `<span class="mbfp-ops-water-pin ${isHydrant ? "" : "is-source"}"><i class="fa-solid ${isHydrant ? "fa-fire-extinguisher" : "fa-droplet"}" aria-hidden="true"></i></span>`,
        iconSize: [52, 52],
        iconAnchor: [26, 48],
      }),
    });
    marker.on("click", () => onSelectSource(source));
    marker.addTo(layer);
    if (source.id === waterSourceId) {
      map.setView(point, 17, { animate: false });
      onSelectSource(source);
    }
  });

  if (!waterSourceId && points.length === 1) {
    map.setView(points[0], 16, { animate: false });
  } else if (!waterSourceId && points.length > 1) {
    map.fitBounds(L.latLngBounds(points), { padding: [72, 72], maxZoom: 15, animate: false });
  } else if (points.length === 0) {
    map.setView(DEFAULT_PROVINCE_CENTER, 9, { animate: false });
  }
}

function drawIncidents(
  L: typeof import("leaflet"),
  map: import("leaflet").Map,
  layer: import("leaflet").LayerGroup,
  clusters: IncidentCluster[],
  onSelectCluster: (cluster: IncidentCluster) => void,
  view: MapView = "ALL",
) {
  layer.clearLayers();
  const points: [number, number][] = [];

  clusters
    .filter((cluster) => {
      if (view === "ACTIVE") return cluster.activeCount > 0;
      if (view === "HISTORY") return cluster.activeCount === 0;
      return true;
    })
    .forEach((cluster) => {
      const point: [number, number] = [cluster.latitude, cluster.longitude];
      points.push(point);
      const historyOnly = cluster.activeCount === 0;
      const count = cluster.incidents.length > 1 ? `<b class="mbfp-ops-marker-count">${cluster.incidents.length}</b>` : "";

      const marker = L.marker(point, {
        icon: L.divIcon({
          className: "mbfp-ops-marker-wrapper",
          html: `<span class="mbfp-ops-marker-ring ${historyOnly ? "is-history" : ""}"><span class="mbfp-ops-fire-marker"><i class="fa-solid fa-fire" aria-hidden="true"></i></span>${count}</span>`,
          iconSize: [58, 58],
          iconAnchor: [29, 48],
        }),
      });

      marker.on("click", () => onSelectCluster(cluster));
      marker.addTo(layer);
    });

  if (points.length === 1) {
    map.setView(points[0], 14, { animate: false });
  } else if (points.length > 1) {
    map.fitBounds(L.latLngBounds(points), { padding: [72, 72], maxZoom: 14, animate: false });
  } else {
    map.setView(DEFAULT_PROVINCE_CENTER, 9, { animate: false });
  }
}

export function ProvincialGisOperationsMap() {
  const searchParams = useMemo(
    () => new URLSearchParams(typeof window === "undefined" ? "" : window.location.search),
    [],
  );
  const waterSourceId = searchParams.get("waterSource") ?? "";
  const { incidents, loading, checking, error, refresh } = useProvincialIncidentFeed({
    includeHistory: true,
  });

  const clusters = useMemo(() => clusterProvincialIncidents(incidents), [incidents]);
  const mapElement = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const layerRef = useRef<import("leaflet").LayerGroup | null>(null);
  const stationLayerRef = useRef<import("leaflet").LayerGroup | null>(null);
  const waterSourceLayerRef = useRef<import("leaflet").LayerGroup | null>(null);
  const leafletRef = useRef<typeof import("leaflet") | null>(null);
  const clustersRef = useRef(clusters);

  const [selectedCluster, setSelectedCluster] = useState<IncidentCluster | null>(null);
  const [selectedIncidentId, setSelectedIncidentId] = useState("");
  const [mapReady, setMapReady] = useState(false);
  const [stations, setStations] = useState<StationMarker[]>([]);
  const [waterSources, setWaterSources] = useState<WaterSource[]>([]);
  const [waterSourcesLoading, setWaterSourcesLoading] = useState(true);
  const [waterSourcesError, setWaterSourcesError] = useState("");
  const [selectedWaterSource, setSelectedWaterSource] = useState<WaterSource | null>(null);
  const [view, setView] = useState<MapView>("ALL");
  const [showStations, setShowStations] = useState(true);
  const [mapMode, setMapMode] = useState<MapContentMode>(() => resolveProvincialMapMode(searchParams));

  const viewRef = useRef<MapView>(view);
  const mapModeRef = useRef<MapContentMode>(mapMode);
  const onSelectRef = useRef<(cluster: IncidentCluster) => void>((cluster) => {
    setSelectedCluster(cluster);
    setSelectedIncidentId(cluster.incidents[0]?.id ?? "");
  });

  useEffect(() => {
    clustersRef.current = clusters;
    viewRef.current = view;
    mapModeRef.current = mapMode;
    if (leafletRef.current && mapRef.current && layerRef.current) {
      if (mapMode === "INCIDENTS") {
        drawIncidents(
          leafletRef.current,
          mapRef.current,
          layerRef.current,
          clusters,
          (c) => onSelectRef.current(c),
          view,
        );
        if (!mapRef.current.hasLayer(layerRef.current)) layerRef.current.addTo(mapRef.current);
      } else {
        mapRef.current.removeLayer(layerRef.current);
      }
    }
  }, [clusters, mapMode, view]);

  // Load Antique BFP fire stations across all municipalities
  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      try {
        const response = await fetch("/api/provincial-bfp/stations?pageSize=100", {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) return;
        const body = await response.json();
        const items = Array.isArray(body.items) ? body.items : [];
        const mapped: StationMarker[] = items.map((st: {
          id: string;
          stationName: string;
          municipalityName: string;
          latitude?: number | null;
          longitude?: number | null;
          status: string;
        }) => {
          let lat = Number(st.latitude);
          let lng = Number(st.longitude);
          if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
            const fallback = MUNICIPAL_CENTERS[st.municipalityName];
            if (fallback) {
              lat = fallback[0];
              lng = fallback[1];
            }
          }
          return {
            id: st.id,
            stationName: st.stationName || `${st.municipalityName} Fire Station`,
            municipalityName: st.municipalityName,
            latitude: lat,
            longitude: lng,
            status: st.status || "ACTIVE",
          };
        });

        if (!controller.signal.aborted) {
          setStations(mapped);
        }
      } catch {
        // Station overlay error degrades gracefully
      }
    })();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void fetchProvincialWaterSources(fetch, controller.signal)
      .then((registry) => {
        if (controller.signal.aborted) return;
        setWaterSources(registry.sources);
        setWaterSourcesError("");
      })
      .catch((loadError) => {
        if (controller.signal.aborted) return;
        setWaterSourcesError(
          loadError instanceof Error ? loadError.message : "Unable to load the provincial water-source layer.",
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setWaterSourcesLoading(false);
      });
    return () => controller.abort();
  }, []);

  // Sync station coverage markers
  useEffect(() => {
    const L = leafletRef.current;
    const map = mapRef.current;
    if (!L || !map || !mapReady) return;
    if (!stationLayerRef.current) stationLayerRef.current = L.layerGroup().addTo(map);

    if (mapMode === "INCIDENTS" && showStations) {
      drawStations(L, stationLayerRef.current, stations);
      if (!map.hasLayer(stationLayerRef.current)) stationLayerRef.current.addTo(map);
    } else {
      map.removeLayer(stationLayerRef.current);
    }
  }, [stations, showStations, mapMode, mapReady]);

  useEffect(() => {
    const L = leafletRef.current;
    const map = mapRef.current;
    if (!L || !map || !mapReady) return;
    if (!waterSourceLayerRef.current) waterSourceLayerRef.current = L.layerGroup().addTo(map);
    if (mapMode === "WATER_SOURCES") {
      drawWaterSources(
        L,
        map,
        waterSourceLayerRef.current,
        waterSources,
        waterSourceId,
        setSelectedWaterSource,
      );
      if (!map.hasLayer(waterSourceLayerRef.current)) waterSourceLayerRef.current.addTo(map);
    } else {
      map.removeLayer(waterSourceLayerRef.current);
    }
  }, [mapMode, mapReady, waterSourceId, waterSources]);

  // Mount Leaflet map with clean OpenStreetMap tiles
  useEffect(() => {
    let disposed = false;
    let map: import("leaflet").Map | null = null;

    void (async () => {
      const L = await import("leaflet");
      if (disposed || !mapElement.current) return;

      map = L.map(mapElement.current, {
        zoomControl: false,
        attributionControl: true,
      }).setView(DEFAULT_PROVINCE_CENTER, 9);

      L.control.zoom({ position: "bottomright" }).addTo(map);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
        maxZoom: 19,
      }).addTo(map);

      const incidentLayer = L.layerGroup();
      leafletRef.current = L;
      mapRef.current = map;
      layerRef.current = incidentLayer;

      if (mapModeRef.current === "INCIDENTS") {
        incidentLayer.addTo(map);
        drawIncidents(
          L,
          map,
          incidentLayer,
          clustersRef.current,
          (c) => onSelectRef.current(c),
          viewRef.current,
        );
      }
      setMapReady(true);
    })();

    return () => {
      disposed = true;
      layerRef.current = null;
      stationLayerRef.current = null;
      waterSourceLayerRef.current = null;
      leafletRef.current = null;
      mapRef.current = null;
      map?.remove();
    };
  }, []);

  function handleJumpMunicipality(name: string) {
    if (!mapRef.current) return;
    const coords = MUNICIPAL_CENTERS[name];
    if (coords) {
      mapRef.current.flyTo(coords, 13, { duration: 1.2 });
    }
  }

  function handleResetView() {
    if (!mapRef.current) return;
    mapRef.current.flyTo(DEFAULT_PROVINCE_CENTER, 9, { duration: 1.2 });
  }

  async function handleRefresh() {
    if (mapMode === "INCIDENTS") {
      await refresh(true);
      return;
    }
    setWaterSourcesLoading(true);
    try {
      const registry = await fetchProvincialWaterSources();
      setWaterSources(registry.sources);
      setWaterSourcesError("");
    } catch (loadError) {
      setWaterSourcesError(
        loadError instanceof Error ? loadError.message : "Unable to load the provincial water-source layer.",
      );
    } finally {
      setWaterSourcesLoading(false);
    }
  }

  const activeCount = useMemo(
    () => incidents.filter((incident) => !TERMINAL_STATUSES.has(incident.status)).length,
    [incidents],
  );
  const resolvedCount = incidents.length - activeCount;
  const activeStationCount = useMemo(
    () => stations.filter((station) => station.status === "ACTIVE").length,
    [stations],
  );

  const selectedIncident = useMemo(() => {
    if (!selectedCluster) return null;
    return (
      selectedCluster.incidents.find((i) => i.id === selectedIncidentId) ??
      selectedCluster.incidents[0] ??
      null
    );
  }, [selectedCluster, selectedIncidentId]);

  useEffect(() => {
    if (!selectedWaterSource) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelectedWaterSource(null);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [selectedWaterSource]);

  return (
    <main className="mbfp-ops-root">
      <style>{styles}</style>
      <section className="mbfp-ops-workspace" aria-labelledby="provincial-gis-heading">
        {/* Header Toolbar */}
        <header className="mbfp-ops-toolbar">
          <div className="pbfp-title-group">
            <p className="mbfp-ops-eyebrow">Provincial fire operations</p>
            <h1 id="provincial-gis-heading" className="mbfp-ops-title">
              {mapMode === "INCIDENTS" ? "GIS incident map" : "GIS water source map"}
            </h1>
          </div>
          <div className="mbfp-ops-tools">
            <button
              className="mbfp-ops-refresh"
              type="button"
              onClick={() => void handleRefresh()}
              disabled={mapMode === "INCIDENTS" ? checking : waterSourcesLoading}
            >
              <i className={`fa-solid fa-rotate-right ${(mapMode === "INCIDENTS" ? checking : waterSourcesLoading) ? "fa-spin" : ""}`} aria-hidden="true" />
              <span>{(mapMode === "INCIDENTS" ? checking : waterSourcesLoading) ? "Refreshing map" : "Live refresh"}</span>
            </button>
          </div>
        </header>

        {/* 4 Clean White KPI Stat Cards */}
        <div className="mbfp-ops-stats">
          <article className="mbfp-ops-stat is-active">
            <div className="pbfp-stat-header">
              <span className="mbfp-ops-stat-label">Active now</span>
              <span className="pbfp-stat-icon-badge">
                <i className="fa-solid fa-fire" aria-hidden="true" />
              </span>
            </div>
            <span className="mbfp-ops-stat-num">{loading ? "--" : activeCount}</span>
          </article>

          <article className="mbfp-ops-stat is-resolved">
            <div className="pbfp-stat-header">
              <span className="mbfp-ops-stat-label">Resolved</span>
              <span className="pbfp-stat-icon-badge">
                <i className="fa-solid fa-check" aria-hidden="true" />
              </span>
            </div>
            <span className="mbfp-ops-stat-num">{loading ? "--" : resolvedCount}</span>
          </article>

          <article className="mbfp-ops-stat is-stations">
            <div className="pbfp-stat-header">
              <span className="mbfp-ops-stat-label">Active stations</span>
              <span className="pbfp-stat-icon-badge">
                <i className="fa-solid fa-truck-fast" aria-hidden="true" />
              </span>
            </div>
            <span className="mbfp-ops-stat-num">{activeStationCount}</span>
          </article>

          <article className="mbfp-ops-stat is-sites">
            <div className="pbfp-stat-header">
              <span className="mbfp-ops-stat-label">Water sources</span>
              <span className="pbfp-stat-icon-badge">
                <i className="fa-solid fa-location-dot" aria-hidden="true" />
              </span>
            </div>
            <span className="mbfp-ops-stat-num">{waterSourcesLoading ? "--" : waterSources.length}</span>
          </article>
        </div>

        {/* Operational Filter Pills, Municipality Jump, and Coverage Toggle */}
        <div className="mbfp-ops-controls">
          <div className="pbfp-controls-left">
            <div className="mbfp-ops-mode-switch" role="group" aria-label="Choose map content">
              {([
                ["INCIDENTS", "Incidents", "fa-fire"],
                ["WATER_SOURCES", "Water sources", "fa-droplet"],
              ] as Array<[MapContentMode, string, string]>).map(([key, label, icon]) => (
                <button
                  key={key}
                  type="button"
                  className={`mbfp-ops-mode-button${mapMode === key ? " is-on" : ""}`}
                  onClick={() => {
                    setMapMode(key);
                    setSelectedWaterSource(null);
                    if (key === "WATER_SOURCES") setSelectedCluster(null);
                  }}
                  aria-pressed={mapMode === key}
                >
                  <i className={`fa-solid ${icon}`} aria-hidden="true" />
                  {label}
                </button>
              ))}
            </div>
            {mapMode === "INCIDENTS" && (
              <div className="mbfp-ops-segmented" role="group" aria-label="Which incidents to show">
                {(["ALL", "ACTIVE", "HISTORY"] as MapView[]).map((key) => (
                  <button
                    key={key}
                    type="button"
                    className={`mbfp-ops-segment${view === key ? " is-on" : ""}`}
                    onClick={() => setView(key)}
                    aria-pressed={view === key}
                  >
                    {key === "ALL" ? "All" : key === "ACTIVE" ? "Active" : "History"}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="pbfp-controls-right">
            {/* Quick jump to any Antique municipality */}
            <select
              className="pbfp-jump-select"
              aria-label="Jump to municipality"
              defaultValue=""
              onChange={(e) => {
                if (e.target.value) handleJumpMunicipality(e.target.value);
              }}
            >
              <option value="" disabled>
                📍 Jump to Municipality…
              </option>
              {Object.keys(MUNICIPAL_CENTERS)
                .sort()
                .map((muni) => (
                  <option key={muni} value={muni}>
                    {muni}
                  </option>
                ))}
            </select>

            <button
              type="button"
              className="pbfp-btn-reset-view"
              onClick={handleResetView}
              title="Reset view to whole Antique province"
            >
              <i className="fa-solid fa-expand" aria-hidden="true" />
              <span>Full Province</span>
            </button>

            {mapMode === "INCIDENTS" && <label className="mbfp-ops-layer-toggle">
              <input
                type="checkbox"
                checked={showStations}
                onChange={(e) => setShowStations(e.target.checked)}
              />
              <i className="fa-solid fa-truck-fast" aria-hidden="true" />
              Stations and coverage
            </label>}
          </div>
        </div>

        {/* Leaflet Map Canvas */}
        <div className="mbfp-ops-map-shell">
          <div ref={mapElement} className="mbfp-ops-map" aria-label={mapMode === "INCIDENTS" ? "Provincial incident map" : "Provincial water source map"} />
          {!mapReady && (
            <div className="mbfp-ops-map-loading" aria-label="Loading provincial operations map" />
          )}

          <aside className="mbfp-ops-legend" aria-label="What the map symbols mean">
            {mapMode === "INCIDENTS" && <span className="mbfp-ops-legend-row">
              <i className="mbfp-ops-key key-active" aria-hidden="true" />
              Active incident
            </span>}
            {mapMode === "INCIDENTS" && <span className="mbfp-ops-legend-row">
              <i className="mbfp-ops-key key-history" aria-hidden="true" />
              Resolved or closed
            </span>}
            {mapMode === "INCIDENTS" && showStations && (
              <span className="mbfp-ops-legend-row">
                <i className="mbfp-ops-key key-station" aria-hidden="true" />
                Station · {STATION_COVERAGE_METERS / 1000} km reach
              </span>
            )}
            {mapMode === "WATER_SOURCES" && <span className="mbfp-ops-legend-row">
              <i className="mbfp-ops-key key-water-source" aria-hidden="true" />
              Hydrant or water source
            </span>}
          </aside>

          {mapMode === "INCIDENTS" && !loading && !error && incidents.length === 0 && (
            <div className="mbfp-ops-empty" role="status">
              <strong>No incidents have been reported across Antique province</strong>
              <p>The map monitors all 18 municipalities. New emergency alerts appear automatically.</p>
            </div>
          )}

          {mapMode === "INCIDENTS" && !loading && !error && incidents.length > 0 && view === "ACTIVE" && activeCount === 0 && (
            <div className="mbfp-ops-empty" role="status">
              <strong>Nothing is burning right now</strong>
              <p>Every incident across Antique province is resolved or closed. Switch to History to view previous responses.</p>
            </div>
          )}
          {mapMode === "WATER_SOURCES" && !waterSourcesLoading && !waterSourcesError && waterSources.length === 0 && (
            <div className="mbfp-ops-empty" role="status">
              <strong>No mapped water sources are available</strong>
              <p>The provincial registry does not currently contain a hydrant or other water source.</p>
            </div>
          )}
        </div>

        {/* Footnote */}
        <footer className="mbfp-ops-footnote">
          {mapMode === "INCIDENTS" ? <>
          <span className="mbfp-ops-summary">
            <strong>{incidents.length}</strong>
            {incidents.length === 1 ? "province-wide report" : "province-wide reports"} across{" "}
            {clusters.length} reported {clusters.length === 1 ? "location" : "locations"} in Antique.
          </span>
          {error ? (
            <span className="mbfp-ops-error" role="alert">
              {error}
            </span>
          ) : (
            <a className="mbfp-ops-queue-link" href="/provincial-bfp/incidents">
              Open active incident queue
            </a>
          )}
          </> : <>
            <span className="mbfp-ops-summary">
              <strong>{waterSources.length}</strong>
              {waterSources.length === 1 ? "mapped water source" : "mapped water sources"} across Antique.
            </span>
            {waterSourcesError ? <span className="mbfp-ops-error" role="alert">{waterSourcesError}</span> : (
              <a className="mbfp-ops-queue-link" href="/provincial-bfp/water-sources">
                Open provincial water-source registry
              </a>
            )}
          </>}
        </footer>
      </section>

      {/* Provincial Incident Modal */}
      {selectedCluster && selectedIncident && (
        <div
          className="pbfp-gis-modal-backdrop"
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedCluster(null);
          }}
        >
          <section
            className="pbfp-gis-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="pbfp-gis-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="pbfp-gis-modal-header">
              <div>
                <p className="pbfp-gis-modal-kicker">Province-wide incident record</p>
                <h2 id="pbfp-gis-modal-title">
                  {selectedCluster.incidents.length > 1
                    ? `${selectedCluster.incidents.length} reports at this location`
                    : "Incident details"}
                </h2>
              </div>
              <button
                className="pbfp-gis-modal-close"
                type="button"
                onClick={() => setSelectedCluster(null)}
                aria-label="Close incident details"
              >
                <i className="fa-solid fa-xmark" aria-hidden="true" />
              </button>
            </header>

            {selectedCluster.incidents.length > 1 && (
              <div className="pbfp-gis-modal-selector" aria-label="Reports at this location">
                {selectedCluster.incidents.map((candidate) => (
                  <button
                    key={candidate.id}
                    type="button"
                    className={candidate.id === selectedIncident.id ? "is-selected" : ""}
                    onClick={() => setSelectedIncidentId(candidate.id)}
                  >
                    <strong>{candidate.referenceNumber}</strong>
                    <span>
                      {candidate.originMunicipality} · {humanize(candidate.status)}
                    </span>
                  </button>
                ))}
              </div>
            )}

            <div className="pbfp-gis-modal-body">
              <section className="pbfp-gis-modal-hero">
                <span className="pbfp-gis-modal-fire">
                  <i className="fa-solid fa-fire" aria-hidden="true" />
                </span>
                <div>
                  <strong>{selectedIncident.referenceNumber}</strong>
                  <span
                    className={`pbfp-gis-status ${
                      TERMINAL_STATUSES.has(selectedIncident.status) ? "status-closed" : ""
                    }`}
                  >
                    {humanize(selectedIncident.status)}
                  </span>
                </div>
                <p>Reported {formatDate(selectedIncident.submittedAt)}</p>
              </section>

              <div className="pbfp-gis-facts">
                <article>
                  <span>Origin Municipality</span>
                  <strong>{selectedIncident.originMunicipality || "Antique"}</strong>
                </article>
                <article>
                  <span>Reported Barangay</span>
                  <strong>{selectedIncident.barangay || "Unspecified Barangay"}</strong>
                </article>
                <article>
                  <span>GPS Coordinates</span>
                  <strong>
                    {resolveIncidentCoordinates(selectedIncident)
                      ? `${resolveIncidentCoordinates(selectedIncident)![0].toFixed(5)}, ${resolveIncidentCoordinates(selectedIncident)![1].toFixed(5)}`
                      : "Not recorded"}
                  </strong>
                </article>
                <article>
                  <span>Fire Classification</span>
                  <strong>{humanize(selectedIncident.fireType)}</strong>
                </article>
                <article>
                  <span>Calculated Severity</span>
                  <strong>{humanize(selectedIncident.calculatedSeverity)}</strong>
                </article>
                <article>
                  <span>Dispatched At</span>
                  <strong>{formatDate(selectedIncident.dispatchedAt)}</strong>
                </article>
                <article>
                  <span>Assigned Station Units</span>
                  <strong>
                    {selectedIncident.assignedStationCount} Station
                    {selectedIncident.assignedStationCount === 1 ? "" : "s"}
                  </strong>
                </article>
                <article>
                  <span>Observer Units Attached</span>
                  <strong>{selectedIncident.observers?.length ?? 0} Nearby BFP</strong>
                </article>
              </div>

              <div className="pbfp-gis-modal-actions">
                <a
                  href={`/provincial-bfp/incidents?incident=${encodeURIComponent(selectedIncident.id)}`}
                  className="pbfp-btn-action secondary"
                >
                  <i className="fa-solid fa-satellite-dish" aria-hidden="true" /> Command Roster
                </a>
                <a
                  href={`/provincial-bfp/incident-reports?report=${encodeURIComponent(selectedIncident.id)}`}
                  className="pbfp-btn-action primary"
                >
                  <i className="fa-solid fa-file-lines" aria-hidden="true" /> View Full Report
                </a>
              </div>
            </div>
          </section>
        </div>
      )}
      {selectedWaterSource && (
        <div
          className="pbfp-gis-modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSelectedWaterSource(null);
          }}
        >
          <section
            className="pbfp-gis-modal pbfp-water-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="provincial-water-source-modal-title"
          >
            <header className="pbfp-gis-modal-header">
              <div>
                <p className="pbfp-gis-modal-kicker">Mapped provincial water network</p>
                <h2 id="provincial-water-source-modal-title">Water source details</h2>
              </div>
              <button
                className="pbfp-gis-modal-close"
                type="button"
                aria-label="Close water source details"
                onClick={() => setSelectedWaterSource(null)}
              >
                <i className="fa-solid fa-xmark" aria-hidden="true" />
              </button>
            </header>
            <div className="pbfp-gis-modal-body">
              <section className="pbfp-water-modal__hero">
                <span className="pbfp-water-modal__icon">
                  <i className={`fa-solid ${selectedWaterSource.sourceKind === "FIRE_HYDRANT" ? "fa-fire-extinguisher" : "fa-droplet"}`} aria-hidden="true" />
                </span>
                <div>
                  <p className="pbfp-water-modal__kind">
                    {selectedWaterSource.sourceKind === "FIRE_HYDRANT" ? "Fire hydrant" : "Water source"}
                  </p>
                  <h3 className="pbfp-water-modal__location">{selectedWaterSource.exactLocation}</h3>
                </div>
              </section>
              <div className="pbfp-gis-facts">
                <article><span>Municipality</span><strong>{selectedWaterSource.municipalityName}</strong></article>
                <article><span>Type / color</span><strong>{selectedWaterSource.typeColor}</strong></article>
                <article><span>Quantity</span><strong>{selectedWaterSource.quantity}</strong></article>
                <article><span>Coordinates</span><strong>{selectedWaterSource.latitude.toFixed(7)}, {selectedWaterSource.longitude.toFixed(7)}</strong></article>
              </div>
              <span className="pbfp-water-modal__origin">
                <i className="fa-solid fa-file-shield" aria-hidden="true" />
                {selectedWaterSource.recordOrigin === "BFP_LOCATOR_CHART_2018" ? "BFP locator chart · 2018" : "Municipal entry"}
              </span>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
