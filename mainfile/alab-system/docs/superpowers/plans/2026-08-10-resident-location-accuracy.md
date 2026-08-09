# Resident Location Accuracy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the resident report's one-shot location result with progressive high-accuracy detection, Antique validation, correct barangay/municipality selection, and a stable responsive Leaflet preview.

**Architecture:** Put deterministic accuracy and Philippine address-selection rules in a small pure TypeScript module that Node can test directly. Keep browser lifecycle, Leaflet, and DOM updates in the existing resident report page, using `watchPosition` to retain the best reading for up to 10 seconds. Keep all visual changes scoped to the existing location card markup and CSS.

**Tech Stack:** Next.js App Router, React 19, TypeScript, browser Geolocation API, Leaflet 1.9, OpenStreetMap/Nominatim, Node 25 test runner.

## Global Constraints

- Confirm automatically at 50 meters or better.
- Accept 51-150 meters only as `APPROXIMATE` after the 10-second refinement window.
- Do not confirm a reading worse than 150 meters.
- Do not confirm a reverse-geocoded result outside Antique.
- Preserve every report section except the resident location step.
- Keep all commits local; do not push or deploy without a new user request.

---

### Task 1: Add Tested Location Selection Rules

**Files:**
- Create: `mainfile/alab-system/app/resident/report-fire/location-logic.ts`
- Create: `mainfile/alab-system/tests/resident-location-logic.test.mjs`

**Interfaces:**
- Produces: `LocationReading`, `LocationQuality`, `ResolvedAddress`, `TARGET_ACCURACY_METERS`, `ACCEPTABLE_ACCURACY_METERS`, `REFINEMENT_WINDOW_MS`, `chooseBetterReading`, `classifyAccuracy`, and `resolvePhilippineAddress`.
- Consumes: plain coordinate and Nominatim address objects; no browser or Leaflet globals.

- [ ] **Step 1: Write the failing logic tests**

```js
import assert from "node:assert/strict";
import test from "node:test";
import {
  chooseBetterReading,
  classifyAccuracy,
  resolvePhilippineAddress,
} from "../app/resident/report-fire/location-logic.ts";

test("keeps the most accurate GPS reading", () => {
  const bacolod = { latitude: 10.6765, longitude: 122.9509, accuracy: 4200, timestamp: 1 };
  const hamtic = { latitude: 10.7023, longitude: 121.9828, accuracy: 28, timestamp: 2 };
  assert.deepEqual(chooseBetterReading(bacolod, hamtic), hamtic);
  assert.deepEqual(chooseBetterReading(hamtic, bacolod), hamtic);
});

test("classifies precise, approximate, and poor accuracy", () => {
  assert.equal(classifyAccuracy(50), "precise");
  assert.equal(classifyAccuracy(120), "approximate");
  assert.equal(classifyAccuracy(151), "poor");
});

test("prioritizes an explicit barangay and validates Antique", () => {
  assert.deepEqual(resolvePhilippineAddress({
    neighbourhood: "Macapina",
    quarter: "Barangay 6",
    city: "Bacolod",
    region: "Negros Island Region",
  }), { barangay: "Barangay 6", municipality: "Bacolod", isAntique: false });

  assert.deepEqual(resolvePhilippineAddress({
    village: "Igbical",
    town: "Hamtic",
    state: "Antique",
    "ISO3166-2-lvl4": "PH-ANT",
  }), { barangay: "Igbical", municipality: "Hamtic", isAntique: true });
});
```

- [ ] **Step 2: Run the tests and verify RED**

Run from `mainfile/alab-system`:

```bash
node --test tests/resident-location-logic.test.mjs
```

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `location-logic.ts`.

- [ ] **Step 3: Implement the pure rules**

