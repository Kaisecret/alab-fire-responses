'use client';

import { useEffect, useRef } from 'react';
import 'leaflet/dist/leaflet.css';
import type { Circle, Map as LeafletMap, Marker } from 'leaflet';
import { reportFireMarkup, reportFireStyles } from '../../_content/resident-report-fire-content';
import {
  REFINEMENT_WINDOW_MS,
  chooseBetterReading,
  classifyAccuracy,
  isWithinAntiqueBounds,
  resolveNearestLandmark,
  resolvePhilippineAddress,
  type LocationQuality,
  type LocationReading,
} from './location-logic';

const OSM_TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const REVERSE_GEOCODE_URL = '/api/geocode/reverse';
const DEFAULT_MAP_CENTER: [number, number] = [11.2753568, 121.7387252];
const LOCATION_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 12000,
  maximumAge: 0,
};

type LocationUiState =
  | 'locating'
  | 'improving'
  | 'confirmed'
  | 'approximate'
  | 'low-accuracy'
  | 'outside'
  | 'adjusting'
  | 'adjusted'
  | 'error';

type ReverseGeocodePayload = {
  name?: string;
  display_name?: string;
  address?: Record<string, string>;
};

type LandmarkUiState = 'waiting' | 'suggested' | 'confirmed' | 'unavailable';

function locationErrorCopy(error: GeolocationPositionError) {
  if (error.code === error.PERMISSION_DENIED) {
    return 'Location permission was not allowed. Enable location access, then try again.';
  }
  if (error.code === error.POSITION_UNAVAILABLE) {
    return 'Your device could not provide a reliable position. Turn on GPS and try again.';
  }
  if (error.code === error.TIMEOUT) {
    return 'Location detection took too long. Move near a window and try again.';
  }
  return 'We could not detect your location. Please try again.';
}

function barangayLabel(value: string) {
  if (!value) return 'Barangay name unavailable';
  return /\bbarangay\b/i.test(value) ? value : `Barangay ${value}`;
}

