'use client';

import { useEffect, useRef, useState } from 'react';
import 'leaflet/dist/leaflet.css';
import type { Circle, Map as LeafletMap, Marker } from 'leaflet';
import { ResidentFireLoader } from '../../_components/resident-fire-loader';
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
  return <LegacyResidentReportFirePage />;
}

function LegacyResidentReportFirePage() {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;

    const handleSubmissionState = (event: Event) => {
      setIsSubmitting(Boolean((event as CustomEvent<{ loading?: boolean }>).detail?.loading));
    };
    root.addEventListener('resident-report:submission-state', handleSubmissionState);

    const disposeLocation = initializeLocationLogic(root);
    const disposePhotoCapture = initializePhotoCapture(root);
    const disposeSubmission = initializeReportSubmission(root);
    const disposeScrollIndicator = initializeScrollDownIndicator(root);

    return () => {
      disposeScrollIndicator();
      disposeSubmission();
      disposePhotoCapture();
      disposeLocation();
      root.removeEventListener('resident-report:submission-state', handleSubmissionState);
    };
  }, []);

  return (
    <>
      <style>{reportFireStyles}</style>
      <div ref={rootRef} dangerouslySetInnerHTML={{ __html: reportFireMarkup }} />
      {isSubmitting && <ResidentFireLoader label="Sending your fire alert…" />}
    </>
  );
}

function initializeScrollDownIndicator(root: HTMLElement): () => void {
  const scrollDownBtn = root.querySelector<HTMLButtonElement>('[data-scroll-down-btn]');
  if (!scrollDownBtn) return () => {};

  const handleScroll = () => {
    const scrollY = window.scrollY || document.documentElement.scrollTop;
    if (scrollY > 50) {
      scrollDownBtn.classList.add('is-hidden');
    } else {
      scrollDownBtn.classList.remove('is-hidden');
    }
  };

  const handleScrollDownClick = () => {
    const target = root.querySelector('.landmark-box') || root.querySelector('.tactical-grid-3') || root.querySelector('.photo-field');
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      window.scrollBy({ top: 380, behavior: 'smooth' });
    }
  };

  window.addEventListener('scroll', handleScroll, { passive: true });
  scrollDownBtn.addEventListener('click', handleScrollDownClick);

  return () => {
    window.removeEventListener('scroll', handleScroll);
    scrollDownBtn.removeEventListener('click', handleScrollDownClick);
  };
}

