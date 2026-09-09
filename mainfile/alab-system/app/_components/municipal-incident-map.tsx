"use client";

import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";

type IncidentMapProps = {
  incident: {
    latitude: number;
    longitude: number;
    stationLatitude: number | null;
    stationLongitude: number | null;
    stationName: string | null;
    landmark: string | null;
  };
};

type RouteOrigin = {
  latitude: number;
  longitude: number;
  label: string;
  isLiveDevice: boolean;
};

/**
 * Tactical device position query helper.
 * Used for live dispatch telemetry calculations while keeping map view strictly centered on the fire report site.
 */
function getCurrentMunicipalDeviceLocation(): Promise<RouteOrigin | null> {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      resolve(null);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) =>
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          label: "Municipal BFP device location",
          isLiveDevice: true,
        }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 12_000, maximumAge: 0 }
    );
  });
}

/**
 * Route guidance calculation module.
 * Retains road telemetry calculations and fallbacks without cluttering the map canvas with red polylines.
 */
async function computeTacticalRoadRoute(
  origin: RouteOrigin,
  incident: { latitude: number; longitude: number },
  mapInstance?: import("leaflet").Map | null,
  renderPolylineOnMap: boolean = false
) {
  const direct: [[number, number], [number, number]] = [
    [origin.latitude, origin.longitude],
    [incident.latitude, incident.longitude],
  ];

  const showDirectFallback = (message: string) => {
    if (renderPolylineOnMap && mapInstance) {
      // Direct fallback polyline helper if explicit visual overlay is activated
      const L = (window as unknown as { L?: typeof import("leaflet") }).L;
      if (L) {
        L.polyline(direct, { color: "#94A3B8", dashArray: "6 6", weight: 2.5 }).addTo(mapInstance);
        mapInstance.fitBounds(L.latLngBounds(direct).pad(0.25));
      }
    }
    return message;
  };

  try {
    const q = new URLSearchParams({
      fromLat: String(origin.latitude),
      fromLng: String(origin.longitude),
      toLat: String(incident.latitude),
      toLng: String(incident.longitude),
    });

    const response = await fetch(`/api/routes/road?${q}`);
    if (!response.ok) {
      return showDirectFallback("Road guidance is temporarily unavailable. Direct emergency line displayed.");
    }
    const data = await response.json();
    const kilometers = Number(data.directKilometers || 0).toFixed(1);

    if (data.mode === "road" && Array.isArray(data.coordinates)) {
      if (renderPolylineOnMap && mapInstance) {
        const L = (window as unknown as { L?: typeof import("leaflet") }).L;
        if (L) {
          L.polyline(data.coordinates, { color: "#DC2626", weight: 5, opacity: 0.9 }).addTo(mapInstance);
          mapInstance.fitBounds(L.latLngBounds(data.coordinates).pad(0.18));
        }
      }
      return `Road route active: ${(data.distanceMeters / 1000).toFixed(1)} km · Est. Response Time: ~${Math.max(
        1,
        Math.round(data.durationSeconds / 60)
      )} mins (Direct: ${kilometers} km)`;
    } else {
      return showDirectFallback(`Road guidance is temporarily unavailable. Direct distance: ${kilometers} km.`);
    }
  } catch {
    return showDirectFallback("Road guidance is temporarily unavailable. Direct emergency line displayed.");
  }
}

