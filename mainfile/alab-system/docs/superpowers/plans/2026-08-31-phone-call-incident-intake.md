# Phone-Call Incident Intake Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a Municipal BFP administrator pin a phone-reported fire on a zoomable map, record caller information, select individual responders from a station, and dispatch them in one atomic action.

**Architecture:** Keep `fire_reports` as the single incident source of truth, adding source-aware fields for reports created from calls. Add a municipal-authorized create-and-dispatch service that validates a station and responder selection before writing the report and existing dispatch records in one transaction. Add a focused Leaflet intake component to the Active Incidents page and extend existing incident read models to show the `From Phone Caller` source.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, PostgreSQL/Supabase migrations, `pg`, Leaflet 1.9, Node built-in test runner.

**Spec:** `docs/superpowers/specs/2026-08-31-phone-call-incident-intake-design.md`

## Global Constraints

- Only Municipal BFP administrators can create or dispatch a phone-call incident; the server derives municipality scope solely from `requireMunicipalAdmin`.
- A phone-call incident stores caller name and phone and displays the exact source label `From Phone Caller`.
- The map pin must support zoom, pan, click-to-place, and drag-to-adjust before dispatch.
- A dispatch selects one active station and one or more active responders assigned to that station; it must never broadcast to a whole station by default.
- A successful create-and-dispatch request is atomic, creates mobile/provincial notifications, and creates no resident notification.
- Existing ALAB-app reports, current station-team dispatch, responder lifecycle, GIS map, and resolution behavior must remain functional.
- Use current project conventions: server-side `pg` access, custom BFP sessions, `runtime = "nodejs"`, Leaflet dynamic import in client components, and Node tests in `tests/*.test.mjs`.

---

## File Structure

| File | Responsibility |
| --- | --- |
| `supabase/migrations/20260831100000_add_phone_call_incident_source.sql` | Source-aware `fire_reports` schema, source-specific integrity checks, and queue index. |
| `lib/municipal-bfp/phone-incidents.ts` | Input parsing/validation and the atomic phone-call create-and-dispatch operation. |
| `lib/municipal-bfp/dispatch.ts` | Add scoped individual-responder lookup and make resident notification paths safe for reports without a resident profile. |
| `app/api/municipal-bfp/phone-incidents/route.ts` | Municipal-admin POST route for the atomic operation. |
| `app/api/municipal-bfp/stations/[stationId]/responders/route.ts` | Municipal-admin GET route listing active, station-scoped responders. |
| `app/_components/municipal-phone-call-incident-intake.tsx` | Accessible Leaflet pin-and-dispatch modal/workspace and its form state. |
| `app/municipal-bfp/active-incidents/page.tsx` | Add the intake trigger and refresh the live queue after success. |
| `app/_components/use-municipal-incident-feed.ts` and `app/api/municipal-bfp/incidents/route.ts` | Return and consume a report source in the active queue. |
| `app/api/municipal-bfp/incidents/[id]/route.ts`, `app/_components/municipal-incident-detail.tsx`, `app/_components/municipal-gis-incident-modal.tsx` | Read nullable resident information safely and label phone-source detail views. |
| `tests/phone-call-incident-schema.test.mjs`, `tests/phone-call-incident-service.test.mjs`, `tests/phone-call-incident-ui.test.mjs` | Source schema, scoped atomic dispatch, and UI/source-label regression coverage. |

### Task 1: Add a source-aware incident migration

**Files:**
- Create: `supabase/migrations/20260831100000_add_phone_call_incident_source.sql`
- Test: `tests/phone-call-incident-schema.test.mjs`

**Interfaces:**
- Consumes: existing `public.fire_reports`, `public.users`, and `public.municipalities` tables.
- Produces: `fire_reports.report_source`, `caller_name`, `caller_phone`, `created_by_user_id`, and `reported_at`; phone-call rows may have a null `resident_profile_id`.

- [ ] **Step 1: Write the failing migration contract test**

