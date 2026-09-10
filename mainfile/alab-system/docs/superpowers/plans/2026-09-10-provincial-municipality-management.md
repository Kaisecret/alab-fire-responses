# Provincial Municipality Management Implementation Plan

> **For agentic workers:** Use `superpowers:executing-plans` to implement this plan task by task after the user requests implementation. Steps use checkbox syntax for tracking. This document is a plan only.

**Goal:** Allow authorized Provincial BFP users to view and manage all Antique municipalities' stations, municipal BFP personnel, resident registrations, and resident application reviews, and view all municipal fire reports and generate provincial summaries from the Provincial portal.

**Architecture:** Add scoped Provincial APIs over the existing PostgreSQL records. Share validated transaction services with Municipal workflows, preserving their municipality restrictions. Replace Provincial sample data with paginated, filterable reads and authenticated management actions.

**Tech Stack:** Existing Next.js 16 App Router, React, TypeScript, `pg`, Supabase PostgreSQL/storage, existing account notifications, PhilSMS, and Gmail delivery.

**Spec:** `docs/superpowers/specs/2026-09-10-provincial-municipality-management-design.md`.

## Global constraints

- Plan only until implementation is requested. User selected full Provincial management including resident approvals.
- Provincial UI scope; shared service refactoring is allowed only when Municipal behavior remains tested and unchanged.
- Province is Antique, derived server-side. Read actual migrations before writing SQL; never guess columns or table names.
- No sample people, stations, counts, shifts, or readiness states in production views.
- Preserve municipal dispatch authority and the coordination fixes in `0622434`.
- Existing auth, audit, private evidence handling, PhilSMS, and Gmail remain in use.
- Every list defaults to 25 rows; maximum page size 100. Every mutation validates actor, record province, expected revision, and allowed action.
- Never hard-delete accounts, application histories, dispatch histories, or station snapshots.
- No new public database grants, no arbitrary credential exposure, and no automatic production migration from a UI request.

## Contract and file map

All paths below are relative to `mainfile/alab-system`.

Create `lib/provincial-bfp/management/` with `types.ts`, `filters.ts`, `scope.ts`, `overview.ts`, `stations.ts`, `personnel.ts`, `residents.ts`, `applications.ts`, `reports.ts`, `report-summaries.ts`, `audit.ts`, and `exports.ts`. Each service owns one domain; scope and filter rules are shared.

```ts
type ManagementFilters = {
  municipalityId?: string; stationId?: string; barangayId?: string;
  search?: string; status?: string; from?: string; to?: string;
  page: number; pageSize: 25 | 50 | 100;
};
type ManagementPage<T> = {
  items: T[]; total: number; page: number; pageSize: number; updatedAt: string;
};
type ManagementActor = { userId: string; role: "PROVINCIAL_BFP"; province: "Antique" };
type MutationContext = { actor: ManagementActor; requestId: string; expectedVersion: string; reason?: string };
type ReportFilters = ManagementFilters & {
  reportSource?: "ALAB_APP" | "PHONE_CALL";
  fireType?: string; severity?: string;
};
```

`requireProvincialBfp(request)` remains the authentication entry point. `getManagementActor(request)` validates that identity and creates `ManagementActor`; it never reads actor identity from JSON. `parseManagementFilters(searchParams)` validates list inputs. `assertManagementTarget(client, actor, targetType, targetId)` checks persisted target ownership in the write transaction.

Use uniform HTTP behavior: 400 invalid input, 401 missing sign-in, 403 inactive/wrong role, 404 inaccessible target, 409 stale or conflicting state, 500 unexpected error. Responses use `Cache-Control: private, no-store`.

| API relative to `/api/provincial-bfp` | Methods | Service result |
| --- | --- | --- |
| `/management-summary` | GET | Filtered distinct counts and last update |
| `/municipalities` and `/municipalities/[municipalityId]` | GET | Municipality summaries and detail |
| `/stations` and `/stations/[stationId]` | GET, POST on list; GET, PATCH on detail | Station pages/create/update/status actions |
| `/personnel` and `/personnel/[personnelId]` | GET, POST on list; GET, PATCH on detail | Personnel pages/create/edit/assign/transfer/status actions |
| `/resident-applications` and `/resident-applications/[applicationId]` | GET | Latest applications and protected review detail |
| `/resident-applications/[applicationId]/approve` | POST | Saved approval and notification outcome |
| `/resident-applications/[applicationId]/request-corrections` | POST | Saved correction and separate SMS/email outcome |
| `/residents` and `/residents/[residentId]` | GET; GET, PATCH on detail | Resident directory/profile and administrative account actions |
| `/incident-reports` and `/incident-reports/[reportId]` | GET | Paginated all-status report registry and canonical protected detail |
| `/report-summaries` | GET | Filtered province/municipality aggregate preview with explicit period and metric definitions |
| `/management-audit` | GET | Paginated audited changes |
| `/management-export` | GET | Authenticated CSV for a validated dataset/filter set |