function initializeReportSubmission(root: HTMLElement): () => void {
  const submitButton = root.querySelector<HTMLButtonElement>('[data-report-submit]');
  const cancelButton = root.querySelector<HTMLButtonElement>('[data-report-cancel]');
  const errorMessage = root.querySelector<HTMLElement>('[data-report-submit-error]');
  const locationCard = root.querySelector<HTMLElement>('[data-location-card]');
  const landmarkInput = root.querySelector<HTMLInputElement>('[data-landmark-input]');
  const photoInput = root.querySelector<HTMLInputElement>('[data-photo-input]');
  const typeButtons = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-fire-type]'));
  const densityButton = root.querySelector<HTMLButtonElement>('[data-quick-density]');
  const routeButton = root.querySelector<HTMLButtonElement>('[data-quick-route]');
  if (!submitButton || !locationCard || !landmarkInput || !photoInput || typeButtons.length === 0) return () => {};

  let fireType = typeButtons.find((button) => button.classList.contains('selected'))?.dataset.fireType ?? 'HOUSE_BUILDING';
  let selectedDensity: string | null = null;
  let selectedRoute: string | null = null;
  let submitting = false;
  let attachedPhotos: File[] = [];

  const handlePhotosUpdated = (event: Event) => {
    const detail = (event as CustomEvent<{ files?: File[] }>).detail;
    attachedPhotos = detail?.files ?? [];
  };
  root.addEventListener('resident-report:photos-updated', handlePhotosUpdated);

  const showError = (message: string) => {
    if (!errorMessage) return;
    errorMessage.hidden = !message;
    errorMessage.textContent = message;
    if (message) {
      errorMessage.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };
  const typeHandlers = new Map<HTMLButtonElement, () => void>();

  const setSubmissionLoading = (loading: boolean) => {
    root.dispatchEvent(new CustomEvent('resident-report:submission-state', { detail: { loading } }));
  };

  const resetSubmission = () => {
    submitting = false;
    submitButton.disabled = false;
    submitButton.textContent = 'SEND FIRE ALERT';
    setSubmissionLoading(false);
  };

  const detectLocationForSubmission = () => new Promise<boolean>((resolve) => {
    root.dispatchEvent(new CustomEvent('resident-report:request-location', { detail: { resolve } }));
  });

  typeButtons.forEach((button) => {
    const handler = () => {
      fireType = button.dataset.fireType ?? 'HOUSE_BUILDING';
      typeButtons.forEach((item) => item.classList.toggle('selected', item === button));
    };
    typeHandlers.set(button, handler);
    button.addEventListener('click', handler);
  });

  const handleDensityClick = () => {
    if (!densityButton) return;
    const active = densityButton.classList.toggle('is-active');
    densityButton.setAttribute('aria-pressed', String(active));
    selectedDensity = active ? (densityButton.dataset.quickDensity || 'PACKED_MAGKAKADIKIT') : null;
  };

  const handleRouteClick = () => {
    if (!routeButton) return;
    const active = routeButton.classList.toggle('is-active');
    routeButton.setAttribute('aria-pressed', String(active));
    selectedRoute = active ? (routeButton.dataset.quickRoute || 'INTERIOR_ALLEY_ESKINITA') : null;
  };

  densityButton?.addEventListener('click', handleDensityClick);
  routeButton?.addEventListener('click', handleRouteClick);

  const submit = async () => {
    if (submitting) return;
    showError('');
    if (locationCard.dataset.locationValid !== 'true') {
      submitting = true;
      submitButton.disabled = true;
      submitButton.textContent = 'DETECTING LOCATION…';
      setSubmissionLoading(true);
      const locationDetected = await detectLocationForSubmission();
      if (!locationDetected) {
        showError('We could not verify your current location. Turn on precise location, then try again.');
        resetSubmission();
        return;
      }
    }
    const { locationLatitude, locationLongitude, locationAccuracy, locationMunicipality, locationBarangay } = locationCard.dataset;
    if (!locationLatitude || !locationLongitude || !locationMunicipality || !locationBarangay) {
      showError('Current GPS location, municipality, and barangay are required.');
      resetSubmission();
      return;
    }
    submitting = true;
    submitButton.disabled = true;
    submitButton.textContent = 'SENDING FIRE ALERT…';
    setSubmissionLoading(true);
    const form = new FormData();
    form.set('fireType', fireType);
    form.set("latitude", locationLatitude);
    form.set('longitude', locationLongitude);
    form.set('locationAccuracy', locationAccuracy ?? '');
    form.set('municipality', locationMunicipality);
    form.set('barangay', locationBarangay);
    form.set('landmark', landmarkInput.value.trim());
    form.set('description', '');
    if (selectedDensity) form.set('houseDensity', selectedDensity);
    if (selectedRoute) form.set('routeAccessibility', selectedRoute);
    if (locationCard.dataset.weatherTemperature) form.set('weatherTemperature', locationCard.dataset.weatherTemperature);
    if (locationCard.dataset.weatherHumidity) form.set('weatherHumidity', locationCard.dataset.weatherHumidity);
    if (locationCard.dataset.weatherWindSpeed) form.set('weatherWindSpeed', locationCard.dataset.weatherWindSpeed);
    if (locationCard.dataset.weatherWindDirection) form.set('weatherWindDirection', locationCard.dataset.weatherWindDirection);
    if (locationCard.dataset.weatherWindCondition) form.set('weatherWindCondition', locationCard.dataset.weatherWindCondition);
    if (attachedPhotos.length > 0) {
      attachedPhotos.forEach((file) => form.append('photos', file));
      form.set('photo', attachedPhotos[0] || photoInput.files?.[0]);
    } else if (photoInput.files?.[0]) {
      form.set("photo", photoInput.files[0]);
    }
    try {
      const response = await fetch("/api/resident/fire-reports", { method: "POST", body: form });
      const data = await response.json() as { error?: string; report?: { id: string } };
      if (!response.ok || !data.report?.id) throw new Error(data.error || 'Unable to submit the fire report.');
      window.location.assign(`/resident/reports/${data.report.id}`);
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Unable to submit the fire report.');
      resetSubmission();
    }
  };
  const cancel = () => window.location.assign('/resident');
  submitButton.addEventListener('click', submit);
  cancelButton?.addEventListener('click', cancel);

  return () => {
    typeHandlers.forEach((handler, button) => button.removeEventListener('click', handler));
    densityButton?.removeEventListener('click', handleDensityClick);
    routeButton?.removeEventListener('click', handleRouteClick);
    submitButton.removeEventListener('click', submit);
    cancelButton?.removeEventListener('click', cancel);
    root.removeEventListener('resident-report:photos-updated', handlePhotosUpdated);
  };
}