```js
test("phone call incident migration keeps app reports intact and constrains phone reports", () => {
  const migration = source("supabase/migrations/20260831100000_add_phone_call_incident_source.sql");
  assert.match(migration, /alter column resident_profile_id drop not null/i);
  assert.match(migration, /report_source text not null default 'ALAB_APP'/i);
  assert.match(migration, /caller_name text/i);
  assert.match(migration, /caller_phone text/i);
  assert.match(migration, /created_by_user_id uuid references public\.users/i);
  assert.match(migration, /reported_at timestamptz not null default now\(\)/i);
  assert.match(migration, /report_source = 'PHONE_CALL'/i);
  assert.match(migration, /fire_reports_municipality_source_submitted_idx/i);
});
```

- [ ] **Step 2: Run the new test to verify it fails**

Run: `node --test tests/phone-call-incident-schema.test.mjs`

Expected: FAIL because the migration file does not yet exist.

- [ ] **Step 3: Create the migration with backward-compatible defaults and checks**

```sql
alter table public.fire_reports
  alter column resident_profile_id drop not null,
  add column if not exists report_source text not null default 'ALAB_APP',
  add column if not exists caller_name text,
  add column if not exists caller_phone text,
  add column if not exists created_by_user_id uuid references public.users(id) on delete set null,
  add column if not exists reported_at timestamptz not null default now();

alter table public.fire_reports
  add constraint fire_reports_source_shape_check check (
    (report_source = 'ALAB_APP' and resident_profile_id is not null)
    or (
      report_source = 'PHONE_CALL' and resident_profile_id is null
      and char_length(trim(caller_name)) between 2 and 120
      and caller_phone ~ '^\\+?[0-9]{10,15}$'
      and created_by_user_id is not null
    )
  );

create index if not exists fire_reports_municipality_source_submitted_idx
  on public.fire_reports (municipality_id, report_source, submitted_at desc);
```

Also add a `fire_reports_report_source_check` allowing only `ALAB_APP` and `PHONE_CALL`, update any non-null caller fields in existing rows only when necessary to satisfy the new constraint, and add table comments explaining that server-side code owns these fields.

- [ ] **Step 4: Run migration and schema checks**

Run: `node --test tests/phone-call-incident-schema.test.mjs tests/migration.test.mjs tests/supabase-schema.test.mjs`

Expected: PASS. Apply the migration to the project Supabase database using the repository’s established migration command before running the full test suite.

- [ ] **Step 5: Commit the schema contract**

```bash
git add supabase/migrations/20260831100000_add_phone_call_incident_source.sql tests/phone-call-incident-schema.test.mjs
git commit -m "feat: add phone call incident source schema"
```

### Task 2: Build source-specific validation and an atomic individual-responder dispatch service

**Files:**
- Create: `lib/municipal-bfp/phone-incidents.ts`
- Modify: `lib/municipal-bfp/dispatch.ts:10-209`
- Test: `tests/phone-call-incident-service.test.mjs`

**Interfaces:**
- Consumes: `withTransaction`, `createAccountNotifications`, `sendDispatchPush`, `FireType`, authenticated municipal IDs, and active station/personnel tables.
- Produces: `validatePhoneCallIncidentInput(raw): PhoneCallIncidentInput`, `listStationResponders(municipalityId, stationId): DispatchableResponder[]`, and `createPhoneCallIncidentAndDispatch(input): PhoneCallIncidentDispatch`.

- [ ] **Step 1: Write failing service contract tests**

```js
test("phone call dispatch validates the caller, pin, one station, and selected responders", () => {
  const service = source("lib/municipal-bfp/phone-incidents.ts");
  assert.match(service, /export function validatePhoneCallIncidentInput/);
  assert.match(service, /callerName/);
  assert.match(service, /callerPhone/);
  assert.match(service, /stationId/);
  assert.match(service, /responderIds/);
  assert.match(service, /PHONE_CALL/);
  assert.match(service, /withTransaction/);
});

test("phone call dispatch uses only selected active responders and never creates a resident notification", () => {
  const service = source("lib/municipal-bfp/phone-incidents.ts");
  assert.match(service, /recipient_user_id = any\(\$[0-9]+::uuid\[\]\)/);
  assert.match(service, /STATION_RESPONDER_SELECTION_REQUIRED/);
  assert.match(service, /INCIDENT_DISPATCH_ASSIGNED/);
  assert.doesNotMatch(service, /resident_user_id/);
});
```

- [ ] **Step 2: Run service tests to verify they fail**

