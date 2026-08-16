# Resident-to-Municipal BFP Response Routing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a live resident fire-report workflow that lets Municipal BFP view a reported emergency, route from its station to the incident, respond to it, and synchronize the responding status to the resident.

**Architecture:** Extend the existing PostgreSQL fire-report schema with operational state, station coordinates, and status history. Keep all sensitive access server-side through existing signed resident/BFP cookies; browser UI uses scoped API routes. Leaflet renders real incident/station markers, an OSRM road route, and a direct-line fallback.

**Tech Stack:** Next.js 16 App Router, TypeScript, React 19, PostgreSQL via `pg`, Supabase Storage with `@supabase/supabase-js`, Leaflet, OpenStreetMap/OSRM, Node test runner.

## Global Constraints

- Do not implement municipality polygon-based automatic routing in this phase.
- Do not expose Supabase secret or service-role keys through a `NEXT_PUBLIC_` variable.
- Require a valid resident session for resident report APIs and a valid active Municipal BFP session for Municipal BFP APIs.
- Return resident location, photo URLs, contact details, and profile history only for a report-related authorized Municipal BFP request.
- Keep photo uploads private, validate JPEG/PNG/WebP file types, and enforce an 8 MB maximum.
- Preserve legacy fire-report statuses while adding the agreed operational lifecycle.
- Fall back to a direct line and straight-line distance if OSRM cannot return a road route.
- Every task starts with a failing test and ends with its focused test passing.

---

## File Structure

- `supabase/migrations/<timestamp>_add_resident_bfp_response_workflow.sql`: fire-report status expansion, responder fields, station locations, status history, indexes, RLS, and private-storage bucket metadata.
- `lib/fire-reports/types.ts`: shared report/status/route TypeScript types and public status labels.
- `lib/fire-reports/service.ts`: transaction-safe report creation, resident retrieval, BFP incident retrieval, and respond transition.
- `lib/fire-reports/validation.ts`: request field validation and legal status transition checks.
- `lib/fire-reports/route.ts`: Haversine distance and OSRM response normalization.
- `lib/supabase/server-storage.ts`: server-only private photo upload and signed URL functions.
- `app/api/resident/fire-reports/route.ts`: resident report creation/list endpoint.
- `app/api/resident/fire-reports/[id]/route.ts`: resident-owned report detail endpoint.
- `app/api/municipal-bfp/incidents/route.ts`: protected Municipal BFP queue endpoint.
- `app/api/municipal-bfp/incidents/[id]/route.ts`: protected report/profile/map-data endpoint.
- `app/api/municipal-bfp/incidents/[id]/respond/route.ts`: protected transaction-safe Respond endpoint.
- `app/api/routes/road/route.ts`: coordinate-validated OSRM proxy.
- `app/_components/resident-fire-report-form.tsx`: controlled report submission form using existing GPS/photo UI hooks.
- `app/_components/resident-report-status.tsx`: live polling resident report status panel.
- `app/_components/municipal-incident-map.tsx`: Leaflet incident/station/road-route/direct-line map.
- `app/_components/municipal-incident-detail.tsx`: incident details, resident emergency profile, and Respond action.
- `app/resident/report-fire/page.tsx`, `app/resident/reports/page.tsx`, `app/resident/reports/[id]/page.tsx`: replace placeholder markup with live report components.
- `app/municipal-bfp/active-incidents/page.tsx`, `app/municipal-bfp/verification-queue/page.tsx`, `app/municipal-bfp/gis-map/page.tsx`: replace static mock incident data with protected live data/components.
- `tests/fire-report-workflow.test.mjs`, `tests/municipal-incident-access.test.mjs`, `tests/road-route.test.mjs`, `tests/resident-report-submission.test.mjs`: behavior/regression coverage.

### Task 1: Add the emergency workflow database schema

**Files:**
- Create: `mainfile/alab-system/supabase/migrations/<timestamp>_add_resident_bfp_response_workflow.sql`
- Modify: `mainfile/alab-system/tests/supabase-schema.test.mjs`
- Test: `mainfile/alab-system/tests/fire-report-workflow.test.mjs`

**Consumes:** Existing `users`, `municipalities`, `resident_profiles`, `fire_reports`, and `fire_report_photos` tables.

**Produces:** `fire_report_status_history`, `municipal_bfp_stations`, expanded fire-report status constraint, response-audit columns, and supporting indexes for later API tasks.