Station PATCH actions: `UPDATE`, `DEACTIVATE`, `REACTIVATE`. Personnel PATCH actions: `UPDATE`, `ASSIGN_STATION`, `TRANSFER_MUNICIPALITY`, `SUSPEND`, `REACTIVATE`. Resident PATCH actions: `UPDATE_ADMINISTRATIVE_DETAILS`, `SUSPEND`, `REACTIVATE`; reactivation is not application approval. Password reset uses a separate explicit action in the existing credential workflow, never a returned directory field.

## Task 1: Scope, data contracts, and schema preparation

**Files:** create `management/types.ts`, `filters.ts`, `scope.ts`; extend `lib/provincial-bfp/auth.ts` only as needed; create `tests/provincial-management-scope.test.mjs` and `tests/provincial-management-schema.test.mjs`; create a CLI-generated migration only after inspecting current schema.

- [ ] Read the spec, current `AGENTS.md`, bundled Next route documentation, auth guard, migrations, station services, resident review services, and the coordination review.
- [ ] Add behavioral tests for unsigned/wrong-role/suspended actors; valid Antique targets; another province; mismatched municipality/station/barangay filters; malformed UUIDs; page size 101; and stale revision handling. For example, `assert.throws(() => parseManagementFilters(new URLSearchParams('pageSize=101')), /INVALID_PAGE_SIZE/)`.
- [ ] Run `node --test tests/provincial-management-scope.test.mjs`; verify each new case fails for the intended missing behavior.
- [ ] Implement the contracts above. Keep the target municipality in a filter distinct from the authenticated actor scope. Lock target ownership when performing mutations.
- [ ] Inspect existing audit and uniqueness constraints. Reuse current audit tables where their record model is sufficient; otherwise create `provincial_management_events` for cross-domain audit and `provincial_management_operations` for idempotency. Operations have a unique `(actor_user_id, request_id)`, a payload digest, action, target, and saved result. Both are server-only with revoked public grants; audit rows reject update/delete. Add only measured query indexes.
- [ ] Use `supabase migration new provincial_management_support` after checking CLI help. Keep its generated timestamp after all existing migrations. Verify replay, grants, immutable audit, and unique operation keys using PostgreSQL tests.
- [ ] Run both task test files and commit this independently tested foundation.

## Task 2: Province-wide municipality overview

**Files:** create `management/overview.ts`, `/api/provincial-bfp/management-summary/route.ts`, `/municipalities/route.ts`, `/municipalities/[municipalityId]/route.ts`; modify `app/provincial-bfp/municipal-status/page.tsx` and `app/_components/provincial-bfp-dashboard.tsx`; create `tests/provincial-management-overview.test.mjs`.

**Interfaces:** `listManagedMunicipalities(actor, filters)` returns `ManagementPage<MunicipalitySummary>`; `getManagementSummary(actor, filters)` returns distinct domain totals. `MunicipalitySummary` contains ID/name, station count, personnel count, resident count, pending-application count, total fire report count, active incident count, and resolved count. Use the report filtering/counting contract in Task 7 for those last three fields.

- [ ] Seed test municipalities with zero stations, two stations, administrators without station assignments, and multiple verification histories for one resident. Assert no duplicate personnel/resident counts and that zero-record municipalities remain visible.
- [ ] Run the overview tests and confirm failure against sample-backed pages or missing services.
- [ ] Implement separate aggregates joined to `municipalities`; apply the same municipality/date filters to cards and lists. Use `COUNT(DISTINCT user_id)` where assignment history can multiply rows.
- [ ] Replace sample municipal cards with database summaries and links carrying the municipality filter. Add real empty/error/last-update states.
- [ ] Test a dashboard card count against the total of its linked filtered list, run the task tests, and commit.

## Task 3: Station directory and administration

