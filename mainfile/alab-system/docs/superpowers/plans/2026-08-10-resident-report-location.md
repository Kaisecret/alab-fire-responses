# Resident Report Location Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Automatically request and display a resident's browser location in the existing fire-report location step while preserving the rest of the report UI.

**Architecture:** Keep the report's existing HTML-string content module and add data hooks to its location card. Convert the page wrapper into a small client component that owns a scoped `useEffect`, calls the browser Geolocation API, updates only those hooks, initializes a Leaflet mini-map, and cleans up listeners/map resources on unmount. After a successful position, make one Nominatim reverse lookup for barangay and municipality labels, retaining coordinates as the fallback.

**Tech Stack:** Next.js App Router, React client component, browser Geolocation API, existing inline report CSS, Node test runner with static contract tests.

## Global Constraints

- Change only the resident fire-report location step and its client behavior.
- Replace the placeholder location icon with the existing project fire/location icon treatment.
- Preserve the landmark, fire-type, description, photo, navigation, and submission UI.
- Use one Nominatim reverse lookup per successful detection to resolve barangay and municipality labels from OpenStreetMap.
- Show a lightweight Leaflet mini-map with a locating pulse and a project-styled position marker.
- Handle denied, unavailable, and timed-out location as recoverable UI states.

---

### Task 1: Add the failing resident-location contract tests

**Files:**
- Create: `mainfile/alab-system/tests/resident-report-location.test.mjs`

**Interfaces:**
- Consumes: `app/resident/report-fire/page.tsx` and `app/_content/resident-report-fire-content.ts` source text.
- Produces: a regression contract for browser geolocation, the location data hooks, ALAB icon, success/error states, and retry behavior.

- [ ] **Step 1: Write the failing test**

