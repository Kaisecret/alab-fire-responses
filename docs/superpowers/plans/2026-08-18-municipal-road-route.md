# Municipal BFP Road Route Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prioritize a real road route from the Municipal BFP station to a fire report on the incident map.

**Architecture:** The existing `/api/routes/road` endpoint continues to obtain a driving route from OSRM. The Leaflet component defers any dashed direct line until that endpoint reports a fallback and pans/zooms to actual route coordinates when available.

**Tech Stack:** Next.js, TypeScript, Leaflet, OSRM, Node test runner.

## Global Constraints

- Do not change incident, report, station, or authentication database data.
- Start every route at assigned Municipal BFP station coordinates.
- Retain a clear offline fallback when a road route cannot be calculated.

---

### Task 1: Prefer road geometry in the incident map

**Files:**
- Modify: `mainfile/alab-system/tests/municipal-gis-map.test.mjs`
- Modify: `mainfile/alab-system/app/_components/municipal-incident-map.tsx`

- [ ] **Step 1: Write the failing test**

Add assertions for the named fallback and road bounds:

```js
assert.match(map, /showDirectFallback/);
assert.match(map, /fitBounds\(L\.latLngBounds\(data\.coordinates\)/);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/municipal-gis-map.test.mjs`

Expected: FAIL because neither implementation detail exists.

- [ ] **Step 3: Implement the minimum route priority change**

Add a local `showDirectFallback` function that draws the dashed line only after a failed or unavailable OSRM route. In the successful route branch, add the red road polyline and fit Leaflet bounds to `data.coordinates`.

- [ ] **Step 4: Run focused test**

Run: `node --test tests/municipal-gis-map.test.mjs`

Expected: PASS.

- [ ] **Step 5: Verify the application**

Run:

```bash
npm test
npm run build -- --webpack
```

Expected: 119 app tests pass and Next.js completes the production build.

- [ ] **Step 6: Commit**

```bash
git add docs/superpowers/specs/2026-08-18-municipal-road-route-design.md docs/superpowers/plans/2026-08-18-municipal-road-route.md mainfile/alab-system/tests/municipal-gis-map.test.mjs mainfile/alab-system/app/_components/municipal-incident-map.tsx
git commit -m "fix: prioritize municipal road route"
```
