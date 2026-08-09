'use client';

import { useEffect, useRef } from 'react';
import { reportFireMarkup, reportFireStyles } from '../../_content/resident-report-fire-content';

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

      navigator.geolocation.getCurrentPosition((position) => {
        const { latitude, longitude, accuracy: meters } = position.coords;
        card.dataset.locationLatitude = latitude.toFixed(6);
        card.dataset.locationLongitude = longitude.toFixed(6);
        setState('success');
        if (title) title.textContent = 'Location Detected';
        if (text) text.textContent = `Coordinates: ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
        if (accuracy) accuracy.textContent = `Accuracy: ${Math.round(meters)} meters`;
      }, (error) => {
        setState('error');
        if (title) title.textContent = 'Location needs permission';
        if (text) text.textContent = 'Allow location access to attach your position to this report.';
        if (accuracy) accuracy.textContent = 'No location attached yet';
        if (errorText) {
          errorText.hidden = false;
          errorText.textContent = locationErrorCopy(error);
        }
      }, LOCATION_OPTIONS);
    };

    refresh.addEventListener('click', detectLocation);
    detectLocation();

    return () => refresh.removeEventListener('click', detectLocation);
  }, []);

  return (
    <div ref={rootRef} dangerouslySetInnerHTML={{ __html: "<style>" + reportFireStyles + "</style>" + reportFireMarkup }} />
  );
}
