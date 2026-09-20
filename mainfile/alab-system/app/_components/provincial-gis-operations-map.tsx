"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";

import { useProvincialIncidentFeed } from "./use-provincial-incident-feed";
import type { ProvincialIncidentSummary } from "../../lib/intermunicipality/provincial";

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
type MapStyle = "DARK" | "LIGHT" | "SATELLITE";

const STATION_COVERAGE_METERS = 3_000;

const MAP_TILE_CONFIG: Record<MapStyle, { url: string; attribution: string; maxZoom: number }> = {
  DARK: {
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    attribution: "© OpenStreetMap contributors © CARTO",
    maxZoom: 19,
  },
  LIGHT: {
    url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
    attribution: "© OpenStreetMap contributors © CARTO",
    maxZoom: 19,
  },
  SATELLITE: {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "Esri, Maxar, Earthstar Geographics",
    maxZoom: 18,
  },
};

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
  :root {
    --pbfp-bg: #0B0F19;
    --pbfp-card-bg: rgba(17, 24, 39, 0.85);
    --pbfp-card-border: rgba(255, 255, 255, 0.09);
    --pbfp-text-primary: #F8FAFC;
    --pbfp-text-secondary: #94A3B8;
    --pbfp-text-muted: #64748B;
    --pbfp-accent-red: #EF4444;
    --pbfp-accent-blue: #3B82F6;
    --pbfp-accent-green: #10B981;
    --pbfp-accent-amber: #F59E0B;
    --pbfp-accent-cyan: #06B6D4;
  }

  .pbfp-theme-light {
    --pbfp-bg: #F1F5F9;
    --pbfp-card-bg: #FFFFFF;
    --pbfp-card-border: #E2E8F0;
    --pbfp-text-primary: #0F172A;
    --pbfp-text-secondary: #475569;
    --pbfp-text-muted: #64748B;
  }

  .mbfp-ops-root {
    min-height: 100dvh;
    padding: clamp(1rem, 2.5vw, 2.25rem);
    background: var(--pbfp-bg);
    background-image: 
      radial-gradient(1200px circle at 50% -120px, rgba(220, 38, 38, 0.15), transparent 70%),
      radial-gradient(900px circle at 100% 300px, rgba(37, 99, 235, 0.09), transparent 65%);
    color: var(--pbfp-text-primary);
    font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    transition: background 0.25s ease, color 0.25s ease;
  }

  .mbfp-ops-workspace {
    width: min(100%, 1520px);
    margin: 0 auto;
  }

  /* Command Header */
  .mbfp-ops-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1.25rem;
    margin-bottom: 1.25rem;
    padding: 0.75rem 0.25rem;
    flex-wrap: wrap;
  }

  .pbfp-brand-cluster {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .pbfp-insignia-box {
    width: 48px;
    height: 48px;
    border-radius: 14px;
    background: linear-gradient(135deg, #DC2626 0%, #991B1B 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    color: #FFFFFF;
    font-size: 1.4rem;
    box-shadow: 0 0 25px rgba(220, 38, 38, 0.45);
    border: 1px solid rgba(255, 255, 255, 0.2);
    flex-shrink: 0;
  }

  .mbfp-ops-eyebrow {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    margin: 0 0 0.25rem;
    color: var(--pbfp-accent-red);
    font-size: 0.72rem;
    font-weight: 850;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }

  .mbfp-ops-eyebrow:before {
    width: 0.55rem;
    height: 0.55rem;
    border-radius: 999px;
    background: #EF4444;
    box-shadow: 0 0 10px #EF4444;
    animation: pbfp-live-pulse 1.8s infinite;
    content: "";
  }

  .mbfp-ops-title {
    margin: 0;
    font-size: clamp(1.6rem, 2.5vw, 2.3rem);
    line-height: 1.05;
    letter-spacing: -0.04em;
    font-weight: 900;
    color: var(--pbfp-text-primary);
  }

  .mbfp-ops-tools {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 0.65rem;
    flex-wrap: wrap;
  }

  .pbfp-clock-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 0.9rem;
    background: var(--pbfp-card-bg);
    border: 1px solid var(--pbfp-card-border);
    border-radius: 12px;
    font-size: 0.78rem;
    font-weight: 750;
    color: var(--pbfp-text-secondary);
    backdrop-filter: blur(12px);
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);
  }
  .pbfp-clock-badge i {
    color: var(--pbfp-accent-blue);
  }

  .pbfp-theme-btn,
  .mbfp-ops-refresh {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.55rem;
    min-height: 2.6rem;
    padding: 0.55rem 1rem;
    border: 1px solid var(--pbfp-card-border);
    border-radius: 12px;
    background: var(--pbfp-card-bg);
    color: var(--pbfp-text-primary);
    font: inherit;
    font-size: 0.82rem;
    font-weight: 750;
    cursor: pointer;
    backdrop-filter: blur(12px);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
    transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .pbfp-theme-btn:hover,
  .mbfp-ops-refresh:hover:not(:disabled) {
    transform: translateY(-1px);
    border-color: rgba(255, 255, 255, 0.25);
    background: rgba(255, 255, 255, 0.06);
  }

  .pbfp-theme-light .pbfp-theme-btn:hover,
  .pbfp-theme-light .mbfp-ops-refresh:hover:not(:disabled) {
    background: #F8FAFC;
    border-color: #CBD5E1;
  }

  .mbfp-ops-refresh:disabled {
    opacity: 0.6;
    cursor: wait;
  }

  /* Bento Tactical Stat Cards */
  .mbfp-ops-stats {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 0.85rem;
    margin-bottom: 1.15rem;
  }

  .mbfp-ops-stat {
    position: relative;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 1.15rem 1.25rem;
    border-radius: 16px;
    background: var(--pbfp-card-bg);
    border: 1px solid var(--pbfp-card-border);
    backdrop-filter: blur(16px);
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08);
    transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
  }

  .mbfp-ops-stat:hover {
    transform: translateY(-2px);
    box-shadow: 0 16px 36px rgba(0, 0, 0, 0.15);
  }

  .mbfp-ops-stat.is-active {
    border-left: 4px solid var(--pbfp-accent-red);
    background: linear-gradient(135deg, rgba(239, 68, 68, 0.08) 0%, var(--pbfp-card-bg) 60%);
  }
  .mbfp-ops-stat.is-resolved {
    border-left: 4px solid var(--pbfp-accent-green);
    background: linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, var(--pbfp-card-bg) 60%);
  }
  .mbfp-ops-stat.is-stations {
    border-left: 4px solid var(--pbfp-accent-blue);
    background: linear-gradient(135deg, rgba(59, 130, 246, 0.08) 0%, var(--pbfp-card-bg) 60%);
  }
  .mbfp-ops-stat.is-sites {
    border-left: 4px solid var(--pbfp-accent-cyan);
    background: linear-gradient(135deg, rgba(6, 182, 212, 0.08) 0%, var(--pbfp-card-bg) 60%);
  }

  .pbfp-stat-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 0.6rem;
  }

  .pbfp-stat-icon {
    width: 38px;
    height: 38px;
    border-radius: 11px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.1rem;
  }

  .is-active .pbfp-stat-icon {
    background: rgba(239, 68, 68, 0.15);
    color: #EF4444;
    box-shadow: 0 0 15px rgba(239, 68, 68, 0.25);
  }
  .is-resolved .pbfp-stat-icon {
    background: rgba(16, 185, 129, 0.15);
    color: #10B981;
  }
  .is-stations .pbfp-stat-icon {
    background: rgba(59, 130, 246, 0.15);
    color: #3B82F6;
    box-shadow: 0 0 15px rgba(59, 130, 246, 0.25);
  }
  .is-sites .pbfp-stat-icon {
    background: rgba(6, 182, 212, 0.15);
    color: #06B6D4;
  }

  .pbfp-stat-pill {
    padding: 0.22rem 0.6rem;
    border-radius: 999px;
    font-size: 0.64rem;
    font-weight: 850;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  .is-active .pbfp-stat-pill {
    background: rgba(239, 68, 68, 0.2);
    color: #F87171;
    border: 1px solid rgba(239, 68, 68, 0.3);
  }
  .is-resolved .pbfp-stat-pill {
    background: rgba(16, 185, 129, 0.2);
    color: #34D399;
  }
  .is-stations .pbfp-stat-pill {
    background: rgba(59, 130, 246, 0.2);
    color: #60A5FA;
  }
  .is-sites .pbfp-stat-pill {
    background: rgba(6, 182, 212, 0.2);
    color: #22D3EE;
  }

  .mbfp-ops-stat-num {
    font-size: 2.25rem;
    font-weight: 900;
    line-height: 1;
    color: var(--pbfp-text-primary);
    font-variant-numeric: tabular-nums;
    letter-spacing: -0.03em;
  }

  .mbfp-ops-stat.is-active .mbfp-ops-stat-num {
    color: #EF4444;
    text-shadow: 0 0 25px rgba(239, 68, 68, 0.4);
  }

  .mbfp-ops-stat-label {
    margin-top: 0.35rem;
    font-size: 0.72rem;
    font-weight: 800;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: var(--pbfp-text-muted);
  }

  /* Command Controls Bar */
  .mbfp-ops-controls {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.85rem;
    flex-wrap: wrap;
    margin-bottom: 1.1rem;
    padding: 0.6rem 0.85rem;
    border-radius: 14px;
    background: var(--pbfp-card-bg);
    border: 1px solid var(--pbfp-card-border);
    backdrop-filter: blur(14px);
  }

  .pbfp-controls-left {
    display: flex;
    align-items: center;
    gap: 0.85rem;
    flex-wrap: wrap;
  }

  .mbfp-ops-segmented {
    display: inline-flex;
    padding: 0.25rem;
    border: 1px solid var(--pbfp-card-border);
    border-radius: 11px;
    background: rgba(0, 0, 0, 0.25);
    gap: 0.2rem;
  }
  .pbfp-theme-light .mbfp-ops-segmented {
    background: #E2E8F0;
  }

  .mbfp-ops-segment {
    padding: 0.45rem 0.95rem;
    border: 0;
    border-radius: 8px;
    background: transparent;
    color: var(--pbfp-text-muted);
    font: inherit;
    font-size: 0.8rem;
    font-weight: 750;
    cursor: pointer;
    transition: all 0.18s ease;
  }

  .mbfp-ops-segment:hover {
    color: var(--pbfp-text-primary);
  }

  .mbfp-ops-segment.is-on {
    background: var(--pbfp-accent-red);
    color: #FFFFFF;
    box-shadow: 0 2px 10px rgba(239, 68, 68, 0.4);
  }

  .pbfp-tile-segmented {
    display: inline-flex;
    padding: 0.25rem;
    border: 1px solid var(--pbfp-card-border);
    border-radius: 11px;
    background: rgba(0, 0, 0, 0.25);
    gap: 0.2rem;
  }
  .pbfp-theme-light .pbfp-tile-segmented {
    background: #E2E8F0;
  }

  .pbfp-tile-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.45rem 0.75rem;
    border: 0;
    border-radius: 8px;
    background: transparent;
    color: var(--pbfp-text-muted);
    font: inherit;
    font-size: 0.76rem;
    font-weight: 750;
    cursor: pointer;
    transition: all 0.18s ease;
  }

  .pbfp-tile-btn:hover {
    color: var(--pbfp-text-primary);
  }

  .pbfp-tile-btn.is-active {
    background: #1E293B;
    color: #FFFFFF;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  }
  .pbfp-theme-light .pbfp-tile-btn.is-active {
    background: #FFFFFF;
    color: #0F172A;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
  }

  .pbfp-controls-right {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex-wrap: wrap;
  }

  .pbfp-jump-select {
    padding: 0.45rem 0.85rem;
    border: 1px solid var(--pbfp-card-border);
    border-radius: 10px;
    background: var(--pbfp-card-bg);
    color: var(--pbfp-text-primary);
    font: inherit;
    font-size: 0.78rem;
    font-weight: 700;
    cursor: pointer;
    outline: none;
  }

  .mbfp-ops-layer-toggle {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.45rem 0.85rem;
    border: 1px solid var(--pbfp-card-border);
    border-radius: 10px;
    background: var(--pbfp-card-bg);
    color: var(--pbfp-text-secondary);
    font-size: 0.8rem;
    font-weight: 750;
    cursor: pointer;
    user-select: none;
    transition: all 0.15s ease;
  }

  .mbfp-ops-layer-toggle:hover {
    color: var(--pbfp-text-primary);
  }

  .mbfp-ops-layer-toggle i {
    color: var(--pbfp-accent-blue);
    font-size: 0.82rem;
  }

  .mbfp-ops-layer-toggle input {
    accent-color: var(--pbfp-accent-blue);
    cursor: pointer;
    width: 15px;
    height: 15px;
  }

  .pbfp-btn-reset-view {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.45rem 0.85rem;
    border: 1px solid var(--pbfp-card-border);
    border-radius: 10px;
    background: var(--pbfp-card-bg);
    color: var(--pbfp-text-secondary);
    font: inherit;
    font-size: 0.78rem;
    font-weight: 750;
    cursor: pointer;
    transition: all 0.15s ease;
  }
  .pbfp-btn-reset-view:hover {
    color: var(--pbfp-text-primary);
  }

  /* Map Shell & Frame */
  .mbfp-ops-map-shell {
    position: relative;
    overflow: hidden;
    min-height: min(720px, calc(100dvh - 240px));
    border: 1px solid var(--pbfp-card-border);
    border-radius: 20px;
    background: #0F172A;
    box-shadow: 0 25px 60px rgba(0, 0, 0, 0.4);
  }
  .pbfp-theme-light .mbfp-ops-map-shell {
    background: #E2E8F0;
    box-shadow: 0 20px 45px rgba(54, 78, 110, 0.12);
  }

  .mbfp-ops-map {
    width: 100%;
    min-height: min(720px, calc(100dvh - 240px));
  }

  .mbfp-ops-map .leaflet-control-zoom {
    border: 0;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
    border-radius: 12px;
    overflow: hidden;
  }

  .mbfp-ops-map .leaflet-control-zoom a {
    width: 2.3rem;
    height: 2.3rem;
    line-height: 2.3rem;
    color: #FFFFFF;
    background: rgba(15, 23, 42, 0.9);
    backdrop-filter: blur(10px);
    border-color: rgba(255, 255, 255, 0.12);
    transition: background 0.15s;
  }
  .mbfp-ops-map .leaflet-control-zoom a:hover {
    background: #1E293B;
  }

  /* Custom Markers */
  .mbfp-ops-marker-wrapper {
    background: transparent;
    border: 0;
  }

  .mbfp-ops-marker-ring {
    position: relative;
    display: grid;
    width: 62px;
    height: 62px;
    place-items: center;
    border: 1px solid rgba(239, 68, 68, 0.5);
    border-radius: 999px;
    background: rgba(239, 68, 68, 0.15);
    box-shadow: 0 0 0 8px rgba(239, 68, 68, 0.12);
    animation: pbfp-marker-pulse 2.2s infinite ease-out;
  }

  .mbfp-ops-marker-ring.is-history {
    border-color: rgba(100, 116, 139, 0.4);
    background: rgba(100, 116, 139, 0.15);
    box-shadow: 0 0 0 6px rgba(100, 116, 139, 0.08);
    animation: none;
  }

  .mbfp-ops-fire-marker {
    display: grid;
    width: 34px;
    height: 34px;
    place-items: center;
    border: 2px solid #FFFFFF;
    border-radius: 50% 50% 50% 0;
    background: linear-gradient(135deg, #EF4444 0%, #DC2626 100%);
    box-shadow: 0 6px 16px rgba(220, 38, 38, 0.6);
    transform: rotate(-45deg);
    cursor: pointer;
    transition: transform 0.15s ease;
  }
  .mbfp-ops-fire-marker:hover {
    transform: rotate(-45deg) scale(1.1);
  }

  .is-history .mbfp-ops-fire-marker {
    background: linear-gradient(135deg, #64748B 0%, #475569 100%);
    box-shadow: 0 5px 12px rgba(51, 65, 85, 0.45);
  }

  .mbfp-ops-fire-marker i {
    color: #FFFFFF;
    font-size: 0.9rem;
    transform: rotate(45deg);
  }

  .mbfp-ops-marker-count {
    position: absolute;
    right: -2px;
    top: -2px;
    display: grid;
    min-width: 22px;
    height: 22px;
    padding: 0 5px;
    place-items: center;
    border: 2px solid #FFFFFF;
    border-radius: 999px;
    background: #0F172A;
    color: #FFFFFF;
    font: 900 11px/1 Arial, sans-serif;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
  }

  .mbfp-ops-station-pin {
    display: grid;
    width: 32px;
    height: 32px;
    place-items: center;
    border: 2px solid #FFFFFF;
    border-radius: 10px;
    background: linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%);
    color: #FFFFFF;
    font-size: 0.8rem;
    box-shadow: 0 6px 16px rgba(29, 78, 216, 0.55);
    cursor: pointer;
  }
  .mbfp-ops-station-pin.is-inactive {
    background: #64748B;
    box-shadow: 0 4px 10px rgba(100, 116, 139, 0.35);
  }

  /* Floating Legend HUD */
  .mbfp-ops-legend {
    position: absolute;
    z-index: 420;
    left: 1.25rem;
    bottom: 1.25rem;
    display: grid;
    gap: 0.45rem;
    min-width: 220px;
    padding: 0.85rem 1rem;
    border: 1px solid var(--pbfp-card-border);
    border-radius: 14px;
    background: rgba(15, 23, 42, 0.88);
    backdrop-filter: blur(14px);
    color: #F8FAFC;
    font-size: 0.74rem;
    line-height: 1.35;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
  }

  .mbfp-ops-legend-row {
    display: flex;
    align-items: center;
    gap: 0.55rem;
  }

  .mbfp-ops-key {
    width: 0.75rem;
    height: 0.75rem;
    flex-shrink: 0;
    border-radius: 4px;
  }
  .mbfp-ops-key.key-active {
    background: #EF4444;
    box-shadow: 0 0 8px rgba(239, 68, 68, 0.6);
  }
  .mbfp-ops-key.key-history {
    background: #64748B;
  }
  .mbfp-ops-key.key-station {
    background: #3B82F6;
    box-shadow: 0 0 8px rgba(59, 130, 246, 0.6);
  }

  /* Empty State */
  .mbfp-ops-empty {
    position: absolute;
    z-index: 420;
    left: 50%;
    top: 50%;
    width: min(32rem, calc(100% - 2rem));
    padding: 1.5rem 1.75rem;
    border: 1px solid var(--pbfp-card-border);
    border-radius: 18px;
    background: rgba(15, 23, 42, 0.92);
    backdrop-filter: blur(16px);
    color: #F8FAFC;
    text-align: center;
    transform: translate(-50%, -50%);
    box-shadow: 0 25px 60px rgba(0, 0, 0, 0.5);
  }

  .mbfp-ops-empty strong {
    display: block;
    margin-bottom: 0.4rem;
    color: #FFFFFF;
    font-size: 1.05rem;
  }
  .mbfp-ops-empty p {
    margin: 0;
    font-size: 0.88rem;
    color: #94A3B8;
    line-height: 1.5;
  }

  .mbfp-ops-map-loading {
    position: absolute;
    inset: 0;
    background: linear-gradient(105deg, rgba(15,23,42,0.85) 20%, rgba(30,41,59,0.85) 38%, rgba(15,23,42,0.85) 55%);
    background-size: 220% 100%;
    animation: mbfp-ops-shimmer 1.35s linear infinite;
  }

  /* Footnote Summary Bar */
  .mbfp-ops-footnote {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
    margin-top: 1.15rem;
    padding: 0.85rem 1.25rem;
    border-radius: 14px;
    background: var(--pbfp-card-bg);
    border: 1px solid var(--pbfp-card-border);
    backdrop-filter: blur(14px);
    color: var(--pbfp-text-secondary);
    font-size: 0.86rem;
    flex-wrap: wrap;
  }

  .mbfp-ops-summary {
    display: inline-flex;
    align-items: baseline;
    gap: 0.55rem;
    color: var(--pbfp-text-primary);
  }
  .mbfp-ops-summary strong {
    color: var(--pbfp-accent-red);
    font-size: 1.15rem;
    font-weight: 900;
  }

  .mbfp-ops-error {
    color: #EF4444;
    font-weight: 750;
  }

  .mbfp-ops-queue-link {
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
    color: var(--pbfp-accent-red);
    font-weight: 850;
    text-decoration: none;
    padding: 0.35rem 0.75rem;
    border-radius: 8px;
    background: rgba(239, 68, 68, 0.1);
    transition: all 0.15s ease;
  }
  .mbfp-ops-queue-link:hover {
    background: rgba(239, 68, 68, 0.2);
    transform: translateX(2px);
  }

  /* Provincial Modal */
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
    background: rgba(11, 15, 25, 0.78);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    box-sizing: border-box;
    animation: fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .pbfp-gis-modal {
    display: flex;
    overflow: hidden;
    width: min(100%, 750px);
    max-height: min(720px, calc(100dvh - 4rem));
    flex-direction: column;
    border: 1px solid var(--pbfp-card-border);
    border-radius: 20px;
    background: var(--pbfp-card-bg);
    box-shadow: 0 30px 90px rgba(0, 0, 0, 0.6);
  }

  .pbfp-gis-modal-header {
    display: flex;
    align-items: start;
    justify-content: space-between;
    gap: 1rem;
    padding: 1.15rem 1.4rem;
    border-bottom: 1px solid var(--pbfp-card-border);
  }

  .pbfp-gis-modal-kicker {
    margin: 0 0 0.25rem;
    color: var(--pbfp-accent-red);
    font-size: 0.7rem;
    font-weight: 850;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  .pbfp-gis-modal-header h2 {
    margin: 0;
    color: var(--pbfp-text-primary);
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
    border: 1px solid var(--pbfp-card-border);
    border-radius: 10px;
    background: rgba(255, 255, 255, 0.05);
    color: var(--pbfp-text-muted);
    cursor: pointer;
    transition: all 0.15s ease;
  }
  .pbfp-gis-modal-close:hover {
    border-color: #EF4444;
    color: #EF4444;
  }

  .pbfp-gis-modal-selector {
    display: flex;
    overflow-x: auto;
    gap: 0.55rem;
    padding: 0.75rem 1.4rem;
    border-bottom: 1px solid var(--pbfp-card-border);
    background: rgba(0, 0, 0, 0.2);
  }

  .pbfp-gis-modal-selector button {
    min-width: 190px;
    padding: 0.65rem 0.85rem;
    border: 1px solid var(--pbfp-card-border);
    border-radius: 10px;
    background: rgba(255, 255, 255, 0.04);
    color: var(--pbfp-text-secondary);
    text-align: left;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .pbfp-gis-modal-selector button.is-selected {
    border-color: #EF4444;
    background: rgba(239, 68, 68, 0.15);
    color: #EF4444;
  }

  .pbfp-gis-modal-selector strong,
  .pbfp-gis-modal-selector span {
    display: block;
  }
  .pbfp-gis-modal-selector strong {
    font-size: 0.8rem;
    font-weight: 800;
  }
  .pbfp-gis-modal-selector span {
    margin-top: 0.2rem;
    font-size: 0.7rem;
  }

  .pbfp-gis-modal-body {
    overflow-y: auto;
    padding: 1.15rem 1.4rem 1.4rem;
  }

  .pbfp-gis-modal-hero {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 0.85rem;
    align-items: center;
    padding: 1rem 1.15rem;
    border: 1px solid rgba(239, 68, 68, 0.3);
    border-radius: 14px;
    background: linear-gradient(120deg, rgba(239, 68, 68, 0.12) 0%, rgba(239, 68, 68, 0.03) 100%);
  }

  .pbfp-gis-modal-fire {
    display: grid;
    width: 44px;
    height: 44px;
    place-items: center;
    border-radius: 13px;
    background: linear-gradient(135deg, #EF4444 0%, #DC2626 100%);
    color: #FFFFFF;
    font-size: 1.15rem;
    box-shadow: 0 8px 20px rgba(239, 68, 68, 0.35);
  }

  .pbfp-gis-modal-hero strong {
    margin-right: 0.6rem;
    color: var(--pbfp-text-primary);
    font-size: 1.1rem;
    font-weight: 850;
  }

  .pbfp-gis-status {
    display: inline-flex;
    padding: 0.24rem 0.6rem;
    border-radius: 999px;
    background: rgba(16, 185, 129, 0.2);
    color: #34D399;
    font-size: 0.68rem;
    font-weight: 850;
    text-transform: uppercase;
  }
  .pbfp-gis-status.status-closed {
    background: rgba(100, 116, 139, 0.2);
    color: #94A3B8;
  }

  .pbfp-gis-modal-hero p {
    grid-column: 2;
    margin: 0.25rem 0 0;
    color: var(--pbfp-text-muted);
    font-size: 0.76rem;
  }

  .pbfp-gis-facts {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.65rem;
    margin-top: 1rem;
  }

  .pbfp-gis-facts article {
    min-width: 0;
    padding: 0.75rem 0.85rem;
    border: 1px solid var(--pbfp-card-border);
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.03);
  }
  .pbfp-theme-light .pbfp-gis-facts article {
    background: #F8FAFC;
  }

  .pbfp-gis-facts span {
    display: block;
    margin-bottom: 0.25rem;
    color: var(--pbfp-text-muted);
    font-size: 0.66rem;
    font-weight: 800;
    letter-spacing: 0.05em;
    text-transform: uppercase;
  }

  .pbfp-gis-facts strong {
    display: block;
    overflow-wrap: anywhere;
    color: var(--pbfp-text-primary);
    font-size: 0.86rem;
    line-height: 1.35;
    font-weight: 750;
  }

  .pbfp-gis-modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.75rem;
    margin-top: 1.25rem;
    padding-top: 1.15rem;
    border-top: 1px solid var(--pbfp-card-border);
  }

  .pbfp-btn-action {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.55rem 1.05rem;
    border-radius: 10px;
    font-size: 0.82rem;
    font-weight: 800;
    text-decoration: none;
    cursor: pointer;
    transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .pbfp-btn-action.secondary {
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid var(--pbfp-card-border);
    color: var(--pbfp-text-primary);
  }
  .pbfp-btn-action.secondary:hover {
    background: rgba(255, 255, 255, 0.12);
  }

  .pbfp-btn-action.primary {
    background: linear-gradient(135deg, #EF4444 0%, #DC2626 100%);
    border: 1px solid rgba(239, 68, 68, 0.4);
    color: #FFFFFF;
    box-shadow: 0 4px 16px rgba(220, 38, 38, 0.4);
  }
  .pbfp-btn-action.primary:hover {
    transform: translateY(-1px);
    box-shadow: 0 6px 20px rgba(220, 38, 38, 0.55);
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes pbfp-live-pulse {
    0% {
      box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7);
    }
    70% {
      box-shadow: 0 0 0 8px rgba(239, 68, 68, 0);
    }
    100% {
      box-shadow: 0 0 0 0 rgba(239, 68, 68, 0);
    }
  }

  @keyframes pbfp-marker-pulse {
    0% {
      box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.5);
    }
    70% {
      box-shadow: 0 0 0 16px rgba(239, 68, 68, 0);
    }
    100% {
      box-shadow: 0 0 0 0 rgba(239, 68, 68, 0);
    }
  }

  @keyframes mbfp-ops-shimmer {
    to { background-position: -220% 0; }
  }

  @media (max-width: 900px) {
    .mbfp-ops-stats {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (max-width: 640px) {
    .mbfp-ops-root { padding: 0.85rem; }
    .mbfp-ops-toolbar { flex-direction: column; align-items: stretch; }
    .mbfp-ops-tools { justify-content: space-between; }
    .mbfp-ops-stats { grid-template-columns: 1fr; }
    .mbfp-ops-controls { flex-direction: column; align-items: stretch; }
    .pbfp-controls-left, .pbfp-controls-right { justify-content: space-between; width: 100%; }
    .mbfp-ops-map-shell, .mbfp-ops-map { min-height: 480px; }
    .mbfp-ops-footnote { flex-direction: column; align-items: flex-start; }
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
      color: inactive ? "#64748B" : "#3B82F6",
      weight: 1.5,
      dashArray: "6 6",
      fillColor: inactive ? "#64748B" : "#3B82F6",
      fillOpacity: 0.08,
      interactive: false,
    }).addTo(layer);

    L.marker(point, {
      icon: L.divIcon({
        className: "mbfp-ops-marker-wrapper",
        html: `<span class="mbfp-ops-station-pin ${inactive ? "is-inactive" : ""}"><i class="fa-solid fa-truck-fast" aria-hidden="true"></i></span>`,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      }),
    })
      .bindTooltip(
        `<strong>${station.stationName}</strong><br/>${station.municipalityName} · ${inactive ? "Inactive" : "Active"} coverage (${STATION_COVERAGE_METERS / 1000} km)`,
        { direction: "top", offset: [0, -14] },
      )
      .addTo(layer);
  });
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
          iconSize: [62, 62],
          iconAnchor: [31, 50],
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
  const { incidents, loading, checking, error, refresh } = useProvincialIncidentFeed({
    includeHistory: true,
  });

  const clusters = useMemo(() => clusterProvincialIncidents(incidents), [incidents]);
  const mapElement = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const tileLayerRef = useRef<import("leaflet").TileLayer | null>(null);
  const layerRef = useRef<import("leaflet").LayerGroup | null>(null);
  const stationLayerRef = useRef<import("leaflet").LayerGroup | null>(null);
  const leafletRef = useRef<typeof import("leaflet") | null>(null);
  const clustersRef = useRef(clusters);

  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [mapStyle, setMapStyle] = useState<MapStyle>("DARK");
  const [selectedCluster, setSelectedCluster] = useState<IncidentCluster | null>(null);
  const [selectedIncidentId, setSelectedIncidentId] = useState("");
  const [mapReady, setMapReady] = useState(false);
  const [stations, setStations] = useState<StationMarker[]>([]);
  const [view, setView] = useState<MapView>("ALL");
  const [showStations, setShowStations] = useState(true);
  const [currentTime, setCurrentTime] = useState<string>("");

  const viewRef = useRef<MapView>(view);
  const onSelectRef = useRef<(cluster: IncidentCluster) => void>((cluster) => {
    setSelectedCluster(cluster);
    setSelectedIncidentId(cluster.incidents[0]?.id ?? "");
  });

  // Digital clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          timeZoneName: "short",
        }),
      );
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    clustersRef.current = clusters;
    viewRef.current = view;
    if (leafletRef.current && mapRef.current && layerRef.current) {
      drawIncidents(
        leafletRef.current,
        mapRef.current,
        layerRef.current,
        clusters,
        (c) => onSelectRef.current(c),
        view,
      );
    }
  }, [clusters, view]);

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
        // Degrade gracefully
      }
    })();
    return () => controller.abort();
  }, []);

  // Sync station coverage markers
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

  // Update map tile style when changed
  useEffect(() => {
    const L = leafletRef.current;
    const map = mapRef.current;
    if (!L || !map || !mapReady) return;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    const cfg = MAP_TILE_CONFIG[mapStyle];
    const newTileLayer = L.tileLayer(cfg.url, {
      attribution: cfg.attribution,
      maxZoom: cfg.maxZoom,
    }).addTo(map);

    // Keep tiles at the back
    newTileLayer.bringToBack();
    tileLayerRef.current = newTileLayer;
  }, [mapStyle, mapReady]);

  // Mount Leaflet map
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

      const cfg = MAP_TILE_CONFIG[mapStyle];
      const initialTiles = L.tileLayer(cfg.url, {
        attribution: cfg.attribution,
        maxZoom: cfg.maxZoom,
      }).addTo(map);

      tileLayerRef.current = initialTiles;

      const incidentLayer = L.layerGroup().addTo(map);
      leafletRef.current = L;
      mapRef.current = map;
      layerRef.current = incidentLayer;

      drawIncidents(
        L,
        map,
        incidentLayer,
        clustersRef.current,
        (c) => onSelectRef.current(c),
        viewRef.current,
      );
      setMapReady(true);
    })();

    return () => {
      disposed = true;
      layerRef.current = null;
      stationLayerRef.current = null;
      tileLayerRef.current = null;
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

  return (
    <main className={`mbfp-ops-root ${theme === "light" ? "pbfp-theme-light" : ""}`}>
      <style>{styles}</style>
      <section className="mbfp-ops-workspace" aria-labelledby="provincial-gis-heading">
        {/* Header HUD */}
        <header className="mbfp-ops-toolbar">
          <div className="pbfp-brand-cluster">
            <div className="pbfp-insignia-box" aria-hidden="true">
              <i className="fa-solid fa-shield-halved" />
            </div>
            <div>
              <p className="mbfp-ops-eyebrow">Provincial fire operations</p>
              <h1 id="provincial-gis-heading" className="mbfp-ops-title">GIS incident map</h1>
            </div>
          </div>

          <div className="mbfp-ops-tools">
            {currentTime && (
              <div className="pbfp-clock-badge">
                <i className="fa-regular fa-clock" aria-hidden="true" />
                <span>{currentTime}</span>
              </div>
            )}

            <button
              type="button"
              className="pbfp-theme-btn"
              onClick={() => {
                const nextTheme = theme === "dark" ? "light" : "dark";
                setTheme(nextTheme);
                setMapStyle(nextTheme === "dark" ? "DARK" : "LIGHT");
              }}
              title={`Switch to ${theme === "dark" ? "Light" : "Dark"} mode`}
            >
              <i className={`fa-solid ${theme === "dark" ? "fa-sun" : "fa-moon"}`} aria-hidden="true" />
              <span>{theme === "dark" ? "Light Mode" : "Dark Ops"}</span>
            </button>

            <button
              className="mbfp-ops-refresh"
              type="button"
              onClick={() => void refresh(true)}
              disabled={checking}
            >
              <i className={`fa-solid fa-rotate-right ${checking ? "fa-spin" : ""}`} aria-hidden="true" />
              <span>{checking ? "Refreshing map" : "Live refresh"}</span>
            </button>
          </div>
        </header>

        {/* 4 Bento Tactical Stat Cards */}
        <div className="mbfp-ops-stats">
          <article className="mbfp-ops-stat is-active">
            <div className="pbfp-stat-top">
              <span className="pbfp-stat-icon">
                <i className="fa-solid fa-fire-flame-curved" aria-hidden="true" />
              </span>
              <span className="pbfp-stat-pill">
                {activeCount > 0 ? "LIVE THREATS" : "SECURED"}
              </span>
            </div>
            <span className="mbfp-ops-stat-num">{loading ? "--" : activeCount}</span>
            <span className="mbfp-ops-stat-label">Active now</span>
          </article>

          <article className="mbfp-ops-stat is-resolved">
            <div className="pbfp-stat-top">
              <span className="pbfp-stat-icon">
                <i className="fa-solid fa-shield-check" aria-hidden="true" />
              </span>
              <span className="pbfp-stat-pill">CONTAINED</span>
            </div>
            <span className="mbfp-ops-stat-num">{loading ? "--" : resolvedCount}</span>
            <span className="mbfp-ops-stat-label">Resolved</span>
          </article>

          <article className="mbfp-ops-stat is-stations">
            <div className="pbfp-stat-top">
              <span className="pbfp-stat-icon">
                <i className="fa-solid fa-truck-fast" aria-hidden="true" />
              </span>
              <span className="pbfp-stat-pill">READY FLEET</span>
            </div>
            <span className="mbfp-ops-stat-num">{activeStationCount}</span>
            <span className="mbfp-ops-stat-label">Active stations</span>
          </article>

          <article className="mbfp-ops-stat is-sites">
            <div className="pbfp-stat-top">
              <span className="pbfp-stat-icon">
                <i className="fa-solid fa-location-crosshairs" aria-hidden="true" />
              </span>
              <span className="pbfp-stat-pill">GEO-CLUSTERED</span>
            </div>
            <span className="mbfp-ops-stat-num">{clusters.length}</span>
            <span className="mbfp-ops-stat-label">Mapped sites</span>
          </article>
        </div>

        {/* Command Controls Bar */}
        <div className="mbfp-ops-controls">
          <div className="pbfp-controls-left">
            {/* Status Segmented Filter */}
            <div className="mbfp-ops-segmented" role="group" aria-label="Which incidents to show">
              {(
                [
                  ["ALL", "All"],
                  ["ACTIVE", "Active"],
                  ["HISTORY", "History"],
                ] as Array<[MapView, string]>
              ).map(([key, label]) => (
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

            {/* Map Theme Tiles Switcher */}
            <div className="pbfp-tile-segmented" role="group" aria-label="Map style">
              {(
                [
                  ["DARK", "🌑 Dark Ops"],
                  ["LIGHT", "🗺️ Clean Light"],
                  ["SATELLITE", "🛰️ Satellite"],
                ] as Array<[MapStyle, string]>
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  className={`pbfp-tile-btn${mapStyle === key ? " is-active" : ""}`}
                  onClick={() => setMapStyle(key)}
                  aria-pressed={mapStyle === key}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="pbfp-controls-right">
            {/* Municipality Fly-To Selector */}
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

            {/* Reset Zoom Button */}
            <button
              type="button"
              className="pbfp-btn-reset-view"
              onClick={handleResetView}
              title="Reset view to whole Antique province"
            >
              <i className="fa-solid fa-expand" aria-hidden="true" />
              <span>Full Province</span>
            </button>

            {/* Stations and Coverage Checkbox */}
            <label className="mbfp-ops-layer-toggle">
              <input
                type="checkbox"
                checked={showStations}
                onChange={(e) => setShowStations(e.target.checked)}
              />
              <i className="fa-solid fa-truck-fast" aria-hidden="true" />
              Stations and coverage
            </label>
          </div>
        </div>

        {/* Leaflet Map Canvas */}
        <div className="mbfp-ops-map-shell">
          <div ref={mapElement} className="mbfp-ops-map" aria-label="Provincial incident map" />
          {!mapReady && (
            <div className="mbfp-ops-map-loading" aria-label="Loading provincial incident map" />
          )}

          {/* Floating Glass Legend */}
          <aside className="mbfp-ops-legend" aria-label="What the map symbols mean">
            <span className="mbfp-ops-legend-row">
              <i className="mbfp-ops-key key-active" aria-hidden="true" />
              Active incident (Radar Pulse)
            </span>
            <span className="mbfp-ops-legend-row">
              <i className="mbfp-ops-key key-history" aria-hidden="true" />
              Resolved or closed
            </span>
            {showStations && (
              <span className="mbfp-ops-legend-row">
                <i className="mbfp-ops-key key-station" aria-hidden="true" />
                Station · {STATION_COVERAGE_METERS / 1000} km reach
              </span>
            )}
          </aside>

          {!loading && !error && incidents.length === 0 && (
            <div className="mbfp-ops-empty" role="status">
              <strong>No incidents have been reported across Antique province</strong>
              <p>The map monitors all 18 municipalities. New emergency alerts appear automatically.</p>
            </div>
          )}

          {!loading && !error && incidents.length > 0 && view === "ACTIVE" && activeCount === 0 && (
            <div className="mbfp-ops-empty" role="status">
              <strong>Nothing is burning right now</strong>
              <p>Every incident across Antique province is resolved or closed. Switch to History to view previous responses.</p>
            </div>
          )}
        </div>

        {/* Footnote Summary Bar */}
        <footer className="mbfp-ops-footnote">
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
              <span>Open active incident queue</span>
              <i className="fa-solid fa-arrow-right" aria-hidden="true" />
            </a>
          )}
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
    </main>
  );
}
