"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { FeatureCollection } from "geojson";
import type { Map as LeafletMap, LayerGroup, LatLngBounds } from "leaflet";
import "leaflet/dist/leaflet.css";
import type { ProvincialIncidentSummary } from "../../lib/intermunicipality/provincial";
import { groupAntiqueDashboardIncidents, isPointInAntique } from "../../lib/provincial-bfp/dashboard-map";
import styles from "./provincial-dashboard-incident-map.module.css";
import { SkeletonBar } from "./skeleton-loader";

type Props = {
  incidents: ProvincialIncidentSummary[];
  loading: boolean;
  error: string;
};

export function ProvincialDashboardIncidentMap({ incidents, loading, error }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const layerRef = useRef<LayerGroup | null>(null);
  const boundsRef = useRef<LatLngBounds | null>(null);
  const leafletRef = useRef<typeof import("leaflet") | null>(null);
  const focusedIncidentsRef = useRef(false);
  const [boundary, setBoundary] = useState<FeatureCollection | null>(null);
  const [ready, setReady] = useState(false);
  const [mapError, setMapError] = useState("");
  const [retry, setRetry] = useState(0);
  const locations = useMemo(() => boundary ? groupAntiqueDashboardIncidents(incidents, boundary) : [], [incidents, boundary]);
  const mappedCount = locations.reduce((count, location) => count + location.incidents.length, 0);
  const unmappedCount = incidents.length - mappedCount;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const controller = new AbortController();
    let disposed = false;
    let map: LeafletMap | null = null;
    let observer: ResizeObserver | null = null;

    void (async () => {
      try {
        const [L, response] = await Promise.all([
          import("leaflet"),
          fetch("/data/antique-boundary.geojson", { signal: controller.signal }),
        ]);
        if (!response.ok) throw new Error("Unable to load Antique's map boundary.");
        const province = await response.json() as FeatureCollection;
        if (disposed) return;
        const provinceLayer = L.geoJSON(province, {
          style: { color: "#526d85", weight: 2, fill: false },
          interactive: false,
        });
        const bounds = provinceLayer.getBounds();
        if (!bounds.isValid()) throw new Error("Antique's map boundary is unavailable.");
        map = L.map(container, { scrollWheelZoom: false, zoomSnap: 0.1, maxBounds: bounds.pad(0.06), maxBoundsViscosity: 1 });
        mapRef.current = map;
        leafletRef.current = L;
        boundsRef.current = bounds;
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
          maxZoom: 19,
        }).addTo(map);

        provinceLayer.addTo(map);
        layerRef.current = L.layerGroup().addTo(map);
        L.control.scale({ imperial: false, position: "bottomleft" }).addTo(map);
        map.setView([11.05, 122.03], 10, { animate: false });
        map.setMinZoom(map.getBoundsZoom(bounds, false, L.point(36, 36)));
        const provinceMap = map;
        let lastValidCenter = provinceMap.getCenter();
        let restoringCenter = false;
        provinceMap.on("moveend", () => {
          if (disposed || restoringCenter) return;
          const center = provinceMap.getCenter();
          if (isPointInAntique(center.lat, center.lng, province)) {
            lastValidCenter = center;
          } else {
            // Keep the map center in Antique while the surrounding tiles stay visible.
            restoringCenter = true;
            provinceMap.panTo(lastValidCenter, { animate: false });
            restoringCenter = false;
          }
        });
        observer = new ResizeObserver(() => {
          if (!map || disposed) return;
          map.invalidateSize();
          map.setMinZoom(map.getBoundsZoom(bounds, false, L.point(36, 36)));
        });
        observer.observe(container);
        setBoundary(province);
        setReady(true);
      } catch (failure) {
        if (!disposed) setMapError(failure instanceof Error ? failure.message : "Unable to load the incident map.");
      }
    })();

    return () => {
      disposed = true;
      controller.abort();
      observer?.disconnect();
      map?.remove();
      mapRef.current = null;
      layerRef.current = null;
      leafletRef.current = null;
      focusedIncidentsRef.current = false;
    };
  }, [retry]);

  useEffect(() => {
    const L = leafletRef.current;
    const layer = layerRef.current;
    const map = mapRef.current;
    if (!ready || !L || !layer || !map) return;
    if (locations.length > 0 && !focusedIncidentsRef.current) {
      focusedIncidentsRef.current = true;
      map.fitBounds(L.latLngBounds(locations.map(location => [location.latitude, location.longitude])), {
        padding: [40, 40], maxZoom: 12, animate: false,
      });
    }
    layer.clearLayers();
    for (const location of locations) {
      const icon = L.divIcon({
        className: styles.marker,
        html: `<span class="${styles.pin}"><i class="fa-solid fa-fire" aria-hidden="true"></i></span>${location.incidents.length > 1 ? `<b class="${styles.count}">${location.incidents.length}</b>` : ""}`,
        iconSize: [36, 42], iconAnchor: [18, 40], popupAnchor: [0, -38],
      });
      const popup = document.createElement("div");
      popup.className = styles.popup;
      const heading = document.createElement("strong");
      heading.textContent = `${location.incidents.length} active incident${location.incidents.length === 1 ? "" : "s"}`;
      popup.append(heading);
      for (const incident of location.incidents) {
        const link = document.createElement("a");
        link.href = `/provincial-bfp/incidents?incident=${encodeURIComponent(incident.id)}`;
        link.textContent = `${incident.referenceNumber} · ${[incident.barangay, incident.originMunicipality].filter(Boolean).join(", ")}`;
        popup.append(link);
      }
      L.marker([location.latitude, location.longitude], { icon, title: heading.textContent, alt: heading.textContent })
        .bindPopup(popup, { maxHeight: 220, maxWidth: 280 }).addTo(layer);
    }
  }, [locations, ready]);

  return (
    <section className={styles.card} aria-labelledby="provincial-dashboard-map-title">
      <header className={styles.header}>
        <div className={styles.titleRow}>
          <span className={styles.icon}><i className="fa-solid fa-map-location-dot" aria-hidden="true" /></span>
          <div>
            <h2 id="provincial-dashboard-map-title">GIS incident map</h2>
            <p>Antique province · Live incident locations</p>
          </div>
        </div>
        <div className={styles.toolbar}>
          <span className={styles.scope}><span />Antique only</span>
          <div className={styles.actions}>
            <button type="button" disabled={!ready} onClick={() => {
              focusedIncidentsRef.current = true;
              if (boundsRef.current) mapRef.current?.stop().fitBounds(boundsRef.current, { padding: [18, 18], animate: false });
            }}><i className="fa-solid fa-expand" aria-hidden="true" />Show all Antique</button>
          </div>
        </div>
      </header>
      <div className={styles.mapShell}>
        <div ref={containerRef} className={styles.canvas} aria-label="Incident map restricted to Antique province, including Caluya" />
        {!ready && !mapError && <div className={styles.loading} role="status">Loading Antique map…</div>}
        {mapError && <div className={styles.message} role="alert">
          <strong>Map unavailable</strong><p>{mapError}</p>
          <button type="button" onClick={() => { setReady(false); setMapError(""); setRetry(value => value + 1); }}>Retry map</button>
        </div>}
        {ready && !loading && !error && mappedCount === 0 && <div className={`${styles.message} ${styles.empty}`} role="status">
          <strong>{incidents.length ? "No mapped incident locations" : "No active incidents"}</strong>
          <p>{incidents.length ? "Reports will appear here when coordinates within Antique are available." : "Antique's active incidents will appear on this map."}</p>
        </div>}
      </div>
      <footer className={styles.footer}>
        <div className={styles.legend}><span /><strong>{mappedCount}</strong> mapped incident{mappedCount === 1 ? "" : "s"}
          <Link href="/provincial-bfp/gis-map">Open GIS map <i className="fa-solid fa-arrow-up-right-from-square" aria-hidden="true" /></Link>
        </div>
        <p role={error ? "alert" : "status"} className={error ? styles.error : undefined}>
          {error ? `Incident feed unavailable: ${error}` : loading ? <SkeletonBar width="14rem" height={10} style={{ display: "inline-block", verticalAlign: "middle" }} />
            : !ready ? "Preparing Antique's map boundary…"
            : unmappedCount > 0 ? `${unmappedCount} report${unmappedCount === 1 ? " has" : "s have"} no usable location within Antique.`
            : "Select a pin to view its incident reports."}
        </p>
      </footer>
    </section>
  );
}
