# Municipal Incident Map Marker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show every Municipal BFP incident as the approved red emergency pin with a white fire icon and soft red location ring.

**Architecture:** The existing Leaflet `L.divIcon` remains the incident marker implementation. Only its HTML and local CSS in the municipal incident map component change; routing, popups, map coordinates, API calls, and incident data remain intact.

**Tech Stack:** Next.js client component, TypeScript, Leaflet, Node test runner.

## Global Constraints

- Do not change backend, report data, routing, or APIs.
- Keep the marker anchored to the submitted incident coordinate.
- Do not use the plain `/images/fire logo.webp` image for this map marker.

---

### Task 1: Render the approved emergency marker

**Files:**
- Modify: `mainfile/alab-system/tests/municipal-gis-map.test.mjs`
- Modify: `mainfile/alab-system/app/_components/municipal-incident-map.tsx`

**Interfaces:**
- Consumes: Leaflet `L.divIcon` and the existing `incident.latitude` / `incident.longitude` marker location.
- Produces: `.mbfp-incident-fire-marker` and `.mbfp-incident-fire-pin` marker markup rendered by Leaflet.

- [x] **Step 1: Write the failing test**

```js
assert.match(map, /mbfp-incident-fire-pin/);
assert.match(map, /fa-fire/);
assert.match(map, /rgba\(220, 38, 38/);
```

- [x] **Step 2: Run test to verify it fails**

Run: `node --test tests/municipal-gis-map.test.mjs`

Observed: FAIL because `mbfp-incident-fire-pin` did not exist.

- [x] **Step 3: Write minimal implementation**

The Leaflet `divIcon` now renders the red pin and white flame inside the ring, with a 60px marker size and a coordinate-safe anchor.

- [x] **Step 4: Run test to verify it passes**

Run: `node --test tests/municipal-gis-map.test.mjs`

Observed: PASS.

- [x] **Step 5: Verify the application**

Run:

```bash
npm test
npm run build -- --webpack
```

Observed: 119 tests passed and the Next.js production build completed successfully.
