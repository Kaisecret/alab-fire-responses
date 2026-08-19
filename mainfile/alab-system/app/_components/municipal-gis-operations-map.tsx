"use client";

import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import { MunicipalIncident, useMunicipalIncidentFeed } from "./use-municipal-incident-feed";

const DEFAULT_MAP_CENTER: [number, number] = [10.75, 121.94];

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

const styles = `
  .mbfp-ops-root { min-height: 100dvh; padding: clamp(1rem, 2vw, 1.75rem); background: #eef5fd; color: #0f172a; }
  .mbfp-ops-workspace { width: min(100%, 1440px); margin: 0 auto; }
  .mbfp-ops-toolbar { display: flex; align-items: end; justify-content: space-between; gap: 1rem; margin-bottom: 1rem; }
  .mbfp-ops-eyebrow { display: inline-flex; align-items: center; gap: .5rem; margin: 0 0 .35rem; color: #b91c1c; font-size: .73rem; font-weight: 800; letter-spacing: .09em; text-transform: uppercase; }
  .mbfp-ops-eyebrow::before { width: .55rem; height: .55rem; border-radius: 999px; background: #dc2626; box-shadow: 0 0 0 4px rgba(220,38,38,.12); content: ""; }
  .mbfp-ops-title { margin: 0; font-size: clamp(1.75rem, 3vw, 2.75rem); line-height: 1; letter-spacing: -.045em; font-weight: 800; }
  .mbfp-ops-subtitle { max-width: 60ch; margin: .55rem 0 0; color: #5f718d; font-size: .96rem; line-height: 1.55; }
  .mbfp-ops-tools { display: flex; align-items: center; justify-content: flex-end; gap: .75rem; flex-wrap: wrap; }
  .mbfp-ops-live { display: inline-flex; align-items: center; gap: .5rem; min-height: 2.75rem; color: #0f766e; font-size: .86rem; font-weight: 750; }
  .mbfp-ops-live-dot { width: .5rem; height: .5rem; border-radius: 999px; background: #10b981; box-shadow: 0 0 0 0 rgba(16,185,129,.38); animation: mbfp-ops-pulse 1.9s ease-out infinite; }
  .mbfp-ops-refresh { display: inline-flex; align-items: center; justify-content: center; gap: .55rem; min-height: 2.8rem; padding: .65rem .9rem; border: 1px solid #cfdced; border-radius: 10px; background: #fff; color: #25354f; font: inherit; font-size: .88rem; font-weight: 750; cursor: pointer; box-shadow: 0 8px 20px rgba(42,68,110,.07); transition: background 160ms ease, border-color 160ms ease, transform 160ms ease; }
  .mbfp-ops-refresh:hover:not(:disabled) { border-color: #94a3b8; background: #f8fafc; }
  .mbfp-ops-refresh:active:not(:disabled) { transform: translateY(1px); }
  .mbfp-ops-refresh:disabled { color: #94a3b8; cursor: wait; }
  .mbfp-ops-map-shell { position: relative; overflow: hidden; min-height: min(680px, calc(100dvh - 225px)); border: 1px solid #d7e3f1; border-radius: 18px; background: #dbeafe; box-shadow: 0 22px 48px rgba(54,78,110,.14); }
  .mbfp-ops-map { width: 100%; min-height: min(680px, calc(100dvh - 225px)); }
  .mbfp-ops-map .leaflet-control-zoom a { width: 2.25rem; height: 2.25rem; line-height: 2.1rem; color: #1e293b; border-color: #d7e3f1; }
  .mbfp-ops-map .leaflet-popup-content-wrapper, .mbfp-ops-map .leaflet-popup-tip { box-shadow: 0 12px 28px rgba(36,56,85,.2); }
  .mbfp-ops-map .leaflet-popup-content { margin: .9rem 1rem; }
  .mbfp-ops-marker-wrapper { background: transparent; border: 0; }
  .mbfp-ops-marker-ring { display: grid; width: 58px; height: 58px; place-items: center; border: 1px solid rgba(220,38,38,.42); border-radius: 999px; background: rgba(254,242,242,.45); box-shadow: 0 0 0 8px rgba(220,38,38,.1); }
  .mbfp-ops-fire-marker { display: grid; width: 32px; height: 32px; place-items: center; border: 2px solid #fff; border-radius: 50% 50% 50% 0; background: #dc2626; box-shadow: 0 5px 12px rgba(153,27,27,.48); transform: rotate(-45deg); }
  .mbfp-ops-fire-marker i { color: #fff; font-size: .82rem; transform: rotate(45deg); }
  .mbfp-ops-empty { position: absolute; z-index: 420; left: 50%; top: 50%; width: min(31rem, calc(100% - 2rem)); padding: 1.1rem 1.25rem; border: 1px solid rgba(255,255,255,.8); border-radius: 14px; background: rgba(255,255,255,.94); color: #334155; text-align: center; transform: translate(-50%,-50%); box-shadow: 0 18px 42px rgba(45,65,89,.18); }
  .mbfp-ops-empty strong { display: block; margin-bottom: .32rem; color: #0f172a; font-size: 1rem; }
  .mbfp-ops-empty p { margin: 0; font-size: .9rem; line-height: 1.45; }
  .mbfp-ops-map-loading { position: absolute; inset: 0; background: linear-gradient(105deg,#d9e5f1 20%,#edf4fb 38%,#d9e5f1 55%); background-size: 220% 100%; animation: mbfp-ops-shimmer 1.35s linear infinite; }
  .mbfp-ops-footnote { display: grid; grid-template-columns: minmax(0,1fr) auto; gap: 1rem; align-items: center; margin-top: .8rem; color: #61718a; font-size: .85rem; line-height: 1.45; }
  .mbfp-ops-summary { display: inline-flex; align-items: baseline; gap: .55rem; color: #1e293b; }
  .mbfp-ops-summary strong { color: #dc2626; font-size: 1.08rem; }
  .mbfp-ops-error { color: #b91c1c; font-weight: 700; }
  .mbfp-ops-queue-link { color: #b91c1c; font-weight: 800; text-decoration: none; }
  .mbfp-ops-queue-link:hover { text-decoration: underline; }
  @keyframes mbfp-ops-pulse { 0% { box-shadow: 0 0 0 0 rgba(16,185,129,.38); } 75%,100% { box-shadow: 0 0 0 7px rgba(16,185,129,0); } }
  @keyframes mbfp-ops-shimmer { to { background-position: -220% 0; } }
  @media (max-width: 720px) { .mbfp-ops-root { padding: 1rem; } .mbfp-ops-toolbar { align-items: stretch; flex-direction: column; } .mbfp-ops-tools { justify-content: space-between; } .mbfp-ops-refresh { flex: 1; } .mbfp-ops-map-shell,.mbfp-ops-map { min-height: min(520px, calc(100dvh - 265px)); } .mbfp-ops-footnote { grid-template-columns: 1fr; gap: .35rem; } }
  @media (prefers-reduced-motion: reduce) { .mbfp-ops-live-dot,.mbfp-ops-map-loading { animation: none; } .mbfp-ops-refresh { transition: none; } }
`;

