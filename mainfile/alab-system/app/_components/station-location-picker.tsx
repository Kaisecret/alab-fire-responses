"use client";

import "leaflet/dist/leaflet.css";

import { useEffect, useRef, useState } from "react";
import type { Map as LeafletMap, Marker } from "leaflet";

type PlacedStation = { stationName: string; latitude: number; longitude: number; status: string };

const ANTIQUE_CENTER: [number, number] = [10.75, 121.94];
const OSM_TILE_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
// "10.744500, 121.942300" as Google Maps copies it.
const COORDINATE_PAIR = /^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/;

/** The pin when both values are numbers inside the Philippines, the range the stations API accepts. */
export function parseStationPosition(latitude: string, longitude: string): [number, number] | null {
  const lat = Number(latitude);
  const lng = Number(longitude);
  return Number.isFinite(lat) && Number.isFinite(lng) && lat >= 4 && lat <= 22 && lng >= 116 && lng <= 127 ? [lat, lng] : null;
}

export function StationLocationPicker({
  latitude,
  longitude,
  setLatitude,
  setLongitude,
  stations,
  disabled,
}: {
  latitude: string;
  longitude: string;
  setLatitude: (value: string) => void;
  setLongitude: (value: string) => void;
  stations: PlacedStation[];
  disabled?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const leafletRef = useRef<typeof import("leaflet") | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState("");

  const position = parseStationPosition(latitude, longitude);
  const pinLat = position?.[0];
  const pinLng = position?.[1];
  const typedBoth = latitude.trim() !== "" && longitude.trim() !== "";

  useEffect(() => {
    let active = true;
    void import("leaflet").then(({ default: L }) => {
      if (!active || !containerRef.current || mapRef.current) return;
      const first = stations.find((station) => station.status === "ACTIVE");
      const start = parseStationPosition(latitude, longitude) ?? (first ? [first.latitude, first.longitude] as [number, number] : ANTIQUE_CENTER);
      const map = L.map(containerRef.current, { center: start, zoom: first ? 14 : 11 });
      L.tileLayer(OSM_TILE_URL, {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);
      // Existing stations as dots, so the new pin is placed with them in view.
      stations.forEach((station) => {
        const label = document.createElement("span");
        label.textContent = station.stationName.split(" · Head:")[0];
        L.circleMarker([station.latitude, station.longitude], {
          radius: 6,
          color: "#FFFFFF",
          weight: 2,
          fillColor: station.status === "ACTIVE" ? "#2563EB" : "#94A3B8",
          fillOpacity: 1,
        }).bindTooltip(label, { direction: "top" }).addTo(map);
      });
      map.on("click", (event) => {
        setLatitude(event.latlng.lat.toFixed(6));
        setLongitude(event.latlng.lng.toFixed(6));
      });
      mapRef.current = map;
      leafletRef.current = L;
      setMapReady(true);
      // The modal slides in, so measure again once it has settled.
      window.setTimeout(() => map.invalidateSize(), 300);
    });
    return () => {
      active = false;
      mapRef.current?.remove();
      mapRef.current = null;
      markerRef.current = null;
      leafletRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- built once; later pin moves go through the effect below
  }, []);

  useEffect(() => {
    const L = leafletRef.current;
    const map = mapRef.current;
    if (!mapReady || !L || !map) return;
    if (pinLat === undefined || pinLng === undefined) {
      markerRef.current?.remove();
      markerRef.current = null;
      return;
    }
    if (markerRef.current) {
      markerRef.current.setLatLng([pinLat, pinLng]);
    } else {
      const marker = L.marker([pinLat, pinLng], {
        draggable: true,
        icon: L.divIcon({
          className: "sloc-pin-wrap",
          html: '<span class="sloc-pin" aria-hidden="true"><i class="fa-solid fa-building-shield"></i></span>',
          iconSize: [38, 38],
          iconAnchor: [19, 36],
        }),
      }).addTo(map);
      marker.on("dragend", () => {
        const point = marker.getLatLng();
        setLatitude(point.lat.toFixed(6));
        setLongitude(point.lng.toFixed(6));
      });
      markerRef.current = marker;
    }
    if (!map.getBounds().contains([pinLat, pinLng])) map.setView([pinLat, pinLng], Math.max(map.getZoom(), 16));
  }, [mapReady, pinLat, pinLng, setLatitude, setLongitude]);

  const typeCoordinate = (value: string, set: (value: string) => void) => {
    const pair = value.match(COORDINATE_PAIR);
    if (pair) {
      setLatitude(pair[1]);
      setLongitude(pair[2]);
    } else {
      set(value);
    }
  };

  const locateMe = () => {
    if (!navigator.geolocation) {
      setLocateError("This browser cannot share its location. Click the map instead.");
      return;
    }
    setLocating(true);
    setLocateError("");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setLocating(false);
        setLatitude(coords.latitude.toFixed(6));
        setLongitude(coords.longitude.toFixed(6));
      },
      () => {
        setLocating(false);
        setLocateError("Location was not shared. Click the map instead.");
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  };

  const hint = locateError
    ? { tone: "error", icon: "fa-circle-exclamation", text: locateError }
    : position
      ? { tone: "ok", icon: "fa-circle-check", text: "Pin set. Drag it or click the map to adjust." }
      : typedBoth
        ? { tone: "error", icon: "fa-circle-exclamation", text: "Use coordinates inside the Philippines (latitude 4 to 22, longitude 116 to 127)." }
        : { tone: "", icon: "fa-circle-info", text: "Click the map, drag the pin, or paste coordinates from Google Maps." };

  return (
    <div className="mbfp-form-group">
      <style>{pickerStyles}</style>
      <div className="sloc-label-row">
        <label htmlFor="modal-station-lat">
          Station Location <span className="mbfp-required">*</span>
        </label>
        <button type="button" className="sloc-locate-btn" onClick={locateMe} disabled={disabled || locating}>
          <i className={`fa-solid ${locating ? "fa-circle-notch fa-spin" : "fa-location-crosshairs"}`} />
          <span>{locating ? "Locating…" : "Use my location"}</span>
        </button>
      </div>

      <div className="sloc-map-wrap">
        <div ref={containerRef} className="sloc-map" role="region" aria-label="Station location map" />
        {!position && (
          <div className="sloc-map-tip" aria-hidden="true">
            <i className="fa-solid fa-hand-pointer" /> Click the map to drop the pin
          </div>
        )}
      </div>

      <div className="sloc-inputs">
        <div className="sloc-field">
          <span className="sloc-prefix">LAT</span>
          <input
            id="modal-station-lat"
            required
            type="text"
            inputMode="decimal"
            autoComplete="off"
            className="mbfp-form-input sloc-input"
            placeholder="10.744500"
            aria-label="Latitude"
            value={latitude}
            onChange={(e) => typeCoordinate(e.target.value, setLatitude)}
            disabled={disabled}
          />
        </div>
        <div className="sloc-field">
          <span className="sloc-prefix">LNG</span>
          <input
            id="modal-station-lng"
            required
            type="text"
            inputMode="decimal"
            autoComplete="off"
            className="mbfp-form-input sloc-input"
            placeholder="121.942300"
            aria-label="Longitude"
            value={longitude}
            onChange={(e) => typeCoordinate(e.target.value, setLongitude)}
            disabled={disabled}
          />
        </div>
      </div>

      <p className={`sloc-hint ${hint.tone}`} role="status">
        <i className={`fa-solid ${hint.icon}`} /> {hint.text}
      </p>
    </div>
  );
}

const pickerStyles = `
  .sloc-label-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
  }

  .sloc-locate-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
    padding: 0.45rem 0.8rem;
    border: 1.5px solid #FECACA;
    border-radius: 999px;
    background: #FEF2F2;
    color: #B91C1C;
    font: inherit;
    font-size: 0.8rem;
    font-weight: 700;
    cursor: pointer;
    transition: background 0.15s, border-color 0.15s;
  }

  .sloc-locate-btn:hover:not(:disabled) {
    background: #FEE2E2;
    border-color: #FCA5A5;
  }

  .sloc-locate-btn:disabled {
    opacity: 0.6;
    cursor: default;
  }

  .sloc-map-wrap {
    position: relative;
    border: 1.5px solid #CBD5E1;
    border-radius: 12px;
    overflow: hidden;
  }

  .sloc-map {
    height: 230px;
    width: 100%;
    background: #F1F5F9;
    cursor: crosshair;
  }

  .sloc-map-tip {
    position: absolute;
    left: 50%;
    bottom: 12px;
    transform: translateX(-50%);
    z-index: 500;
    padding: 0.45rem 0.85rem;
    border-radius: 999px;
    background: rgba(15, 23, 42, 0.82);
    color: #FFFFFF;
    font-size: 0.78rem;
    font-weight: 600;
    white-space: nowrap;
    pointer-events: none;
  }

  .sloc-pin-wrap {
    background: none;
    border: none;
  }

  .sloc-pin {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 38px;
    height: 38px;
    border-radius: 50% 50% 50% 0;
    transform: rotate(-45deg);
    background: #D00F09;
    border: 3px solid #FFFFFF;
    box-shadow: 0 6px 14px rgba(208, 15, 9, 0.4);
    box-sizing: border-box;
  }

  .sloc-pin i {
    transform: rotate(45deg);
    color: #FFFFFF;
    font-size: 0.9rem;
  }

  .sloc-inputs {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.75rem;
  }

  .sloc-field {
    position: relative;
    display: flex;
    align-items: center;
  }

  .sloc-prefix {
    position: absolute;
    left: 0.7rem;
    padding: 0.2rem 0.45rem;
    border-radius: 6px;
    background: #F1F5F9;
    color: #475569;
    font-size: 0.7rem;
    font-weight: 800;
    letter-spacing: 0.04em;
    pointer-events: none;
  }

  .mbfp-form-input.sloc-input {
    padding-left: 3.4rem;
    font-variant-numeric: tabular-nums;
  }

  .sloc-hint {
    display: flex;
    align-items: flex-start;
    gap: 0.45rem;
    margin: 0;
    font-size: 0.8rem;
    color: #64748B;
  }

  .sloc-hint i {
    margin-top: 0.15rem;
  }

  .sloc-hint.ok {
    color: #15803D;
  }

  .sloc-hint.error {
    color: #B91C1C;
  }

  @media (max-width: 480px) {
    .sloc-inputs {
      grid-template-columns: 1fr;
    }

    .sloc-map {
      height: 200px;
    }
  }
`;
