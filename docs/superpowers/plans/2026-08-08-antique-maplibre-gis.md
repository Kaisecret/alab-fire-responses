# Antique MapLibre GIS Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a real MapLibre GL JS GIS map focused on the whole Province of Antique.

**Architecture:** Keep the existing GIS page layout and controls, but replace the map mock with a dedicated `AntiqueGisMap` client component. The component owns MapLibre setup, Antique bounds, base-map color tuning, and operational markers.

**Tech Stack:** Next.js App Router, React Client Components, MapLibre GL JS, node:test static regression tests.

## Global Constraints

- Do not change unrelated municipal dashboard UI.
- Focus the map on the whole Province of Antique, not only San Jose de Buenavista.
- Match the existing ALAB palette: `#D32F2F`, `#1565C0`, `#00838f`, pale neutral surfaces.
- Keep the component browser-safe by initializing MapLibre only inside `useEffect`.

---

### Task 1: Add GIS Regression Test

**Files:**
- Create: `mainfile/alab-system/tests/municipal-gis-map.test.mjs`

**Interfaces:**
- Consumes: `app/municipal-bfp/gis-map/page.tsx`
- Produces: Static assertions for dependency, Antique bounds, and map marker palette.

- [ ] **Step 1: Write the failing test**

```js
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();

test("municipal GIS page renders a MapLibre map focused on Antique", () => {
  const pagePath = join(root, "app", "municipal-bfp", "gis-map", "page.tsx");
  const mapPath = join(root, "app", "_components", "antique-gis-map.tsx");

  assert.equal(existsSync(pagePath), true, "GIS page is missing");
  assert.equal(existsSync(mapPath), true, "Antique GIS map component is missing");

  const page = readFileSync(pagePath, "utf8");
  const map = readFileSync(mapPath, "utf8");

  assert.match(page, /AntiqueGisMap/);
  assert.match(map, /maplibre-gl/);
  assert.match(map, /ANTIQUE_BOUNDS/);
  assert.match(map, /maxBounds:\s*ANTIQUE_BOUNDS/);
  assert.match(map, /Province of Antique/);
});

test("municipal GIS MapLibre markers keep the ALAB incident palette", () => {
  const mapPath = join(root, "app", "_components", "antique-gis-map.tsx");
  const map = readFileSync(mapPath, "utf8");

  assert.match(map, /#D32F2F/);
  assert.match(map, /#1565C0/);
  assert.match(map, /#00838f/);
  assert.match(map, /Fire Incident \(4\)/);
  assert.match(map, /Fire Station \(2\)/);
  assert.match(map, /Water Source \(3\)/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/municipal-gis-map.test.mjs`
Expected: FAIL because `app/_components/antique-gis-map.tsx` does not exist yet.

### Task 2: Implement Antique MapLibre Component

**Files:**
- Create: `mainfile/alab-system/app/_components/antique-gis-map.tsx`
- Modify: `mainfile/alab-system/app/municipal-bfp/gis-map/page.tsx`
- Modify: `mainfile/alab-system/package.json`
- Modify: `mainfile/alab-system/package-lock.json`

**Interfaces:**
- Consumes: MapLibre GL JS default export.
- Produces: `export function AntiqueGisMap(): JSX.Element`.

- [ ] **Step 1: Install dependency**

Run: `npm install maplibre-gl`
Expected: `package.json` and `package-lock.json` include `maplibre-gl`.

- [ ] **Step 2: Implement component**

Create `app/_components/antique-gis-map.tsx` as a client component that imports React hooks, dynamically imports `maplibre-gl` inside `useEffect`, sets `maxBounds: ANTIQUE_BOUNDS`, adds MapLibre navigation controls, creates ALAB-colored markers, and removes the map on unmount.

- [ ] **Step 3: Replace mock map in page**

Update `app/municipal-bfp/gis-map/page.tsx` to import and render `<AntiqueGisMap />`, keeping the page header and layer buttons intact.

- [ ] **Step 4: Run tests**

Run: `npm test -- tests/municipal-gis-map.test.mjs`
Expected: PASS.

### Task 3: Verify Build Quality

**Files:**
- No new files.

**Interfaces:**
- Consumes: Completed map component and page.
- Produces: Verification evidence.

- [ ] **Step 1: Run full tests**

Run: `npm test`
Expected: all node tests pass.

- [ ] **Step 2: Run lint**

Run: `npm run lint`
Expected: lint exits successfully or reports only pre-existing unrelated issues.

- [ ] **Step 3: Run build**

Run: `npm run build`
Expected: Next build exits successfully.