**Files:** create `management/stations.ts`, Provincial station API routes, `app/_components/provincial-station-directory.tsx`; modify `app/provincial-bfp/firetrucks-stations/page.tsx`; reuse/refactor `lib/municipal-bfp/stations.ts`; create `tests/provincial-station-management.test.mjs`.

**Interfaces:** `listManagedStations(actor, filters)`, `getManagedStation(actor, stationId)`, `createManagedStation(context, input)`, and `updateManagedStation(context, stationId, input)`. Station input contains municipality ID for creation, name, coordinates, and explicit action for updates.

- [ ] Test station reads across two municipalities and exclusion of other provinces; create/update validation; stale edit conflict; active-assignment/dispatch deactivation conflicts; and immutable historical snapshots after editing station coordinates.
- [ ] Run the task test file and verify failure before implementing the new actions.
- [ ] Wrap existing domain operations in Provincial scope checks. Add checks absent from reused functions rather than assuming those functions authorize Provincial access. Persist domain change, operation result, and audit in one transaction.
- [ ] Build a station list and detail/editor with municipality shown in the title. Show assigned-personnel links. Deactivation requires a reason and explains blocking assignments.
- [ ] Test valid edits, invalid coordinates, duplicate submits, and rejected deactivation; rerun existing station/dispatch tests and commit.

## Task 4: Full municipal BFP personnel registry

**Files:** create `management/personnel.ts`, Provincial personnel API routes, `app/_components/provincial-personnel-directory.tsx`; modify `app/provincial-bfp/responders/page.tsx`; reuse account provisioning and station services; create `tests/provincial-personnel-management.test.mjs`.

**Interfaces:** `listManagedPersonnel(actor, filters)`, `getManagedPersonnel(actor, userId)`, `createManagedPersonnel(context, input)`, and `updateManagedPersonnel(context, userId, input)`.

- [ ] Test that staff, municipal administrators, suspended personnel, and unassigned personnel appear exactly once. Cover role/status/station filters and omission of password/token fields.
- [ ] Run the tests and verify intended failures.
- [ ] Use users/profiles as the personnel identity and left-join current assignments. Reuse provisioning validation, including official-email uniqueness and the one-active-municipal-admin constraint.
- [ ] Implement edits and transfers with target/source locks. Reject transfers while the user has an active dispatch; reject destinations outside Antique or inactive stations. Suspend/reactivate through account status, preserving historical assignments and dispatch snapshots.
- [ ] Replace sample responder names/shifts with the registry. Include create/edit/transfer/status dialogs and links from station and municipality details.
- [ ] Verify a suspended user's existing session is refused on the next API request. Test simultaneous transfers, audit entries, and credential non-disclosure; commit after tests pass.

## Task 5: Resident directory and account management

**Files:** create `management/residents.ts`, Provincial resident API routes, `app/provincial-bfp/residents/page.tsx`, `app/_components/provincial-resident-directory.tsx`; create `tests/provincial-resident-management.test.mjs`.

**Interfaces:** `listManagedResidents(actor, filters)`, `getManagedResident(actor, residentId)`, and `updateManagedResident(context, residentId, input)`. The result exposes account status and application status as separate fields.

- [ ] Test one resident with several application histories, one without an application, one without a primary address, and suspended/pending/approved residents. Verify deduplication and the Unassigned group.
- [ ] Run the task test file and verify failures.
- [ ] Query residents from users/profiles and select one primary address and latest verification deterministically. Keep known outside-province residents inaccessible even through direct IDs.
- [ ] Implement paginated list/profile/history views and audited administrative corrections. Re-check jurisdiction inside edits. Route identity/jurisdiction-sensitive changes through re-verification; never rewrite approval evidence or historical review events.
- [ ] Block activation of an unverified resident through a status action. Test account suspension/session denial, conflicting edits, field allowlists, and historical ownership audit; commit.

## Task 6: Provincial resident application approval and corrections

**Files:** create `management/applications.ts`, Provincial application list/detail/approve/request-corrections routes, `app/provincial-bfp/resident-applications/page.tsx`, `app/_components/provincial-resident-application-review.tsx`; refactor shared `lib/resident-applications/service.ts` transaction entry points; create `tests/provincial-application-review.test.mjs`.