async function compressImageForUpload(file: File): Promise<File> {
  if (typeof document === 'undefined' || typeof Image === 'undefined') return file;
  if (file.size < 280 * 1024 && (file.type === 'image/jpeg' || file.type === 'image/png' || file.type === 'image/webp')) {
    return file;
  }
  return new Promise((resolve) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const maxDimension = 1440;
      let { width, height } = img;
      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(file);
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(file);
            return;
          }
          const cleanName = file.name.replace(/\.[^/.]+$/, '') + '.jpg';
          resolve(new File([blob], cleanName, { type: 'image/jpeg' }));
        },
        'image/jpeg',
        0.80
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(file);
    };
    img.src = objectUrl;
  });
}

function initializePhotoCapture(root: HTMLElement): () => void {
  const openButton = root.querySelector<HTMLButtonElement>('[data-photo-open]');
  const photoInput = root.querySelector<HTMLInputElement>('[data-photo-input]');
  const gridList = root.querySelector<HTMLElement>('[data-photo-grid-list]');
  const thumbsContainer = root.querySelector<HTMLElement>('[data-photo-thumbs-container]');
  const addAnotherBtn = root.querySelector<HTMLButtonElement>('[data-photo-add-another]');
  const countPill = root.querySelector<HTMLElement>('[data-photo-count-pill]');

  // Legacy compat handles for test coverage
  const takeButton = root.querySelector<HTMLButtonElement>('[data-photo-take]');
  const useButton = root.querySelector<HTMLButtonElement>('[data-photo-use]');

  if (!openButton || !photoInput) {
    return () => {};
  }

  type StoredPhoto = { file: File; url: string };
  let photos: StoredPhoto[] = [];

  const updateUI = () => {
    if (photos.length === 0) {
      openButton.hidden = false;
      openButton.dataset.photoState = 'empty';
      if (gridList) gridList.hidden = true;
    } else {
      openButton.hidden = true;
      openButton.dataset.photoState = 'selected';
      if (gridList) gridList.hidden = false;

      if (thumbsContainer) {
        thumbsContainer.innerHTML = '';
        photos.forEach((item, index) => {
          const thumb = document.createElement('div');
          thumb.className = 'photo-thumb-item';
          thumb.innerHTML = `
            <img src="${item.url}" alt="Fire photo ${index + 1}" class="photo-thumb-img" />
            <button type="button" class="photo-thumb-remove" aria-label="Remove photo ${index + 1}">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
            <span class="photo-thumb-badge">Photo ${index + 1}</span>
          `;
          const removeBtn = thumb.querySelector<HTMLButtonElement>('.photo-thumb-remove');
          removeBtn?.addEventListener('click', (e) => {
            e.stopPropagation();
            removePhoto(index);
          });
          thumbsContainer.appendChild(thumb);
        });
      }

      if (addAnotherBtn) {
        addAnotherBtn.hidden = photos.length >= 3;
        if (countPill) countPill.textContent = `${photos.length}/3`;
      }
    }

    const event = new CustomEvent('resident-report:photos-updated', {
      detail: { files: photos.map((p) => p.file) },
    });
    root.dispatchEvent(event);
  };

  const removePhoto = (index: number) => {
    const removed = photos.splice(index, 1);
    if (removed[0]?.url) URL.revokeObjectURL(removed[0].url);
    updateUI();
  };

  const openCamera = () => {
    if (photos.length >= 3) return;
    photoInput.click();
  };

  const handlePhotoChange = async () => {
    const newFiles = Array.from(photoInput.files ?? []);
    if (newFiles.length === 0) return;

    const availableSlots = 3 - photos.length;
    const toAdd = newFiles.slice(0, availableSlots);
    photoInput.value = '';

    for (const rawFile of toAdd) {
      const optimizedFile = await compressImageForUpload(rawFile);
      photos.push({
        file: optimizedFile,
        url: URL.createObjectURL(optimizedFile),
      });
    }

    updateUI();
  };

  openButton.addEventListener('click', openCamera);
  addAnotherBtn?.addEventListener('click', openCamera);
  takeButton?.addEventListener('click', openCamera);
  useButton?.addEventListener('click', () => {});
  photoInput.addEventListener('change', handlePhotoChange);

  updateUI();

  return () => {
    photos.forEach((p) => URL.revokeObjectURL(p.url));
    photos = [];
    openButton.removeEventListener('click', openCamera);
    addAnotherBtn?.removeEventListener('click', openCamera);
    takeButton?.removeEventListener('click', openCamera);
    photoInput.removeEventListener('change', handlePhotoChange);
  };
}

