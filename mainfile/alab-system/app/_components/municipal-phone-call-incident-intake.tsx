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

function normalizePlace(value: string) {
  return value
    .toLowerCase()
    .replace(/^(brgy\.?|barangay)\s*/gi, "")
    .replace(/[^a-z0-9]/g, "");
}

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
  const [municipalityName, setMunicipalityName] = useState("");
  const [detectedMunicipality, setDetectedMunicipality] = useState("");
  const [stations, setStations] = useState<Station[]>([]);
  const [barangays, setBarangays] = useState<Barangay[]>([]);
  const [responders, setResponders] = useState<Responder[]>([]);
  const [mapStart, setMapStart] = useState<Coordinates | null>(null);
  const [location, setLocation] = useState<Coordinates | null>(null);
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [pinPlaced, setPinPlaced] = useState(false);
  const [detectedBarangay, setDetectedBarangay] = useState("");
  const [showOutOfBoundsModal, setShowOutOfBoundsModal] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);

  const [callerName, setCallerName] = useState("");
  const [callerPhone, setCallerPhone] = useState("");
  const [fireType, setFireType] = useState("");
  const [barangayId, setBarangayId] = useState("");
  const [landmark, setLandmark] = useState("");
  const [description, setDescription] = useState("");
  const [reportedAt, setReportedAt] = useState(localDateTimeValue);
  const [stationId, setStationId] = useState("");
  const [responderIds, setResponderIds] = useState<string[]>([]);
  const [showConfirmation, setShowConfirmation] = useState(false);

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
  const barangaysRef = useRef<Barangay[]>([]);
  const municipalityRef = useRef<string>("");
  const lastWarnedMuniRef = useRef<string>("");

  useEffect(() => {
    barangaysRef.current = barangays;
  }, [barangays]);

  useEffect(() => {
    municipalityRef.current = municipalityName;
  }, [municipalityName]);

  // Robust Reverse Geocoding & Municipal Boundary Verification
  const checkCoordinatesLocation = useCallback(async (coords: Coordinates) => {
    setIsGeocoding(true);
    try {
      const response = await fetch(`/api/geocode/reverse?lat=${coords.latitude}&lon=${coords.longitude}`);
      if (!response.ok) return;
      const data = await response.json() as {
        display_name?: string;
        address?: {
          village?: string;
          hamlet?: string;
          suburb?: string;
          quarter?: string;
          neighbourhood?: string;
          municipality?: string;
          town?: string;
          city?: string;
          county?: string;
        };
      };
      const address = data.address;
      if (!address) return;

      // 1. Municipal Territory Boundary Detection
      const detectedMuni = address.municipality || address.town || address.city || "";
      const currentMuni = municipalityRef.current;
      setDetectedMunicipality(detectedMuni);

      if (detectedMuni && currentMuni) {
        const normDetected = normalizePlace(detectedMuni);
        const normCurrent = normalizePlace(currentMuni);
        if (normDetected && normCurrent && !normDetected.includes(normCurrent) && !normCurrent.includes(normDetected)) {
          // Trigger immediate pop-up modal if dragged to a foreign municipality
          if (lastWarnedMuniRef.current !== detectedMuni) {
            lastWarnedMuniRef.current = detectedMuni;
            setShowOutOfBoundsModal(true);
          }
        } else {
          lastWarnedMuniRef.current = "";
        }
      }

      // 2. High-Accuracy Barangay Detection from OSM Reverse Geocoding
      const candidates = [
        address.village,
        address.hamlet,
        address.suburb,
        address.quarter,
        address.neighbourhood,
        ...(data.display_name ? data.display_name.split(",").map((s) => s.trim()) : []),
      ].filter((p): p is string => Boolean(p && p.trim()));

      const availableBarangays = barangaysRef.current;
      let matchedBarangay: Barangay | undefined;

      for (const candidate of candidates) {
        const normCandidate = normalizePlace(candidate);
        if (!normCandidate || normCandidate.length < 2) continue;

        matchedBarangay = availableBarangays.find((b) => {
          const normB = normalizePlace(b.name);
          return normB === normCandidate;
        });
        if (matchedBarangay) break;
      }

      // Fallback substring matching for compound names
      if (!matchedBarangay) {
        for (const candidate of candidates) {
          const normCandidate = normalizePlace(candidate);
          if (!normCandidate || normCandidate.length < 4) continue;

          matchedBarangay = availableBarangays.find((b) => {
            const normB = normalizePlace(b.name);
            return normB.length >= 4 && (normB.includes(normCandidate) || normCandidate.includes(normB));
          });
          if (matchedBarangay) break;
        }
      }

      if (matchedBarangay) {
        setBarangayId(matchedBarangay.id);
        setDetectedBarangay(matchedBarangay.name);
      }
    } catch {
      // Graceful fallback
    } finally {
      setIsGeocoding(false);
    }
  }, []);

  const confirmCoordinates = useCallback((coordinates: Coordinates) => {
    locationRef.current = coordinates;
    setLocation(coordinates);
    setLatitude(coordinates.latitude.toFixed(6));
    setLongitude(coordinates.longitude.toFixed(6));
    setPinPlaced(true);
    markerRef.current?.setLatLng([coordinates.latitude, coordinates.longitude]);
    mapRef.current?.panTo([coordinates.latitude, coordinates.longitude]);
    void checkCoordinatesLocation(coordinates);
  }, [checkCoordinatesLocation]);

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

  const handleBarangaySelect = (newBarangayId: string) => {
    setBarangayId(newBarangayId);
    const selected = barangays.find((b) => b.id === newBarangayId);
    if (selected) {
      setDetectedBarangay(selected.name);
    }
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
      if (event.key === "Escape" && !submitting) {
        if (showOutOfBoundsModal) setShowOutOfBoundsModal(false);
        else if (showConfirmation) setShowConfirmation(false);
        else onClose();
      }
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose, showConfirmation, showOutOfBoundsModal, submitting]);

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
        const payload = await response.json() as { municipality?: string; barangays?: Barangay[]; error?: string };
        if (!response.ok) throw new Error(errorMessage(payload, "Unable to load municipal barangays."));
        if (payload.municipality) setMunicipalityName(payload.municipality);
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

  const handleOpenConfirmation = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!valid || !location || submitting) {
      setError("Complete all required caller, incident, dispatch, and precise map-pin fields before proceeding.");
      return;
    }
    setError("");
    setShowConfirmation(true);
  };

  const handleConfirmAndDispatch = async () => {
    if (!valid || !location || submitting) return;
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch("/api/municipal-bfp/phone-incidents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          callerName: callerName.trim(),
          callerPhone: callerPhone.trim(),
          fireType,
          description: description.trim(),
          barangayId: barangayId.trim(),
          landmark: landmark.trim(),
          latitude: location.latitude,
          longitude: location.longitude,
          reportedAt: new Date(reportedAt).toISOString(),
          stationId,
          responderIds,
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

  const selectedStationObj = stations.find((s) => s.id === stationId);
  const selectedBarangayObj = barangays.find((b) => b.id === barangayId);
  const selectedFireTypeObj = fireTypes.find(([val]) => val === fireType);
  const selectedResponderObjs = responders.filter((r) => responderIds.includes(r.id));

  return createPortal(
    <div ref={portalRootRef} className="mbfp-phone-intake-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !submitting) onClose(); }}>
      <style>{phoneIntakeStyles}</style>
      <section ref={dialogRef} className="mbfp-phone-intake" role="dialog" aria-modal="true" aria-labelledby="phone-intake-title" onKeyDown={trapFocus}>
        {/* FIXED HEADER - ZERO TOP INDEX */}
        <header className="mbfp-phone-intake-header">
          <div className="mbfp-phone-header-main">
            <div className="mbfp-phone-header-icon">
              <i className="fa-solid fa-phone-volume" aria-hidden="true" />
            </div>
            <div>
              <p className="mbfp-phone-header-kicker">
                <span className="mbfp-phone-live-dot" aria-hidden="true" />
                {municipalityName ? `${municipalityName} Emergency Command · Direct Line` : "Municipal emergency dispatch · direct line"}
              </p>
              <h2 id="phone-intake-title">
                {showConfirmation ? "Confirm Incident & Dispatch Summary" : "New phone-call incident"}
              </h2>
            </div>
          </div>
          <button type="button" className="mbfp-phone-close" onClick={onClose} disabled={submitting} aria-label="Close phone-call intake">
            <i className="fa-solid fa-xmark" aria-hidden="true" />
          </button>
        </header>

        {showConfirmation ? (
          /* ========================================================================= */
          /* STAGE 2: PRE-DISPATCH CONFIRMATION SUMMARY MODAL (NON-DESTRUCTIVE BACK) */
          /* ========================================================================= */
          <div className="mbfp-confirmation-wrapper">
            <div className="mbfp-confirmation-scroll-body">
              <div className="mbfp-confirmation-banner">
                <div className="mbfp-confirmation-banner-icon">
                  <i className="fa-solid fa-shield-halved" aria-hidden="true" />
                </div>
                <div>
                  <h3>Review Dispatch Summary</h3>
                  <p>Please double-check all caller details and assigned response team before alerting mobile units.</p>
                </div>
              </div>

              {error && (
                <p className="mbfp-phone-error" role="alert">
                  <i className="fa-solid fa-circle-exclamation" aria-hidden="true" />
                  <span>{error}</span>
                </p>
              )}

              <div className="mbfp-confirmation-grid">
                {/* 1. Incident & Caller Info */}
                <div className="mbfp-summary-card">
                  <div className="mbfp-summary-card-header">
                    <i className="fa-solid fa-fire-flame-curved" />
                    <span>Incident &amp; Caller Details</span>
                  </div>
                  <div className="mbfp-summary-dl">
                    <div className="mbfp-summary-item">
                      <label>Emergency Type</label>
                      <strong className="mbfp-tag-fire">{selectedFireTypeObj ? selectedFireTypeObj[1] : fireType}</strong>
                    </div>
                    <div className="mbfp-summary-item">
                      <label>Caller Name</label>
                      <strong>{callerName}</strong>
                    </div>
                    <div className="mbfp-summary-item">
                      <label>Caller Phone</label>
                      <strong className="mbfp-phone-link">{callerPhone}</strong>
                    </div>
                    <div className="mbfp-summary-item">
                      <label>Reported Timestamp</label>
                      <span>{new Date(reportedAt).toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" })}</span>
                    </div>
                    <div className="mbfp-summary-item full">
                      <label>Description &amp; Access Notes</label>
                      <p className="mbfp-summary-desc">{description}</p>
                    </div>
                  </div>
                </div>

                {/* 2. Location & Map Pin */}
                <div className="mbfp-summary-card">
                  <div className="mbfp-summary-card-header">
                    <i className="fa-solid fa-location-dot" />
                    <span>Location &amp; Coordinates</span>
                  </div>
                  <div className="mbfp-summary-dl">
                    <div className="mbfp-summary-item">
                      <label>Barangay</label>
                      <strong className="mbfp-tag-brgy">Brgy. {selectedBarangayObj?.name || "—"}</strong>
                    </div>
                    <div className="mbfp-summary-item">
                      <label>Municipality</label>
                      <strong>{municipalityName || "Assigned Municipality"}</strong>
                    </div>
                    <div className="mbfp-summary-item">
                      <label>GPS Coordinates</label>
                      <span className="mbfp-coords-chip">
                        {location ? `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}` : "—"}
                      </span>
                    </div>
                    <div className="mbfp-summary-item">
                      <label>Nearest Landmark</label>
                      <span>{landmark || "None specified"}</span>
                    </div>
                  </div>
                </div>

                {/* 3. Dispatching Station & Responders */}
                <div className="mbfp-summary-card full-width">
                  <div className="mbfp-summary-card-header">
                    <i className="fa-solid fa-truck-medical" />
                    <span>Assigned Response Team</span>
                  </div>
                  <div className="mbfp-summary-dl">
                    <div className="mbfp-summary-item">
                      <label>Dispatching Station</label>
                      <strong>{selectedStationObj?.stationName || "—"}</strong>
                    </div>
                    <div className="mbfp-summary-item full">
                      <label>Alerted Responders ({selectedResponderObjs.length})</label>
                      <div className="mbfp-summary-responders-chips">
                        {selectedResponderObjs.map((res) => (
                          <span key={res.id} className="mbfp-responder-chip">
                            <i className="fa-solid fa-user-shield" />
                            {res.displayName}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* CONFIRMATION FOOTER */}
            <footer className="mbfp-phone-footer">
              <p>
                <i className="fa-solid fa-circle-info" aria-hidden="true" />
                <span>Confirming will immediately send mobile emergency push notifications to the {selectedResponderObjs.length} selected firefighters.</span>
              </p>
              <div className="mbfp-phone-footer-buttons">
                <button
                  type="button"
                  className="mbfp-phone-cancel"
                  onClick={() => setShowConfirmation(false)}
                  disabled={submitting}
                >
                  <i className="fa-solid fa-arrow-left" aria-hidden="true" />
                  <span>Back / Edit Details</span>
                </button>
                <button
                  type="button"
                  className="mbfp-phone-submit"
                  onClick={() => void handleConfirmAndDispatch()}
                  disabled={submitting}
                >
                  <span>{submitting ? "Dispatching Responders…" : "Confirm & Dispatch"}</span>
                  <i className={`fa-solid ${submitting ? "fa-circle-notch fa-spin" : "fa-truck-fast"}`} aria-hidden="true" />
                </button>
              </div>
            </footer>
          </div>
        ) : (
          /* ========================================================================= */
          /* STAGE 1: INTAKE WORKSPACE (CLEAN LAYOUT - NO DISTRACTING BANNERS)          */
          /* ========================================================================= */
          <form onSubmit={handleOpenConfirmation} className="mbfp-phone-form">
            <div className="mbfp-phone-scrollable-body">
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
                          onChange={(event) => handleBarangaySelect(event.target.value)}
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

                    {detectedBarangay && (
                      <div className="mbfp-detected-badge" aria-live="polite">
                        <i className="fa-solid fa-wand-magic-sparkles" aria-hidden="true" />
                        <span>Auto-detected: <strong>Brgy. {detectedBarangay}</strong></span>
                      </div>
                    )}

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
                        {isGeocoding ? (
                          <>
                            <i className="fa-solid fa-circle-notch fa-spin" aria-hidden="true" />
                            <span>Detecting location…</span>
                          </>
                        ) : (
                          <>
                            <i className="fa-solid fa-hand-pointer" aria-hidden="true" />
                            <span>Click or drag pin to exact location</span>
                          </>
                        )}
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
            </div>

            {/* DEDICATED SPACIOUS FOOTER - AMPLE BREATHING ROOM */}
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
                  <span>Create & Dispatch</span>
                  <i className="fa-solid fa-arrow-right" aria-hidden="true" />
                </button>
              </div>
            </footer>
          </form>
        )}

        {/* ========================================================================= */}
        {/* IMMEDIATE OUT-OF-BOUNDS WARNING POP-UP MODAL                              */}
        {/* ========================================================================= */}
        {showOutOfBoundsModal && (
          <div className="mbfp-popup-modal-backdrop" role="dialog" aria-modal="true">
            <div className="mbfp-popup-modal">
              <div className="mbfp-popup-modal-header">
                <div className="mbfp-popup-modal-icon warning">
                  <i className="fa-solid fa-triangle-exclamation" aria-hidden="true" />
                </div>
                <div>
                  <h4>Location Outside Jurisdiction</h4>
                  <p>Municipal jurisdiction boundary notice</p>
                </div>
              </div>
              <div className="mbfp-popup-modal-body">
                <p className="mbfp-popup-modal-highlight">
                  ⚠️ Pin is placed in <strong>{detectedMunicipality || "Different Municipality"}</strong>.
                </p>
                <p>
                  You are signed in under <strong>{municipalityName || "Hamtic"} Emergency Command</strong>. Reports dispatched from here should be within the {municipalityName || "Hamtic"} area.
                </p>
                <p className="mbfp-popup-modal-subtext">
                  Would you like to re-center the map pin to {municipalityName || "your station"} area, or keep this pin position?
                </p>
              </div>
              <div className="mbfp-popup-modal-actions">
                <button
                  type="button"
                  className="mbfp-phone-cancel"
                  onClick={() => {
                    setShowOutOfBoundsModal(false);
                    if (mapStart) {
                      confirmCoordinates(mapStart);
                    }
                  }}
                >
                  <i className="fa-solid fa-location-crosshairs" aria-hidden="true" />
                  <span>Center to {municipalityName || "Station"}</span>
                </button>
                <button
                  type="button"
                  className="mbfp-phone-submit"
                  onClick={() => setShowOutOfBoundsModal(false)}
                >
                  <span>Keep Position</span>
                  <i className="fa-solid fa-check" aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>,
    document.body,
  );
}

const phoneIntakeStyles = `
  /* BACKDROP & MODAL WRAPPER */
  .mbfp-phone-intake-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 9999;
    display: grid;
    place-items: center;
    padding: 1.5rem;
    background: rgba(15, 23, 42, 0.75);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    animation: mbfpBackdropFade 0.2s ease-out;
  }

  @keyframes mbfpBackdropFade {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  .mbfp-phone-intake {
    width: min(1160px, 100%);
    height: min(90vh, 880px);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    background: #f8fafc;
    border: 1px solid rgba(255, 255, 255, 0.4);
    border-radius: 20px;
    box-shadow: 0 25px 65px -10px rgba(15, 23, 42, 0.55), 0 0 0 1px rgba(15, 23, 42, 0.1);
    color: #0f172a;
    animation: mbfpModalPop 0.22s cubic-bezier(0.16, 1, 0.3, 1);
    position: relative;
  }

  @keyframes mbfpModalPop {
    from { opacity: 0; transform: scale(0.98) translateY(6px); }
    to { opacity: 1; transform: scale(1) translateY(0); }
  }

  /* FIXED HEADER - ZERO TOP INDEX */
  .mbfp-phone-intake-header {
    flex: 0 0 auto;
    position: relative;
    top: 0;
    left: 0;
    right: 0;
    z-index: 10;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: 1.15rem 1.6rem;
    background: linear-gradient(135deg, #7f1d1d 0%, #b91c1c 45%, #dc2626 100%);
    color: #ffffff;
    border-bottom: 1px solid rgba(255, 255, 255, 0.18);
    box-shadow: 0 4px 16px -4px rgba(153, 27, 27, 0.35);
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
    border: 1px solid rgba(255, 255, 255, 0.28);
    border-radius: 12px;
    font-size: 1.15rem;
    color: #ffffff;
    box-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.35);
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
    width: 2.35rem;
    height: 2.35rem;
    border: 1px solid rgba(255, 255, 255, 0.28);
    border-radius: 10px;
    background: rgba(255, 255, 255, 0.14);
    color: #ffffff;
    font-size: 1.05rem;
    cursor: pointer;
    transition: all 0.18s ease;
  }

  .mbfp-phone-close:hover {
    background: rgba(255, 255, 255, 0.28);
    border-color: rgba(255, 255, 255, 0.5);
    transform: rotate(90deg);
  }

  /* FORM SHELL */
  .mbfp-phone-form {
    display: flex;
    flex-direction: column;
    flex: 1 1 auto;
    min-height: 0;
    overflow: hidden;
  }

  /* SCROLLABLE INNER BODY - SLIM SCROLLBAR */
  .mbfp-phone-scrollable-body {
    flex: 1 1 auto;
    overflow-y: auto;
    overflow-x: hidden;
    padding: 1.35rem 1.6rem 2rem;
    scrollbar-width: thin;
    scrollbar-color: #cbd5e1 transparent;
  }

  .mbfp-phone-scrollable-body::-webkit-scrollbar {
    width: 5px;
  }
  .mbfp-phone-scrollable-body::-webkit-scrollbar-track {
    background: transparent;
    margin: 8px 0;
  }
  .mbfp-phone-scrollable-body::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 9999px;
  }
  .mbfp-phone-scrollable-body::-webkit-scrollbar-thumb:hover {
    background: #94a3b8;
  }

  .mbfp-phone-error {
    display: flex;
    align-items: center;
    gap: 0.65rem;
    margin: 0 0 1.2rem;
    padding: 0.8rem 1.1rem;
    border: 1px solid #fecaca;
    border-radius: 12px;
    background: #fef2f2;
    color: #991b1b;
    font-size: 0.82rem;
    font-weight: 700;
    box-shadow: 0 2px 8px rgba(239, 68, 68, 0.08);
  }

  .mbfp-detected-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    margin-top: -0.25rem;
    margin-bottom: 0.85rem;
    padding: 0.45rem 0.8rem;
    border: 1px solid #bbf7d0;
    border-radius: 8px;
    background: #f0fdf4;
    color: #166534;
    font-size: 0.76rem;
    font-weight: 600;
  }

  .mbfp-detected-badge i {
    color: #16a34a;
  }

  .mbfp-phone-grid {
    display: grid;
    grid-template-columns: minmax(0, 1.22fr) minmax(360px, 0.98fr);
    gap: 1.35rem;
    align-items: start;
    padding-bottom: 0.5rem;
  }

  .mbfp-phone-column {
    display: grid;
    gap: 1.3rem;
  }

  /* SECTIONS & CARDS */
  .mbfp-phone-section {
    padding: 1.25rem 1.35rem;
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
    margin-bottom: 1.05rem;
  }

  .mbfp-phone-step-badge {
    display: grid;
    place-items: center;
    width: 1.8rem;
    height: 1.8rem;
    flex: 0 0 auto;
    border-radius: 8px;
    background: linear-gradient(135deg, #fee2e2, #fecaca);
    color: #991b1b;
    border: 1px solid #fca5a5;
    font-size: 0.74rem;
    font-weight: 900;
    box-shadow: 0 2px 6px rgba(220, 38, 38, 0.12);
  }

  .mbfp-phone-section h3 {
    margin: 0;
    color: #0f172a;
    font-size: 0.98rem;
    font-weight: 800;
    letter-spacing: -0.01em;
  }

  .mbfp-phone-section-heading p {
    margin: 0.2rem 0 0;
    color: #64748b;
    font-size: 0.75rem;
    line-height: 1.4;
  }

  /* FIELDS & INPUTS */
  .mbfp-phone-fields {
    display: grid;
    gap: 0.9rem;
    margin-bottom: 0.9rem;
  }

  .mbfp-phone-fields.two {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .mbfp-phone-section label {
    display: grid;
    gap: 0.38rem;
    color: #1e293b;
    font-size: 0.76rem;
    font-weight: 700;
  }

  .mbfp-phone-label-full {
    display: grid;
    gap: 0.38rem;
    margin-top: 0.3rem;
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
    padding: 0.68rem 0.85rem;
    background: #ffffff;
    color: #0f172a;
    font: inherit;
    font-size: 0.84rem;
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
    gap: 0.65rem;
    margin: 1.05rem 0 0;
    padding: 0.95rem;
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
    font-size: 0.75rem;
    font-weight: 800;
  }

  .mbfp-phone-responders legend i {
    color: #ef4444;
  }

  .mbfp-phone-responders-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 0.6rem;
  }

  .mbfp-phone-responder {
    display: flex !important;
    align-items: center;
    gap: 0.7rem;
    padding: 0.7rem 0.85rem;
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
    width: 1.15rem !important;
    height: 1.15rem !important;
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
    font-size: 0.83rem;
    font-weight: 700;
  }

  .mbfp-phone-responder-role {
    color: #64748b;
    font-size: 0.69rem;
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
    margin-top: 0.95rem;
  }

  .mbfp-phone-coord-btn {
    grid-column: 1 / -1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.45rem;
    border: 1px solid #fecaca;
    border-radius: 10px;
    padding: 0.62rem 0.85rem;
    background: #fef2f2;
    color: #991b1b;
    font: inherit;
    font-size: 0.79rem;
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
    font-size: 0.7rem;
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
    margin: 0.9rem 0 0;
    padding: 0.65rem 0.85rem;
    border-radius: 10px;
    background: #fef3c7;
    border: 1px solid #fde68a;
    color: #92400e;
    font-size: 0.75rem;
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
    margin-top: 0.95rem;
    padding: 0.9rem;
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

  /* CONFIRMATION SUMMARY STAGE */
  .mbfp-confirmation-wrapper {
    display: flex;
    flex-direction: column;
    flex: 1 1 auto;
    min-height: 0;
    overflow: hidden;
    background: #f8fafc;
  }

  .mbfp-confirmation-scroll-body {
    flex: 1 1 auto;
    overflow-y: auto;
    padding: 1.35rem 1.6rem 2rem;
    scrollbar-width: thin;
    scrollbar-color: #cbd5e1 transparent;
  }

  .mbfp-confirmation-banner {
    display: flex;
    align-items: center;
    gap: 0.85rem;
    padding: 1rem 1.25rem;
    margin-bottom: 1.25rem;
    background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
    border: 1.5px solid #bfdbfe;
    border-radius: 14px;
    color: #1e3a8a;
  }

  .mbfp-confirmation-banner-icon {
    display: grid;
    place-items: center;
    width: 2.5rem;
    height: 2.5rem;
    border-radius: 10px;
    background: #2563eb;
    color: #ffffff;
    font-size: 1.15rem;
    flex: 0 0 auto;
  }

  .mbfp-confirmation-banner h3 {
    margin: 0;
    font-size: 1rem;
    font-weight: 800;
    color: #1e3a8a;
  }

  .mbfp-confirmation-banner p {
    margin: 0.2rem 0 0;
    font-size: 0.78rem;
    color: #3b82f6;
  }

  .mbfp-confirmation-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 1.2rem;
  }

  .mbfp-summary-card {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 14px;
    padding: 1.15rem 1.25rem;
    box-shadow: 0 2px 8px rgba(15, 23, 42, 0.04);
  }

  .mbfp-summary-card.full-width {
    grid-column: 1 / -1;
  }

  .mbfp-summary-card-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.95rem;
    padding-bottom: 0.65rem;
    border-bottom: 1px solid #f1f5f9;
    color: #0f172a;
    font-size: 0.88rem;
    font-weight: 800;
  }

  .mbfp-summary-card-header i {
    color: #dc2626;
  }

  .mbfp-summary-dl {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.85rem 1.25rem;
  }

  .mbfp-summary-item {
    display: grid;
    gap: 0.25rem;
  }

  .mbfp-summary-item.full {
    grid-column: 1 / -1;
  }

  .mbfp-summary-item label {
    font-size: 0.7rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: #64748b;
  }

  .mbfp-summary-item strong {
    font-size: 0.86rem;
    color: #0f172a;
  }

  .mbfp-summary-item span {
    font-size: 0.84rem;
    color: #334155;
  }

  .mbfp-tag-fire {
    display: inline-block;
    padding: 0.2rem 0.55rem;
    border-radius: 6px;
    background: #fef2f2;
    border: 1px solid #fca5a5;
    color: #991b1b;
    font-size: 0.8rem;
    font-weight: 800;
  }

  .mbfp-tag-brgy {
    display: inline-block;
    padding: 0.2rem 0.55rem;
    border-radius: 6px;
    background: #f0fdf4;
    border: 1px solid #86efac;
    color: #166534;
    font-size: 0.82rem;
    font-weight: 800;
  }

  .mbfp-coords-chip {
    font-family: monospace;
    font-size: 0.8rem !important;
    background: #f1f5f9;
    padding: 0.2rem 0.45rem;
    border-radius: 6px;
    color: #0f172a !important;
    font-weight: 600;
  }

  .mbfp-phone-link {
    font-family: monospace;
    color: #0284c7 !important;
  }

  .mbfp-summary-desc {
    margin: 0;
    padding: 0.65rem 0.85rem;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    font-size: 0.82rem;
    color: #1e293b;
    line-height: 1.45;
  }

  .mbfp-summary-responders-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-top: 0.3rem;
  }

  .mbfp-responder-chip {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.35rem 0.65rem;
    border-radius: 8px;
    background: #fef2f2;
    border: 1px solid #fecaca;
    color: #991b1b;
    font-size: 0.8rem;
    font-weight: 700;
  }

  .mbfp-responder-chip i {
    color: #dc2626;
    font-size: 0.82rem;
  }

  /* IMMEDIATE OUT OF BOUNDS WARNING POP-UP MODAL */
  .mbfp-popup-modal-backdrop {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 999;
    display: grid;
    place-items: center;
    padding: 1.5rem;
    background: rgba(15, 23, 42, 0.7);
    backdrop-filter: blur(6px);
    animation: mbfpBackdropFade 0.18s ease-out;
  }

  .mbfp-popup-modal {
    width: min(500px, 100%);
    background: #ffffff;
    border-radius: 18px;
    border: 1px solid #fed7aa;
    box-shadow: 0 25px 50px -12px rgba(15, 23, 42, 0.4), 0 0 0 1px rgba(234, 88, 12, 0.2);
    padding: 1.5rem 1.65rem;
    animation: mbfpModalPop 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .mbfp-popup-modal-header {
    display: flex;
    align-items: center;
    gap: 0.85rem;
    margin-bottom: 1.1rem;
  }

  .mbfp-popup-modal-icon.warning {
    display: grid;
    place-items: center;
    width: 2.75rem;
    height: 2.75rem;
    border-radius: 14px;
    background: #fff7ed;
    border: 1.5px solid #fed7aa;
    color: #ea580c;
    font-size: 1.25rem;
    flex: 0 0 auto;
  }

  .mbfp-popup-modal-header h4 {
    margin: 0;
    font-size: 1.12rem;
    font-weight: 800;
    color: #7c2d12;
  }

  .mbfp-popup-modal-header p {
    margin: 0.2rem 0 0;
    font-size: 0.76rem;
    font-weight: 600;
    color: #9a3412;
  }

  .mbfp-popup-modal-body p {
    margin: 0 0 0.65rem;
    font-size: 0.86rem;
    font-weight: 500;
    color: #334155;
    line-height: 1.5;
  }

  .mbfp-popup-modal-highlight {
    padding: 0.6rem 0.85rem;
    background: #fff7ed;
    border-radius: 8px;
    border-left: 3.5px solid #ea580c;
    color: #9a3412 !important;
    font-size: 0.85rem !important;
  }

  .mbfp-popup-modal-subtext {
    font-size: 0.8rem !important;
    color: #64748b !important;
    font-weight: 500 !important;
    margin-top: 0.4rem;
  }

  .mbfp-popup-modal-actions {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 0.85rem;
    margin-top: 1.4rem;
    padding-top: 1.1rem;
    border-top: 1.5px solid #f1f5f9;
  }

  /* DEDICATED SPACIOUS FOOTER - ZERO CRAMPING */
  .mbfp-phone-footer {
    flex: 0 0 auto;
    position: relative;
    z-index: 10;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1.25rem;
    padding: 1.15rem 1.6rem 1.35rem;
    background: #ffffff;
    border-top: 1.5px solid #e2e8f0;
    box-shadow: 0 -4px 20px rgba(15, 23, 42, 0.06);
  }

  .mbfp-phone-footer > p {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    max-width: 520px;
    margin: 0;
    color: #64748b;
    font-size: 0.74rem;
    font-weight: 600;
    line-height: 1.4;
  }

  .mbfp-phone-footer > p i {
    color: #dc2626;
    font-size: 0.9rem;
    flex: 0 0 auto;
  }

  .mbfp-phone-footer-buttons {
    display: flex;
    align-items: center;
    gap: 0.85rem;
    flex-shrink: 0;
  }

  .mbfp-phone-cancel,
  .mbfp-phone-submit {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.55rem;
    border-radius: 11px;
    padding: 0.75rem 1.35rem;
    font: inherit;
    font-size: 0.84rem;
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
    .mbfp-phone-scrollable-body,
    .mbfp-confirmation-scroll-body,
    .mbfp-phone-footer {
      padding-left: 1.1rem;
      padding-right: 1.1rem;
    }
    .mbfp-phone-grid,
    .mbfp-confirmation-grid {
      grid-template-columns: 1fr;
    }
    .mbfp-phone-map {
      height: 240px;
    }
    .mbfp-phone-fields.two,
    .mbfp-summary-dl {
      grid-template-columns: 1fr;
    }
    .mbfp-phone-footer {
      flex-direction: column;
      align-items: stretch;
      padding-bottom: 1.5rem;
    }
    .mbfp-phone-footer-buttons {
      justify-content: flex-end;
    }
    .mbfp-phone-submit,
    .mbfp-phone-cancel {
      min-height: 46px;
    }
  }

  @media (max-width: 440px) {
    .mbfp-phone-intake-header h2 {
      font-size: 1.05rem;
    }
    .mbfp-phone-footer-buttons,
    .mbfp-popup-modal-actions {
      display: grid;
      grid-template-columns: 1fr;
    }
    .mbfp-phone-cancel,
    .mbfp-phone-submit {
      width: 100%;
    }
  }
`;
