# Municipal BFP Live Device Route Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build each Municipal BFP road route from the currently used device location to the reported fire.

**Architecture:** `MunicipalIncidentMap` requests one browser GPS reading on the client. It uses those coordinates for its existing protected OSRM route request and uses the assigned station coordinates only when GPS cannot be read.

**Tech Stack:** Next.js client component, TypeScript, Browser Geolocation API, Leaflet, OSRM, Node test runner.

## Global Constraints

- Do not store Municipal BFP device locations in the database.
- Request location only while the incident map is open.
- Keep the assigned station as a visible operational fallback when permission is unavailable.

---

### Task 1: Route from the Municipal BFP device

**Files:**
- Modify: `mainfile/alab-system/tests/municipal-gis-map.test.mjs`
- Modify: `mainfile/alab-system/app/_components/municipal-incident-map.tsx`

- [ ] **Step 1: Write the failing test**

Add:

```js
assert.match(map, /navigator\.geolocation\.getCurrentPosition/);
assert.match(map, /Municipal BFP device location/);
assert.match(map, /enableHighAccuracy: true/);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/municipal-gis-map.test.mjs`

Expected: FAIL because the component currently uses station coordinates only.

- [ ] **Step 3: Implement the live-location route**

Request a single high-accuracy position, render it as a blue Leaflet origin marker, and populate the existing route API `fromLat` and `fromLng` with the device location. On geolocation failure, use station coordinates and show a station-fallback route message.

- [ ] **Step 4: Run focused test**

Run: `node --test tests/municipal-gis-map.test.mjs`

Expected: PASS.

- [ ] **Step 5: Verify the application**

Run:

```bash
npm test
npm run build -- --webpack
```

Expected: 119 app tests pass and the Next.js production build completes.

- [ ] **Step 6: Commit**

```bash
git add docs/superpowers/specs/2026-08-18-municipal-live-device-route-design.md docs/superpowers/plans/2026-08-18-municipal-live-device-route.md mainfile/alab-system/tests/municipal-gis-map.test.mjs mainfile/alab-system/app/_components/municipal-incident-map.tsx
git commit -m "feat: route municipal BFP from device location"
```