```ts
export const TARGET_ACCURACY_METERS = 50;
export const ACCEPTABLE_ACCURACY_METERS = 150;
export const REFINEMENT_WINDOW_MS = 10_000;

export type LocationReading = {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
};

export type LocationQuality = 'precise' | 'approximate' | 'poor';

export type ResolvedAddress = {
  barangay: string;
  municipality: string;
  isAntique: boolean;
};

export function chooseBetterReading(current: LocationReading | null, candidate: LocationReading) {
  return !current || candidate.accuracy < current.accuracy ? candidate : current;
}

export function classifyAccuracy(accuracy: number): LocationQuality {
  if (accuracy <= TARGET_ACCURACY_METERS) return 'precise';
  if (accuracy <= ACCEPTABLE_ACCURACY_METERS) return 'approximate';
  return 'poor';
}

export function resolvePhilippineAddress(address: Record<string, string>): ResolvedAddress {
  const values = Object.values(address);
  const explicitBarangay = values.find((value) => /\bbarangay\b/i.test(value));
  const barangay = explicitBarangay
    ?? address.village
    ?? address.suburb
    ?? address.quarter
    ?? address.neighbourhood
    ?? address.hamlet
    ?? '';
  const municipality = address.municipality ?? address.city ?? address.town ?? '';
  const isAntique = address['ISO3166-2-lvl4'] === 'PH-ANT'
    || address.state?.trim().toLowerCase() === 'antique';
  return { barangay, municipality, isAntique };
}
```

- [ ] **Step 4: Run the logic tests and verify GREEN**

Run: `node --test tests/resident-location-logic.test.mjs`

Expected: 3 tests pass, 0 fail.

- [ ] **Step 5: Commit locally**

```bash
git add app/resident/report-fire/location-logic.ts tests/resident-location-logic.test.mjs
git commit -m "test: define resident location accuracy rules"
```

### Task 2: Define Progressive GPS and Map Contracts

**Files:**
- Modify: `mainfile/alab-system/tests/resident-report-location.test.mjs`
- Test: `mainfile/alab-system/app/resident/report-fire/page.tsx`
- Test: `mainfile/alab-system/app/_content/resident-report-fire-content.ts`

**Interfaces:**
- Consumes: constants and helpers from Task 1's `location-logic.ts` module.
- Produces: regression contracts for `watchPosition`, cleanup, accuracy visualization, manual adjustment, and scoped status styles.

- [ ] **Step 1: Replace the one-shot contract with failing progressive-location assertions**

```js
test("resident location refines GPS readings before confirmation", () => {
  const page = readFileSync(join(root, "app", "resident", "report-fire", "page.tsx"), "utf8");
  assert.match(page, /navigator\.geolocation\.watchPosition/);
  assert.match(page, /navigator\.geolocation\.clearWatch/);
  assert.match(page, /chooseBetterReading/);
  assert.match(page, /REFINEMENT_WINDOW_MS/);
  assert.doesNotMatch(page, /getCurrentPosition/);
});

test("resident location exposes stable map and correction states", () => {
  const page = readFileSync(join(root, "app", "resident", "report-fire", "page.tsx"), "utf8");
  const content = readFileSync(join(root, "app", "_content", "resident-report-fire-content.ts"), "utf8");
  assert.match(page, /ResizeObserver/);
  assert.match(page, /leaflet\.circle/);
  assert.match(page, /dragend/);
  assert.match(page, /OUTSIDE ANTIQUE|outside-antique/);
  assert.match(content, /is-improving/);
  assert.match(content, /is-approximate/);
  assert.match(content, /is-outside/);
  assert.match(content, /data-location-map-panel/);
});
```

- [ ] **Step 2: Run the focused contract test and verify RED**

Run: `node --test tests/resident-report-location.test.mjs`

Expected: FAIL because the page still uses `getCurrentPosition` and lacks the new states.

### Task 3: Implement Progressive GPS and Antique Validation

**Files:**
- Modify: `mainfile/alab-system/app/resident/report-fire/page.tsx`
- Test: `mainfile/alab-system/tests/resident-report-location.test.mjs`
- Test: `mainfile/alab-system/tests/resident-location-logic.test.mjs`

**Interfaces:**
- Consumes: all exports from `location-logic.ts`, the existing reverse-geocode endpoint, and the location-card data hooks.
- Produces: best-reading refinement, final address state, Antique validation, map marker/accuracy circle, retry, map-click adjustment, and marker-drag adjustment.

- [ ] **Step 1: Import rules and add lifecycle state**

Import the Task 1 helpers and track `watchId`, `refinementTimer`, `bestReading`, `accuracyCircle`, `resizeObserver`, and `isFinalizing`. Add `stopDetection()` that clears both the watch and timer, and call it before retry and on unmount.

- [ ] **Step 2: Replace `getCurrentPosition` with `watchPosition`**

For every reading, build a `LocationReading`, select it with `chooseBetterReading`, immediately update the coordinates/map/accuracy text when it improves, and keep status `IMPROVING` until finalized. Finalize immediately at `precise`; otherwise finalize the best reading after `REFINEMENT_WINDOW_MS`.

