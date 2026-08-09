# Antique Hybrid Imagery Map Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Make the Antique-only Leaflet map show satellite-visible houses and structures by default while keeping readable labels, OSM facilities, and a street-map fallback.

**Architecture:** Add an Esri World Imagery base layer and Esri reference-label overlay to the existing Leaflet map. Keep the standard OpenStreetMap layer as an alternate basemap, preserve the exact Antique boundary and operational markers, and upgrade close-zoom public-facility markers with category icons and permanent labels. Missing OSM records remain explicitly unverified rather than being invented.

**Tech Stack:** Next.js 16.2.12, React 19.2.4, Leaflet 1.9.4, OpenStreetMap, ArcGIS static basemap tiles, Overpass API, Node test runner.

## Global Constraints

- Change only the GIS map component, map-specific styles, focused GIS tests, and this map design/plan documentation.
- Keep Leaflet 1.9, complete Antique bounds, Caluya coverage, and visible attributions.
- Satellite imagery is the default; no white or colored wash may cover the imagery.
- Keep OpenStreetMap as the street-map fallback and retain OSM facility data.
- Do not add a municipality selector, offline building bundle, MapLibre dependency, or invented shelter/building records.
- Do not change the surrounding desktop dashboard layout or non-map application behavior.

---

### Task 1: Lock Hybrid Basemap and Label Requirements in Tests

**Files:**
- Modify: `tests/municipal-gis-map.test.mjs`

- [ ] **Step 1: Add failing assertions**

Add assertions for the imagery URL, reference overlay URL, layer control, OSM fallback, readable close-zoom labels, and the absence of a white wash.

- [ ] **Step 2: Run the focused GIS tests and confirm the new assertions fail**

Run `node --test tests/municipal-gis-map.test.mjs` from `mainfile/alab-system`.

Expected: only the new hybrid/label assertions fail.

---

### Task 2: Implement Hybrid Antique Basemaps

**Files:**
- Modify: `app/_components/antique-gis-map.tsx`
- Modify: `app/municipal-bfp/gis-map/page.tsx`

- [ ] **Step 1: Add imagery and reference tile constants**

Use `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}` for imagery and `https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}` for labels, each with Esri attribution.

- [ ] **Step 2: Add the default imagery layer and OSM fallback layer**

Create the imagery layer first, add the reference overlay above it, retain the OSM layer, and add a Leaflet layers control with `Satellite` and `Street map` options. Keep the imagery layer selected by default and preserve existing controls.

- [ ] **Step 3: Keep fallback behavior non-blocking**

If imagery tiles fail, the OSM street layer remains selectable and operational overlays still render.

---

### Task 3: Make Schools and Public Places Readable

**Files:**
- Modify: `app/_components/antique-gis-map.tsx`
- Modify: `app/municipal-bfp/gis-map/page.tsx`

- [ ] **Step 1: Add category icon metadata**

Use accessible Leaflet `DivIcon` markers for school, medical, government/response, and shelter/assembly categories while retaining the ALAB operational circles.

- [ ] **Step 2: Add close-zoom labels**

At zoom 14 or higher, bind a permanent sanitized tooltip for named public facilities; keep unnamed facilities clickable without forcing a label.

- [ ] **Step 3: Update the legend and map-only CSS**

Add imagery/reference-layer attribution styling and compact mobile facility-label rules without changing desktop dashboard layout.

---

### Task 4: Verify and Deploy

**Files:**
- Review all map-specific files and generated docs.

- [ ] **Step 1: Run focused tests, typecheck, lint, and production build**

Run the GIS test, `npx tsc --noEmit`, `npm run lint`, and the root `npm run build`.

- [ ] **Step 2: Verify remote imagery, OSM, boundary, and live GIS resources**

Check HTTP 200 responses for representative ArcGIS imagery, OSM street, boundary, local GIS, and Railway GIS URLs.

- [ ] **Step 3: Inspect desktop and mobile screenshots**

Confirm roofs are visible, labels/controls remain inside the map, and the exact Antique extent still includes Caluya.

- [ ] **Step 4: Commit, push, and redeploy Railway**

Push the clean branch and wait for the Railway deployment to reach `SUCCESS` before reporting the live URL.