**Interfaces:** `listManagedApplications(actor, filters)`, `getManagedApplication(actor, applicationId)`, `approveManagedApplication(context, applicationId, expectedSubmissionNumber)`, and `requestManagedApplicationCorrections(context, applicationId, expectedSubmissionNumber, message)`.

- [ ] Write tests for Provincial review of applications from two municipalities and denial of a Municipal caller attempting the other municipality. Test pending/approved/correction/history filters and private evidence access.
- [ ] Run the task test file and verify failures before widening any shared service interface.
- [ ] Resolve application ownership server-side. Call shared approval/correction transitions under row locks with explicit actor context, expected status, and submission number. Preserve Municipal scope checks on existing routes.
- [ ] Store the operation key and payload digest with the review result. Repeated identical requests return that result; conflicting payloads or a second reviewer receive 409.
- [ ] Reuse review evidence helpers and existing delivery queue. After commit, invoke the existing PhilSMS/Gmail delivery service. Render saved status separately from queued/sent/unconfirmed delivery state. Do not resend a message merely because delivery tracking failed.
- [ ] Add Municipal and Provincial review-result notifications with role-correct links. The resident uses the existing correction/resubmission flow.
- [ ] Run a real two-connection test: Municipal approval versus Provincial correction on the same pending submission must yield exactly one decision, one audit outcome, and no duplicate notification jobs. Verify resubmission and stale-tab conflicts; commit when tests pass.

## Task 7: All municipal fire reports and real provincial summaries

**Files:** create `management/reports.ts`, `management/report-summaries.ts`, `app/api/provincial-bfp/incident-reports/route.ts`, `app/api/provincial-bfp/incident-reports/[reportId]/route.ts`, `app/api/provincial-bfp/report-summaries/route.ts`, `app/provincial-bfp/incident-reports/page.tsx`, `app/_components/provincial-report-directory.tsx`, and `app/_components/provincial-report-detail.tsx`; modify `app/provincial-bfp/reports/page.tsx`; adapt existing Provincial incident detail and `lib/intermunicipality/provincial.ts` to reuse the canonical report detail; create `tests/provincial-report-directory.test.mjs` and `tests/provincial-report-summaries.test.mjs`.

**Interfaces:** `listProvincialReports(actor, filters: ReportFilters)` returns `ManagementPage<ProvincialReportRow>`; `getProvincialReport(actor, reportId)` returns one protected report detail or null; `getProvincialReportSummary(actor, filters: ReportFilters)` returns total distinct reports, counts by status/source/fire type/municipality, available timing metrics, and the applied date boundaries. `ProvincialReportRow` includes ID, reference, municipality ID/name, barangay, report source, fire type, calculated severity, status, submitted time, response-start time, and latest dispatch summary. Exports reuse these services rather than rebuilding scope rules.

- [ ] Add PostgreSQL fixtures for two Antique municipalities and one outside the province; citizen-app and phone reports; a report without any dispatch; resolved/false/rejected/duplicate/closed records; multiple photos and dispatch recipients; and a resident whose current address differs from the report's jurisdiction. Assert that each in-scope report appears once and direct detail access to an outside-province report returns no data.
- [ ] Test default All statuses/All time registry behavior and explicit date/source/status filters. Verify no-dispatch reports open, incident ownership uses `fire_reports.municipality_id`, and historical station/personnel snapshots are not replaced with current assignment values.
- [ ] Run `node --test tests/provincial-report-directory.test.mjs tests/provincial-report-summaries.test.mjs` and confirm the expected missing-service failures.
- [ ] Implement paginated reads from `fire_reports`, with left/lateral joins for optional/latest dispatch data and separate queries for detail history/photos/recipients. Validate status/type/source values against existing server enums. Do not join all one-to-many detail tables into the paginated list query.
- [ ] Extend the existing incident detail through a shared canonical service. Preserve existing API response contracts or adapt their consumers in the same task. Fetch signed private incident-photo URLs only on authenticated detail requests; never expose verification documents, device/IP fields, storage keys, or credentials through report reads.
- [ ] Build the All Municipal Reports table and detail view with municipality, barangay, date, status, source, fire type, severity, search, pagination, last-updated, and retry controls. Link the live incident queue and municipality Reports tab to the same detail. Keep Provincial incident-command controls absent.
- [ ] Replace sample rows in `/provincial-bfp/reports` with an on-demand summary form and preview. Use explicit Asia/Manila period boundaries, separate administrative outcomes from confirmed incidents, and show Not available for metrics lacking timestamps. A report submitted at midnight Manila must fall into exactly one daily period.
- [ ] Reconcile overview cards, municipality comparison rows, report registry totals, and exported totals for the same filter set. Include municipalities with zero matching reports. Hand-check a fixture with two real incidents, one false report, and one duplicate: received=4, false=1, duplicate=1; do not label received=4 as four confirmed fires.
- [ ] Connect summary preview to Task 8 CSV export and a print-friendly view. Display no stored-file/archive state unless a real persisted file exists. Rerun existing Provincial incident/coordination tests and commit the verified report feature.

