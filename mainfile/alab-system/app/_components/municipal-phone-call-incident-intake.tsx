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
          <div><p>Municipal emergency dispatch</p><h2 id="phone-intake-title"><i className="fa-solid fa-phone-volume" aria-hidden="true" /> New phone-call incident</h2></div>
          <button type="button" className="mbfp-phone-close" onClick={onClose} disabled={submitting} aria-label="Close phone-call intake"><i className="fa-solid fa-xmark" aria-hidden="true" /></button>
        </header>
        <form onSubmit={submit} className="mbfp-phone-form">
          {error && <p className="mbfp-phone-error" role="alert"><i className="fa-solid fa-circle-exclamation" aria-hidden="true" />{error}</p>}
          <div className="mbfp-phone-grid">
            <div className="mbfp-phone-column">
              <section className="mbfp-phone-section"><div className="mbfp-phone-section-heading"><span>01</span><div><h3>Caller and incident</h3><p>Record only what the caller can confirm.</p></div></div>
                <div className="mbfp-phone-fields two"><label>Caller name<input ref={firstFieldRef} value={callerName} onChange={(event) => setCallerName(event.target.value)} autoComplete="name" required minLength={2} maxLength={120} /></label><label>Caller phone<input value={callerPhone} onChange={(event) => setCallerPhone(event.target.value)} autoComplete="tel" inputMode="tel" pattern="[+]?[0-9]{10,15}" title="Please enter a valid phone number (e.g. 09109975737 or +639109975737)" required placeholder="09XXXXXXXXX" /></label></div>
                <div className="mbfp-phone-fields two"><label>Fire type<select value={fireType} onChange={(event) => setFireType(event.target.value)} required><option value="">Select classification</option>{fireTypes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label>Reported at<input type="datetime-local" value={reportedAt} onChange={(event) => setReportedAt(event.target.value)} required /></label></div>
                <div className="mbfp-phone-fields two"><label>Barangay<select value={barangayId} onChange={(event) => setBarangayId(event.target.value)} required disabled={loadingBarangays}><option value="">{loadingBarangays ? "Loading barangays…" : "Select barangay"}</option>{barangays.map((barangay) => <option key={barangay.id} value={barangay.id}>{barangay.name}</option>)}</select></label><label>Nearest landmark <span>Optional</span><input value={landmark} onChange={(event) => setLandmark(event.target.value)} maxLength={200} placeholder="School, plaza, intersection…" /></label></div>
                <label>Description<textarea value={description} onChange={(event) => setDescription(event.target.value)} required maxLength={1200} rows={4} placeholder="What is burning, visible risk, people affected, and access notes…" /></label>
              </section>
              <section className="mbfp-phone-section"><div className="mbfp-phone-section-heading"><span>02</span><div><h3>Response team</h3><p>Select one station, then choose the people to receive the dispatch.</p></div></div>
                <label>Dispatching station<select value={stationId} onChange={(event) => selectStation(event.target.value)} required disabled={loadingStations}><option value="">{loadingStations ? "Loading stations…" : "Select active station"}</option>{stations.map((station) => <option key={station.id} value={station.id}>{station.stationName}</option>)}</select></label>
                {stationId && <fieldset className="mbfp-phone-responders"><legend>Individual responders</legend>{loadingResponders ? <p className="mbfp-phone-muted">Loading active responders…</p> : responders.length ? responders.map((responder) => <label key={responder.id} className="mbfp-phone-responder"><input type="checkbox" checked={responderIds.includes(responder.id)} onChange={() => toggleResponder(responder.id)} /><span>{responder.displayName}</span></label>) : <p className="mbfp-phone-muted">No active responders are assigned to this station.</p>}</fieldset>}
              </section>
            </div>
            <aside className="mbfp-phone-map-column"><section className="mbfp-phone-section mbfp-phone-map-section"><div className="mbfp-phone-section-heading"><span>03</span><div><h3>Confirm incident pin</h3><p>Click the map or drag the red fire pin. For keyboard use, enter coordinates and select Set precise coordinates. Station coordinates are only a starting point.</p></div></div>
              <div ref={mapContainerRef} className="mbfp-phone-map" aria-label="Incident location map" />
              <div className="mbfp-phone-coordinate-controls" aria-describedby="phone-coordinate-help"><label>Latitude<input type="number" inputMode="decimal" step="0.000001" min="4" max="22" value={latitude} onChange={(event) => setLatitude(event.target.value)} /></label><label>Longitude<input type="number" inputMode="decimal" step="0.000001" min="116" max="127" value={longitude} onChange={(event) => setLongitude(event.target.value)} /></label><button type="button" onClick={applyKeyboardPin}>Set precise coordinates</button></div>
              <p id="phone-coordinate-help" className="mbfp-phone-coordinate-help">Enter Philippine coordinates (latitude 4–22, longitude 116–127) and select Set precise coordinates to confirm the same red pin used by the map.</p>
              <p className={`mbfp-phone-pin-status ${pinPlaced ? "confirmed" : ""}`} aria-live="polite"><i className={`fa-solid ${pinPlaced ? "fa-circle-check" : "fa-location-crosshairs"}`} aria-hidden="true" />{pinPlaced && location ? `Precise pin set: ${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}` : "Precise pin required — click the map or drag the red pin."}</p>
              <div className="mbfp-phone-dispatch-note"><i className="fa-solid fa-tower-broadcast" aria-hidden="true" /><div><strong>From Phone Caller</strong><span>This creates and immediately assigns a municipal response dispatch.</span></div></div>
            </section></aside>
          </div>
          <footer className="mbfp-phone-footer"><p><i className="fa-solid fa-shield-heart" aria-hidden="true" /> Dispatch is enabled only after a caller, details, a manual pin, station, and responder are selected.</p><div><button type="button" className="mbfp-phone-cancel" onClick={onClose} disabled={submitting}>Cancel</button><button type="submit" className="mbfp-phone-submit" disabled={!valid || submitting}>{submitting ? "Dispatching…" : "Create & Dispatch"}<i className="fa-solid fa-truck-fast" aria-hidden="true" /></button></div></footer>
        </form>
      </section>
    </div>,
    document.body,
  );
}

