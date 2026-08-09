'use client';

import { useEffect, useRef } from 'react';
import 'leaflet/dist/leaflet.css';
import { reportFireMarkup, reportFireStyles } from '../../_content/resident-report-fire-content';

const OSM_TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const REVERSE_GEOCODE_URL = '/api/geocode/reverse';
const DEFAULT_MAP_CENTER: [number, number] = [11.2753568, 121.7387252];
const LOCATION_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 15000,
  maximumAge: 0,
};

function locationErrorCopy(error: GeolocationPositionError) {
  if (error.code === error.PERMISSION_DENIED) {
    return 'Location permission was not allowed. You can try again or adjust the pin manually.';
  }
  if (error.code === error.POSITION_UNAVAILABLE) {
    return 'Your location is temporarily unavailable. Please try again.';
  }
  if (error.code === error.TIMEOUT) {
    return 'Location detection took too long. Please try again.';
  }
  return 'We could not detect your location. Please try again.';
}

type ReverseGeocodePayload = {
  address?: Record<string, string>;
};

function firstAddressValue(address: Record<string, string>, keys: string[]) {
  return keys.map((key) => address[key]).find(Boolean) ?? '';
}

function barangayLabel(value: string) {
  if (!value) return 'Barangay name unavailable';
  return /^barangay\b/i.test(value) ? value : `Barangay ${value}`;
}

function municipalityLabel(value: string) {
  if (!value) return 'Municipality name unavailable';
  return /^municipality\b/i.test(value) ? value : `Municipality ${value}`;
}