- [ ] **Step 1: Write the failing schema test**

Add assertions that the new migration contains the status history table, responder columns, station table, a `fire_reports_municipality_status_submitted_idx` index, and RLS:

```js
assert.match(migration, /create table public\.fire_report_status_history/);
assert.match(migration, /responding_bfp_user_id uuid references public\.users/);
assert.match(migration, /create table public\.municipal_bfp_stations/);
assert.match(migration, /fire_reports_municipality_status_submitted_idx/);
assert.match(migration, /enable row level security/);
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `npm test -- --test-name-pattern="emergency workflow schema"` from `mainfile/alab-system`.

Expected: failure because the migration does not yet exist.

- [ ] **Step 3: Add the migration**

Create an imperative migration that:

```sql
alter table public.fire_reports
  add column if not exists responding_bfp_user_id uuid references public.users(id) on delete set null,
  add column if not exists responding_station_name text,
  add column if not exists response_started_at timestamptz;

alter table public.fire_reports drop constraint if exists fire_reports_status_check;
alter table public.fire_reports add constraint fire_reports_status_check check (
  status in (
    'SUBMITTED', 'UNDER_VERIFICATION', 'CONFIRMED', 'REJECTED', 'FALSE_REPORT',
    'DUPLICATE', 'NEEDS_MORE_INFO', 'CLOSED', 'PENDING_VERIFICATION', 'VERIFIED',
    'RESPONDING', 'FIRETRUCK_DISPATCHED', 'RESPONDER_ARRIVED', 'UNDER_CONTROL', 'RESOLVED'
  )
);

create table public.fire_report_status_history (
  id uuid primary key default gen_random_uuid(),
  fire_report_id uuid not null references public.fire_reports(id) on delete restrict,
  previous_status text,
  next_status text not null,
  actor_user_id uuid references public.users(id) on delete set null,
  resident_message text,
  created_at timestamptz not null default now()
);
```

Add `municipal_bfp_stations` with a unique municipality ID, station name, latitude, longitude, and timestamps. Add indexes on report municipality/status/submitted time and status history report/created time. Enable RLS on both new tables without public policies because all access remains server-side.

- [ ] **Step 4: Run the focused test and verify it passes**

Run: `npm test -- --test-name-pattern="emergency workflow schema"`.

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/<timestamp>_add_resident_bfp_response_workflow.sql tests/supabase-schema.test.mjs tests/fire-report-workflow.test.mjs
git commit -m "feat: add emergency report workflow schema"
```

### Task 2: Build validated report and route domain services

**Files:**
- Create: `mainfile/alab-system/lib/fire-reports/types.ts`
- Create: `mainfile/alab-system/lib/fire-reports/validation.ts`
- Create: `mainfile/alab-system/lib/fire-reports/route.ts`
- Create: `mainfile/alab-system/tests/road-route.test.mjs`
- Modify: `mainfile/alab-system/tests/fire-report-workflow.test.mjs`

**Consumes:** The Task 1 report-status values.

**Produces:** `validateFireReportInput`, `canTransitionReportStatus`, `straightLineKilometers`, and `normalizeOsrmRoute` for API routes and UI components.

- [ ] **Step 1: Write failing tests**

```js
assert.equal(canTransitionReportStatus("SUBMITTED", "RESPONDING"), true);
assert.equal(canTransitionReportStatus("RESOLVED", "RESPONDING"), false);
assert.equal(Math.round(straightLineKilometers(10.7, 121.98, 10.75, 121.94) * 10) / 10, 7);
assert.deepEqual(normalizeOsrmRoute({ routes: [{ distance: 1800, duration: 300, geometry: { coordinates: [[121.98, 10.7], [121.94, 10.75]] } }] }), {
  distanceMeters: 1800,
  durationSeconds: 300,
  coordinates: [[10.7, 121.98], [10.75, 121.94]],
});
```

- [ ] **Step 2: Run the focused tests and verify they fail**

Run: `node --test tests/fire-report-workflow.test.mjs tests/road-route.test.mjs`.

Expected: failure because the domain modules do not exist.

- [ ] **Step 3: Implement pure validation and route modules**

Define a `FireReportStatus` union and a status-label map. Validate fire type, trimmed landmark/description length, finite Philippine coordinate ranges, accepted photo MIME types, and 8 MB maximum. Use a Haversine formula for direct distance. Normalize only the first valid OSRM route and convert OSRM longitude/latitude pairs to Leaflet latitude/longitude pairs.