const phoneIntakeStyles = `
  .mbfp-phone-intake-backdrop{position:fixed;inset:0;z-index:1200;display:grid;place-items:center;padding:1rem;background:rgba(15,23,42,.68);backdrop-filter:blur(6px);font-family:'Plus Jakarta Sans',-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.mbfp-phone-intake{width:min(1120px,100%);max-height:calc(100dvh - 2rem);overflow:auto;background:#f8fafc;border:1px solid rgba(255,255,255,.7);border-radius:20px;box-shadow:0 28px 72px rgba(15,23,42,.42);color:#0f172a}.mbfp-phone-intake-header{display:flex;align-items:center;justify-content:space-between;gap:1rem;padding:1.1rem 1.4rem;background:linear-gradient(120deg,#991b1b,#dc2626);color:#fff}.mbfp-phone-intake-header p{margin:0 0 .2rem;font-size:.68rem;font-weight:800;letter-spacing:.1em;text-transform:uppercase;opacity:.8}.mbfp-phone-intake-header h2{margin:0;font-size:1.2rem;letter-spacing:-.02em}.mbfp-phone-intake-header h2 i{margin-right:.45rem}.mbfp-phone-close{width:2.25rem;height:2.25rem;border:1px solid rgba(255,255,255,.35);border-radius:9px;background:rgba(255,255,255,.12);color:#fff;font-size:1rem;cursor:pointer}.mbfp-phone-form{padding:1.15rem 1.4rem 1.25rem}.mbfp-phone-error{display:flex;gap:.55rem;margin:0 0 1rem;padding:.7rem .8rem;border:1px solid #fecaca;border-radius:9px;background:#fff1f2;color:#991b1b;font-size:.8rem;font-weight:700}.mbfp-phone-grid{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(330px,.85fr);gap:1rem}.mbfp-phone-column{display:grid;gap:1rem}.mbfp-phone-section{padding:1rem;border:1px solid #e2e8f0;border-radius:12px;background:#fff}.mbfp-phone-section-heading{display:flex;gap:.65rem;margin-bottom:.9rem}.mbfp-phone-section-heading>span{display:grid;place-items:center;width:1.55rem;height:1.55rem;flex:0 0 auto;border-radius:50%;background:#fee2e2;color:#b91c1c;font-size:.68rem;font-weight:900}.mbfp-phone-section h3{margin:0;color:#0f172a;font-size:.92rem}.mbfp-phone-section-heading p{margin:.15rem 0 0;color:#64748b;font-size:.73rem;line-height:1.4}.mbfp-phone-fields{display:grid;gap:.75rem;margin-bottom:.75rem}.mbfp-phone-fields.two{grid-template-columns:repeat(2,minmax(0,1fr))}.mbfp-phone-section label{display:grid;gap:.35rem;color:#334155;font-size:.73rem;font-weight:800}.mbfp-phone-section label span{color:#94a3b8;font-weight:600}.mbfp-phone-section input,.mbfp-phone-section select,.mbfp-phone-section textarea{box-sizing:border-box;width:100%;border:1px solid #cbd5e1;border-radius:8px;padding:.58rem .65rem;background:#fff;color:#0f172a;font:inherit;font-size:.8rem;font-weight:500}.mbfp-phone-section textarea{resize:vertical;line-height:1.45}.mbfp-phone-section input:focus,.mbfp-phone-section select:focus,.mbfp-phone-section textarea:focus{outline:3px solid rgba(220,38,38,.13);border-color:#dc2626}.mbfp-phone-section input:disabled,.mbfp-phone-section select:disabled{cursor:not-allowed;background:#f1f5f9;color:#94a3b8}.mbfp-phone-responders{display:grid;gap:.45rem;margin:.85rem 0 0;padding:.75rem;border:1px solid #e2e8f0;border-radius:9px}.mbfp-phone-responders legend{padding:0 .2rem;color:#334155;font-size:.73rem;font-weight:800}.mbfp-phone-responder{display:flex!important;grid-template-columns:none!important;align-items:center;gap:.55rem;padding:.52rem .6rem;border-radius:7px;background:#f8fafc;cursor:pointer}.mbfp-phone-responder:hover{background:#fff1f2}.mbfp-phone-responder input{width:1rem!important;height:1rem}.mbfp-phone-responder span{color:#1e293b!important;font-size:.8rem}.mbfp-phone-muted{margin:.15rem 0;color:#64748b;font-size:.76rem}.mbfp-phone-map-section{height:calc(100% - 2px);box-sizing:border-box;display:flex;flex-direction:column}.mbfp-phone-map{min-height:280px;flex:1;border:1px solid #cbd5e1;border-radius:10px;background:#e2e8f0;overflow:hidden}.mbfp-phone-coordinate-controls{display:grid;grid-template-columns:1fr 1fr;gap:.55rem;margin-top:.75rem}.mbfp-phone-coordinate-controls label{font-size:.7rem}.mbfp-phone-coordinate-controls button{grid-column:1/-1;border:1px solid #b91c1c;border-radius:8px;padding:.55rem .65rem;background:#fff1f2;color:#991b1b;font:inherit;font-size:.75rem;font-weight:800;cursor:pointer}.mbfp-phone-coordinate-help{margin:.45rem 0 0;color:#64748b;font-size:.68rem;line-height:1.4}.mbfp-phone-fire-icon-wrap{background:transparent;border:0}.mbfp-phone-fire-icon{display:grid;place-items:center;width:30px;height:30px;border:3px solid #fff;border-radius:50% 50% 50% 0;background:#dc2626;color:#fff;box-shadow:0 3px 10px rgba(127,29,29,.45);transform:rotate(-45deg)}.mbfp-phone-fire-icon i{font-size:.86rem;transform:rotate(45deg)}.mbfp-phone-pin-status{display:flex;gap:.45rem;margin:.75rem 0 0;color:#b45309;font-size:.73rem;font-weight:800;line-height:1.4}.mbfp-phone-pin-status.confirmed{color:#047857}.mbfp-phone-dispatch-note{display:flex;gap:.6rem;margin-top:.85rem;padding:.7rem;border-radius:9px;background:#fff7ed;color:#9a3412}.mbfp-phone-dispatch-note>i{padding-top:.1rem}.mbfp-phone-dispatch-note div{display:grid;gap:.1rem}.mbfp-phone-dispatch-note strong{font-size:.75rem}.mbfp-phone-dispatch-note span{font-size:.69rem;line-height:1.35}.mbfp-phone-footer{display:flex;align-items:center;justify-content:space-between;gap:1rem;margin-top:1rem;padding-top:1rem;border-top:1px solid #e2e8f0}.mbfp-phone-footer>p{display:flex;gap:.4rem;max-width:480px;margin:0;color:#64748b;font-size:.71rem;line-height:1.4}.mbfp-phone-footer>p i{color:#dc2626;padding-top:.1rem}.mbfp-phone-footer>div{display:flex;gap:.55rem;flex-shrink:0}.mbfp-phone-cancel,.mbfp-phone-submit{border-radius:8px;padding:.62rem .85rem;font:inherit;font-size:.78rem;font-weight:800;cursor:pointer}.mbfp-phone-cancel{border:1px solid #cbd5e1;background:#fff;color:#334155}.mbfp-phone-submit{border:1px solid #b91c1c;background:#dc2626;color:#fff;box-shadow:0 3px 10px rgba(185,28,28,.22)}.mbfp-phone-submit i{margin-left:.45rem}.mbfp-phone-submit:disabled,.mbfp-phone-cancel:disabled,.mbfp-phone-close:disabled{cursor:not-allowed;opacity:.55}@media(max-width:768px){.mbfp-phone-intake-backdrop{align-items:start;padding:0}.mbfp-phone-intake{min-height:100dvh;max-height:100dvh;border-radius:0}.mbfp-phone-intake-header,.mbfp-phone-form{padding-left:1rem;padding-right:1rem}.mbfp-phone-grid{grid-template-columns:1fr}.mbfp-phone-map-column{min-height:390px}.mbfp-phone-fields.two{grid-template-columns:1fr}.mbfp-phone-footer{align-items:stretch;flex-direction:column}.mbfp-phone-footer>div{justify-content:flex-end}.mbfp-phone-submit{min-height:42px}}@media(max-width:420px){.mbfp-phone-intake-header h2{font-size:1rem}.mbfp-phone-footer>div{display:grid;grid-template-columns:1fr}.mbfp-phone-cancel,.mbfp-phone-submit{width:100%}}
`;
