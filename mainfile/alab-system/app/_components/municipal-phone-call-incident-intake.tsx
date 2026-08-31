"use client";

import "leaflet/dist/leaflet.css";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import type { Map as LeafletMap, Marker } from "leaflet";

type Coordinates = { latitude: number; longitude: number };
type Station = { id: string; stationName: string; latitude: number; longitude: number; status: "ACTIVE" | "INACTIVE" };
type Responder = { id: string; displayName: string };
type Barangay = { id: string; name: string };

const fireTypes = [
  ["HOUSE_BUILDING", "House / building fire"],
  ["VEHICLE", "Vehicle fire"],
  ["GRASS", "Grass fire"],
  ["FOREST", "Forest fire"],
  ["OTHER", "Other emergency"],
] as const;

const phonePattern = /^\+?[0-9]{10,15}$/;

function localDateTimeValue() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 16);
}

function errorMessage(payload: unknown, fallback: string) {
  return typeof payload === "object" && payload && "error" in payload && typeof payload.error === "string" ? payload.error : fallback;
}

function focusableElements(container: HTMLElement) {
  return Array.from(container.querySelectorAll<HTMLElement>('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'));
}

export function MunicipalPhoneCallIncidentIntake({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false);
  const [stations, setStations] = useState<Station[]>([]);
  const [barangays, setBarangays] = useState<Barangay[]>([]);
  const [responders, setResponders] = useState<Responder[]>([]);
  const [mapStart, setMapStart] = useState<Coordinates | null>(null);
  const [location, setLocation] = useState<Coordinates | null>(null);
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [pinPlaced, setPinPlaced] = useState(false);
  const [callerName, setCallerName] = useState("");
  const [callerPhone, setCallerPhone] = useState("");
  const [fireType, setFireType] = useState("");
  const [barangayId, setBarangayId] = useState("");
  const [landmark, setLandmark] = useState("");
  const [description, setDescription] = useState("");
  const [reportedAt, setReportedAt] = useState(localDateTimeValue);
  const [stationId, setStationId] = useState("");
  const [responderIds, setResponderIds] = useState<string[]>([]);
  const [loadingStations, setLoadingStations] = useState(true);
  const [loadingBarangays, setLoadingBarangays] = useState(true);
  const [loadingResponders, setLoadingResponders] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const firstFieldRef = useRef<HTMLInputElement>(null);
  const openingElementRef = useRef<HTMLElement | null>(typeof document === "undefined" ? null : document.activeElement as HTMLElement | null);
  const portalRootRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const locationRef = useRef<Coordinates | null>(null);

  const confirmCoordinates = useCallback((coordinates: Coordinates) => {
    locationRef.current = coordinates;
    setLocation(coordinates);
    setLatitude(coordinates.latitude.toFixed(6));
    setLongitude(coordinates.longitude.toFixed(6));
    setPinPlaced(true);
    markerRef.current?.setLatLng([coordinates.latitude, coordinates.longitude]);
    mapRef.current?.panTo([coordinates.latitude, coordinates.longitude]);
  }, []);

  const updatePin = useCallback((latlng: import("leaflet").LatLng) => {
    confirmCoordinates({ latitude: latlng.lat, longitude: latlng.lng });
  }, [confirmCoordinates]);

  const applyKeyboardPin = () => {
    const coordinates = { latitude: Number(latitude), longitude: Number(longitude) };
    if (!Number.isFinite(coordinates.latitude) || !Number.isFinite(coordinates.longitude) || coordinates.latitude < 4 || coordinates.latitude > 22 || coordinates.longitude < 116 || coordinates.longitude > 127) {
      setError("Enter valid Philippine latitude and longitude values before setting the precise pin.");
      return;
    }
    setError("");
    confirmCoordinates(coordinates);
  };

  useEffect(() => { firstFieldRef.current?.focus(); }, []);

  useEffect(() => {
    const openingElement = openingElementRef.current;
    const originalOverflow = document.body.style.overflow;
    const background = Array.from(document.body.children).filter((element) => element !== portalRootRef.current).map((element) => ({
      element: element as HTMLElement,
      inert: (element as HTMLElement).inert,
      ariaHidden: element.getAttribute("aria-hidden"),
    }));
    document.body.style.overflow = "hidden";
    background.forEach(({ element }) => {
      element.inert = true;
      element.setAttribute("aria-hidden", "true");
    });
    return () => {
      document.body.style.overflow = originalOverflow;
      background.forEach(({ element, inert, ariaHidden }) => {
        element.inert = inert;
        if (ariaHidden === null) element.removeAttribute("aria-hidden");
        else element.setAttribute("aria-hidden", ariaHidden);
      });
      openingElement?.focus();
    };
  }, []);

  const trapFocus = (event: React.KeyboardEvent<HTMLElement>) => {
    if (event.key !== "Tab") return;
    const dialog = dialogRef.current;
    if (!dialog) return;
    const focusable = focusableElements(dialog);
    if (!focusable.length) {
      event.preventDefault();
      return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !submitting) onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose, submitting]);

  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      setLoadingStations(true);
      try {
        const response = await fetch("/api/municipal-bfp/stations", { cache: "no-store", signal: controller.signal });
        const payload = await response.json() as { stations?: Station[]; error?: string };
        if (!response.ok) throw new Error(errorMessage(payload, "Unable to load municipal BFP stations."));
        const activeStations = (payload.stations ?? []).filter((station) => station.status === "ACTIVE");
        setStations(activeStations);
        const firstStation = activeStations[0];
        if (firstStation) setMapStart({ latitude: firstStation.latitude, longitude: firstStation.longitude });
        else setError("No active municipal BFP stations are available for dispatch.");
      } catch (caught) {
        if (!controller.signal.aborted) setError(caught instanceof Error ? caught.message : "Unable to load municipal BFP stations.");
      } finally {
        if (!controller.signal.aborted) setLoadingStations(false);
      }
    })();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      setLoadingBarangays(true);
      try {
        const response = await fetch("/api/municipal-bfp/barangays", { cache: "no-store", signal: controller.signal });
        const payload = await response.json() as { barangays?: Barangay[]; error?: string };
        if (!response.ok) throw new Error(errorMessage(payload, "Unable to load municipal barangays."));
        setBarangays(payload.barangays ?? []);
      } catch (caught) {
        if (!controller.signal.aborted) setError(caught instanceof Error ? caught.message : "Unable to load municipal barangays.");
      } finally {
        if (!controller.signal.aborted) setLoadingBarangays(false);
      }
    })();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!stationId) {
      return;
    }
    const controller = new AbortController();
    void (async () => {
      setLoadingResponders(true);
      try {
        const response = await fetch(`/api/municipal-bfp/stations/${stationId}/responders`, { cache: "no-store", signal: controller.signal });
        const payload = await response.json() as { responders?: Responder[]; error?: string };
        if (!response.ok) throw new Error(errorMessage(payload, "Unable to load station responders."));
        setResponders(payload.responders ?? []);
      } catch (caught) {
        if (!controller.signal.aborted) setError(caught instanceof Error ? caught.message : "Unable to load station responders.");
      } finally {
        if (!controller.signal.aborted) setLoadingResponders(false);
      }
    })();
    return () => controller.abort();
  }, [stationId]);

  useEffect(() => {
    if (!mapStart || !mapContainerRef.current || mapRef.current) return;
    let active = true;
    void (async () => {
      const leafletModule = await import("leaflet");
      const L = leafletModule.default;
      if (!active || !mapContainerRef.current || mapRef.current) return;

      const map = L.map(mapContainerRef.current, { center: [mapStart.latitude, mapStart.longitude], zoom: 14, zoomControl: true });
      mapRef.current = map;
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map);
      const fireIcon = L.divIcon({
        className: "mbfp-phone-fire-icon-wrap",
        html: '<span class="mbfp-phone-fire-icon" aria-hidden="true"><i class="fa-solid fa-fire"></i></span>',
        iconSize: [34, 34],
        iconAnchor: [17, 31],
      });
      const mapCoordinates = locationRef.current ?? mapStart;
      const initialCoordinates: [number, number] = [mapCoordinates.latitude, mapCoordinates.longitude];
      const marker = L.marker(initialCoordinates, { draggable: true, icon: fireIcon }).addTo(map);
      markerRef.current = marker;
      marker.on("dragend", () => updatePin(marker.getLatLng()));
      map.on("click", (event) => {
        marker.setLatLng(event.latlng);
        updatePin(event.latlng);
      });
      window.setTimeout(() => map.invalidateSize(), 0);
    })();
    return () => {
      active = false;
      markerRef.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [mapStart, updatePin]);

  const valid = callerName.trim().length >= 2
    && phonePattern.test(callerPhone.trim())
    && Boolean(fireType)
    && Boolean(barangayId.trim())
    && Boolean(description.trim())
    && Boolean(reportedAt)
    && Boolean(location)
    && pinPlaced
    && Boolean(stationId)
    && responderIds.length > 0
    && !loadingStations
    && !loadingBarangays
    && !loadingResponders;

  const selectStation = (nextStationId: string) => {
    setStationId(nextStationId);
    setResponderIds([]);
    setResponders([]);
    setError("");
  };

  const toggleResponder = (responderId: string) => {
    setResponderIds((current) => current.includes(responderId) ? current.filter((id) => id !== responderId) : [...current, responderId]);
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!valid || !location || submitting) {
      setError("Complete all required caller, incident, dispatch, and precise map-pin fields before dispatching.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch("/api/municipal-bfp/phone-incidents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          callerName: callerName.trim(), callerPhone: callerPhone.trim(), fireType, description: description.trim(), barangayId: barangayId.trim(),
          landmark: landmark.trim(), latitude: location.latitude, longitude: location.longitude, reportedAt: new Date(reportedAt).toISOString(),
          stationId, responderIds,
        }),
      });
      const payload = await response.json().catch(() => null);
      if (response.status !== 201) throw new Error(errorMessage(payload, "Unable to create and dispatch this phone-call incident."));
      onCreated();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to create and dispatch this phone-call incident.");
      setSubmitting(false);
    }
  };

  if (!mounted || typeof document === "undefined") return null;

  return createPortal(
    <div ref={portalRootRef} className="mbfp-phone-intake-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !submitting) onClose(); }}>
      <style>{phoneIntakeStyles}</style>
      <section ref={dialogRef} className="mbfp-phone-intake" role="dialog" aria-modal="true" aria-labelledby="phone-intake-title" onKeyDown={trapFocus}>
        <header className="mbfp-phone-intake-header">
          <div className="mbfp-phone-header-main">
            <div className="mbfp-phone-header-icon">
              <i className="fa-solid fa-phone-volume" aria-hidden="true" />
            </div>
            <div>
              <p className="mbfp-phone-header-kicker">
                <span className="mbfp-phone-live-dot" aria-hidden="true" />
                Municipal emergency dispatch · direct line
              </p>
              <h2 id="phone-intake-title">New phone-call incident</h2>
            </div>
          </div>
          <button type="button" className="mbfp-phone-close" onClick={onClose} disabled={submitting} aria-label="Close phone-call intake">
            <i className="fa-solid fa-xmark" aria-hidden="true" />
          </button>
        </header>

        <form onSubmit={submit} className="mbfp-phone-form">
          {error && (
            <p className="mbfp-phone-error" role="alert">
              <i className="fa-solid fa-circle-exclamation" aria-hidden="true" />
              <span>{error}</span>
            </p>
          )}

          <div className="mbfp-phone-grid">
            <div className="mbfp-phone-column">
              {/* SECTION 01: CALLER & INCIDENT */}
              <section className="mbfp-phone-section">
                <div className="mbfp-phone-section-heading">
                  <span className="mbfp-phone-step-badge">01</span>
                  <div>
                    <h3>Caller and incident</h3>
                    <p>Record only what the caller can confirm.</p>
                  </div>
                </div>

                <div className="mbfp-phone-fields two">
                  <label>
                    Caller name
                    <input
                      ref={firstFieldRef}
                      value={callerName}
                      onChange={(event) => setCallerName(event.target.value)}
                      autoComplete="name"
                      required
                      minLength={2}
                      maxLength={120}
                      placeholder="Full name of caller"
                    />
                  </label>
                  <label>
                    Caller phone
                    <input
                      value={callerPhone}
                      onChange={(event) => setCallerPhone(event.target.value)}
                      autoComplete="tel"
                      inputMode="tel"
                      pattern="[+]?[0-9]{10,15}"
                      title="Please enter a valid phone number (e.g. 09109975737 or +639109975737)"
                      required
                      placeholder="09XXXXXXXXX"
                    />
                  </label>
                </div>

                <div className="mbfp-phone-fields two">
                  <label>
                    Fire type
                    <select value={fireType} onChange={(event) => setFireType(event.target.value)} required>
                      <option value="">Select classification</option>
                      {fireTypes.map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Reported at
                    <input
                      type="datetime-local"
                      value={reportedAt}
                      onChange={(event) => setReportedAt(event.target.value)}
                      required
                    />
                  </label>
                </div>

                <div className="mbfp-phone-fields two">
                  <label>Barangay<select
                      value={barangayId}
                      onChange={(event) => setBarangayId(event.target.value)}
                      required
                      disabled={loadingBarangays}
                    >
                      <option value="">{loadingBarangays ? "Loading barangays…" : "Select barangay"}</option>
                      {barangays.map((barangay) => (
                        <option key={barangay.id} value={barangay.id}>{barangay.name}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Nearest landmark <span className="mbfp-phone-optional-tag">Optional</span>
                    <input
                      value={landmark}
                      onChange={(event) => setLandmark(event.target.value)}
                      maxLength={200}
                      placeholder="School, plaza, bridge, chapel…"
                    />
                  </label>
                </div>

                <label className="mbfp-phone-label-full">
                  Description
                  <textarea
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    required
                    maxLength={1200}
                    rows={3}
                    placeholder="What is burning, visible risk, people affected, access road condition, or hazards…"
                  />
                </label>
              </section>

              {/* SECTION 02: RESPONSE TEAM */}
              <section className="mbfp-phone-section">
                <div className="mbfp-phone-section-heading">
                  <span className="mbfp-phone-step-badge">02</span>
                  <div>
                    <h3>Response team</h3>
                    <p>Select one station, then choose the people to receive the dispatch.</p>
                  </div>
                </div>

                <label className="mbfp-phone-label-full">
                  Dispatching station
                  <select
                    value={stationId}
                    onChange={(event) => selectStation(event.target.value)}
                    required
                    disabled={loadingStations}
                  >
                    <option value="">{loadingStations ? "Loading stations…" : "Select active station"}</option>
                    {stations.map((station) => (
                      <option key={station.id} value={station.id}>{station.stationName}</option>
                    ))}
                  </select>
                </label>

                {stationId && (
                  <fieldset className="mbfp-phone-responders">
                    <legend>
                      <i className="fa-solid fa-users-viewfinder" aria-hidden="true" />
                      Individual responders
                    </legend>
                    {loadingResponders ? (
                      <div className="mbfp-phone-responders-loading">
                        <i className="fa-solid fa-circle-notch fa-spin" aria-hidden="true" />
                        <span>Loading active responders…</span>
                      </div>
                    ) : responders.length ? (
                      <div className="mbfp-phone-responders-grid">
                        {responders.map((responder) => {
                          const isChecked = responderIds.includes(responder.id);
                          return (
                            <label
                              key={responder.id}
                              className={`mbfp-phone-responder ${isChecked ? "selected" : ""}`}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => toggleResponder(responder.id)}
                              />
                              <div className="mbfp-phone-responder-info">
                                <span className="mbfp-phone-responder-name">{responder.displayName}</span>
                                <span className="mbfp-phone-responder-role">BFP Responder</span>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="mbfp-phone-muted">
                        <i className="fa-solid fa-circle-info" aria-hidden="true" />
                        No active responders are assigned to this station.
                      </p>
                    )}
                  </fieldset>
                )}
              </section>
            </div>

            {/* SECTION 03: MAP & PIN CONFIRMATION */}
            <aside className="mbfp-phone-map-column">
              <section className="mbfp-phone-section mbfp-phone-map-section">
                <div className="mbfp-phone-section-heading">
                  <span className="mbfp-phone-step-badge">03</span>
                  <div>
                    <h3>Confirm incident pin</h3>
                    <p>Click the map or drag the red fire pin. For keyboard use, enter coordinates and select Set precise coordinates. Station coordinates are only a starting point.</p>
                  </div>
                </div>

                <div className="mbfp-phone-map-wrapper">
                  <div ref={mapContainerRef} className="mbfp-phone-map" aria-label="Incident location map" />
                  <div className="mbfp-phone-map-overlay-hint">
                    <i className="fa-solid fa-hand-pointer" aria-hidden="true" />
                    <span>Click or drag pin to exact location</span>
                  </div>
                </div>

                <div className="mbfp-phone-coordinate-controls" aria-describedby="phone-coordinate-help">
                  <label>
                    Latitude
                    <input
                      type="number"
                      inputMode="decimal"
                      step="0.000001"
                      min="4"
                      max="22"
                      value={latitude}
                      onChange={(event) => setLatitude(event.target.value)}
                      placeholder="e.g. 10.743200"
                    />
                  </label>
                  <label>
                    Longitude
                    <input
                      type="number"
                      inputMode="decimal"
                      step="0.000001"
                      min="116"
                      max="127"
                      value={longitude}
                      onChange={(event) => setLongitude(event.target.value)}
                      placeholder="e.g. 121.984100"
                    />
                  </label>
                  <button type="button" className="mbfp-phone-coord-btn" onClick={applyKeyboardPin}>
                    <i className="fa-solid fa-location-crosshairs" aria-hidden="true" />
                    Set precise coordinates
                  </button>
                </div>

                <p id="phone-coordinate-help" className="mbfp-phone-coordinate-help">
                  Enter Philippine coordinates (latitude 4–22, longitude 116–127) and select Set precise coordinates to confirm the same red pin used by the map.
                </p>

                <p className={`mbfp-phone-pin-status ${pinPlaced ? "confirmed" : ""}`} aria-live="polite">
                  <i className={`fa-solid ${pinPlaced ? "fa-circle-check" : "fa-location-crosshairs"}`} aria-hidden="true" />
                  <span>
                    {pinPlaced && location
                      ? `Precise pin set: ${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`
                      : "Precise pin required — click the map or drag the red pin."}
                  </span>
                </p>

                <div className="mbfp-phone-dispatch-note">
                  <div className="mbfp-phone-dispatch-note-icon">
                    <i className="fa-solid fa-tower-broadcast" aria-hidden="true" />
                  </div>
                  <div>
                    <strong>From Phone Caller</strong>
                    <span>This creates and immediately assigns a municipal response dispatch.</span>
                  </div>
                </div>
              </section>
            </aside>
          </div>

          <footer className="mbfp-phone-footer">
            <p>
              <i className="fa-solid fa-shield-halved" aria-hidden="true" />
              <span>Dispatch is enabled only after a caller, details, a manual pin, station, and responder are selected.</span>
            </p>
            <div className="mbfp-phone-footer-buttons">
              <button type="button" className="mbfp-phone-cancel" onClick={onClose} disabled={submitting}>
                Cancel
              </button>
              <button type="submit" className="mbfp-phone-submit" disabled={!valid || submitting}>
                <span>{submitting ? "Dispatching…" : "Create & Dispatch"}</span>
                <i className={`fa-solid ${submitting ? "fa-circle-notch fa-spin" : "fa-truck-fast"}`} aria-hidden="true" />
              </button>
            </div>
          </footer>
        </form>
      </section>
    </div>,
    document.body,
  );
}

const phoneIntakeStyles = `
  /* BACKDROP & MODAL WRAPPER */
  .mbfp-phone-intake-backdrop {
    position: fixed;
    inset: 0;
    z-index: 1200;
    display: grid;
    place-items: center;
    padding: 1.25rem;
    background: rgba(15, 23, 42, 0.72);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    animation: mbfpBackdropFade 0.22s ease-out;
  }

  @keyframes mbfpBackdropFade {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  .mbfp-phone-intake {
    width: min(1160px, 100%);
    max-height: min(92vh, 900px);
    display: flex;
    flex-direction: column;
    overflow-y: auto;
    overflow-x: hidden;
    background: #f8fafc;
    border: 1px solid rgba(255, 255, 255, 0.4);
    border-radius: 20px;
    box-shadow: 0 25px 60px -12px rgba(15, 23, 42, 0.45), 0 0 0 1px rgba(15, 23, 42, 0.08);
    color: #0f172a;
    animation: mbfpModalPop 0.25s cubic-bezier(0.16, 1, 0.3, 1);

    /* ULTRA-SLIM CUSTOM SCROLLBAR (SLIDER) */
    scrollbar-width: thin;
    scrollbar-color: #cbd5e1 transparent;
  }

  @keyframes mbfpModalPop {
    from { opacity: 0; transform: scale(0.97) translateY(8px); }
    to { opacity: 1; transform: scale(1) translateY(0); }
  }

  .mbfp-phone-intake::-webkit-scrollbar {
    width: 6px;
  }
  .mbfp-phone-intake::-webkit-scrollbar-track {
    background: transparent;
    margin: 12px 0;
  }
  .mbfp-phone-intake::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 9999px;
  }
  .mbfp-phone-intake::-webkit-scrollbar-thumb:hover {
    background: #94a3b8;
  }

  /* HEADER */
  .mbfp-phone-intake-header {
    position: sticky;
    top: 0;
    z-index: 20;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: 1rem 1.5rem;
    background: linear-gradient(135deg, #7f1d1d 0%, #b91c1c 45%, #dc2626 100%);
    color: #ffffff;
    border-bottom: 1px solid rgba(255, 255, 255, 0.15);
    box-shadow: 0 4px 16px -4px rgba(153, 27, 27, 0.3);
  }

  .mbfp-phone-header-main {
    display: flex;
    align-items: center;
    gap: 0.85rem;
  }

  .mbfp-phone-header-icon {
    display: grid;
    place-items: center;
    width: 2.5rem;
    height: 2.5rem;
    background: rgba(255, 255, 255, 0.15);
    border: 1px solid rgba(255, 255, 255, 0.25);
    border-radius: 12px;
    font-size: 1.15rem;
    color: #ffffff;
    box-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.3);
  }

  .mbfp-phone-header-kicker {
    display: flex;
    align-items: center;
    gap: 0.45rem;
    margin: 0 0 0.2rem;
    font-size: 0.68rem;
    font-weight: 800;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #fecaca;
  }

  .mbfp-phone-live-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #4ade80;
    box-shadow: 0 0 8px #4ade80;
    animation: mbfpPulseDot 1.6s ease-in-out infinite;
  }

  @keyframes mbfpPulseDot {
    0%, 100% { transform: scale(1); opacity: 1; }
    50% { transform: scale(1.4); opacity: 0.75; }
  }

  .mbfp-phone-intake-header h2 {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 800;
    letter-spacing: -0.02em;
    color: #ffffff;
  }

  .mbfp-phone-close {
    display: grid;
    place-items: center;
    width: 2.25rem;
    height: 2.25rem;
    border: 1px solid rgba(255, 255, 255, 0.25);
    border-radius: 10px;
    background: rgba(255, 255, 255, 0.12);
    color: #ffffff;
    font-size: 1rem;
    cursor: pointer;
    transition: all 0.18s ease;
  }

  .mbfp-phone-close:hover {
    background: rgba(255, 255, 255, 0.25);
    border-color: rgba(255, 255, 255, 0.45);
    transform: rotate(90deg);
  }

  /* FORM & GRID */
  .mbfp-phone-form {
    padding: 1.25rem 1.5rem 1.5rem;
  }

  .mbfp-phone-error {
    display: flex;
    align-items: center;
    gap: 0.65rem;
    margin: 0 0 1.2rem;
    padding: 0.75rem 1rem;
    border: 1px solid #fecaca;
    border-radius: 12px;
    background: #fef2f2;
    color: #991b1b;
    font-size: 0.82rem;
    font-weight: 700;
    box-shadow: 0 2px 8px rgba(239, 68, 68, 0.08);
  }

  .mbfp-phone-grid {
    display: grid;
    grid-template-columns: minmax(0, 1.22fr) minmax(360px, 0.98fr);
    gap: 1.25rem;
    align-items: start;
  }

  .mbfp-phone-column {
    display: grid;
    gap: 1.2rem;
  }

  /* SECTIONS & CARDS */
  .mbfp-phone-section {
    padding: 1.2rem 1.3rem;
    border: 1px solid #e2e8f0;
    border-radius: 16px;
    background: #ffffff;
    box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04), 0 4px 12px rgba(15, 23, 42, 0.02);
    transition: box-shadow 0.2s ease, border-color 0.2s ease;
  }

  .mbfp-phone-section:hover {
    border-color: #cbd5e1;
    box-shadow: 0 4px 16px rgba(15, 23, 42, 0.06);
  }

  .mbfp-phone-section-heading {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    margin-bottom: 1rem;
  }

  .mbfp-phone-step-badge {
    display: grid;
    place-items: center;
    width: 1.75rem;
    height: 1.75rem;
    flex: 0 0 auto;
    border-radius: 8px;
    background: linear-gradient(135deg, #fee2e2, #fecaca);
    color: #991b1b;
    border: 1px solid #fca5a5;
    font-size: 0.72rem;
    font-weight: 900;
    box-shadow: 0 2px 6px rgba(220, 38, 38, 0.12);
  }

  .mbfp-phone-section h3 {
    margin: 0;
    color: #0f172a;
    font-size: 0.96rem;
    font-weight: 800;
    letter-spacing: -0.01em;
  }

  .mbfp-phone-section-heading p {
    margin: 0.2rem 0 0;
    color: #64748b;
    font-size: 0.74rem;
    line-height: 1.4;
  }

  /* FIELDS & INPUTS */
  .mbfp-phone-fields {
    display: grid;
    gap: 0.85rem;
    margin-bottom: 0.85rem;
  }

  .mbfp-phone-fields.two {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .mbfp-phone-section label {
    display: grid;
    gap: 0.35rem;
    color: #1e293b;
    font-size: 0.75rem;
    font-weight: 700;
  }

  .mbfp-phone-label-full {
    display: grid;
    gap: 0.35rem;
    margin-top: 0.2rem;
  }

  .mbfp-phone-optional-tag {
    font-size: 0.68rem;
    font-weight: 600;
    color: #94a3b8;
    background: #f1f5f9;
    padding: 0.1rem 0.35rem;
    border-radius: 4px;
    margin-left: 0.3rem;
  }

  .mbfp-phone-section input,
  .mbfp-phone-section select,
  .mbfp-phone-section textarea {
    box-sizing: border-box;
    width: 100%;
    border: 1.5px solid #e2e8f0;
    border-radius: 10px;
    padding: 0.65rem 0.8rem;
    background: #ffffff;
    color: #0f172a;
    font: inherit;
    font-size: 0.82rem;
    font-weight: 500;
    transition: all 0.18s ease;
  }

  .mbfp-phone-section textarea {
    resize: vertical;
    line-height: 1.5;
  }

  .mbfp-phone-section input:focus,
  .mbfp-phone-section select:focus,
  .mbfp-phone-section textarea:focus {
    outline: none;
    border-color: #ef4444;
    box-shadow: 0 0 0 3.5px rgba(239, 68, 68, 0.12);
  }

  .mbfp-phone-section input:disabled,
  .mbfp-phone-section select:disabled {
    cursor: not-allowed;
    background: #f8fafc;
    color: #94a3b8;
    border-color: #e2e8f0;
  }

  /* RESPONDERS LIST */
  .mbfp-phone-responders {
    display: grid;
    gap: 0.6rem;
    margin: 0.95rem 0 0;
    padding: 0.9rem;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    background: #f8fafc;
  }

  .mbfp-phone-responders legend {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0 0.45rem;
    color: #1e293b;
    font-size: 0.74rem;
    font-weight: 800;
  }

  .mbfp-phone-responders legend i {
    color: #ef4444;
  }

  .mbfp-phone-responders-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 0.55rem;
  }

  .mbfp-phone-responder {
    display: flex !important;
    align-items: center;
    gap: 0.65rem;
    padding: 0.65rem 0.8rem;
    border: 1.5px solid #e2e8f0;
    border-radius: 10px;
    background: #ffffff;
    cursor: pointer;
    transition: all 0.16s ease;
  }

  .mbfp-phone-responder:hover {
    border-color: #cbd5e1;
    background: #f1f5f9;
  }

  .mbfp-phone-responder.selected {
    border-color: #ef4444;
    background: #fef2f2;
    box-shadow: 0 2px 6px rgba(239, 68, 68, 0.08);
  }

  .mbfp-phone-responder input {
    width: 1.1rem !important;
    height: 1.1rem !important;
    accent-color: #dc2626;
    margin: 0;
    cursor: pointer;
  }

  .mbfp-phone-responder-info {
    display: grid;
    gap: 0.1rem;
  }

  .mbfp-phone-responder-name {
    color: #0f172a !important;
    font-size: 0.82rem;
    font-weight: 700;
  }

  .mbfp-phone-responder-role {
    color: #64748b;
    font-size: 0.68rem;
    font-weight: 600;
  }

  .mbfp-phone-responders-loading {
    display: flex;
    align-items: center;
    gap: 0.55rem;
    padding: 0.75rem;
    color: #64748b;
    font-size: 0.78rem;
    font-weight: 600;
  }

  .mbfp-phone-muted {
    display: flex;
    align-items: center;
    gap: 0.45rem;
    margin: 0.2rem 0;
    color: #64748b;
    font-size: 0.76rem;
    font-weight: 600;
  }

  /* MAP SECTION */
  .mbfp-phone-map-section {
    display: flex;
    flex-direction: column;
  }

  .mbfp-phone-map-wrapper {
    position: relative;
    border-radius: 12px;
    overflow: hidden;
    border: 1.5px solid #cbd5e1;
    box-shadow: 0 2px 8px rgba(15, 23, 42, 0.08);
  }

  .mbfp-phone-map {
    min-height: 250px;
    height: 270px;
    width: 100%;
    background: #e2e8f0;
  }

  .mbfp-phone-map-overlay-hint {
    position: absolute;
    top: 10px;
    right: 10px;
    z-index: 400;
    display: flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.35rem 0.65rem;
    background: rgba(15, 23, 42, 0.85);
    backdrop-filter: blur(4px);
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 9999px;
    color: #ffffff;
    font-size: 0.68rem;
    font-weight: 700;
    pointer-events: none;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.25);
  }

  .mbfp-phone-map-overlay-hint i {
    color: #f87171;
  }

  .mbfp-phone-coordinate-controls {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.65rem;
    margin-top: 0.9rem;
  }

  .mbfp-phone-coord-btn {
    grid-column: 1 / -1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.45rem;
    border: 1px solid #fecaca;
    border-radius: 10px;
    padding: 0.6rem 0.8rem;
    background: #fef2f2;
    color: #991b1b;
    font: inherit;
    font-size: 0.78rem;
    font-weight: 800;
    cursor: pointer;
    transition: all 0.18s ease;
  }

  .mbfp-phone-coord-btn:hover {
    background: #fee2e2;
    border-color: #f87171;
  }

  .mbfp-phone-coordinate-help {
    margin: 0.45rem 0 0;
    color: #64748b;
    font-size: 0.69rem;
    line-height: 1.4;
  }

  .mbfp-phone-fire-icon-wrap {
    background: transparent;
    border: 0;
  }

  .mbfp-phone-fire-icon {
    display: grid;
    place-items: center;
    width: 32px;
    height: 32px;
    border: 3px solid #ffffff;
    border-radius: 50% 50% 50% 0;
    background: #dc2626;
    color: #ffffff;
    box-shadow: 0 4px 12px rgba(185, 28, 28, 0.5);
    transform: rotate(-45deg);
  }

  .mbfp-phone-fire-icon i {
    font-size: 0.92rem;
    transform: rotate(45deg);
  }

  .mbfp-phone-pin-status {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin: 0.8rem 0 0;
    padding: 0.6rem 0.75rem;
    border-radius: 10px;
    background: #fef3c7;
    border: 1px solid #fde68a;
    color: #92400e;
    font-size: 0.74rem;
    font-weight: 800;
    line-height: 1.35;
  }

  .mbfp-phone-pin-status.confirmed {
    background: #ecfdf5;
    border-color: #a7f3d0;
    color: #065f46;
  }

  .mbfp-phone-dispatch-note {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    margin-top: 0.9rem;
    padding: 0.85rem;
    border: 1px solid #fed7aa;
    border-radius: 12px;
    background: #fff7ed;
    color: #9a3412;
  }

  .mbfp-phone-dispatch-note-icon {
    display: grid;
    place-items: center;
    width: 2rem;
    height: 2rem;
    flex: 0 0 auto;
    border-radius: 8px;
    background: #ffedd5;
    color: #c2410c;
    font-size: 0.95rem;
  }

  .mbfp-phone-dispatch-note div {
    display: grid;
    gap: 0.15rem;
  }

  .mbfp-phone-dispatch-note strong {
    font-size: 0.78rem;
    font-weight: 800;
    color: #7c2d12;
  }

  .mbfp-phone-dispatch-note span {
    font-size: 0.71rem;
    line-height: 1.4;
    color: #9a3412;
  }

  /* FOOTER */
  .mbfp-phone-footer {
    position: sticky;
    bottom: 0;
    z-index: 15;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    margin-top: 1.25rem;
    padding: 1rem 0 0;
    background: #f8fafc;
    border-top: 1px solid #e2e8f0;
  }

  .mbfp-phone-footer > p {
    display: flex;
    align-items: center;
    gap: 0.45rem;
    max-width: 500px;
    margin: 0;
    color: #64748b;
    font-size: 0.73rem;
    font-weight: 600;
    line-height: 1.4;
  }

  .mbfp-phone-footer > p i {
    color: #dc2626;
    font-size: 0.85rem;
    flex: 0 0 auto;
  }

  .mbfp-phone-footer-buttons {
    display: flex;
    align-items: center;
    gap: 0.65rem;
    flex-shrink: 0;
  }

  .mbfp-phone-cancel,
  .mbfp-phone-submit {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    border-radius: 10px;
    padding: 0.7rem 1.15rem;
    font: inherit;
    font-size: 0.82rem;
    font-weight: 800;
    cursor: pointer;
    transition: all 0.18s ease;
  }

  .mbfp-phone-cancel {
    border: 1.5px solid #cbd5e1;
    background: #ffffff;
    color: #334155;
  }

  .mbfp-phone-cancel:hover:not(:disabled) {
    background: #f1f5f9;
    border-color: #94a3b8;
    color: #0f172a;
  }

  .mbfp-phone-submit {
    border: 1px solid #b91c1c;
    background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
    color: #ffffff;
    box-shadow: 0 4px 14px rgba(220, 38, 38, 0.35);
  }

  .mbfp-phone-submit:hover:not(:disabled) {
    background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
    box-shadow: 0 6px 20px rgba(220, 38, 38, 0.45);
    transform: translateY(-1px);
  }

  .mbfp-phone-submit:active:not(:disabled) {
    transform: translateY(0);
  }

  .mbfp-phone-submit:disabled,
  .mbfp-phone-cancel:disabled,
  .mbfp-phone-close:disabled {
    cursor: not-allowed;
    opacity: 0.55;
    transform: none;
    box-shadow: none;
  }

  /* RESPONSIVE */
  @media (max-width: 840px) {
    .mbfp-phone-intake-backdrop {
      align-items: start;
      padding: 0;
    }
    .mbfp-phone-intake {
      min-height: 100dvh;
      max-height: 100dvh;
      border-radius: 0;
      border: 0;
    }
    .mbfp-phone-intake-header,
    .mbfp-phone-form {
      padding-left: 1rem;
      padding-right: 1rem;
    }
    .mbfp-phone-grid {
      grid-template-columns: 1fr;
    }
    .mbfp-phone-map {
      height: 240px;
    }
    .mbfp-phone-fields.two {
      grid-template-columns: 1fr;
    }
    .mbfp-phone-footer {
      flex-direction: column;
      align-items: stretch;
    }
    .mbfp-phone-footer-buttons {
      justify-content: flex-end;
    }
    .mbfp-phone-submit,
    .mbfp-phone-cancel {
      min-height: 44px;
    }
  }

  @media (max-width: 440px) {
    .mbfp-phone-intake-header h2 {
      font-size: 1.05rem;
    }
    .mbfp-phone-footer-buttons {
      display: grid;
      grid-template-columns: 1fr;
    }
    .mbfp-phone-cancel,
    .mbfp-phone-submit {
      width: 100%;
    }
  }
`;