/* ─────────────────────────────────────────────────────────────
 * All DOM-dependent location logic extracted here so it only
 * runs once the innerHTML elements are guaranteed to exist.
 * ───────────────────────────────────────────────────────────── */
function initializeLocationLogic(root: HTMLElement): () => void {
    const card = root.querySelector<HTMLElement>('[data-location-card]');
    const refresh = root.querySelector<HTMLButtonElement>('[data-location-refresh]');
    if (!card || !refresh) return () => {};
    const locationCard: HTMLElement = card;
    const refreshButton: HTMLButtonElement = refresh;

    const status = root.querySelector<HTMLElement>('[data-location-status]');
    const title = root.querySelector<HTMLElement>('[data-location-title]');
    const text = root.querySelector<HTMLElement>('[data-location-text]');
    const accuracy = root.querySelector<HTMLElement>('.accuracy[data-location-accuracy]');
    const errorText = root.querySelector<HTMLElement>('[data-location-error]');
    const address = root.querySelector<HTMLElement>('[data-location-address]');
    const barangay = root.querySelector<HTMLElement>('[data-location-place] [data-location-barangay]');
    const municipality = root.querySelector<HTMLElement>('[data-location-place] [data-location-municipality]');
    const coordinates = root.querySelector<HTMLElement>('[data-location-coordinates]');
    const mapElement = root.querySelector<HTMLElement>('[data-location-map]');
    const mapOverlay = root.querySelector<HTMLElement>('[data-location-map-overlay]');
    const mapOverlayLabel = root.querySelector<HTMLElement>('[data-location-map-label]');
    const landmarkCard = root.querySelector<HTMLElement>('[data-nearest-landmark]');
    const landmarkName = root.querySelector<HTMLElement>('[data-landmark-name]');
    const landmarkStatus = root.querySelector<HTMLElement>('[data-landmark-status]');
    const landmarkInput = root.querySelector<HTMLInputElement>('[data-landmark-input]');
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
    let hasManualLandmark = false;
    let leaflet: typeof import('leaflet') | null = null;
    let map: LeafletMap | null = null;
    let marker: Marker | null = null;
    let accuracyCircle: Circle | null = null;
    let resizeObserver: ResizeObserver | null = null;
    const locationRequestResolvers = new Map<number, Set<(valid: boolean) => void>>();

    function settleLocationRequests(run: number, valid: boolean) {
      const resolvers = locationRequestResolvers.get(run);
      if (!resolvers) return;
      resolvers.forEach((resolve) => resolve(valid));
      locationRequestResolvers.delete(run);
    }

    function settleAllLocationRequests(valid: boolean) {
      locationRequestResolvers.forEach((resolvers) => resolvers.forEach((resolve) => resolve(valid)));
      locationRequestResolvers.clear();
    }

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

    function showLocationSummary(
      reading: LocationReading | null,
      barangayValue: string,
      municipalityValue: string,
    ) {
      if (address) address.hidden = false;
      if (barangay) barangay.textContent = barangayValue;
      if (municipality) municipality.textContent = municipalityValue;
      if (coordinates) {
        coordinates.textContent = reading
          ? `Latitude ${reading.latitude.toFixed(5)} | Longitude ${reading.longitude.toFixed(5)}`
          : 'Latitude -- | Longitude --';
      }
      if (text) {
        text.hidden = true;
        text.textContent = `${barangayValue}, ${municipalityValue}`;
      }
      if (accuracy) {
        accuracy.hidden = true;
        accuracy.textContent = '';
      }
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
      if (landmarkInput && !hasManualLandmark && (kind === 'suggested' || kind === 'confirmed')) {
        landmarkInput.value = nameValue;
      }
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
      showLocationSummary(reading, 'Barangay checking', 'Municipality checking');

      if (!locationCard.dataset.weatherFetched) {
        locationCard.dataset.weatherFetched = 'pending';
        fetch(`/api/weather/current?lat=${reading.latitude}&lng=${reading.longitude}`)
          .then((res) => res.json())
          .then((data) => {
            if (!data?.weather) return;
            const w = data.weather;
            locationCard.dataset.weatherTemperature = String(w.temperatureC);
            locationCard.dataset.weatherHumidity = String(w.relativeHumidity);
            locationCard.dataset.weatherWindSpeed = String(w.windSpeedKph);
            locationCard.dataset.weatherWindDirection = String(w.windDirectionDeg);
            locationCard.dataset.weatherWindCondition = w.windCondition;
            locationCard.dataset.weatherFetched = 'done';
          })
          .catch(() => {
            locationCard.dataset.weatherFetched = '';
          });
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
          draggable: false,
          autoPan: false,
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
    ): Promise<boolean> {
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
        if (disposed || requestRun !== detectionRun) return false;

        const resolved = resolvePhilippineAddress(payload.address ?? {});
        const mappedLandmark = resolveNearestLandmark(payload);
        const placeSummary = `${barangayLabel(resolved.barangay)}, ${resolved.municipality || 'Municipality unavailable'}`;
        locationCard.dataset.locationBarangay = resolved.barangay;
        locationCard.dataset.locationMunicipality = resolved.municipality;
        locationCard.dataset.locationProvince = resolved.isAntique ? 'Antique' : '';
        showLocationSummary(
          reading,
          barangayLabel(resolved.barangay),
          resolved.municipality || 'Municipality unavailable',
        );

        if (!resolved.isAntique) {
          setLocationValidity(false);
          setState('outside');
          setLandmark('unavailable', 'No Antique landmark selected', 'Location is outside Antique');
          if (title) title.textContent = 'Location is outside Antique';
          if (text) {
            text.textContent = placeSummary;
          }
          showError(
            resolved.municipality
              ? `Detected near ${resolved.municipality}, outside Antique. Keep GPS on and try again, or adjust the pin in Antique.`
              : 'This position could not be verified inside Antique. Try again or adjust the pin.',
          );
          setMapOverlay(false, 'Location is outside Antique');
          return false;
        } else {
          setLocationValidity(true);
          setState(source === 'manual' ? 'adjusted' : quality === 'precise' ? 'confirmed' : 'approximate');
          setLandmark(
            mappedLandmark ? 'suggested' : 'unavailable',
            mappedLandmark || 'No named landmark is mapped nearby',
            mappedLandmark ? 'Nearest mapped place' : 'You can adjust the fire pin',
          );
          if (title) title.textContent = source === 'manual' ? 'Fire report pin' : 'Fire report location';
          if (text) text.textContent = placeSummary;
          showError('');
          setMapOverlay(false, 'Location verified');
          window.requestAnimationFrame(() => map?.invalidateSize({ pan: false }));
          return true;
        }
      } catch (reverseError: unknown) {
        if (
          disposed
          || requestRun !== detectionRun
          || (reverseError instanceof DOMException && reverseError.name === 'AbortError')
        ) return false;

        setLocationValidity(false);
        setState('error');
        setLandmark('unavailable', 'Landmark lookup unavailable', 'Try detecting your location again');
        if (title) title.textContent = 'Could not verify Antique location';
        showLocationSummary(reading, 'Barangay unavailable', 'Municipality unavailable');
        showError('Your coordinates were detected, but the Antique address could not be verified. Try again or adjust the pin.');
        setMapOverlay(false, 'Address unavailable');
        return false;
      } finally {
        if (requestRun === detectionRun) isFinalizing = false;
      }
    }

    async function finalizeAutomaticLocation(reading: LocationReading, run: number) {
      if (disposed || run !== detectionRun || isFinalizing) return;
      isFinalizing = true;
      stopDetection();
      const quality = classifyAccuracy(reading.accuracy);

      if (quality === 'poor') {
        isFinalizing = false;
        setLocationValidity(false);
        setState('low-accuracy');
        setLandmark('unavailable', 'Waiting for a more accurate location', 'Landmark not selected');
        if (title) title.textContent = 'Location is still too approximate';
        showError('The current reading is too broad for a fire report. Keep GPS on, move near a window, then try again or adjust the pin.');
        setMapOverlay(false, 'Low accuracy');
        settleLocationRequests(run, false);
        return;
      }

      settleLocationRequests(run, await resolveReading(reading, 'automatic', quality));
    }

    async function finalizeManualLocation(latitudeValue: number, longitudeValue: number) {
      detectionRun += 1;
      stopDetection();
      reverseController?.abort();
      isAdjusting = false;
      hasManualLandmark = false;
      if (landmarkInput) landmarkInput.value = '';
      isFinalizing = true;
      const run = detectionRun;
      marker?.dragging?.disable();
      const reading: LocationReading = {
        latitude: latitudeValue,
        longitude: longitudeValue,
        accuracy: 10,
        timestamp: Date.now(),
      };
      bestReading = reading;
      updateReading(reading);
      settleLocationRequests(run, await resolveReading(reading, 'manual', 'precise'));
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
      setLandmark('waiting', 'Finding a reliable nearby place...', 'Improving GPS accuracy');
      showError('');

      if (classifyAccuracy(selected.accuracy) === 'precise' && isWithinAntiqueBounds(selected)) {
        void finalizeAutomaticLocation(selected, run);
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
      settleLocationRequests(run, false);
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
      showLocationSummary(null, 'Barangay checking', 'Municipality checking');
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
        settleLocationRequests(run, false);
        return run;
      }

      setState('locating');
      if (title) title.textContent = 'Finding you in Antique';
      setMapOverlay(true, 'Locating you...');

      watchId = navigator.geolocation.watchPosition(
        (position) => handlePosition(position, run),
        (error) => handleLocationError(error, run),
        LOCATION_OPTIONS,
      );
      refinementTimer = window.setTimeout(() => {
        if (disposed || run !== detectionRun || isFinalizing) return;
        if (bestReading) {
          void finalizeAutomaticLocation(bestReading, run);
          return;
        }
        stopDetection();
        setState('error');
        if (title) title.textContent = 'Location timed out';
        setLandmark('unavailable', 'No location was detected', 'Landmark not selected');
        showError('No GPS reading arrived. Turn on precise location, move near a window, and try again.');
        setMapOverlay(false, 'Location timed out');
        settleLocationRequests(run, false);
      }, REFINEMENT_WINDOW_MS);
      return run;
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
      if (accuracy) accuracy.hidden = true;
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
          dragging: false,
          touchZoom: false,
          scrollWheelZoom: false,
          doubleClickZoom: false,
          boxZoom: false,
          keyboard: false,
          attributionControl: true,
        });
        leaflet.tileLayer(OSM_TILE_URL, {
          maxZoom: 19,
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        }).addTo(map);
        if (false as boolean) {
          leaflet.control.zoom({ position: 'topright' }).addTo(map);
        }
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

    const handleSubmissionLocationRequest = (event: Event) => {
      const detail = (event as CustomEvent<{ resolve?: (valid: boolean) => void }>).detail;
      if (!detail?.resolve) return;
      if (locationCard.dataset.locationValid === 'true') {
        detail.resolve(true);
        return;
      }
      const run = detectLocation();
      const resolvers = locationRequestResolvers.get(run) ?? new Set<(valid: boolean) => void>();
      resolvers.add(detail.resolve);
      locationRequestResolvers.set(run, resolvers);
    };

    void initializeMap();
    refreshButton.addEventListener('click', detectLocation);
    root.addEventListener('resident-report:request-location', handleSubmissionLocationRequest);
    landmarkInput?.addEventListener('input', () => {
      const manualLandmark = landmarkInput.value.trim();
      hasManualLandmark = Boolean(manualLandmark);
      if (!manualLandmark) return;
      if (landmarkCard) {
        landmarkCard.dataset.landmarkState = 'confirmed';
        landmarkCard.dataset.landmarkName = manualLandmark;
      }
      if (landmarkName) landmarkName.textContent = manualLandmark;
      if (landmarkStatus) landmarkStatus.textContent = 'Entered by resident';
    });
    landmarkConfirm?.addEventListener('click', confirmLandmarkSelection);
    landmarkChange?.addEventListener('click', changeLandmarkSelection);
    detectLocation();

    return () => {
      disposed = true;
      detectionRun += 1;
      stopDetection();
      reverseController?.abort();
      settleAllLocationRequests(false);
      resizeObserver?.disconnect();
      refreshButton.removeEventListener('click', detectLocation);
      root.removeEventListener('resident-report:request-location', handleSubmissionLocationRequest);
      landmarkConfirm?.removeEventListener('click', confirmLandmarkSelection);
      landmarkChange?.removeEventListener('click', changeLandmarkSelection);
      map?.remove();
      map = null;
      marker = null;
      accuracyCircle = null;
      leaflet = null;
    };
}