export default function ResidentReportFirePage() {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const card = root.querySelector<HTMLElement>('[data-location-card]');
    const refresh = root.querySelector<HTMLButtonElement>('[data-location-refresh]');
    const adjust = root.querySelector<HTMLButtonElement>('[data-location-adjust]');
    if (!card || !refresh) return;
    const locationCard: HTMLElement = card;
    const refreshButton: HTMLButtonElement = refresh;

    const status = root.querySelector<HTMLElement>('[data-location-status]');
    const title = root.querySelector<HTMLElement>('[data-location-title]');
    const text = root.querySelector<HTMLElement>('[data-location-text]');
    const accuracy = root.querySelector<HTMLElement>('[data-location-accuracy]');
    const errorText = root.querySelector<HTMLElement>('[data-location-error]');
    const address = root.querySelector<HTMLElement>('[data-location-address]');
    const barangay = root.querySelector<HTMLElement>('[data-location-barangay]');
    const municipality = root.querySelector<HTMLElement>('[data-location-municipality]');
    const coordinates = root.querySelector<HTMLElement>('[data-location-coordinates]');
    const mapElement = root.querySelector<HTMLElement>('[data-location-map]');
    const mapOverlay = root.querySelector<HTMLElement>('[data-location-map-overlay]');
    const mapOverlayLabel = root.querySelector<HTMLElement>('[data-location-map-label]');
    const landmarkCard = root.querySelector<HTMLElement>('[data-nearest-landmark]');
    const landmarkName = root.querySelector<HTMLElement>('[data-landmark-name]');
    const landmarkStatus = root.querySelector<HTMLElement>('[data-landmark-status]');
    const landmarkConfirm = root.querySelector<HTMLButtonElement>('[data-landmark-confirm]');
    const landmarkChange = root.querySelector<HTMLButtonElement>('[data-landmark-change]');

    const stateClasses = [
      'is-locating',
      'is-improving',
      'is-confirmed',
      'is-approximate',
      'is-low-accuracy',
      'is-outside',
      'is-adjusting',
      'is-adjusted',
      'is-error',
    ];
    const stateLabels: Record<LocationUiState, string> = {
      locating: 'LOCATING',
      improving: 'IMPROVING',
      confirmed: 'CONFIRMED',
      approximate: 'APPROXIMATE',
      'low-accuracy': 'LOW ACCURACY',
      outside: 'OUTSIDE ANTIQUE',
      adjusting: 'ADJUST PIN',
      adjusted: 'PIN ADJUSTED',
      error: 'LOCATION NEEDED',
    };

    let disposed = false;
    let detectionRun = 0;
    let watchId: number | null = null;
    let refinementTimer: number | null = null;
    let reverseController: AbortController | null = null;
    let bestReading: LocationReading | null = null;
    let isFinalizing = false;
    let isAdjusting = false;
    let leaflet: typeof import('leaflet') | null = null;
    let map: LeafletMap | null = null;
    let marker: Marker | null = null;
    let accuracyCircle: Circle | null = null;
    let resizeObserver: ResizeObserver | null = null;

    function setState(kind: LocationUiState) {
      status?.classList.remove(...stateClasses);
      status?.classList.add(`is-${kind}`);
      if (status) status.textContent = stateLabels[kind];
      locationCard.dataset.locationState = kind;
      refreshButton.disabled = kind === 'locating' || kind === 'improving';
    }

    function setMapOverlay(visible: boolean, label: string) {
      mapOverlay?.classList.toggle('is-hidden', !visible);
      if (mapOverlayLabel) mapOverlayLabel.textContent = label;
      mapElement?.setAttribute('aria-busy', String(visible));
    }

    function showError(message: string) {
      if (!errorText) return;
      errorText.hidden = !message;
      errorText.textContent = message;
    }

    function setLocationValidity(valid: boolean) {
      locationCard.dataset.locationValid = String(valid);
    }

    function setLandmark(
      kind: LandmarkUiState,
      nameValue: string,
      statusValue: string,
    ) {
      if (landmarkCard) {
        landmarkCard.dataset.landmarkState = kind;
        landmarkCard.dataset.landmarkName = kind === 'suggested' || kind === 'confirmed'
          ? nameValue
          : '';
      }
      if (landmarkName) landmarkName.textContent = nameValue;
      if (landmarkStatus) landmarkStatus.textContent = statusValue;
      if (landmarkConfirm) landmarkConfirm.disabled = kind !== 'suggested';
      if (landmarkChange) landmarkChange.disabled = map === null;
    }

    function stopDetection() {
      if (watchId !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchId);
        watchId = null;
      }
      if (refinementTimer !== null) {
        window.clearTimeout(refinementTimer);
        refinementTimer = null;
      }
    }

    function updateReading(reading: LocationReading) {
      locationCard.dataset.locationLatitude = reading.latitude.toFixed(6);
      locationCard.dataset.locationLongitude = reading.longitude.toFixed(6);
      locationCard.dataset.locationAccuracy = String(Math.round(reading.accuracy));
      if (text) {
        text.hidden = false;
        text.textContent = `Coordinates: ${reading.latitude.toFixed(5)}, ${reading.longitude.toFixed(5)}`;
      }
      if (coordinates) {
        coordinates.textContent = `Latitude ${reading.latitude.toFixed(5)} | Longitude ${reading.longitude.toFixed(5)}`;
      }
      if (accuracy) {
        accuracy.hidden = false;
        const rounded = Math.max(1, Math.round(reading.accuracy));
        accuracy.textContent = rounded >= 1000
          ? `Best accuracy: +/- ${(rounded / 1000).toFixed(1)} km`
          : `Best accuracy: +/- ${rounded} meters`;
      }

      if (!leaflet || !map) return;

      const point: [number, number] = [reading.latitude, reading.longitude];
      const zoom = reading.accuracy <= 50
        ? 17
        : reading.accuracy <= 150
          ? 16
          : reading.accuracy <= 1000
            ? 13
            : 10;
      map.setView(point, zoom, { animate: true });

      if (!marker) {
        marker = leaflet.marker(point, {
          title: 'Detected resident location',
          draggable: true,
          autoPan: true,
          icon: leaflet.divIcon({
            className: 'location-map-marker-wrapper',
            html: '<span class="location-map-marker"><img src="/images/fire logo.webp" alt="" /></span>',
            iconSize: [38, 38],
            iconAnchor: [19, 19],
          }),
        }).addTo(map).bindTooltip('Fire location', {
          direction: 'top',
          offset: [0, -18],
        });
        marker.dragging?.disable();
        marker.on('dragend', () => {
          if (!isAdjusting || !marker) return;
          const pointAfterDrag = marker.getLatLng();
          void finalizeManualLocation(pointAfterDrag.lat, pointAfterDrag.lng);
        });
      } else {
        marker.setLatLng(point);
      }

      if (!accuracyCircle) {
        accuracyCircle = leaflet.circle(point, {
          radius: Math.max(15, reading.accuracy),
          color: '#d31212',
          weight: 1.5,
          opacity: 0.7,
          fillColor: '#ef4444',
          fillOpacity: 0.1,
          interactive: false,
        }).addTo(map);
      } else {
        accuracyCircle.setLatLng(point);
        accuracyCircle.setRadius(Math.max(15, reading.accuracy));
      }

      window.requestAnimationFrame(() => map?.invalidateSize({ pan: false }));
    }

    async function resolveReading(
      reading: LocationReading,
      source: 'automatic' | 'manual',
      quality: LocationQuality,
    ) {
      const requestRun = detectionRun;
      reverseController?.abort();
      const controller = new AbortController();
      reverseController = controller;
      setMapOverlay(true, 'Checking your Antique address...');
      setLandmark('waiting', 'Checking nearby mapped places...', 'Matching your location');
      if (title) title.textContent = 'Verifying location';
      showError('');

      const query = new URLSearchParams({
        lat: String(reading.latitude),
        lon: String(reading.longitude),
      });

      try {
        const response = await fetch(`${REVERSE_GEOCODE_URL}?${query.toString()}`, {
          headers: { Accept: 'application/json' },
          signal: controller.signal,
        });
        if (!response.ok) throw new Error(`Reverse geocode HTTP ${response.status}`);

        const payload = await response.json() as ReverseGeocodePayload;
        if (disposed || requestRun !== detectionRun) return;

        const resolved = resolvePhilippineAddress(payload.address ?? {});
        const mappedLandmark = resolveNearestLandmark(payload);
        const placeSummary = `${barangayLabel(resolved.barangay)}, ${resolved.municipality || 'Municipality unavailable'}`;
        locationCard.dataset.locationBarangay = resolved.barangay;
        locationCard.dataset.locationMunicipality = resolved.municipality;
        locationCard.dataset.locationProvince = resolved.isAntique ? 'Antique' : '';
        if (barangay) barangay.textContent = barangayLabel(resolved.barangay);
        if (municipality) municipality.textContent = resolved.municipality || 'Municipality unavailable';
        if (coordinates) {
          coordinates.textContent = `Latitude ${reading.latitude.toFixed(5)} | Longitude ${reading.longitude.toFixed(5)}`;
        }
        if (address) address.hidden = false;

        if (!resolved.isAntique) {
          setLocationValidity(false);
          setState('outside');
          setLandmark('unavailable', 'No Antique landmark selected', 'Location is outside Antique');
          if (title) title.textContent = 'Location is outside Antique';
          if (text) {
            text.hidden = false;
            text.textContent = placeSummary;
          }
          showError(
            resolved.municipality
              ? `Detected near ${resolved.municipality}, outside Antique. Keep GPS on and try again, or adjust the pin in Antique.`
              : 'This position could not be verified inside Antique. Try again or adjust the pin.',
          );
        } else {
          setLocationValidity(true);
          setState(source === 'manual' ? 'adjusted' : quality === 'precise' ? 'confirmed' : 'approximate');
          setLandmark(
            mappedLandmark ? 'suggested' : 'unavailable',
            mappedLandmark || 'No named landmark is mapped nearby',
            mappedLandmark ? 'Nearest mapped place' : 'You can adjust the fire pin',
          );
          if (title) title.textContent = source === 'manual' ? 'Fire report pin' : 'Fire report location';
          if (text) {
            text.hidden = true;
            text.textContent = placeSummary;
          }
          if (accuracy) {
            accuracy.hidden = true;
            accuracy.textContent = source === 'manual'
              ? 'Pin selected manually'
              : 'GPS position selected';
          }
          showError('');
        }
        setMapOverlay(false, 'Location verified');
        window.requestAnimationFrame(() => map?.invalidateSize({ pan: false }));
      } catch (reverseError: unknown) {
        if (
          disposed
          || requestRun !== detectionRun
          || (reverseError instanceof DOMException && reverseError.name === 'AbortError')
        ) return;

        setLocationValidity(false);
        setState('error');
        setLandmark('unavailable', 'Landmark lookup unavailable', 'Try detecting your location again');
        if (title) title.textContent = 'Could not verify Antique location';
        if (address) address.hidden = true;
        if (text) text.hidden = false;
        if (accuracy) accuracy.hidden = false;
        showError('Your coordinates were detected, but the Antique address could not be verified. Try again or adjust the pin.');
        setMapOverlay(false, 'Address unavailable');
      } finally {
        if (requestRun === detectionRun) isFinalizing = false;
      }
    }

    async function finalizeAutomaticLocation(reading: LocationReading) {
      if (disposed || isFinalizing) return;
      isFinalizing = true;
      stopDetection();
      const quality = classifyAccuracy(reading.accuracy);

      if (quality === 'poor') {
        isFinalizing = false;
        setLocationValidity(false);
        setState('low-accuracy');
        setLandmark('unavailable', 'Waiting for a more accurate location', 'Landmark not selected');
        if (title) title.textContent = 'Location is still too approximate';
        if (text) text.hidden = false;
        if (accuracy) accuracy.hidden = false;
        showError('The current reading is too broad for a fire report. Keep GPS on, move near a window, then try again or adjust the pin.');
        setMapOverlay(false, 'Low accuracy');
        return;
      }

      await resolveReading(reading, 'automatic', quality);
    }

    async function finalizeManualLocation(latitudeValue: number, longitudeValue: number) {
      detectionRun += 1;
      stopDetection();
      reverseController?.abort();
      isAdjusting = false;
      isFinalizing = true;
      marker?.dragging?.disable();
      const reading: LocationReading = {
        latitude: latitudeValue,
        longitude: longitudeValue,
        accuracy: 10,
        timestamp: Date.now(),
      };
      bestReading = reading;
      updateReading(reading);
      await resolveReading(reading, 'manual', 'precise');
    }

    function handlePosition(position: GeolocationPosition, run: number) {
      if (disposed || run !== detectionRun || isFinalizing) return;
      const candidate: LocationReading = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        timestamp: position.timestamp,
      };
      const selected = chooseBetterReading(bestReading, candidate);
      if (selected === bestReading) return;

      bestReading = selected;
      setLocationValidity(false);
      updateReading(selected);
      if (title) title.textContent = 'Improving location accuracy';
      if (address) address.hidden = true;
      setLandmark('waiting', 'Finding a reliable nearby place...', 'Improving GPS accuracy');
      showError('');

      if (classifyAccuracy(selected.accuracy) === 'precise' && isWithinAntiqueBounds(selected)) {
        void finalizeAutomaticLocation(selected);
        return;
      }

      setState('improving');
      setMapOverlay(true, 'Improving GPS accuracy...');
    }

    function handleLocationError(error: GeolocationPositionError, run: number) {
      if (disposed || run !== detectionRun || isFinalizing) return;
      stopDetection();
      setLocationValidity(false);
      setState('error');
      if (title) title.textContent = error.code === error.PERMISSION_DENIED
        ? 'Location permission needed'
        : 'Location unavailable';
      if (text) text.textContent = 'Allow precise location access to attach your position to this report.';
      if (accuracy) accuracy.textContent = 'No verified location attached';
      if (accuracy) accuracy.hidden = false;
      setLandmark('unavailable', 'Location is needed first', 'Landmark not selected');
      if (text) text.hidden = false;
      showError(locationErrorCopy(error));
      setMapOverlay(false, 'Location unavailable');
    }

    function detectLocation() {
      detectionRun += 1;
      const run = detectionRun;
      stopDetection();
      reverseController?.abort();
      bestReading = null;
      isFinalizing = false;
      isAdjusting = false;
      marker?.dragging?.disable();
      setLocationValidity(false);
      locationCard.dataset.locationBarangay = '';
      locationCard.dataset.locationMunicipality = '';
      locationCard.dataset.locationProvince = '';
      if (address) address.hidden = true;
      if (coordinates) coordinates.textContent = 'Latitude -- | Longitude --';
      if (text) text.hidden = false;
      if (accuracy) accuracy.hidden = false;
      setLandmark('waiting', 'Finding a nearby mapped place...', 'Waiting for location');
      showError('');

      if (!navigator.geolocation) {
        setState('error');
        if (title) title.textContent = 'Location unavailable';
        if (text) text.textContent = 'This browser does not support location detection.';
        if (accuracy) accuracy.textContent = 'No verified location attached';
        if (accuracy) accuracy.hidden = false;
        setLandmark('unavailable', 'Location is not available', 'Landmark not selected');
        setMapOverlay(false, 'Location unavailable');
        return;
      }

      setState('locating');
      if (title) title.textContent = 'Finding you in Antique';
      if (text) text.textContent = 'Allow precise location, then keep GPS on for a few seconds.';
      if (accuracy) accuracy.textContent = 'Waiting for the first GPS reading...';
      setMapOverlay(true, 'Locating you...');

      watchId = navigator.geolocation.watchPosition(
        (position) => handlePosition(position, run),
        (error) => handleLocationError(error, run),
        LOCATION_OPTIONS,
      );
      refinementTimer = window.setTimeout(() => {
        if (disposed || run !== detectionRun || isFinalizing) return;
        if (bestReading) {
          void finalizeAutomaticLocation(bestReading);
          return;
        }
        stopDetection();
        setState('error');
        if (title) title.textContent = 'Location timed out';
        if (accuracy) accuracy.textContent = 'No verified location attached';
        if (accuracy) accuracy.hidden = false;
        setLandmark('unavailable', 'No location was detected', 'Landmark not selected');
        showError('No GPS reading arrived. Turn on precise location, move near a window, and try again.');
        setMapOverlay(false, 'Location timed out');
      }, REFINEMENT_WINDOW_MS);
    }

    function beginManualAdjustment() {
      detectionRun += 1;
      stopDetection();
      reverseController?.abort();
      isFinalizing = false;
      isAdjusting = true;
      setLocationValidity(false);
      setState('adjusting');
      if (title) title.textContent = 'Adjust the report pin';
      if (text) text.textContent = 'Tap the correct place on the map or drag the red marker.';
      if (accuracy) accuracy.textContent = 'Manual pin mode';
      setLandmark('waiting', 'Move the fire pin to the correct place', 'Updating nearby landmark');
      showError('');
      setMapOverlay(false, 'Adjust pin');
      marker?.dragging?.enable();
      map?.invalidateSize({ pan: false });
    }

    function confirmLandmarkSelection() {
      const selectedLandmark = landmarkCard?.dataset.landmarkName?.trim();
      if (!selectedLandmark) return;
      setLandmark('confirmed', selectedLandmark, 'Confirmed by resident');
    }

    function changeLandmarkSelection() {
      beginManualAdjustment();
      mapElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    async function initializeMap() {
      if (!mapElement) return;
      try {
        const leafletModule = await import('leaflet');
        if (disposed || map) return;

        leaflet = leafletModule.default;
        map = leaflet.map(mapElement, {
          center: DEFAULT_MAP_CENTER,
          zoom: 8,
          minZoom: 6,
          maxZoom: 19,
          zoomControl: false,
          attributionControl: true,
        });
        leaflet.tileLayer(OSM_TILE_URL, {
          maxZoom: 19,
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        }).addTo(map);
        leaflet.control.zoom({ position: 'topright' }).addTo(map);
        map.on('click', (event) => {
          if (!isAdjusting) return;
          void finalizeManualLocation(event.latlng.lat, event.latlng.lng);
        });

        if (typeof ResizeObserver !== 'undefined') {
          resizeObserver = new ResizeObserver(() => map?.invalidateSize({ pan: false }));
          resizeObserver.observe(mapElement);
        }
        if (landmarkChange) landmarkChange.disabled = false;
        if (bestReading) updateReading(bestReading);
        window.requestAnimationFrame(() => map?.invalidateSize({ pan: false }));
      } catch {
        if (disposed) return;
        setMapOverlay(true, 'Map unavailable. Check your connection.');
        if (landmarkChange) landmarkChange.disabled = true;
      }
    }

    void initializeMap();
    refreshButton.addEventListener('click', detectLocation);
    adjust?.addEventListener('click', beginManualAdjustment);
    landmarkConfirm?.addEventListener('click', confirmLandmarkSelection);
    landmarkChange?.addEventListener('click', changeLandmarkSelection);
    detectLocation();

    return () => {
      disposed = true;
      detectionRun += 1;
      stopDetection();
      reverseController?.abort();
      resizeObserver?.disconnect();
      refreshButton.removeEventListener('click', detectLocation);
      adjust?.removeEventListener('click', beginManualAdjustment);
      landmarkConfirm?.removeEventListener('click', confirmLandmarkSelection);
      landmarkChange?.removeEventListener('click', changeLandmarkSelection);
      map?.remove();
      map = null;
      marker = null;
      accuracyCircle = null;
      leaflet = null;
    };
  }, []);

  return (
    <div ref={rootRef} dangerouslySetInnerHTML={{ __html: '<style>' + reportFireStyles + '</style>' + reportFireMarkup }} />
  );
}