- [ ] **Step 4: Run the focused tests and verify they pass**

Run: `node --test tests/fire-report-workflow.test.mjs tests/road-route.test.mjs`.

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/fire-reports tests/fire-report-workflow.test.mjs tests/road-route.test.mjs
git commit -m "feat: add fire report validation and route utilities"
```

### Task 3: Implement server-only photo storage and resident report APIs

**Files:**
- Create: `mainfile/alab-system/lib/supabase/server-storage.ts`
- Create: `mainfile/alab-system/lib/fire-reports/service.ts`
- Create: `mainfile/alab-system/app/api/resident/fire-reports/route.ts`
- Create: `mainfile/alab-system/app/api/resident/fire-reports/[id]/route.ts`
- Create: `mainfile/alab-system/tests/resident-report-submission.test.mjs`

**Consumes:** Resident signed-cookie helpers, database pool, Task 1 schema, and Task 2 validation.

**Produces:** Resident-scoped create/list/detail API contract and private-photo signed URL access.

- [ ] **Step 1: Write failing resident-access tests**

```js
assert.match(createRoute, /verifyResidentSession/);
assert.match(createRoute, /request\.formData\(\)/);
assert.match(createRoute, /validateFireReportInput/);
assert.match(createRoute, /uploadFireReportPhoto/);
assert.match(detailRoute, /resident_profile_id/);
assert.match(detailRoute, /where fr\.id = \$1 and fr\.resident_profile_id = \$2/i);
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `node --test tests/resident-report-submission.test.mjs`.

Expected: failure because the routes and storage helper do not exist.

- [ ] **Step 3: Implement report creation as one safe workflow**

Use the resident cookie to resolve the resident profile. Parse `FormData`, validate all fields, and create the report/status-history row inside `withTransaction`. Upload an optional photo through a server-only Supabase client using `SUPABASE_SECRET_KEY`, store only its storage key and metadata, and delete the uploaded object if the database transaction fails. Return report ID, reference number, and initial status. Implement list/detail queries that always constrain by the signed-in resident profile ID and create a signed photo URL only for that report owner.

- [ ] **Step 4: Run the focused test and verify it passes**

Run: `node --test tests/resident-report-submission.test.mjs`.

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/supabase/server-storage.ts lib/fire-reports/service.ts app/api/resident/fire-reports tests/resident-report-submission.test.mjs
git commit -m "feat: add resident fire report submission APIs"
```

### Task 4: Implement protected Municipal BFP incident/profile/respond APIs

**Files:**
- Create: `mainfile/alab-system/app/api/municipal-bfp/incidents/route.ts`
- Create: `mainfile/alab-system/app/api/municipal-bfp/incidents/[id]/route.ts`
- Create: `mainfile/alab-system/app/api/municipal-bfp/incidents/[id]/respond/route.ts`
- Create: `mainfile/alab-system/tests/municipal-incident-access.test.mjs`

**Consumes:** `verifyBfpSession`, `bfpSessionCookieName`, `getBfpIdentity`, Task 1 schema, and Task 3 services.

**Produces:** Municipal BFP-only queue, report/profile detail, and transaction-safe responding transition.

- [ ] **Step 1: Write failing authorization/action tests**

```js
assert.match(queueRoute, /bfpSessionCookieName\("MUNICIPAL_BFP"\)/);
assert.match(queueRoute, /session\.role !== "MUNICIPAL_BFP"/);
assert.match(detailRoute, /resident_profiles/);
assert.match(detailRoute, /resident_addresses/);
assert.match(respondRoute, /withTransaction/);
assert.match(respondRoute, /response_started_at/);
assert.match(respondRoute, /fire_report_status_history/);
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `node --test tests/municipal-incident-access.test.mjs`.

Expected: failure because the incident API routes do not exist.

- [ ] **Step 3: Implement authorization and respond transaction**

Require a Municipal BFP cookie and resolve the active identity before every query. The detail endpoint must return resident name, phone, primary address, barangay, municipality, account creation date, previous report summaries, active report, location/photo/description/landmark, and station coordinates. The respond endpoint must lock the report row, reject terminal reports, update status to RESPONDING, set `responding_bfp_user_id`, station name, and timestamp, then append a status history row with “BFP is responding to your fire report.”

- [ ] **Step 4: Run the focused test and verify it passes**