- [ ] **Step 3: Finalize without false confirmation**

For `poor`, set `LOW ACCURACY`, leave `data-location-valid="false"`, and show retry/manual actions without reverse lookup. For `precise` or `approximate`, perform one reverse lookup, resolve it with `resolvePhilippineAddress`, and set `CONFIRMED`/`APPROXIMATE` only when `isAntique` is true. Otherwise set `OUTSIDE ANTIQUE`, preserve the detected place for transparency, and leave the report location invalid.

- [ ] **Step 4: Keep the Leaflet map stable and informative**

Initialize the map on Antique, add a draggable project marker, `leaflet.circle` accuracy halo, animated `setView`, and `ResizeObserver` calling `invalidateSize({ pan: false })`. Allow an outside reading to remain visible for transparency, but rely on address validation before accepting it. Re-run invalidation after address visibility changes and preserve coordinates/controls if tiles fail.

- [ ] **Step 5: Activate manual correction**

`Adjust Pin` toggles adjustment mode, enables marker dragging, and tells the resident to tap the map. Map click or marker `dragend` stops automatic detection, moves the marker, stores the new coordinates, performs one reverse lookup, and uses `PIN ADJUSTED` only for Antique results.

- [ ] **Step 6: Run both focused test files and verify GREEN**

Run:

```bash
node --test tests/resident-location-logic.test.mjs tests/resident-report-location.test.mjs
```

Expected: all location tests pass, 0 fail.

- [ ] **Step 7: Commit locally**

```bash
git add app/resident/report-fire/page.tsx tests/resident-report-location.test.mjs
git commit -m "fix: refine resident GPS location"
```

### Task 4: Polish Only the Location Card

**Files:**
- Modify: `mainfile/alab-system/app/_content/resident-report-fire-content.ts`
- Test: `mainfile/alab-system/tests/resident-report-location.test.mjs`

**Interfaces:**
- Consumes: status classes and data hooks from Task 3.
- Produces: a stable desktop/mobile location panel that keeps details, map, and actions visible in every state.

- [ ] **Step 1: Scope the location layout**

Change only `[data-location-card]` to a two-column grid on desktop with padded details and a map panel at least 160 pixels high. At 950 pixels and below, stack details over a 180-pixel map. Do not change the neighboring landmark card.

- [ ] **Step 2: Add complete status and motion styles**

Add scoped styles for `.is-improving`, `.is-approximate`, `.is-low-accuracy`, `.is-outside`, and `.is-adjusted`. Keep the current restrained pulse, add a subtle map-overlay fade, honor `prefers-reduced-motion`, and ensure the longest status label wraps without overlapping `LOCATION`.

- [ ] **Step 3: Stabilize the map markup**

Add `data-location-map-panel` to the map wrapper, keep the map and overlay as separate positioned layers, and add a compact accuracy indicator. Keep the project marker and existing buttons.

- [ ] **Step 4: Run the focused contract test**

Run: `node --test tests/resident-report-location.test.mjs`

Expected: all resident location contract tests pass.

- [ ] **Step 5: Commit locally**

```bash
git add app/_content/resident-report-fire-content.ts tests/resident-report-location.test.mjs
git commit -m "style: polish resident location card"
```

### Task 5: Verify the Complete Local Change

**Files:**
- Modify: no production files.

**Interfaces:**
- Consumes: Tasks 1-4.
- Produces: evidence that the scoped fix compiles and does not alter unrelated report UI.

- [ ] **Step 1: Run focused tests**

Run:

```bash
node --test tests/resident-location-logic.test.mjs tests/resident-report-location.test.mjs
```

Expected: all location tests pass, 0 fail.

- [ ] **Step 2: Run lint**

Run: `npm run lint`

Expected: 0 errors. Existing warnings in unrelated files may remain and must be reported.

- [ ] **Step 3: Run the production build**

Run: `npm run build`

Expected: Next.js compiles successfully and lists `/resident/report-fire` plus `/api/geocode/reverse`.

- [ ] **Step 4: Verify reverse-address fixtures**

Call the local reverse endpoint for a Hamtic coordinate and a Bacolod coordinate. Confirm Hamtic resolves inside Antique and Bacolod is recognized as outside Antique.

- [ ] **Step 5: Inspect the final diff and repository state**

Run:

```bash
git diff --check
git status --short --branch
```

Expected: no whitespace errors; local commits are ahead of origin and nothing is pushed or deployed.