Run: `node --test tests/phone-call-incident-service.test.mjs`

Expected: FAIL because `lib/municipal-bfp/phone-incidents.ts` does not yet exist.

- [ ] **Step 3: Implement the validation and transaction boundaries**

Define these exact types in `lib/municipal-bfp/phone-incidents.ts`:

```ts
export type PhoneCallIncidentInput = {
  callerName: string; callerPhone: string; fireType: FireType; description: string;
  barangayId: string; landmark: string; latitude: number; longitude: number;
  reportedAt: Date; stationId: string; responderIds: string[];
};
export type PhoneCallIncidentDispatch = {
  fireReportId: string; referenceNumber: string; dispatchId: string;
  stationName: string; responderCount: number; dispatchedAt: Date;
};
```

Validate 2–120 character caller names, the `^\\+?[0-9]{10,15}$` phone format, an allowed `FireType`, 4–22 latitude, 116–127 longitude, a valid UUID barangay/station/responders list, and a nonempty 1–1200 character description. Query the barangay against the authenticated municipality, then lock the requested active station and load only responder IDs that are active, assigned to that same station, and municipally assigned. Reject any missing/out-of-scope ID with `INVALID_STATION_RESPONDER_SELECTION`.

Inside one `withTransaction`, insert a `PHONE_CALL` row into `fire_reports` with `resident_profile_id = null`, source/caller/staff fields, copied reporter snapshots, `status = 'RESPONDING'`, and server-generated reference number. Insert the existing dispatch, station snapshot, and *only* requested recipient rows; append a `RESPONDING` history row. Notify selected responders and provincial recipients, then call `sendDispatchPush` after transaction success. Do not create a resident notification.

In `dispatch.ts`, add `DispatchableResponder` and `listStationResponders`; change resident-dependent queries in `dispatchIncidentToStations` and `resolveMunicipalIncident` to `left join resident_profiles`, conditionally create resident notifications only when `resident_user_id` is present, and preserve the existing app-report notifications unchanged.

- [ ] **Step 4: Run focused service and regression tests**

Run: `node --test tests/phone-call-incident-service.test.mjs tests/station-team-dispatch-service.test.mjs tests/mobile-station-dispatch.test.mjs tests/municipal-incident-resolution.test.mjs`

Expected: PASS. The existing station-team behavior still selects all recipients for its original route; the new service selects only explicit responder IDs.

- [ ] **Step 5: Commit the service layer**

```bash
git add lib/municipal-bfp/phone-incidents.ts lib/municipal-bfp/dispatch.ts tests/phone-call-incident-service.test.mjs
git commit -m "feat: dispatch phone incidents to selected responders"
```

### Task 3: Expose scoped phone-call and responder APIs

**Files:**
- Create: `app/api/municipal-bfp/phone-incidents/route.ts`
- Create: `app/api/municipal-bfp/stations/[stationId]/responders/route.ts`
- Modify: `tests/phone-call-incident-service.test.mjs`

**Interfaces:**
- Consumes: `requireMunicipalAdmin`, `isAuthorizationResponse`, `createPhoneCallIncidentAndDispatch`, `listStationResponders`.
- Produces: `POST /api/municipal-bfp/phone-incidents` and `GET /api/municipal-bfp/stations/:stationId/responders`.

- [ ] **Step 1: Add failing API-source assertions**

```js
test("phone incident APIs derive scope from the municipal administrator", () => {
  const createRoute = source("app/api/municipal-bfp/phone-incidents/route.ts");
  const respondersRoute = source("app/api/municipal-bfp/stations/[stationId]/responders/route.ts");
  assert.match(createRoute, /requireMunicipalAdmin/);
  assert.match(createRoute, /createPhoneCallIncidentAndDispatch/);
  assert.match(respondersRoute, /requireMunicipalAdmin/);
  assert.match(respondersRoute, /listStationResponders/);
  assert.doesNotMatch(createRoute, /body\.municipalityId/);
  assert.doesNotMatch(respondersRoute, /searchParams.*municipalityId/);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test tests/phone-call-incident-service.test.mjs`

Expected: FAIL because both route modules are missing.

- [ ] **Step 3: Implement deterministic API errors and response shapes**

