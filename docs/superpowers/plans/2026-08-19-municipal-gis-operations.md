# Municipal GIS Operations Map Implementation Plan

> **For implementation:** Make these changes in the `municipal-gis-operations` worktree and verify before integration.

## 1. Lock in the GIS route separation

Update `mainfile/alab-system/tests/municipal-gis-map.test.mjs` to require the GIS route to render an operations-map component rather than `MunicipalIncidentDetail`.

## 2. Reuse the existing scoped live feed

Extend `app/_components/use-municipal-incident-feed.ts` to retain the municipality name returned by `/api/municipal-bfp/incidents`. Keep the existing five-second visible-tab polling behavior.

## 3. Build the map-first operations view

Create `app/_components/municipal-gis-operations-map.tsx`.

- Initialize Leaflet only in the client component and clean it up on unmount.
- Draw all incident markers from the live feed and fit bounds to their coordinates.
- Fall back to an approximate municipal center only when the assigned station has no active incidents.
- Include accessible loading, empty, error, manual-refresh, and live-freshness states.
- Use the existing fire-brand marker language, without adding a new API or backend dependency.

## 4. Render the new view from the GIS route

Replace the first-incident redirect logic in `app/municipal-bfp/gis-map/page.tsx` with the new operations-map component. Leave `MunicipalIncidentDetail` unchanged.

## 5. Verify

Run the focused GIS test, then the full test suite and production build in the app root with dependencies installed. Review the changed files and only then commit, merge, and push when approved.
