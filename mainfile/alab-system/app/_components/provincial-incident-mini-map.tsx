"use client";

import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";

const OSM_TILE_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const SATELLITE_TILE_URL =
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";

/**
 * Where the fire is, for a provincial officer reading a report.
 *
 * A pair of decimal coordinates is a fact about a place without being a
 * picture of one: it cannot be judged against the coast, the road or the
 * barangay around it. The province decides which municipalities to send from
 * that judgement, so the report shows the ground rather than the numbers.
 */
export function ProvincialIncidentMiniMap({
  latitude,
  longitude,
  label,
  landmark,
}: {
  latitude: number;
  longitude: number;
  label: string;
  landmark?: string | null;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [satellite, setSatellite] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    let map: import("leaflet").Map | null = null;
    let cancelled = false;

    void (async () => {
      try {
        const leaflet = (await import("leaflet")).default;
        if (cancelled || !containerRef.current) return;

        map = leaflet.map(containerRef.current, {
          center: [latitude, longitude],
          zoom: 16,
          scrollWheelZoom: false,
          attributionControl: false,
        });

        leaflet
          .tileLayer(satellite ? SATELLITE_TILE_URL : OSM_TILE_URL, { maxZoom: 19 })
          .addTo(map);

        // Custom incident marker with the official ALAB fire logo and radiant pulse beacon
        const incidentIcon = leaflet.divIcon({
          className: "pmm-marker-wrap",
          html: `
            <div class="pmm-marker-pulse" aria-hidden="true"></div>
            <div class="pmm-marker-pin" aria-hidden="true">
              <img
                src="/images/fire logo.webp"
                alt="Fire Incident Location"
                class="pmm-marker-fire-img"
              />
            </div>
          `,
          iconSize: [44, 44],
          iconAnchor: [22, 22],
          popupAnchor: [0, -22],
        });

        leaflet
          .marker([latitude, longitude], { icon: incidentIcon })
          .addTo(map)
          .bindPopup(`<strong>${label}</strong>${landmark ? `<br/>${landmark}` : ""}`);

        // A ring for the immediate surroundings, which is what a commander
        // reads to judge how close the next structure is.
        leaflet
          .circle([latitude, longitude], {
            radius: 120,
            color: "#DC2626",
            weight: 1.5,
            fillColor: "#DC2626",
            fillOpacity: 0.08,
          })
          .addTo(map);

        // The container is sized by the dialog around it, which settles after
        // this runs.
        window.setTimeout(() => map?.invalidateSize(), 60);
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();

    return () => {
      cancelled = true;
      map?.remove();
    };
  }, [latitude, longitude, label, landmark, satellite]);

  if (failed) {
    return (
      <div className="pmm-fallback">
        <img
          src="/images/fire logo.webp"
          alt="Fire"
          style={{ width: 28, height: 28, objectFit: "contain" }}
        />
        <span>The map could not load. The coordinates are below.</span>
      </div>
    );
  }

  return (
    <div className="pmm-wrap">
      <div ref={containerRef} className="pmm-canvas" />
      <div className="pmm-controls">
        <button
          type="button"
          className={`pmm-layer${satellite ? " is-on" : ""}`}
          onClick={() => setSatellite((current) => !current)}
        >
          <i className="fa-solid fa-layer-group" />
          {satellite ? "Street" : "Satellite"}
        </button>
        <a
          className="pmm-layer"
          href={`https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`}
          target="_blank"
          rel="noreferrer"
        >
          <i className="fa-solid fa-arrow-up-right-from-square" />
          Open
        </a>
      </div>
      <div className="pmm-coords">
        {latitude.toFixed(5)}, {longitude.toFixed(5)}
      </div>
    </div>
  );
}

export const provincialMiniMapStyles = `
  .pmm-wrap {
    position: relative;
    border-radius: 12px;
    overflow: hidden;
    border: 1px solid #E2E8F0;
    background: #EEF2F7;
  }
  .pmm-canvas { height: 260px; width: 100%; }
  .pmm-controls {
    position: absolute;
    top: 10px;
    right: 10px;
    z-index: 500;
    display: flex;
    gap: 0.35rem;
  }
  .pmm-layer {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.35rem 0.6rem;
    border-radius: 8px;
    border: 1px solid #E2E8F0;
    background: rgba(255, 255, 255, 0.95);
    color: #334155;
    font-size: 0.7rem;
    font-weight: 700;
    cursor: pointer;
    text-decoration: none;
    box-shadow: 0 2px 8px rgba(15, 23, 42, 0.12);
  }
  .pmm-layer:hover { background: #FFFFFF; color: #0F172A; }
  .pmm-layer.is-on { background: #0F172A; color: #FFFFFF; border-color: #0F172A; }
  .pmm-coords {
    position: absolute;
    left: 10px;
    bottom: 10px;
    z-index: 500;
    padding: 0.3rem 0.55rem;
    border-radius: 7px;
    background: rgba(15, 23, 42, 0.82);
    color: #FFFFFF;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 0.68rem;
    font-weight: 700;
  }
  .pmm-fallback {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.65rem;
    height: 140px;
    border-radius: 12px;
    border: 1px dashed #CBD5E1;
    background: #F8FAFC;
    color: #64748B;
    font-size: 0.8rem;
  }

  /* Custom Incident Map Marker with Official Fire Logo and Radar Pulse */
  .leaflet-div-icon.pmm-marker-wrap {
    background: transparent !important;
    border: none !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
  }
  .pmm-marker-pulse {
    position: absolute;
    width: 52px;
    height: 52px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(239, 68, 68, 0.4) 0%, rgba(220, 38, 38, 0.12) 65%, transparent 100%);
    border: 1.5px solid rgba(220, 38, 38, 0.7);
    animation: pmmPulseRing 2.2s infinite cubic-bezier(0.24, 0, 0.38, 1);
    pointer-events: none;
  }
  @keyframes pmmPulseRing {
    0% {
      transform: scale(0.5);
      opacity: 1;
    }
    70% {
      transform: scale(1.7);
      opacity: 0.2;
    }
    100% {
      transform: scale(2.1);
      opacity: 0;
    }
  }
  .pmm-marker-pin {
    position: relative;
    width: 38px;
    height: 38px;
    border-radius: 50%;
    background: #FFFFFF;
    border: 2.5px solid #DC2626;
    box-shadow: 0 4px 14px rgba(220, 38, 38, 0.55), 0 2px 6px rgba(0, 0, 0, 0.25);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s ease;
    z-index: 2;
  }
  .pmm-marker-pin:hover {
    transform: scale(1.18);
    box-shadow: 0 6px 20px rgba(220, 38, 38, 0.75), 0 2px 8px rgba(0, 0, 0, 0.35);
  }
  .pmm-marker-fire-img {
    width: 24px;
    height: 24px;
    object-fit: contain;
    display: block;
    filter: drop-shadow(0 2px 4px rgba(220, 38, 38, 0.45));
    animation: pmmFlameBreathe 1.8s ease-in-out infinite alternate;
  }
  @keyframes pmmFlameBreathe {
    0% {
      transform: scale(0.95);
      filter: drop-shadow(0 1px 3px rgba(220, 38, 38, 0.4));
    }
    100% {
      transform: scale(1.08);
      filter: drop-shadow(0 3px 8px rgba(239, 68, 68, 0.75));
    }
  }
`;