```js
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();

test("resident fire report requests browser location and updates the scoped location card", () => {
  const page = readFileSync(join(root, "app", "resident", "report-fire", "page.tsx"), "utf8");
  const content = readFileSync(join(root, "app", "_content", "resident-report-fire-content.ts"), "utf8");

  assert.match(page, /navigator\.geolocation\.getCurrentPosition/);
  assert.match(page, /useEffect/);
  assert.match(page, /PERMISSION_DENIED|LOCATION_NEEDED/);
  assert.match(content, /data-location-card/);
  assert.match(content, /data-location-refresh/);
  assert.match(content, /data-location-latitude/);
  assert.match(content, /data-location-longitude/);
  assert.match(content, /data-location-status/);
  assert.match(content, /data-location-text/);
  assert.match(content, /data-location-accuracy/);
  assert.match(content, /\/images\/fire logo\.webp/);
});

test("resident fire report keeps a retry path when location permission is unavailable", () => {
  const page = readFileSync(join(root, "app", "resident", "report-fire", "page.tsx"), "utf8");
  const content = readFileSync(join(root, "app", "_content", "resident-report-fire-content.ts"), "utf8");

  assert.match(content, /Try again|Detect my location/);
  assert.match(page, /PERMISSION_DENIED/);
  assert.match(page, /POSITION_UNAVAILABLE/);
  assert.match(page, /TIMEOUT/);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run from `mainfile/alab-system`:

```bash
node --test tests/resident-report-location.test.mjs
```

Expected: FAIL because the current static page has no client geolocation effect or data hooks.

- [ ] **Step 3: Commit the failing test**

```bash
git add tests/resident-report-location.test.mjs
git commit -m "test: define resident location detection behavior"
```

### Task 2: Add location data hooks and project icon styling

**Files:**
- Modify: `mainfile/alab-system/app/_content/resident-report-fire-content.ts` in the location step markup and location CSS.

**Interfaces:**
- Consumes: the existing `.location-box`, `.location-details`, `.map-preview`, and `.btn-small-outline` styles.
- Produces: `[data-location-card]`, `[data-location-status]`, `[data-location-text]`, `[data-location-accuracy]`, `[data-location-error]`, `[data-location-refresh]`, `[data-location-latitude]`, and `[data-location-longitude]` hooks for the page effect.

- [ ] **Step 1: Add focused location styles**

Add these selectors next to the existing location styles:

```css
.location-box[data-location-card] { position: relative; min-height: 9.7rem; }
.location-status { font-size: 0.7rem; color: #b45309; background: #fff7ed; padding: 0.2rem 0.5rem; border-radius: 1rem; font-weight: 700; }
.location-status.is-success { color: #15803d; background: #dcfce7; }
.location-status.is-error { color: #b91c1c; background: #fee2e2; }
.location-details h4 { display: flex; align-items: center; gap: 0.4rem; }
.location-heading-icon { width: 1.1rem; height: 1.1rem; color: var(--primary-red); }
.location-error { color: #b91c1c; font-size: 0.72rem; line-height: 1.3; margin-bottom: 0.65rem; }
.map-preview { display: grid; place-items: center; background: #fff5f5; border: 1px solid #fecaca; }
.map-preview::after { display: none; }
.map-preview img { width: 3.1rem; height: 3.1rem; object-fit: contain; }
```

- [ ] **Step 2: Replace only the static location card contents**

Keep the step title and surrounding grid unchanged. Add the data attributes and replace the placeholder red CSS pin with the existing project asset:

```html
<span class="location-status" data-location-status>LOCATING...</span>
<div class="location-box" data-location-card data-location-latitude="" data-location-longitude="">
  <div class="location-details">
    <h4>
      <svg class="location-heading-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 21s7-6.1 7-12A7 7 0 0 0 5 9c0 5.9 7 12 7 12Z"/><circle cx="12" cy="9" r="2.5"/></svg>
      <span data-location-title>Detecting location</span>
    </h4>
    <p data-location-text>Allow location access in your browser to attach your position.</p>
    <div class="accuracy" data-location-accuracy>Waiting for permission...</div>
    <div class="location-error" data-location-error hidden></div>
    <div class="action-btn-row">
      <button type="button" class="btn-small-outline" data-location-adjust>Adjust Pin</button>
      <button type="button" class="btn-small-outline" data-location-refresh>Detect my location</button>
    </div>
  </div>
  <div class="map-preview" aria-hidden="true"><img src="/images/fire logo.webp" alt="ALAB fire response location" /></div>
</div>
```

### Task 3: Implement the client-side Geolocation API flow

**Files:**
- Modify: `mainfile/alab-system/app/resident/report-fire/page.tsx`

**Interfaces:**
- Consumes: the location data hooks from Task 2.
- Produces: an automatic permission request on mount, a retry button, successful coordinate state, and recoverable error states.

- [ ] **Step 1: Add the minimal geolocation effect**

Use a scoped root ref and cleanup the click listener:

```tsx
'use client';

import { useEffect, useRef } from 'react';

const LOCATION_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 15000,
  maximumAge: 0,
};

function locationErrorCopy(error: GeolocationPositionError) {
  if (error.code === error.PERMISSION_DENIED) return 'Location permission was not allowed. You can try again or adjust the pin manually.';
  if (error.code === error.POSITION_UNAVAILABLE) return 'Your location is temporarily unavailable. Please try again.';
  if (error.code === error.TIMEOUT) return 'Location detection took too long. Please try again.';
  return 'We could not detect your location. Please try again.';
}
```

Inside the component, request once on mount and again only from `[data-location-refresh]`:

```tsx
const rootRef = useRef<HTMLDivElement | null>(null);

useEffect(() => {
  const root = rootRef.current;
  const card = root?.querySelector<HTMLElement>('[data-location-card]');
  const refresh = root?.querySelector<HTMLButtonElement>('[data-location-refresh]');
  if (!card || !refresh) return;

  const status = root.querySelector<HTMLElement>('[data-location-status]');
  const title = root.querySelector<HTMLElement>('[data-location-title]');
  const text = root.querySelector<HTMLElement>('[data-location-text]');
  const accuracy = root.querySelector<HTMLElement>('[data-location-accuracy]');
  const errorText = root.querySelector<HTMLElement>('[data-location-error]');

  const setState = (kind: 'loading' | 'success' | 'error') => {
    status?.classList.toggle('is-success', kind === 'success');
    status?.classList.toggle('is-error', kind === 'error');
    if (status) status.textContent = kind === 'success' ? 'AUTO DETECTED' : kind === 'error' ? 'LOCATION NEEDED' : 'LOCATING...';
    if (refresh) refresh.disabled = kind === 'loading';
  };

  const detectLocation = () => {
    if (!navigator.geolocation) {
      setState('error');
      if (title) title.textContent = 'Location unavailable';
      if (text) text.textContent = 'This browser does not support location detection.';
      return;
    }

    setState('loading');
    if (title) title.textContent = 'Detecting location';
    if (text) text.textContent = 'Requesting your current position...';
    if (accuracy) accuracy.textContent = 'Waiting for permission...';
    if (errorText) { errorText.hidden = true; errorText.textContent = ''; }

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
      if (errorText) { errorText.hidden = false; errorText.textContent = locationErrorCopy(error); }
    }, LOCATION_OPTIONS);
  };

  refresh.addEventListener('click', detectLocation);
  detectLocation();
  return () => refresh.removeEventListener('click', detectLocation);
}, []);

return <div ref={rootRef} dangerouslySetInnerHTML={{ __html: "<style>" + reportFireStyles + "</style>" + reportFireMarkup }} />;
```

- [ ] **Step 2: Run the focused test to verify it passes**

Run:

```bash
node --test tests/resident-report-location.test.mjs
```

Expected: all resident location contract tests pass.

### Task 4: Verify the complete resident page and commit

**Files:**
- Modify: no additional files.

- [ ] **Step 1: Run the resident location test and full production build**

```bash
node --test tests/resident-report-location.test.mjs
npm run build
```

Expected: the focused tests pass and Next.js completes TypeScript/build output with exit code 0.

- [ ] **Step 2: Smoke-test browser permission states**

Use a browser with `/resident/report-fire` and verify:

- Permission allowed: status becomes `AUTO DETECTED`, coordinates and accuracy appear, and latitude/longitude data attributes are populated.
- Permission denied: status becomes `LOCATION NEEDED`, the error message appears, and `Detect my location` remains usable.
- Retry: clicking `Detect my location` calls the browser geolocation request again.

- [ ] **Step 3: Commit the implementation**

```bash
git add app/resident/report-fire/page.tsx app/_content/resident-report-fire-content.ts tests/resident-report-location.test.mjs
git commit -m "feat: auto-detect resident report location"
```

- [ ] **Step 4: Push and deploy the verified commit**

```bash
git push origin fix/railway-deployment
npx --yes @railway/cli up --detach --yes --service alab-fire-responses --environment production --message "feat: auto-detect resident report location"
```

Confirm the Railway deployment reaches `SUCCESS` and `https://alab-fire-responses-production.up.railway.app/resident/report-fire` returns HTTP 200.