function escapeHtml(value: string) {
  const entities: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" };
  return value.replace(/[&<>'"]/g, (character) => entities[character] || character);
}

function readableStatus(status: string) {
  return status.toLowerCase().split("_").map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
}

function formatReportedAt(timestamp: string) {
  const date = new Date(timestamp);
  return Number.isNaN(date.getTime()) ? "Time unavailable" : new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function drawIncidents(
  L: typeof import("leaflet"),
  map: import("leaflet").Map,
  layer: import("leaflet").LayerGroup,
  incidents: MunicipalIncident[],
  municipality: string
) {
  layer.clearLayers();
  const points: [number, number][] = [];

  incidents.forEach((incident) => {
    if (!Number.isFinite(incident.latitude) || !Number.isFinite(incident.longitude)) return;
    const point: [number, number] = [incident.latitude, incident.longitude];
    points.push(point);

    const location = [incident.barangay, incident.landmark].filter(Boolean).join(" · ") || "Resident reported location";
    const marker = L.marker(point, {
      icon: L.divIcon({
        className: "mbfp-ops-marker-wrapper",
        html: '<span class="mbfp-ops-marker-ring"><span class="mbfp-ops-fire-marker"><i class="fa-solid fa-fire" aria-hidden="true"></i></span></span>',
        iconSize: [58, 58], iconAnchor: [29, 48], popupAnchor: [0, -48],
      }),
    });

    marker.bindPopup(
      `<section style="min-width:190px;font-family:Arial,sans-serif;color:#0f172a;">
        <p style="margin:0 0 5px;color:#dc2626;font-size:11px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;">Active incident</p>
        <strong style="display:block;font-size:14px;line-height:1.35;">${escapeHtml(incident.referenceNumber)}</strong>
        <p style="margin:6px 0 0;font-size:12px;line-height:1.45;color:#475569;">${escapeHtml(location)}</p>
        <p style="margin:6px 0 0;font-size:12px;line-height:1.45;color:#475569;">${escapeHtml(readableStatus(incident.status))} · ${escapeHtml(formatReportedAt(incident.submittedAt))}</p>
        <a href="/municipal-bfp/active-incidents" style="display:inline-block;margin-top:10px;color:#b91c1c;font-size:12px;font-weight:800;text-decoration:none;">Open incident queue</a>
      </section>`
    );
    marker.addTo(layer);
  });

  if (points.length === 1) {
    map.setView(points[0], 15, { animate: false });
  } else if (points.length > 1) {
    map.fitBounds(L.latLngBounds(points), { padding: [72, 72], maxZoom: 15, animate: false });
  } else {
    map.setView(MUNICIPAL_CENTERS[municipality] || DEFAULT_MAP_CENTER, 13, { animate: false });
  }
}

export function MunicipalGisOperationsMap() {
  const { municipality, incidents, loading, checking, refreshing, error, lastCheckedAt, refresh } = useMunicipalIncidentFeed();
  const mapElement = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const layerRef = useRef<import("leaflet").LayerGroup | null>(null);
  const leafletRef = useRef<typeof import("leaflet") | null>(null);
  const incidentsRef = useRef(incidents);
  const municipalityRef = useRef(municipality);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    incidentsRef.current = incidents;
    municipalityRef.current = municipality;
    if (leafletRef.current && mapRef.current && layerRef.current) drawIncidents(leafletRef.current, mapRef.current, layerRef.current, incidents, municipality);
  }, [incidents, municipality]);

  useEffect(() => {
    let disposed = false;
    let map: import("leaflet").Map | null = null;
    (async () => {
      const L = await import("leaflet");
      if (disposed || !mapElement.current) return;
      map = L.map(mapElement.current, { zoomControl: false, attributionControl: true }).setView(DEFAULT_MAP_CENTER, 10);
      L.control.zoom({ position: "bottomright" }).addTo(map);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "© OpenStreetMap contributors", maxZoom: 19 }).addTo(map);
      const incidentLayer = L.layerGroup().addTo(map);
      leafletRef.current = L;
      mapRef.current = map;
      layerRef.current = incidentLayer;
      drawIncidents(L, map, incidentLayer, incidentsRef.current, municipalityRef.current);
      setMapReady(true);
    })();
    return () => {
      disposed = true;
      layerRef.current = null;
      leafletRef.current = null;
      mapRef.current = null;
      map?.remove();
    };
  }, []);

  const updatedLabel = checking ? "Refreshing live incident data…" : lastCheckedAt ? `Last checked ${new Intl.DateTimeFormat("en-PH", { timeStyle: "medium" }).format(lastCheckedAt)}` : "Connecting to the live incident feed…";
  const stationName = municipality || "your assigned municipality";

  return (
    <main className="mbfp-ops-root">
      <style>{styles}</style>
      <section className="mbfp-ops-workspace" aria-labelledby="municipal-gis-heading">
        <header className="mbfp-ops-toolbar">
          <div>
            <p className="mbfp-ops-eyebrow">Municipal live operations</p>
            <h1 id="municipal-gis-heading" className="mbfp-ops-title">GIS incident map</h1>
            <p className="mbfp-ops-subtitle">Live active reports in {stationName}. Select a fire marker to review the incident context, then open the queue to respond.</p>
          </div>
          <div className="mbfp-ops-tools">
            <span className="mbfp-ops-live" aria-live="polite"><span className="mbfp-ops-live-dot" aria-hidden="true" />{updatedLabel}</span>
            <button className="mbfp-ops-refresh" type="button" onClick={() => void refresh(true)} disabled={refreshing}><i className="fa-solid fa-rotate-right" aria-hidden="true" />{refreshing ? "Refreshing" : "Refresh map"}</button>
          </div>
        </header>

        <div className="mbfp-ops-map-shell">
          <div ref={mapElement} className="mbfp-ops-map" aria-label="Municipal incident map" />
          {!mapReady && <div className="mbfp-ops-map-loading" aria-label="Loading municipal incident map" />}
          {!loading && !error && incidents.length === 0 && <div className="mbfp-ops-empty" role="status"><strong>No active incidents in your assigned municipality</strong><p>The map is centered on {stationName} and will update automatically when a new report arrives.</p></div>}
        </div>

        <footer className="mbfp-ops-footnote">
          <span className="mbfp-ops-summary"><strong>{incidents.length}</strong>{incidents.length === 1 ? "active incident plotted" : "active incidents plotted"} for {stationName}.</span>
          {error ? <span className="mbfp-ops-error" role="alert">{error}</span> : <a className="mbfp-ops-queue-link" href="/municipal-bfp/active-incidents">Open active incident queue</a>}
        </footer>
      </section>
    </main>
  );
}