export default function ResidentReportFirePage() {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    const card = root?.querySelector<HTMLElement>('[data-location-card]');
    const refresh = root?.querySelector<HTMLButtonElement>('[data-location-refresh]');
    if (!root || !card || !refresh) return;

    const status = root.querySelector<HTMLElement>('[data-location-status]');
    const title = root.querySelector<HTMLElement>('[data-location-title]');
    const text = root.querySelector<HTMLElement>('[data-location-text]');
    const accuracy = root.querySelector<HTMLElement>('[data-location-accuracy]');
    const errorText = root.querySelector<HTMLElement>('[data-location-error]');
    const address = root.querySelector<HTMLElement>('[data-location-address]');
    const barangay = root.querySelector<HTMLElement>('[data-location-barangay]');
    const municipality = root.querySelector<HTMLElement>('[data-location-municipality]');
    const mapElement = root.querySelector<HTMLElement>('[data-location-map]');
    const mapOverlay = root.querySelector<HTMLElement>('[data-location-map-overlay]');
    const mapOverlayLabel = root.querySelector<HTMLElement>('[data-location-map-label]');

    let disposed = false;
    let reverseController: AbortController | null = null;
    let map: import('leaflet').Map | null = null;
    let marker: import('leaflet').Marker | null = null;
    let latestPosition: [number, number] | null = null;

    const setMapOverlay = (visible: boolean, label: string) => {
      mapOverlay?.classList.toggle('is-hidden', !visible);
      if (mapOverlayLabel) mapOverlayLabel.textContent = label;
      mapElement?.setAttribute('aria-busy', String(visible));
    };

    const setMapPosition = (latitude: number, longitude: number, leaflet: typeof import('leaflet')) => {
      latestPosition = [latitude, longitude];
      if (!map) return;

      map.setView(latestPosition, 16, { animate: true });
      if (!marker) {
        marker = leaflet.marker(latestPosition, {
          title: 'Detected resident location',
          icon: leaflet.divIcon({
            className: 'location-map-marker-wrapper',
            html: '<span class="location-map-marker"><img src="/images/fire logo.webp" alt="" /></span>',
            iconSize: [36, 36],
            iconAnchor: [18, 18],
          }),
        }).addTo(map);
      } else {
        marker.setLatLng(latestPosition);
      }
    };

    const initializeMap = async () => {
      if (!mapElement) return;
      const leafletModule = await import('leaflet');
      if (disposed || map) return;

      const leaflet = leafletModule.default;
      map = leaflet.map(mapElement, {
        center: DEFAULT_MAP_CENTER,
        zoom: 8,
        zoomControl: false,
        attributionControl: true,
      });
      leaflet.tileLayer(OSM_TILE_URL, {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);
      if (latestPosition) setMapPosition(latestPosition[0], latestPosition[1], leaflet);
      window.requestAnimationFrame(() => map?.invalidateSize());
    };

    const setState = (kind: 'loading' | 'success' | 'error') => {
      status?.classList.toggle('is-success', kind === 'success');
      status?.classList.toggle('is-error', kind === 'error');
      if (status) {
        status.textContent = kind === 'success'
          ? 'AUTO DETECTED'
          : kind === 'error'
            ? 'LOCATION NEEDED'
            : 'LOCATING...';
      }
      refresh.disabled = kind === 'loading';
    };

    const detectLocation = () => {
      if (!navigator.geolocation) {
        setState('error');
        if (title) title.textContent = 'Location unavailable';
        if (text) text.textContent = 'This browser does not support location detection.';
        if (accuracy) accuracy.textContent = 'No location attached yet';
        setMapOverlay(false, 'Location unavailable');
        return;
      }

      setState('loading');
      if (title) title.textContent = 'Detecting location';
      if (text) text.textContent = 'Requesting your current position...';
      if (accuracy) accuracy.textContent = 'Waiting for permission...';
      if (errorText) {
        errorText.hidden = true;
        errorText.textContent = '';
      }
      if (address) address.hidden = true;
      setMapOverlay(true, 'Locating you...');

      navigator.geolocation.getCurrentPosition((position) => {
        const { latitude, longitude, accuracy: meters } = position.coords;
        card.dataset.locationLatitude = latitude.toFixed(6);
        card.dataset.locationLongitude = longitude.toFixed(6);
        setMapOverlay(true, 'Finding your barangay...');
        setState('success');
        if (title) title.textContent = 'Location Detected';
        if (text) text.textContent = `Coordinates: ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
        if (accuracy) accuracy.textContent = `Accuracy: ${Math.round(meters)} meters`;
        reverseController?.abort();
        reverseController = new AbortController();

        const leafletPromise = import('leaflet');
        void leafletPromise.then((leafletModule) => {
          if (!disposed) setMapPosition(latitude, longitude, leafletModule.default);
        });

        const query = new URLSearchParams({
          format: 'jsonv2',
          lat: String(latitude),
          lon: String(longitude),
          zoom: '18',
          addressdetails: '1',
        });
        fetch(`${REVERSE_GEOCODE_URL}?${query.toString()}`, {
          headers: { Accept: 'application/json' },
          signal: reverseController.signal,
        })
          .then(async (response) => {
            if (!response.ok) throw new Error(`Reverse geocode HTTP ${response.status}`);
            return response.json() as Promise<ReverseGeocodePayload>;
          })
          .then((payload) => {
            if (disposed) return;
            const reverseAddress = payload.address ?? {};
            const barangayValue = firstAddressValue(reverseAddress, ['village', 'suburb', 'neighbourhood', 'quarter', 'hamlet']);
            const municipalityValue = firstAddressValue(reverseAddress, ['municipality', 'city', 'town', 'county']);
            card.dataset.locationBarangay = barangayValue;
            card.dataset.locationMunicipality = municipalityValue;
            if (barangay) barangay.textContent = barangayLabel(barangayValue);
            if (municipality) municipality.textContent = municipalityLabel(municipalityValue);
            if (address) address.hidden = false;
            setMapOverlay(false, 'Location detected');
          })
          .catch((reverseError: unknown) => {
            if (disposed || (reverseError instanceof DOMException && reverseError.name === 'AbortError')) return;
            card.dataset.locationBarangay = '';
            card.dataset.locationMunicipality = '';
            if (barangay) barangay.textContent = 'Barangay name unavailable';
            if (municipality) municipality.textContent = 'Municipality name unavailable';
            if (address) address.hidden = false;
            setMapOverlay(false, 'Location detected');
          });
      }, (error) => {
        if (disposed) return;
        setState('error');
        if (title) title.textContent = 'Location needs permission';
        if (text) text.textContent = 'Allow location access to attach your position to this report.';
        if (accuracy) accuracy.textContent = 'No location attached yet';
        setMapOverlay(false, 'Location unavailable');
        if (errorText) {
          errorText.hidden = false;
          errorText.textContent = locationErrorCopy(error);
        }
      }, LOCATION_OPTIONS);
    };

    void initializeMap();
    refresh.addEventListener('click', detectLocation);
    detectLocation();

    return () => {
      disposed = true;
      reverseController?.abort();
      refresh.removeEventListener('click', detectLocation);
      map?.remove();
      map = null;
      marker = null;
    };
  }, []);

  return (
    <div ref={rootRef} dangerouslySetInnerHTML={{ __html: "<style>" + reportFireStyles + "</style>" + reportFireMarkup }} />
  );
}