Run: `node --test tests/municipal-incident-access.test.mjs`.

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/api/municipal-bfp/incidents tests/municipal-incident-access.test.mjs
git commit -m "feat: add municipal incident response APIs"
```

### Task 5: Add the validated OSRM road-route proxy

**Files:**
- Create: `mainfile/alab-system/app/api/routes/road/route.ts`
- Modify: `mainfile/alab-system/tests/road-route.test.mjs`

**Consumes:** Task 2 coordinate and OSRM normalization utilities.

**Produces:** Same-origin route JSON with road-route data or direct-line fallback metadata.

- [ ] **Step 1: Write the failing route-proxy test**

```js
assert.match(routeApi, /router\.project-osrm\.org\/route\/v1\/driving/);
assert.match(routeApi, /normalizeOsrmRoute/);
assert.match(routeApi, /straightLineKilometers/);
assert.match(routeApi, /new URLSearchParams/);
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `node --test tests/road-route.test.mjs`.

Expected: failure because the route proxy does not exist.

- [ ] **Step 3: Implement safe OSRM proxying**

Accept exactly four finite coordinate query parameters: `fromLat`, `fromLng`, `toLat`, and `toLng`. Reject invalid bounds with 400. Fetch only the fixed OSRM URL with a 10-second abort signal. On route success, return `mode: "road"`, normalized coordinates, meters, seconds, and direct-line kilometers. On timeout/non-2xx/invalid payload, return `mode: "direct"`, direct-line kilometers, and no external error body.

- [ ] **Step 4: Run the focused test and verify it passes**

Run: `node --test tests/road-route.test.mjs`.

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/api/routes/road/route.ts tests/road-route.test.mjs
git commit -m "feat: add incident road route proxy"
```

### Task 6: Connect the resident report form and report-status views

**Files:**
- Create: `mainfile/alab-system/app/_components/resident-fire-report-form.tsx`
- Create: `mainfile/alab-system/app/_components/resident-report-status.tsx`
- Modify: `mainfile/alab-system/app/resident/report-fire/page.tsx`
- Modify: `mainfile/alab-system/app/resident/reports/page.tsx`
- Modify: `mainfile/alab-system/app/resident/reports/[id]/page.tsx`
- Modify: `mainfile/alab-system/tests/resident-report-location.test.mjs`
- Modify: `mainfile/alab-system/tests/resident-report-detail.test.mjs`

**Consumes:** Existing location/photo UI hooks and Task 3 resident APIs.

**Produces:** Resident-visible report creation and a polling status view that changes when BFP responds.

- [ ] **Step 1: Write failing UI tests**

```js
assert.match(reportPage, /ResidentFireReportForm/);
assert.match(form, /FormData/);
assert.match(form, /\/api\/resident\/fire-reports/);
assert.match(status, /BFP is responding to your fire report/);
assert.match(status, /setInterval/);
```

- [ ] **Step 2: Run the focused tests and verify they fail**

Run: `node --test tests/resident-report-location.test.mjs tests/resident-report-detail.test.mjs`.

Expected: failure because the live form/status components do not exist.

- [ ] **Step 3: Implement accessible resident workflow**

Keep the existing controlled location and camera-first photo behavior. Read the current location card dataset only after its validated state is true; submit current coordinates, locality labels, landmark, selected fire type, short description, and the selected photo in `FormData`. Disable duplicate submissions, show field-level validation, redirect to the new report detail after success, and poll its resident-scoped endpoint every 10 seconds while the report is active. Use the status label map to render Submitted, Pending Verification, Verified, Responding, Dispatched, Arrived, Under Control, or Resolved without exposing BFP-only fields.

- [ ] **Step 4: Run the focused tests and verify they pass**

Run: `node --test tests/resident-report-location.test.mjs tests/resident-report-detail.test.mjs`.

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/_components/resident-fire-report-form.tsx app/_components/resident-report-status.tsx app/resident/report-fire app/resident/reports tests/resident-report-location.test.mjs tests/resident-report-detail.test.mjs
git commit -m "feat: connect resident report submission and status"
```

### Task 7: Build the Municipal BFP incident detail, Respond action, and route map

