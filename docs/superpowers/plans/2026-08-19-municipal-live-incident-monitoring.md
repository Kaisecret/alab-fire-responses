# Municipal Live Incident Monitoring Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Municipal Active Incidents page and dashboard show their station's current incident data with a visible-tab five-second refresh cycle.

**Architecture:** Both client components will consume the existing authenticated `/api/municipal-bfp/incidents` endpoint. A small shared client hook will own fetch state, visible-tab polling, manual refresh, and non-destructive error handling, so both screens apply identical live-data behavior while retaining their existing UI.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, existing Municipal BFP incident API, Node test runner.

## Global Constraints

- Do not change API authorization, database schema, routing, or report lifecycle logic.
- Poll only while the browser tab is visible, at exactly 5,000 ms.
- Keep the established Municipal BFP visual layout; replace only incident-derived hardcoded data.
- Use `cache: "no-store"` for all incident reads.
- Preserve last successful data if a later refresh fails.

---

### Task 1: Add a tested shared Municipal incident feed hook

**Files:**
- Create: `app/_components/use-municipal-incident-feed.ts`
- Modify: `tests/municipal-bfp-mobile.test.mjs`

**Interfaces:**
- Consumes: `GET /api/municipal-bfp/incidents` returning `{ incidents: MunicipalIncident[] }`.
- Produces: `useMunicipalIncidentFeed(): { incidents, loading, refreshing, error, lastCheckedAt, refresh }`.

- [ ] **Step 1: Write the failing tests**

Add assertions that source contains `REFRESH_INTERVAL_MS = 5_000`, uses `document.visibilityState`, registers `visibilitychange`, calls `fetch("/api/municipal-bfp/incidents", { cache: "no-store" })`, and preserves incident state during a failed refresh.

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `node --test tests/municipal-bfp-mobile.test.mjs`

Expected: FAIL because the hook does not exist and the five-second visibility-aware poller is not implemented.

- [ ] **Step 3: Implement the hook**

Create a client hook that loads once, starts an interval only when visible, pauses it when hidden, refreshes immediately when visible again, and exposes one manual `refresh()` function. Only a manual refresh sets the blocking `refreshing` state.

- [ ] **Step 4: Run the focused test to verify it passes**

Run: `node --test tests/municipal-bfp-mobile.test.mjs`

Expected: PASS.

### Task 2: Connect the Active Incidents page to the shared live feed

**Files:**
- Modify: `app/municipal-bfp/active-incidents/page.tsx`
- Modify: `tests/municipal-bfp-mobile.test.mjs`

**Interfaces:**
- Consumes: `useMunicipalIncidentFeed` state and `refresh` method.
- Produces: Active queue that updates every five seconds while visible and provides a manual refresh status.

- [ ] **Step 1: Write the failing test**

Assert that the page imports and uses `useMunicipalIncidentFeed` and no longer owns a `12000` interval.

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `node --test tests/municipal-bfp-mobile.test.mjs`

Expected: FAIL because the page still owns a twelve-second poller.

- [ ] **Step 3: Implement the minimal integration**

Replace local incident loading and interval state with hook output. Keep manual refresh, add a concise last-check label, and mark newly received rows for a brief CSS highlight without moving the layout.

- [ ] **Step 4: Run the focused test to verify it passes**

Run: `node --test tests/municipal-bfp-mobile.test.mjs`

Expected: PASS.

### Task 3: Replace dashboard sample incident data with the live incident feed

**Files:**
- Modify: `app/_components/municipal-bfp-dashboard.tsx`
- Modify: `tests/municipal-bfp-mobile.test.mjs`

**Interfaces:**
- Consumes: `useMunicipalIncidentFeed`.
- Produces: Dashboard incident queue and incident-derived counters sourced from the assigned station's live queue.

- [ ] **Step 1: Write the failing test**

Assert that `incidentData` is absent, the dashboard imports `useMunicipalIncidentFeed`, and its recent queue maps `incidents.slice(0, 5)`.

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `node --test tests/municipal-bfp-mobile.test.mjs`

Expected: FAIL because the dashboard contains the five sample `INC-2025-*` entries.

- [ ] **Step 3: Implement the minimal dashboard integration**

Map real references, barangays, fire types, submitted times, and statuses into the existing table. Compute Active Incidents and Pending Verification from current rows. Keep non-incident resource counters unchanged, add the live check label, and keep the existing empty-state style when the API returns no incidents.

- [ ] **Step 4: Run the focused test to verify it passes**

Run: `node --test tests/municipal-bfp-mobile.test.mjs`

Expected: PASS.

### Task 4: Verify and ship

**Files:**
- Modify: files from Tasks 1-3 only.

- [ ] **Step 1: Check formatting-safe diff**

Run: `git diff --check`

Expected: no output.

- [ ] **Step 2: Run all tests**

Run: `npm test`

Expected: all tests pass.

- [ ] **Step 3: Run the production build**

Run: `npm run build`

Expected: exit code 0.

- [ ] **Step 4: Commit and merge**

Run: `git add app/_components/use-municipal-incident-feed.ts app/_components/municipal-bfp-dashboard.tsx app/municipal-bfp/active-incidents/page.tsx tests/municipal-bfp-mobile.test.mjs docs/superpowers/specs/2026-08-19-municipal-live-incident-monitoring-design.md docs/superpowers/plans/2026-08-19-municipal-live-incident-monitoring.md && git commit -m "feat: live municipal incident monitoring"`

Then fast-forward merge to `main` and push `origin main`.