const mapStyles = `
  .mbfp-clean-map-wrapper {
    position: relative;
    display: flex;
    flex-direction: column;
    width: 100%;
    border-radius: 14px;
    overflow: hidden;
    border: 1px solid #E2E8F0;
    background: #FFFFFF;
    box-shadow: 0 2px 10px rgba(15, 23, 42, 0.04);
  }

  .mbfp-map-container {
    height: 380px;
    width: 100%;
    overflow: hidden;
    position: relative;
    background: #F1F5F9;
    z-index: 1;
  }

  /* Custom fire pin marker */
  .mbfp-incident-fire-marker-wrapper {
    background: transparent;
    border: 0;
  }

  .mbfp-incident-fire-marker {
    width: 60px;
    height: 60px;
    display: grid;
    place-items: center;
    border: 1.5px solid rgba(220, 38, 38, 0.44);
    border-radius: 999px;
    background: rgba(254, 242, 242, 0.4);
    box-shadow: 0 0 0 8px rgba(220, 38, 38, 0.08);
    animation: mbfpPinPulse 2.2s infinite cubic-bezier(0.24, 0, 0.38, 1);
  }

  @keyframes mbfpPinPulse {
    0% {
      transform: scale(0.95);
      box-shadow: 0 0 0 0 rgba(220, 38, 38, 0.25);
    }
    70% {
      transform: scale(1.05);
      box-shadow: 0 0 0 16px rgba(220, 38, 38, 0);
    }
    100% {
      transform: scale(0.95);
      box-shadow: 0 0 0 0 rgba(220, 38, 38, 0);
    }
  }

  .mbfp-incident-fire-pin {
    width: 32px;
    height: 32px;
    display: grid;
    place-items: center;
    border-radius: 50% 50% 50% 0;
    background: #DC2626;
    border: 2px solid #FFFFFF;
    box-shadow: 0 4px 10px rgba(185, 28, 28, 0.5);
    transform: rotate(-45deg);
  }

  .mbfp-incident-fire-pin i {
    color: #FFFFFF;
    font-size: 0.85rem;
    line-height: 1;
    transform: rotate(45deg);
  }

  /* Floating Map Toolbar */
  .mbfp-map-float-actions {
    position: absolute;
    top: 12px;
    left: 12px;
    z-index: 1000;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .mbfp-map-float-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.42rem 0.75rem;
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(8px);
    border: 1px solid #CBD5E1;
    border-radius: 8px;
    font-size: 0.76rem;
    font-weight: 700;
    color: #1E293B;
    cursor: pointer;
    box-shadow: 0 2px 6px rgba(15, 23, 42, 0.12);
    transition: all 0.15s ease;
  }

  .mbfp-map-float-btn:hover {
    background: #FFFFFF;
    border-color: #94A3B8;
    color: #0F172A;
    transform: translateY(-1px);
    box-shadow: 0 4px 10px rgba(15, 23, 42, 0.16);
  }

  .mbfp-map-float-btn i {
    color: #DC2626;
  }

  /* Map Bottom Info Bar */
  .mbfp-map-footer-bar {
    padding: 0.85rem 1.15rem;
    background: #F8FAFC;
    border-top: 1px solid #E2E8F0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.85rem;
    flex-wrap: wrap;
  }

  .mbfp-map-footer-left {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    min-width: 0;
  }

  .mbfp-map-pin-badge {
    width: 34px;
    height: 34px;
    border-radius: 8px;
    background: #FEF2F2;
    border: 1px solid #FECACA;
    color: #DC2626;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.95rem;
    flex-shrink: 0;
  }

  .mbfp-map-location-meta {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
    min-width: 0;
  }

  .mbfp-map-location-title {
    font-size: 0.84rem;
    font-weight: 750;
    color: #0F172A;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    margin: 0;
  }

  .mbfp-map-location-coords {
    font-size: 0.74rem;
    font-family: 'JetBrains Mono', monospace, sans-serif;
    color: #64748B;
    font-weight: 600;
    margin: 0;
  }

  .mbfp-map-footer-actions {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .mbfp-map-action-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.4rem 0.75rem;
    border-radius: 7px;
    font-size: 0.75rem;
    font-weight: 700;
    text-decoration: none;
    cursor: pointer;
    border: 1px solid transparent;
    transition: all 0.15s ease;
  }

  .mbfp-map-action-btn--primary {
    background: #EFF6FF;
    border-color: #BFDBFE;
    color: #1D4ED8;
  }

  .mbfp-map-action-btn--primary:hover {
    background: #DBEAFE;
    border-color: #93C5FD;
    color: #1E40AF;
  }

  .mbfp-map-action-btn--secondary {
    background: #FFFFFF;
    border-color: #E2E8F0;
    color: #475569;
  }

  .mbfp-map-action-btn--secondary:hover {
    background: #F1F5F9;
    border-color: #CBD5E1;
    color: #0F172A;
  }

  @media (max-width: 768px) {
    .mbfp-map-container {
      height: 300px;
    }
    .mbfp-map-footer-bar {
      flex-direction: column;
      align-items: flex-start;
      gap: 0.65rem;
    }
    .mbfp-map-footer-actions {
      width: 100%;
      justify-content: flex-start;
    }
  }
`;

