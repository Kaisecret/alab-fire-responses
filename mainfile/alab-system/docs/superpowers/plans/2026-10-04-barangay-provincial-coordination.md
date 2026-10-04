# Barangay Provincial Coordination Implementation Plan

> **For agentic workers:** Use subagent-driven-development or executing-plans task by task; use the shared API contract below. Do not commit or deploy without authorization.

**Goal:** Three or more distinct active incidents in the same municipality and barangay automatically alert Provincial BFP and allow nearest-municipality mutual aid commands through the existing dispatch workflow.

**Architecture:** A protected durable alert table is synchronized against canonical active fire reports whenever the provincial alert feed polls. Polling runs every five seconds. Acknowledgment silences the popup across provincial sessions without hiding the coordination card. A new incident reopens acknowledgment; fewer than three active incidents closes the alert. Resource commands use existing observers, assistance state, audit and municipal notification handling.

**Tech Stack:** Next.js 16, React 19, PostgreSQL, pg, PGlite integration tests.

**Spec:** User request in this conversation: automatic provincial popup for three or more reports in one barangay, nearest municipality assignment and consistent coordination UI.

## Global Constraints

- Count canonical active incidents only; exclude linked duplicates, DUPLICATE/RESOLVED/CLOSED/REJECTED/FALSE_REPORT and unknown barangays.
- Municipality and barangay IDs define the group; names alone must not merge groups.
- All endpoints require Provincial BFP authorization. No browser-wide private-record cache.
- Provincial acknowledgment must match the current incident snapshot and cannot acknowledge a new unseen incident.
- Assignment requires an active originating dispatch; do not bypass verification or fabricate dispatches.
- Rank eligible active BFP stations by straight-line distance to the selected incident; exclude its municipality and invalid coordinates.
- Commands must be durable, enforce existing provincial command rules, notify the receiving municipality and appear in existing assistance feeds.

### Task 1: Alert persistence and backend (root)

**Files:** New migration from Supabase CLI; `lib/intermunicipality/barangay-alerts.ts`; `app/api/provincial-bfp/barangay-alerts/route.ts`; migration release runner; meaningful PGlite/API tests. Allow the existing assistance creator to accept an internal transaction client so assignment stays atomic.

- [x] Write failing tests for threshold, group isolation, duplicate exclusion, acknowledgment races, closure/reopening and nearest candidates.
- [x] Implement synchronized durable alert table with one open row per group and protected RLS/privileges.
- [x] Implement authorized GET/PATCH/POST and atomic observer/resource-command creation.
- [x] Verify actual migration, production SQL and command idempotency with isolated PostgreSQL.

### Task 2: Provincial UI (UI worker)

**Files:** Shared `barangay-alert-types.ts`; live alert hook; barangay alert popup and coordination panel; integrate into existing backup alarm and assistance page; behavior tests.

- [x] Write a failing behavior test for automatic popup, acknowledgment and selection/submission contract.
- [x] Implement a five-second visible-page feed with request cancellation and auth-error clearing.
- [x] Reuse existing provincial alert styling; defer barangay popup while a forwarded backup popup is active.
- [x] Display persistent barangay cards, incident status, nearest sorted municipality selection and explicit dispatch-wait state.
- [x] Verify responsive controls, native dialog keyboard behavior and server-error handling.

## API Contract

`GET /api/provincial-bfp/barangay-alerts` returns `{ alerts: BarangayAlert[] }` with private/no-store. An alert has `id`, `municipalityId`, `municipalityName`, `barangayId`, `barangay`, `incidentCount`, `openedAt`, `updatedAt`, `acknowledgedAt: string|null`, `incidentIds: string[]`, and `incidents`.

An incident has `id`, `referenceNumber`, `status`, `fireType`, `dispatched: boolean`, `nearbyMunicipalities: Array<{municipalityId, municipalityName, stationId, stationName, distanceMeters}>`, and `commands: Array<{id, recipientMunicipalityId, recipientMunicipalityName, status}>`.

`PATCH` body `{ alertId, incidentIds }` acknowledges only the same current incident set. Return `{ acknowledged: true }`, or 409 when the alert changed.

`POST` body `{ alertId, fireReportId, recipientMunicipalityId, requestedFiretrucks, requestedPersonnel }` returns `{ assistanceRequests }`. Default UI resources: one firetruck, zero personnel. Dispatch unavailable/stale group returns 409; invalid input/recipient returns 400.

### Task 3: Review and verify (root)

- [x] Review backend/UI together against the contract and user behavior.
- [x] Run targeted tests, TypeScript, changed-file lint and production build; run the full suite after integration.
- [x] Obtain read-only code review and fix important findings.
- [x] Report deployment/migration status accurately.

## Verification and delivery

- Final `npm test`: 781 tests, 780 passed, zero failed, one skipped because the broad-suite database concurrency test requires `DATABASE_URL`. Log: `outputs/barangay-coordination-fix/test-suite-verified.log` at the workspace root.
- Final `npm run build`: passed production compilation, TypeScript, route generation and evidence runtime verification. Log: `outputs/barangay-coordination-fix/build-verified.log` at the workspace root.
- Changed-file ESLint passed with no warnings; scoped Git whitespace checks passed.
- Actual migration/service SQL was tested with isolated PGlite fixtures, including group isolation, duplicate exclusion, acknowledgment snapshots, alert reopening, real assistance commands, rollback and idempotency. UI behavior tests cover protected polling, request races, resource selection, dispatch waiting and native dialog lifecycle.
- Read-only review found two lock conflicts with existing acknowledgment/alarm enrollment paths. Regression checks were added before fixes: acknowledgment now acquires the incident before its observer; initial assignment lifecycle locks allow concurrent foreign-key checks before enrolling the observer. Review found no remaining important issue. Separate concurrent PostgreSQL sessions were not available for reproduction.
- Browser inspection was unavailable: the in-app browser returned no available sessions. Responsive CSS and UI behavior were checked in code/tests; live visual inspection remains unverified.
- New migration: `20261004133956_add_provincial_barangay_alerts.sql`. It is included in the release migration runner but has not been applied to the live database in this session. No deployment or commit was performed.