Use `requireMunicipalAdmin` in both routes before loading municipal data. The responder route validates the UUID `stationId` and returns `{ responders: DispatchableResponder[] }`. The POST route accepts caller, map, incident, station, and responder fields, passes `identity.userId`, `identity.municipalityId`, and `identity.municipalityName` as server-owned arguments, then returns `{ incident: PhoneCallIncidentDispatch }` with HTTP 201.

Map service errors to these HTTP responses:

```ts
const statusByCode: Record<string, number> = {
  INVALID_PHONE_CALL_INPUT: 400,
  INVALID_STATION_RESPONDER_SELECTION: 409,
  STATION_RESPONDER_SELECTION_REQUIRED: 400,
  BARANGAY_NOT_IN_MUNICIPALITY: 409,
};
```

Use `runtime = "nodejs"`, log unexpected server failures, and return a user-safe 500 message without database details.

- [ ] **Step 4: Run API authorization regressions**

Run: `node --test tests/phone-call-incident-service.test.mjs tests/municipal-incident-access.test.mjs tests/municipal-stations-personnel.test.mjs`

Expected: PASS. No route accepts a client-provided municipality as authority.

- [ ] **Step 5: Commit the APIs**

```bash
git add app/api/municipal-bfp/phone-incidents/route.ts app/api/municipal-bfp/stations/[stationId]/responders/route.ts tests/phone-call-incident-service.test.mjs
git commit -m "feat: add phone incident dispatch APIs"
```

### Task 4: Make incident read models source-aware and resident-optional

**Files:**
- Modify: `app/api/municipal-bfp/incidents/route.ts:16-23`
- Modify: `app/_components/use-municipal-incident-feed.ts:5-16`
- Modify: `app/api/municipal-bfp/incidents/[id]/route.ts:18-49`
- Modify: `app/_components/municipal-incident-detail.tsx:10-45,1406-1550,1834-1849`
- Modify: `app/_components/municipal-gis-incident-modal.tsx:9-29,92-125`
- Test: `tests/phone-call-incident-ui.test.mjs`

**Interfaces:**
- Consumes: new `fire_reports.report_source`, `caller_name`, `caller_phone`, nullable `resident_profile_id`.
- Produces: `MunicipalIncident.reportSource: "ALAB_APP" | "PHONE_CALL"` and detail payloads with a `reportSource` field.

- [ ] **Step 1: Write failing source-label tests**

```js
test("municipal incident views expose From Phone Caller without requiring a resident profile", () => {
  const queue = source("app/api/municipal-bfp/incidents/route.ts");
  const detail = source("app/api/municipal-bfp/incidents/[id]/route.ts");
  const queueUi = source("app/municipal-bfp/active-incidents/page.tsx");
  const gisUi = source("app/_components/municipal-gis-incident-modal.tsx");
  assert.match(queue, /fr\.report_source as "reportSource"/);
  assert.match(detail, /left join resident_profiles/);
  assert.match(detail, /fr\.report_source as "reportSource"/);
  assert.match(queueUi, /From Phone Caller/);
  assert.match(gisUi, /From Phone Caller/);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test tests/phone-call-incident-ui.test.mjs`

Expected: FAIL because the source field and labels are absent.

- [ ] **Step 3: Update SQL, TypeScript models, and labels**

Add `fr.report_source as "reportSource"` to queue/detail queries. In the detail route, replace mandatory resident joins with left joins, use `coalesce(fr.caller_name, fr.reporter_name_snapshot)` and `coalesce(fr.caller_phone, fr.reporter_phone_snapshot)`, and skip the previous-reports query when `residentProfileId` is null:

```ts
const previousReports = incident.residentProfileId
  ? database.query("select id, reference_number as \"referenceNumber\", status, submitted_at as \"submittedAt\" from fire_reports where resident_profile_id = $1 order by submitted_at desc limit 10", [incident.residentProfileId])
  : Promise.resolve({ rows: [] });
```

Extend `MunicipalIncident` and both detail interfaces with `reportSource`. Render the exact text `From Phone Caller` beside the reference number in the Active Incidents table, detail hero/facts, and GIS modal. Change resident-specific copy in phone-source views to neutral caller copy and remove IP/device audit facts for phone reports rather than presenting fabricated app telemetry.