**Files:**
- Create: `mainfile/alab-system/app/_components/municipal-incident-map.tsx`
- Create: `mainfile/alab-system/app/_components/municipal-incident-detail.tsx`
- Modify: `mainfile/alab-system/app/municipal-bfp/active-incidents/page.tsx`
- Modify: `mainfile/alab-system/app/municipal-bfp/verification-queue/page.tsx`
- Modify: `mainfile/alab-system/app/municipal-bfp/gis-map/page.tsx`
- Modify: `mainfile/alab-system/tests/municipal-gis-map.test.mjs`
- Modify: `mainfile/alab-system/tests/municipal-bfp-mobile.test.mjs`

**Consumes:** Task 4 Municipal BFP APIs and Task 5 route proxy.

**Produces:** Authorized Municipal BFP queue/details/map UI with a real route, direct line, resident profile panel, photo, and Respond action.

- [ ] **Step 1: Write failing Municipal BFP UI tests**

```js
assert.match(detail, /\/api\/municipal-bfp\/incidents/);
assert.match(detail, /Respond/);
assert.match(detail, /resident profile/i);
assert.match(map, /\/api\/routes\/road/);
assert.match(map, /polyline/);
assert.match(map, /direct line/i);
assert.match(map, /distance/i);
assert.match(map, /estimated/i);
```

- [ ] **Step 2: Run the focused tests and verify they fail**

Run: `node --test tests/municipal-gis-map.test.mjs tests/municipal-bfp-mobile.test.mjs`.

Expected: failure because the incident-specific components do not exist.

- [ ] **Step 3: Implement the BFP operator interface**

Replace static incident rows with data fetched from the protected queue endpoint. In the incident detail, render a responsive emergency profile panel, phone link, submitted photo, description, landmark, locality, coordinates, submitted time, previous reports, and status history. Add a red Respond button that calls the respond endpoint and immediately refreshes the detail/queue state. The Leaflet component renders a red incident marker and blue station marker, fetches the same-origin route API, draws a solid road route on success plus a dashed direct line, and leaves the direct line/straight-line distance visible if OSRM is unavailable.

- [ ] **Step 4: Run the focused tests and verify they pass**

Run: `node --test tests/municipal-gis-map.test.mjs tests/municipal-bfp-mobile.test.mjs`.

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/_components/municipal-incident-map.tsx app/_components/municipal-incident-detail.tsx app/municipal-bfp tests/municipal-gis-map.test.mjs tests/municipal-bfp-mobile.test.mjs
git commit -m "feat: add municipal incident response map"
```

### Task 8: Run migration/security checks and full project verification

**Files:**
- Modify: `mainfile/alab-system/.env.example` if present, otherwise `mainfile/alab-system/README.md`
- Modify: `mainfile/alab-system/tests/supabase-setup.test.mjs`

**Consumes:** All prior tasks.

**Produces:** Documented server-only storage configuration and verified build/test evidence.

- [ ] **Step 1: Add failing environment/configuration test**

```js
assert.match(configDocumentation, /SUPABASE_SECRET_KEY/);
assert.match(configDocumentation, /private.*fire-report/i);
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `node --test tests/supabase-setup.test.mjs`.

Expected: failure until the server-only key and private bucket instructions are documented.

- [ ] **Step 3: Document safe deployment configuration**

Document `SUPABASE_SECRET_KEY` as server-only, the private `fire-report-photos` bucket creation, and the 8 MB/image restriction. Do not add secrets to committed files. Verify the migration against the connected Supabase project using the project’s established migration command and check storage/RLS configuration before deployment.

- [ ] **Step 4: Run focused, full, lint, and build verification**

Run:

```bash
npm test
npm run lint
npm run build
```

Expected: all test files pass, ESLint exits 0, and Next build exits 0.

- [ ] **Step 5: Commit**

```bash
git add README.md tests/supabase-setup.test.mjs
git commit -m "docs: configure private incident photo storage"
```

## Plan Self-Review

- Coverage: Tasks 1-4 cover secure report storage, BFP access, response state, profile access, and status history. Task 5 covers real road route/direct-line fallback. Tasks 6-7 cover resident and Municipal BFP interfaces. Task 8 covers configuration and full verification.
- Scope: Automatic municipality-boundary routing, provincial monitoring, later response states, and push/SMS are intentionally omitted.
- Security: Every resident/BFP API requires the existing signed custom session, photos remain private, and resident location/profile data is returned only from authorized report-related routes.
- Type consistency: Task 2 exports the status and route utilities consumed by Tasks 3-7; Task 4 creates the incident contract consumed by Task 7.
