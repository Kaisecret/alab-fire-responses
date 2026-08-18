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

function getCurrentMunicipalDeviceLocation(): Promise<RouteOrigin | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) =>
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          label: "your current device location",
          isLiveDevice: true,
        }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 12_000, maximumAge: 0 }
    );
  });
}

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
    width: 60px;
    height: 60px;
    display: grid;
    place-items: center;
    border: 1.5px solid rgba(220, 38, 38, 0.44);
    border-radius: 999px;
    background: rgba(254, 242, 242, 0.38);
    box-shadow: 0 0 0 8px rgba(220, 38, 38, 0.08);
  }

  .mbfp-incident-fire-pin {
    width: 32px;
    height: 32px;
    display: grid;
    place-items: center;
    border-radius: 50% 50% 50% 0;
    background: #DC2626;
    border: 2px solid #FFFFFF;
    box-shadow: 0 4px 9px rgba(185, 28, 28, 0.46);
    transform: rotate(-45deg);
  }

  .mbfp-incident-fire-pin i {
    color: #FFFFFF;
    font-size: 0.8rem;
    line-height: 1;
    transform: rotate(45deg);
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
          html: '<span class="mbfp-incident-fire-marker"><span class="mbfp-incident-fire-pin"><i class="fa-solid fa-fire" aria-hidden="true"></i></span></span>',
          iconSize: [60, 60],
          iconAnchor: [30, 46],
          popupAnchor: [0, -46],
        }),
      })
        .addTo(map)
        .bindPopup(
          `<div style="font-family: sans-serif; font-size: 12px;"><b style="color:#DC2626;">🔥 Incident Location</b><br/>${incident.landmark || "Resident Reported Site"}</div>`
        );
      incidentMarker.openPopup();

      const stationOrigin =
        incident.stationLatitude != null && incident.stationLongitude != null
          ? {
              latitude: incident.stationLatitude,
              longitude: incident.stationLongitude,
              label: incident.stationName || "Municipal BFP station",
              isLiveDevice: false,
            }
          : null;

      setRouteText("Locating the Municipal BFP device for road guidance…");
      const liveDeviceOrigin = await getCurrentMunicipalDeviceLocation();
      if (disposed || !map) return;

      const origin = liveDeviceOrigin || stationOrigin;
      if (!origin) {
        setRouteText("Allow device location to create a road route. Station coordinates are not configured.");
        return;
      }

      // Station marker
      const originMarker = L.circleMarker([origin.latitude, origin.longitude], {
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

      if (origin.isLiveDevice) {
        originMarker.setPopupContent(
          '<div style="font-family: sans-serif; font-size: 12px;"><b style="color:#2563EB;">Municipal BFP device location</b><br/>Live dispatch origin</div>'
        );
      }

      const direct: [[number, number], [number, number]] = [
        [origin.latitude, origin.longitude],
        [incident.latitude, incident.longitude],
      ];
      const showDirectFallback = (message: string) => {
        L.polyline(direct, { color: "#94A3B8", dashArray: "6 6", weight: 2.5 }).addTo(map!);
        map!.fitBounds(L.latLngBounds(direct).pad(0.25));
        setRouteText(message);
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
          showDirectFallback("Road guidance is temporarily unavailable. Direct emergency line displayed.");
          return;
        }
        const data = await response.json();
        const kilometers = Number(data.directKilometers).toFixed(1);

        if (data.mode === "road" && Array.isArray(data.coordinates)) {
          L.polyline(data.coordinates, { color: "#DC2626", weight: 5, opacity: 0.9 }).addTo(map);
          map.fitBounds(L.latLngBounds(data.coordinates).pad(0.18));
          setRouteText(
            `Road route active: ${(data.distanceMeters / 1000).toFixed(1)} km · Est. Response Time: ~${Math.max(
              1,
              Math.round(data.durationSeconds / 60)
            )} mins (Direct: ${kilometers} km)`
          );
        } else {
          showDirectFallback(`Road guidance is temporarily unavailable. Direct distance: ${kilometers} km.`);
        }
      } catch {
        showDirectFallback("Road guidance is temporarily unavailable. Direct emergency line displayed.");
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