## Task 8: Shared filters, audit, export, and navigation

**Files:** create `app/_components/provincial-management-toolbar.tsx`, `app/_components/use-provincial-management-list.ts`, `management/audit.ts`, `management/exports.ts`, audit/export APIs; modify Provincial layout and audit page; create `tests/provincial-management-ui.test.mjs` and `tests/provincial-management-export.test.mjs`.

- [ ] Test URL filter restoration, page reset after municipality changes, request cancellation, visible-tab refresh, authorization-driven data clearing, and retained data on transient errors.
- [ ] Run the task tests and verify failures.
- [ ] Apply the shared toolbar/list behavior to the new screens. Remove static sidebar count badges; show live counts only when returned by the scoped API. Add All Municipal Reports, Resident Applications, and Registered Residents navigation entries; retain the live Incidents and Provincial Reports links.
- [ ] Implement paginated audit history. Export validates a dataset enum (`STATIONS`, `PERSONNEL`, `RESIDENTS`, `APPLICATIONS`, `FIRE_REPORTS`, `REPORT_SUMMARY`), enforces the same actor/filter scope, and caps output at 10,000 rows with a clear instruction to narrow filters when exceeded. Fire-report and summary export use Task 7 query services and validated report filters.
- [ ] Escape CSV quoting and neutralize values beginning with spreadsheet formula characters. Whitelist export columns; default resident exports contain registration/application metadata, not contact/address/evidence fields. Audit exports.
- [ ] Test keyboard navigation, dialog focus/close behavior, mobile layout, correct municipality labels, empty results, and export privacy; commit.

## Task 9: Integrated verification and deployment preparation

**Files:** update README setup notes and add `docs/superpowers/reviews/2026-09-10-provincial-management-verification.md` containing actual evidence after implementation.

- [ ] Run `npm test`, `node node_modules/typescript/bin/tsc --noEmit`, and `npm run build`. Run lint on changed files and distinguish existing baseline issues from newly introduced failures.
- [ ] Run reset/migration/grant/audit tests against an isolated local Supabase database. Do not run destructive reset or fixture scripts against production. Use real multi-connection tests for conflicting reviews/transfers.
- [ ] Sign in as one Provincial and two Municipal accounts. Confirm Provincial sees both municipalities, each Municipal sees only its own, and Provincial changes appear in the corresponding municipal UI without cross-tab account leakage.
- [ ] Verify one approval, correction/resubmission, staff transfer, station edit, rejected station deactivation, suspended-session denial, and private evidence access. Use authorized test recipients for real SMS/email testing.
- [ ] Open app and phone reports from both municipalities, including one without dispatch and one resolved record. Verify status/date/source filters, protected photo access, original assignment history, summary totals, print view, and CSV output. Municipal sessions must not access the Provincial registry or another municipality's report by changing an ID.
- [ ] Check query plans and row counts against realistic multi-municipality data; verify pagination, index use, deduplication, and that large lists do not fetch every identity document.
- [ ] Review the concrete migration and code diff. Record which checks passed, failed, or were not run. Deploy only when requested and verify the actual Vercel project; migration execution is a separate database step, not implied by a Git push.

## Plan coverage check

Municipality overview: Task 2. All stations: Task 3. All BFP administrators/staff: Task 4. All registered residents: Task 5. Provincial approval/corrections: Task 6. All municipal fire reports, historical details, and real summary generation: Task 7. Filtering, navigation, audit/export: Task 8. Auth, shared scope, concurrency, and migrations: Tasks 1 and 9 with domain-specific tests in Tasks 3–7.

Implementation and a repair review now exist. See `docs/superpowers/reviews/2026-09-10-provincial-management-verification.md` for actual verification evidence and outstanding integration checks. Unchecked steps above are not a certification of completion. The earlier coordination-fix commit remains independent.