export function MunicipalIncidentMap({ incident }: IncidentMapProps) {
  const mapElement = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<import("leaflet").Map | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let disposed = false;

    (async () => {
      const L = await import("leaflet");
      if (disposed || !mapElement.current) return;

      // Clean up previous instance if any
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      // Initialize map directly centered on the verified incident report site
      const map = L.map(mapElement.current, {
        zoomControl: true,
        attributionControl: true,
      }).setView([incident.latitude, incident.longitude], 16);

      mapInstanceRef.current = map;

      // Street Tile Layer (Standard OSM)
      const streetLayer = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
        maxZoom: 19,
      }).addTo(map);

      // Satellite Imagery (Esri World Imagery)
      const satelliteLayer = L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        {
          attribution: "Tiles &copy; Esri &mdash; Source: Esri, Maxar",
          maxZoom: 19,
        }
      );

      // Place Labels for Satellite
      const referenceLayer = L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
        {
          attribution: "Esri Reference",
          maxZoom: 19,
        }
      );

      // Layer Control (Allows switching between Street view and Satellite with labels)
      L.control
        .layers(
          { "Street Map": streetLayer, "Houses / Satellite": satelliteLayer },
          { "Place Labels": referenceLayer },
          { position: "topright" }
        )
        .addTo(map);

      // Dedicated Incident Marker: Displays ONLY the reported fire incident location pin
      const incidentMarker = L.marker([incident.latitude, incident.longitude], {
        icon: L.divIcon({
          className: "mbfp-incident-fire-marker-wrapper",
          html: '<span class="mbfp-incident-fire-marker"><span class="mbfp-incident-fire-pin"><i class="fa-solid fa-fire" aria-hidden="true"></i></span></span>',
          iconSize: [60, 60],
          iconAnchor: [30, 46],
          popupAnchor: [0, -46],
        }),
      })
        .addTo(map)
        .bindPopup(
          `<div style="font-family: system-ui, -apple-system, sans-serif; min-width: 170px; padding: 2px 0;">
            <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 5px;">
              <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #DC2626;"></span>
              <strong style="color: #991B1B; font-size: 13px;">Incident Location</strong>
            </div>
            <div style="font-size: 12px; color: #1E293B; font-weight: 600; margin-bottom: 4px;">
              ${incident.landmark ? incident.landmark.replace(/</g, "&lt;").replace(/>/g, "&gt;") : "Verified Fire Report Site"}
            </div>
            <div style="font-size: 11px; color: #64748B; font-family: monospace;">
              ${incident.latitude.toFixed(6)}, ${incident.longitude.toFixed(6)}
            </div>
          </div>`
        );

      incidentMarker.openPopup();

      // Ensure map is properly sized after DOM paint
      setTimeout(() => {
        if (!disposed && map) {
          map.invalidateSize();
        }
      }, 250);

      // Telemetry origin resolution (runs in background for distance metrics without drawing route lines)
      const stationOrigin =
        incident.stationLatitude != null && incident.stationLongitude != null
          ? {
              latitude: incident.stationLatitude,
              longitude: incident.stationLongitude,
              label: incident.stationName || "Municipal BFP station",
              isLiveDevice: false,
            }
          : null;

      const liveDeviceOrigin = await getCurrentMunicipalDeviceLocation();
      const origin = liveDeviceOrigin || stationOrigin;

      if (origin && !disposed) {
        // Keep telemetry route calculation available in background
        void computeTacticalRoadRoute(origin, incident, map, false);
      }
    })();

    return () => {
      disposed = true;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [incident.latitude, incident.longitude, incident.landmark, incident.stationLatitude, incident.stationLongitude, incident.stationName]);

  const handleRecenter = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([incident.latitude, incident.longitude], 16, {
        animate: true,
        duration: 0.8,
      });
    }
  };

  const handleCopyCoords = async () => {
    try {
      await navigator.clipboard.writeText(`${incident.latitude.toFixed(6)}, ${incident.longitude.toFixed(6)}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard fallback
    }
  };

  const gmapsDirectionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${incident.latitude},${incident.longitude}`;

  return (
    <>
      <style>{mapStyles}</style>
      <div className="mbfp-clean-map-wrapper">
        {/* Floating Controls */}
        <div className="mbfp-map-float-actions">
          <button
            type="button"
            className="mbfp-map-float-btn"
            onClick={handleRecenter}
            title="Re-center map on reported incident location"
          >
            <i className="fa-solid fa-crosshairs" aria-hidden="true" />
            <span>Center Incident</span>
          </button>
        </div>

        {/* Leaflet Canvas: Shows ONLY the report location */}
        <div
          ref={mapElement}
          className="mbfp-map-container"
          aria-label="Report location map"
        />

        {/* Clean Info Strip */}
        <div className="mbfp-map-footer-bar">
          <div className="mbfp-map-footer-left">
            <div className="mbfp-map-pin-badge">
              <i className="fa-solid fa-location-dot" aria-hidden="true" />
            </div>
            <div className="mbfp-map-location-meta">
              <h4 className="mbfp-map-location-title">
                {incident.landmark || "Reported Fire Site"}
              </h4>
              <p className="mbfp-map-location-coords">
                {incident.latitude.toFixed(6)}, {incident.longitude.toFixed(6)}
              </p>
            </div>
          </div>

          <div className="mbfp-map-footer-actions">
            <button
              type="button"
              className="mbfp-map-action-btn mbfp-map-action-btn--secondary"
              onClick={handleCopyCoords}
              title="Copy GPS coordinates to clipboard"
            >
              <i className={`fa-solid ${copied ? "fa-check" : "fa-copy"}`} aria-hidden="true" />
              <span>{copied ? "Copied!" : "Copy GPS"}</span>
            </button>

            <a
              href={gmapsDirectionsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mbfp-map-action-btn mbfp-map-action-btn--primary"
              title="Open turn-by-turn navigation in Google Maps"
            >
              <i className="fa-solid fa-diamond-turn-right" aria-hidden="true" />
              <span>Directions</span>
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