- [ ] **Step 4: Run read-model and GIS regression tests**

Run: `node --test tests/phone-call-incident-ui.test.mjs tests/municipal-incident-access.test.mjs tests/municipal-gis-map.test.mjs tests/municipal-incident-dispatch-ui.test.mjs`

Expected: PASS. App-report fields remain visible for `ALAB_APP`; phone-call rows render caller data and source labels safely.

- [ ] **Step 5: Commit source-aware read models**

```bash
git add app/api/municipal-bfp/incidents app/_components/use-municipal-incident-feed.ts app/_components/municipal-incident-detail.tsx app/_components/municipal-gis-incident-modal.tsx tests/phone-call-incident-ui.test.mjs
git commit -m "feat: label phone caller incidents in municipal views"
```

### Task 5: Implement the interactive phone-call intake workspace

**Files:**
- Create: `app/_components/municipal-phone-call-incident-intake.tsx`
- Modify: `app/municipal-bfp/active-incidents/page.tsx:1-12,460-476`
- Modify: `tests/phone-call-incident-ui.test.mjs`

**Interfaces:**
- Consumes: `GET /api/municipal-bfp/stations`, `GET /api/municipal-bfp/stations/:stationId/responders`, `POST /api/municipal-bfp/phone-incidents`, Leaflet, and `onCreated(): void`.
- Produces: `MunicipalPhoneCallIncidentIntake({ onClose, onCreated })`, opened by an Active Incidents `New Phone Call Incident` control.

- [ ] **Step 1: Write failing interaction contract tests**

```js
test("phone call intake provides a draggable map pin and explicit responder selection", () => {
  const intake = source("app/_components/municipal-phone-call-incident-intake.tsx");
  assert.match(intake, /import\("leaflet"\)/);
  assert.match(intake, /draggable:\s*true/);
  assert.match(intake, /marker\.on\("dragend"/);
  assert.match(intake, /map\.on\("click"/);
  assert.match(intake, /zoomControl:\s*true/);
  assert.match(intake, /Caller name/);
  assert.match(intake, /Caller phone/);
  assert.match(intake, /From Phone Caller/);
  assert.match(intake, /\/api\/municipal-bfp\/stations\/\$\{stationId\}\/responders/);
  assert.match(intake, /Create & Dispatch/);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test tests/phone-call-incident-ui.test.mjs`

Expected: FAIL because the intake component does not exist.

- [ ] **Step 3: Build the accessible two-column modal/workspace**

Create a client component with a `createPortal` dialog, Escape/backdrop close behavior, focusable labelled fields, error `role="alert"`, and a 2-column desktop/1-column mobile layout. Initialize Leaflet once with OpenStreetMap tiles, `zoomControl: true`, and a red `L.divIcon` fire marker:

```ts
const marker = L.marker(initialCoordinates, { draggable: true, icon: fireIcon }).addTo(map);
const updatePin = (latlng: import("leaflet").LatLng) => setLocation({ latitude: latlng.lat, longitude: latlng.lng });
marker.on("dragend", () => updatePin(marker.getLatLng()));
map.on("click", (event) => { marker.setLatLng(event.latlng); updatePin(event.latlng); });
```

Default the map to the selected municipality’s first active station coordinates from `GET /api/municipal-bfp/stations`; do not claim precise incident location until the dispatcher clicks or drags the pin. Load responders only after a station is selected, clear selected responders when that station changes, and show each responder as a labelled checkbox. Require caller name/phone, fire type, barangay, description, explicit map interaction, one station, and at least one responder before enabling `Create & Dispatch`.

On submit, send exactly this payload to the POST route:

```ts
{ callerName, callerPhone, fireType, description, barangayId, landmark, latitude, longitude, reportedAt, stationId, responderIds }
```

Disable duplicate submission, retain values after API validation/conflict errors, announce errors, and call `onCreated()` only after HTTP 201.

- [ ] **Step 4: Integrate the entry point and refresh behavior**

In `ActiveIncidentsPage`, add `const [phoneIntakeOpen, setPhoneIntakeOpen] = useState(false);`, a prominent red `New Phone Call Incident` button beside Live Refresh, and render:

```tsx
{phoneIntakeOpen && <MunicipalPhoneCallIncidentIntake
  onClose={() => setPhoneIntakeOpen(false)}
  onCreated={() => { setPhoneIntakeOpen(false); void refresh(true); }}
/>}
```

Use responsive CSS so the primary emergency action remains visible and does not overflow at 768px or below.

- [ ] **Step 5: Run UI tests and manually verify the visual flow**

Run: `node --test tests/phone-call-incident-ui.test.mjs tests/municipal-incident-dispatch-ui.test.mjs tests/municipal-gis-map.test.mjs && npm run lint && npm run build`

Expected: PASS. In a local Municipal Admin session, verify: map zoom works; click and drag change the pin coordinates; changing the station clears prior responder selection; the action stays disabled until valid; a successful dispatch closes the dialog and displays the new `From Phone Caller` row.

- [ ] **Step 6: Commit the intake UI**

```bash
git add app/_components/municipal-phone-call-incident-intake.tsx app/municipal-bfp/active-incidents/page.tsx tests/phone-call-incident-ui.test.mjs
git commit -m "feat: add phone call incident intake workspace"
```

### Task 6: Run the complete verification suite and document delivery

**Files:**
- Modify: `README.md` only if it contains a Municipal BFP feature list; otherwise no documentation file changes.
- Test: all existing `tests/*.test.mjs`.

**Interfaces:**
- Consumes: all completed migrations, APIs, services, and UI.
- Produces: a verified build and a concise user-facing handoff that identifies the migration and Municipal Admin-only access.

- [ ] **Step 1: Add final regression assertions before broad verification**

```js
test("phone-origin incidents preserve normal mobile lifecycle and municipal resolution", () => {
  const dispatch = source("lib/municipal-bfp/dispatch.ts");
  const phone = source("lib/municipal-bfp/phone-incidents.ts");
  assert.match(phone, /status.*RESPONDING/);
  assert.match(dispatch, /listMobileDispatchAssignments/);
  assert.match(dispatch, /resolveMunicipalIncident/);
  assert.match(phone, /sendDispatchPush/);
});
```

- [ ] **Step 2: Run the targeted final regression group**

Run: `node --test tests/phone-call-incident-*.test.mjs tests/mobile-station-dispatch.test.mjs tests/municipal-incident-resolution.test.mjs tests/municipal-gis-map.test.mjs`

Expected: PASS with phone origin, responder lifecycle, resolution, and GIS coverage all green.

- [ ] **Step 3: Run lint, full tests, and production build**

Run: `npm run lint && npm test && npm run build`

Expected: all commands exit 0. Do not report the feature complete if any command fails; investigate and correct the failure in the task that owns it.

- [ ] **Step 4: Update feature documentation only when the existing README has a matching Municipal BFP capability section**

Add this exact bullet in that existing section if present:

```md
- Municipal admins can create and dispatch a **From Phone Caller** incident by pinning the location and selecting individual station responders.
```

Then run: `git diff --check`.

- [ ] **Step 5: Commit the final verification/docs change**

```bash
git add tests/phone-call-incident-service.test.mjs tests/phone-call-incident-ui.test.mjs README.md
git commit -m "test: verify phone call incident workflow"
```

If `README.md` was not changed because it has no matching capability section, omit it from `git add`.

## Plan Self-Review

**Spec coverage:**

- Phone-call source, caller identity, staff creator, reported timestamp, and nullable resident relationship: Task 1.
- Exact pin, zoom/pan/click/drag interaction and responsive command UI: Task 5.
- Individual station responder selection, active/scope enforcement, atomic writes, mobile/provincial notification, and no resident notification: Tasks 2 and 3.
- Queue, map, and detail `From Phone Caller` labels plus resident-optional records: Task 4.
- Error behavior, authorization, app-report compatibility, responder lifecycle, resolution, lint, tests, and build verification: Tasks 2–6.

**Placeholder scan:** No unfinished markers, deferred implementation, or unspecified test steps remain.

**Type consistency:** The plan uses `PhoneCallIncidentInput`, `PhoneCallIncidentDispatch`, `DispatchableResponder`, `listStationResponders`, and `createPhoneCallIncidentAndDispatch` consistently from service to routes and UI.
