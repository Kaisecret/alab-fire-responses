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

const mapStyles = `
  .mbfp-map-container {
    height: 380px;
    width: 100%;
    border-radius: 14px;
    overflow: hidden;
    border: 1.5px solid #E2E8F0;
    box-shadow: inset 0 2px 6px rgba(0, 0, 0, 0.05);
    z-index: 1;
  }

  .mbfp-incident-fire-marker-wrapper {
    background: transparent;
    border: 0;
  }

  .mbfp-incident-fire-marker {
    width: 38px;
    height: 38px;
    display: grid;
    place-items: center;
  }

  .mbfp-incident-fire-marker img {
    display: block;
    width: 38px;
    height: 38px;
    object-fit: contain;
    filter: drop-shadow(0 3px 5px rgba(185, 28, 28, 0.42));
  }

  .mbfp-route-panel {
    margin-top: 0.95rem;
    background: #F8FAFC;
    border: 1.5px solid #E2E8F0;
    border-radius: 12px;
    padding: 0.85rem 1rem;
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .mbfp-route-icon-badge {
    width: 36px;
    height: 36px;
    border-radius: 8px;
    background: #EFF6FF;
    color: #2563EB;
    border: 1px solid #BFDBFE;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1rem;
    flex-shrink: 0;
  }

  .mbfp-route-text {
    font-size: 0.84rem;
    color: #1E293B;
    font-weight: 700;
    line-height: 1.45;
    margin: 0;
  }

  @media (max-width: 768px) {
    .mbfp-map-container {
      height: 290px;
    }
  }
`;

export function MunicipalIncidentMap({ incident }: IncidentMapProps) {
  const mapElement = useRef<HTMLDivElement | null>(null);
  const [routeText, setRouteText] = useState("Calculating tactical road route…");

  useEffect(() => {
    let disposed = false;
    let map: import("leaflet").Map | null = null;

    (async () => {
      const L = await import("leaflet");
      if (disposed || !mapElement.current) return;

      map = L.map(mapElement.current, { zoomControl: true }).setView(
        [incident.latitude, incident.longitude],
        15
      );

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
      }).addTo(map);

      // Match the resident map marker so BFP personnel can identify the report point at a glance.
      const incidentMarker = L.marker([incident.latitude, incident.longitude], {
        icon: L.divIcon({
          className: "mbfp-incident-fire-marker-wrapper",
          html: '<span class="mbfp-incident-fire-marker"><img src="/images/fire logo.webp" alt="" /></span>',
          iconSize: [38, 38],
          iconAnchor: [19, 38],
          popupAnchor: [0, -36],
        }),
      })
        .addTo(map)
        .bindPopup(
          `<div style="font-family: sans-serif; font-size: 12px;"><b style="color:#DC2626;">🔥 Incident Location</b><br/>${incident.landmark || "Resident Reported Site"}</div>`
        );
      incidentMarker.openPopup();

      if (incident.stationLatitude == null || incident.stationLongitude == null) {
        setRouteText("Station coordinates not configured. Incident marker displayed on map.");
        return;
      }

      // Station marker
      L.circleMarker([incident.stationLatitude, incident.stationLongitude], {
        radius: 10,
        color: "#1E3A8A",
        fillColor: "#2563EB",
        fillOpacity: 1,
        weight: 3,
      })
        .addTo(map)
        .bindPopup(
          `<div style="font-family: sans-serif; font-size: 12px;"><b style="color:#2563EB;">🚒 ${incident.stationName || "Municipal BFP Station"}</b><br/>Dispatch Origin Point</div>`
        );

      const direct: [[number, number], [number, number]] = [
        [incident.stationLatitude, incident.stationLongitude],
        [incident.latitude, incident.longitude],
      ];

      L.polyline(direct, { color: "#94A3B8", dashArray: "6 6", weight: 2.5 }).addTo(map);
      map.fitBounds(L.latLngBounds(direct).pad(0.25));

      try {
        const q = new URLSearchParams({
          fromLat: String(incident.stationLatitude),
          fromLng: String(incident.stationLongitude),
          toLat: String(incident.latitude),
          toLng: String(incident.longitude),
        });

        const response = await fetch(`/api/routes/road?${q}`);
        const data = await response.json();
        const kilometers = Number(data.directKilometers).toFixed(1);

        if (data.mode === "road" && Array.isArray(data.coordinates)) {
          L.polyline(data.coordinates, { color: "#DC2626", weight: 5, opacity: 0.9 }).addTo(map);
          setRouteText(
            `Road route: ${(data.distanceMeters / 1000).toFixed(1)} km · Est. Response Time: ~${Math.max(
              1,
              Math.round(data.durationSeconds / 60)
            )} mins (Direct: ${kilometers} km)`
          );
        } else {
          setRouteText(`Direct line: ${kilometers} km · Road routing telemetry offline.`);
        }
      } catch {
        setRouteText("Direct emergency line displayed. Real-time road routing temporarily unavailable.");
      }
    })();

    return () => {
      disposed = true;
      map?.remove();
    };
  }, [incident]);

  return (
    <>
      <style>{mapStyles}</style>
      <div>
        <div ref={mapElement} className="mbfp-map-container" aria-label="Tactical road routing map" />
        <div className="mbfp-route-panel">
          <div className="mbfp-route-icon-badge">
            <i className="fa-solid fa-route" />
          </div>
          <p className="mbfp-route-text">{routeText}</p>
        </div>
      </div>
    </>
  );
}
