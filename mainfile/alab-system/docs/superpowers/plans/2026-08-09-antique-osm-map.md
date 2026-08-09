# Antique OpenStreetMap Detail Map Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the Municipal BFP GIS map from a tinted raster basemap to a detailed OpenStreetMap vector basemap that shows Antique roads, mapped building footprints, public places, and existing response layers.

**Architecture:** Keep the existing `AntiqueGisMap` component and map shell. Load the OpenFreeMap OSM-derived MapLibre style, tune its existing vector layers to the ALAB palette, and add a small number of map-only interaction layers for buildings, roads, and places. Pass operational-layer visibility from the GIS page into the map so the existing controls become functional without changing the surrounding dashboard structure.

**Tech Stack:** Next.js 16, React 19, TypeScript, MapLibre GL JS 6, OpenStreetMap-derived OpenFreeMap vector tiles, Node test runner.

## Global Constraints

- Keep the map focused on the whole Province of Antique using the existing `ANTIQUE_BOUNDS`.
- Preserve the current Municipal BFP desktop layout, marker palette, incident/station/water data, and route overlay.
- Use visible OpenStreetMap attribution and do not add offline or bulk tile prefetching.
- Treat OSM buildings and places as reference data, not official cadastral/property data.
- Keep implementation scoped to `app/_components/antique-gis-map.tsx`, `app/municipal-bfp/gis-map/page.tsx`, and the focused GIS test.

### Task 1: Extend the GIS regression coverage

**Files:**
- Modify: `tests/municipal-gis-map.test.mjs`

- [ ] **Step 1: Write failing assertions**

Assert that the map includes the OpenFreeMap vector style, a visible zoom level for building detail, explicit `building`, `road`, and `poi` handling, and page controls with accessible pressed state.

- [ ] **Step 2: Run the focused test**

Run: `npm test -- tests/municipal-gis-map.test.mjs`

Expected: FAIL because the current component still uses the OSM raster source and the page buttons are static.

### Task 2: Implement the OSM vector basemap and map controls

**Files:**
- Modify: `app/_components/antique-gis-map.tsx`
- Modify: `app/municipal-bfp/gis-map/page.tsx`

- [ ] **Step 1: Replace the inline raster style with `https://tiles.openfreemap.org/styles/liberty`.
- [ ] **Step 2: Keep Antique bounds, increase the maximum zoom to 19, and retain MapLibre navigation and attribution controls.
- [ ] **Step 3: Tune vector land, water, road, building, and label layers to the existing ALAB colors after the style loads.
- [ ] **Step 4: Add building hover/click inspection, road hover/click inspection, and public-place inspection using rendered OSM vector features.
- [ ] **Step 5: Add layer visibility state for incidents, stations, water sources, and all operational layers; keep roads, buildings, and public places visible as map detail.
- [ ] **Step 6: Preserve the existing legend and operational markers, adding a concise detail legend for mapped buildings, roads, and public places.
- [ ] **Step 7: Run the focused test and confirm it passes.

### Task 3: Verify the map change

**Files:**
- Review: `app/_components/antique-gis-map.tsx`
- Review: `app/municipal-bfp/gis-map/page.tsx`
- Review: `tests/municipal-gis-map.test.mjs`

- [ ] **Step 1: Run the focused GIS test.
- [ ] **Step 2: Run the complete test suite and record any unrelated pre-existing failures.
- [ ] **Step 3: Run lint and the production build.
- [ ] **Step 4: Review the final diff to ensure no resident pages or unrelated desktop styles changed.
