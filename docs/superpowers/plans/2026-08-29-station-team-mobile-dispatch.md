# Station-Team Mobile Dispatch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a Municipal Administrator dispatch an incident to one, several, or all eligible municipal stations so every active responder in those stations receives an in-app and phone notification, acknowledges independently, follows an ALAB in-app route, and is automatically marked on scene after a verified 100-meter arrival.

**Architecture:** Add server-owned dispatch, station-recipient snapshot, mobile-device, and push-delivery records to PostgreSQL. Keep Next.js as the only trusted database/FCM gateway; the existing custom BFP sessions authorize all web and Flutter endpoints. Replace the Flutter sample incident data with a shared assignment controller, render OpenStreetMap/OSRM routing inside ALAB, and validate geofence arrival on the server from throttled location samples.

**Tech Stack:** Next.js 16.2.12, React 19.2.4, TypeScript, PostgreSQL/Supabase migrations, `pg` 8.16.3, `google-auth-library` 11.0.2, Flutter 3.44.1/Dart 3.12.1, `firebase_core` 4.14.0, `firebase_messaging` 16.6.0, `flutter_local_notifications` 22.3.0, `geolocator` 14.0.3, `flutter_map` 8.3.2, `latlong2` 0.10.1, OpenStreetMap, and OSRM.

## Global Constraints

- Preserve the current municipal incident-detail composition, ALAB red/white/pale-slate/navy palette, typography, spacing, tactical map, and Flutter liquid-glass language.
- Only a signed-in `MUNICIPAL_ADMIN` may create a dispatch.
- A dispatch may select one, several, or all eligible active stations in the administrator's municipality.
- Every active responder assigned to a selected station at dispatch time receives one recipient record and one in-app notification.
- Each responder must tap **Acknowledge & Start Route** before operational location tracking starts.
- The first assigned responder with qualifying samples inside 100 meters spanning at least 30 seconds moves the shared incident to `RESPONDER_ARRIVED`.
- A qualifying sample must have accuracy at most 50 meters, be no more than 60 seconds old, not be unreasonably future-dated, and not be reported as mocked.
- Track location only for an acknowledged active assignment; stop on completion, cancellation, logout, or tracking failure.
- Keep `DATABASE_URL`, Supabase secret/service-role keys, Firebase client email/private key, and Google OAuth access tokens out of Flutter and all `NEXT_PUBLIC_` variables.
- All new tables in the exposed `public` schema must have RLS enabled and grants revoked from `anon` and `authenticated`.
- Preserve direct-line map fallback when OSRM is unavailable.
- Pin every added package version and commit `package-lock.json` and `pubspec.lock`.
- Do not change the current Android `applicationId` during this feature; the Firebase Android app must be registered with `com.example.flutter_application_1` so the existing installed app remains upgrade-compatible.
- Every task begins with a failing focused test and ends with the focused test passing.

---

## File Structure

### Database and backend

- `mainfile/alab-system/supabase/migrations/(path returned by supabase migration new)_add_station_team_mobile_dispatch.sql`: dispatch, recipient, device, push-delivery schema; notification event expansion; indexes; RLS; grants.
- `mainfile/alab-system/lib/dispatch/types.ts`: web/mobile dispatch contracts and status unions.
- `mainfile/alab-system/lib/dispatch/arrival.ts`: pure Haversine and arrival-candidate rules.
- `mainfile/alab-system/lib/dispatch/service.ts`: transaction-safe station options, dispatch creation, assignment queries, acknowledgment, location, and shared status transitions.
- `mainfile/alab-system/lib/push/fcm.ts`: server-only FCM HTTP v1 authentication and send logic.
- `mainfile/alab-system/lib/push/delivery.ts`: persisted delivery attempt orchestration and invalid-token revocation.
- `mainfile/alab-system/app/api/municipal-bfp/incidents/[id]/respond/route.ts`: station options GET and admin dispatch POST.
- `mainfile/alab-system/app/api/mobile-bfp/devices/route.ts`: register/refresh/revoke the current phone.
- `mainfile/alab-system/app/api/mobile-bfp/assignments/route.ts`: current responder's active/history feed.
- `mainfile/alab-system/app/api/mobile-bfp/assignments/[dispatchId]/route.ts`: authorized assignment detail.
- `mainfile/alab-system/app/api/mobile-bfp/assignments/[dispatchId]/acknowledge/route.ts`: idempotent acknowledgment and en-route transition.
- `mainfile/alab-system/app/api/mobile-bfp/assignments/[dispatchId]/location/route.ts`: validate samples and confirm automatic arrival.
- `mainfile/alab-system/app/api/mobile-bfp/assignments/[dispatchId]/route-plan/route.ts`: authorized OSRM route for the assigned responder.
- `mainfile/alab-system/app/api/mobile-bfp/assignments/[dispatchId]/status/route.ts`: assigned-responder/admin operational status update.
- `mainfile/alab-system/app/api/mobile-bfp/notifications/route.ts`: mobile notification feed and read actions.
- `mainfile/alab-system/app/api/routes/road/route.ts`: preserve the current web route while sharing route utilities.
- `mainfile/alab-system/lib/notifications/types.ts`: dispatch notification event names.
- `mainfile/alab-system/.env.example`: server-only Firebase variables and safe setup notes.

### Municipal web

- `mainfile/alab-system/app/_components/municipal-dispatch-sheet.tsx`: responsive station picker, counts, submit state, and receipt.
- `mainfile/alab-system/app/_components/municipal-incident-detail.tsx`: open the sheet and display the active dispatch summary without changing the surrounding visual structure.
- `mainfile/alab-system/app/_components/municipal-incident-map.tsx`: render all selected station origins after dispatch instead of an arbitrary station join.

### Flutter mobile

- `apps/bfp_mobile_app/flutter_application_1/lib/models/mobile_dispatch.dart`: immutable assignment, recipient, route, notification, and status models.
- `apps/bfp_mobile_app/flutter_application_1/lib/services/mobile_bfp_api.dart`: authenticated dispatch/device/notification/route methods.
- `apps/bfp_mobile_app/flutter_application_1/lib/services/mobile_dispatch_controller.dart`: shared polling, refresh, selection, acknowledgment, and lifecycle state.
- `apps/bfp_mobile_app/flutter_application_1/lib/services/mobile_notification_service.dart`: Firebase initialization, permission, token refresh, foreground display, and notification-tap stream.
- `apps/bfp_mobile_app/flutter_application_1/lib/services/mobile_location_tracker.dart`: active-assignment location stream, throttling, and server submission.
- `apps/bfp_mobile_app/flutter_application_1/lib/screens/home_dashboard_screen.dart`: live primary assignment and counts.
- `apps/bfp_mobile_app/flutter_application_1/lib/screens/incidents_screen.dart`: live filtered assignments.
- `apps/bfp_mobile_app/flutter_application_1/lib/screens/incident_detail_sheet.dart`: real assignment detail and acknowledge/status actions.
- `apps/bfp_mobile_app/flutter_application_1/lib/screens/map_screen.dart`: real in-app map, route, live marker, ETA, and tracking state.
- `apps/bfp_mobile_app/flutter_application_1/lib/main.dart`: initialize notification handling and share one controller across tabs.
- `apps/bfp_mobile_app/flutter_application_1/android/app/src/main/AndroidManifest.xml`: notification, precise/background location, and foreground-service permissions.
- `apps/bfp_mobile_app/flutter_application_1/android/app/build.gradle.kts`: Google services plugin and desugaring required by the pinned notification package.
- `apps/bfp_mobile_app/flutter_application_1/android/settings.gradle.kts`: Google services plugin declaration.
- `apps/bfp_mobile_app/flutter_application_1/ios/Runner/Info.plist`: notification and active-route location purpose strings.
- `apps/bfp_mobile_app/flutter_application_1/pubspec.yaml`: pinned packages and Firebase assets generated by FlutterFire configuration.

### Tests

- `mainfile/alab-system/tests/station-team-dispatch-schema.test.mjs`
- `mainfile/alab-system/tests/station-team-dispatch-service.test.mjs`
- `mainfile/alab-system/tests/station-team-dispatch-api.test.mjs`
- `mainfile/alab-system/tests/station-team-dispatch-ui.test.mjs`
- `mainfile/alab-system/tests/mobile-dispatch-api.test.mjs`
- `mainfile/alab-system/tests/mobile-push-delivery.test.mjs`
- `apps/bfp_mobile_app/flutter_application_1/test/mobile_dispatch_models_test.dart`
- `apps/bfp_mobile_app/flutter_application_1/test/mobile_dispatch_controller_test.dart`
- `apps/bfp_mobile_app/flutter_application_1/test/mobile_dispatch_ui_test.dart`
- `apps/bfp_mobile_app/flutter_application_1/test/mobile_location_tracker_test.dart`
- `apps/bfp_mobile_app/flutter_application_1/test/mobile_notification_service_test.dart`

---

### Task 1: Add the station-team dispatch database schema

**Files:**
- Create via Supabase CLI: `mainfile/alab-system/supabase/migrations/(generated timestamp)_add_station_team_mobile_dispatch.sql`
- Create: `mainfile/alab-system/tests/station-team-dispatch-schema.test.mjs`
- Modify: `mainfile/alab-system/tests/supabase-schema.test.mjs`

**Interfaces:**
- Consumes: existing `fire_reports`, `municipal_bfp_stations`, `bfp_station_assignments`, `bfp_personnel_profiles`, `users`, and `account_notifications`.
- Produces: `incident_dispatches`, `incident_dispatch_stations`, `incident_dispatch_recipients`, `bfp_mobile_devices`, and `push_notification_deliveries`.

- [ ] **Step 1: Write the failing schema contract test**

Create a test that discovers the migration by suffix without assuming a timestamp:

```js
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const migrations = join(process.cwd(), "supabase", "migrations");

test("station-team dispatch schema is server-owned and multi-recipient", () => {
  const name = readdirSync(migrations).find((file) => file.endsWith("_add_station_team_mobile_dispatch.sql"));
  assert.ok(name, "station-team dispatch migration is missing");
  const sql = readFileSync(join(migrations, name), "utf8");
  for (const table of [
    "incident_dispatches",
    "incident_dispatch_stations",
    "incident_dispatch_recipients",
    "bfp_mobile_devices",
    "push_notification_deliveries",
  ]) {
    assert.match(sql, new RegExp(`create table public\\.${table}`, "i"));
    assert.match(sql, new RegExp(`alter table public\\.${table} enable row level security`, "i"));
    assert.match(sql, new RegExp(`revoke all on table public\\.${table} from anon, authenticated`, "i"));
  }
  assert.match(sql, /where status = 'ACTIVE'/i);
  assert.match(sql, /unique \(dispatch_id, recipient_user_id\)/i);
  assert.match(sql, /INCIDENT_DISPATCH_ASSIGNED/);
});
```

- [ ] **Step 2: Run the test and confirm the expected failure**

Run from `mainfile/alab-system`:

```powershell
node --test tests/station-team-dispatch-schema.test.mjs
```

Expected: FAIL with `station-team dispatch migration is missing`.

- [ ] **Step 3: Discover the installed CLI and create the imperative migration**

```powershell
supabase --version
supabase migration --help
supabase migration new add_station_team_mobile_dispatch
```

Expected: Supabase prints the exact new migration path. Use that returned file for the next step; do not hand-invent a timestamp.

- [ ] **Step 4: Add the complete schema to the generated migration**

Use this table/constraint shape:

```sql
create table public.incident_dispatches (
  id uuid primary key default gen_random_uuid(),
  fire_report_id uuid not null references public.fire_reports(id) on delete restrict,
  municipality_id uuid not null references public.municipalities(id) on delete restrict,
  status text not null default 'ACTIVE' check (status in ('ACTIVE','COMPLETED','CANCELLED')),
  dispatched_by_user_id uuid not null references public.users(id) on delete restrict,
  dispatched_at timestamptz not null default now(),
  completed_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (status = 'ACTIVE' and completed_at is null and cancelled_at is null) or
    (status = 'COMPLETED' and completed_at is not null and cancelled_at is null) or
    (status = 'CANCELLED' and cancelled_at is not null and completed_at is null)
  )
);

create unique index incident_dispatches_one_active_report_idx
  on public.incident_dispatches (fire_report_id) where status = 'ACTIVE';

create table public.incident_dispatch_stations (
  id uuid primary key default gen_random_uuid(),
  dispatch_id uuid not null references public.incident_dispatches(id) on delete restrict,
  station_id uuid not null references public.municipal_bfp_stations(id) on delete restrict,
  station_name_snapshot text not null,
  latitude_snapshot numeric(9,6) not null,
  longitude_snapshot numeric(9,6) not null,
  assigned_at timestamptz not null default now(),
  unique (dispatch_id, station_id)
);

create table public.incident_dispatch_recipients (
  id uuid primary key default gen_random_uuid(),
  dispatch_id uuid not null references public.incident_dispatches(id) on delete restrict,
  dispatch_station_id uuid not null references public.incident_dispatch_stations(id) on delete restrict,
  recipient_user_id uuid not null references public.users(id) on delete restrict,
  status text not null default 'ASSIGNED' check (status in ('ASSIGNED','ACKNOWLEDGED','EN_ROUTE','ON_SCENE','COMPLETED')),
  assigned_at timestamptz not null default now(),
  acknowledged_at timestamptz,
  en_route_at timestamptz,
  arrived_at timestamptz,
  completed_at timestamptz,
  last_latitude numeric(9,6),
  last_longitude numeric(9,6),
  last_accuracy_meters numeric(8,2),
  last_location_at timestamptz,
  arrival_candidate_started_at timestamptz,
  arrival_method text check (arrival_method is null or arrival_method in ('AUTO','MANUAL')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (dispatch_id, recipient_user_id)
);

create table public.bfp_mobile_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  installation_id text not null check (char_length(installation_id) between 16 and 160),
  platform text not null check (platform in ('ANDROID','IOS')),
  fcm_token text not null check (char_length(fcm_token) between 20 and 4096),
  push_enabled boolean not null default true,
  last_seen_at timestamptz not null default now(),
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, installation_id),
  unique (fcm_token)
);

create table public.push_notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid not null references public.account_notifications(id) on delete cascade,
  device_id uuid not null references public.bfp_mobile_devices(id) on delete cascade,
  status text not null default 'PENDING' check (status in ('PENDING','SENT','FAILED','INVALID_TOKEN')),
  attempt_count integer not null default 0 check (attempt_count between 0 and 10),
  provider_message_id text,
  last_error text check (last_error is null or char_length(last_error) <= 300),
  last_attempted_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (notification_id, device_id)
);
```

Add indexes for active assignments by recipient, dispatch recipients by dispatch/status, device tokens by active user, and pending delivery status. Drop/recreate the `account_notifications_event_type_check` constraint with the existing values plus `INCIDENT_DISPATCH_ASSIGNED` and `INCIDENT_DISPATCH_STATUS_CHANGED`. Enable RLS and revoke `anon`/`authenticated` grants on every new table.

- [ ] **Step 5: Run schema tests and inspect migration visibility**

```powershell
node --test tests/station-team-dispatch-schema.test.mjs tests/supabase-schema.test.mjs
supabase migration list --local
```

Expected: both tests PASS and the generated migration appears as pending or applied in the local list.

- [ ] **Step 6: Commit the schema task**

```powershell
git add supabase/migrations tests/station-team-dispatch-schema.test.mjs tests/supabase-schema.test.mjs
git commit -m "feat: add station team dispatch schema"
```

---

### Task 2: Build dispatch contracts, arrival validation, and transaction service

**Files:**
- Create: `mainfile/alab-system/lib/dispatch/types.ts`
- Create: `mainfile/alab-system/lib/dispatch/arrival.ts`
- Create: `mainfile/alab-system/lib/dispatch/service.ts`
- Create: `mainfile/alab-system/tests/station-team-dispatch-service.test.mjs`
- Modify: `mainfile/alab-system/lib/fire-reports/validation.ts`

**Interfaces:**
- Consumes: Task 1 tables, `withTransaction`, `getDatabase`, `createAccountNotifications`, and existing fire-report statuses.
- Produces: `listDispatchStationOptions`, `createStationTeamDispatch`, `listResponderAssignments`, `getResponderAssignment`, `acknowledgeResponderAssignment`, `recordResponderLocation`, and `updateDispatchedIncidentStatus`.

- [ ] **Step 1: Write failing pure behavior tests**

```js
import assert from "node:assert/strict";
import test from "node:test";
import { evaluateArrivalSample } from "../lib/dispatch/arrival.ts";

const incident = { latitude: 10.614591, longitude: 121.970950 };
const at = new Date("2026-08-29T12:00:00.000Z");

test("arrival requires accurate non-mocked samples spanning thirty seconds", () => {
  const first = evaluateArrivalSample({ incident, sample: {
    latitude: 10.614600, longitude: 121.970960, accuracyMeters: 12,
    sampledAt: at, isMocked: false,
  }, candidateStartedAt: null, now: at });
  assert.equal(first.action, "START_CANDIDATE");

  const confirmed = evaluateArrivalSample({ incident, sample: {
    latitude: 10.614600, longitude: 121.970960, accuracyMeters: 12,
    sampledAt: new Date(at.getTime() + 31_000), isMocked: false,
  }, candidateStartedAt: at, now: new Date(at.getTime() + 31_000) });
  assert.equal(confirmed.action, "CONFIRM_ARRIVAL");
});

test("arrival rejects inaccurate, outside, stale, and mocked samples", () => {
  for (const sample of [
    { latitude: 10.6146, longitude: 121.971, accuracyMeters: 80, sampledAt: at, isMocked: false },
    { latitude: 10.6200, longitude: 121.980, accuracyMeters: 10, sampledAt: at, isMocked: false },
    { latitude: 10.6146, longitude: 121.971, accuracyMeters: 10, sampledAt: new Date(at.getTime() - 61_000), isMocked: false },
    { latitude: 10.6146, longitude: 121.971, accuracyMeters: 10, sampledAt: at, isMocked: true },
  ]) {
    assert.equal(evaluateArrivalSample({ incident, sample, candidateStartedAt: null, now: at }).action, "CLEAR_CANDIDATE");
  }
});
```

Add source-contract assertions proving `service.ts` uses `withTransaction`, `for update`, `require`-style municipality parameters rather than body-provided municipality IDs, station/personnel snapshots, unique notification dedupe keys, and status history.

- [ ] **Step 2: Run the focused test and confirm failure**

```powershell
node --test tests/station-team-dispatch-service.test.mjs
```

Expected: FAIL because `lib/dispatch/arrival.ts` and `service.ts` do not exist.

- [ ] **Step 3: Define the shared TypeScript contracts**

```ts
export type DispatchStatus = "ACTIVE" | "COMPLETED" | "CANCELLED";
export type DispatchRecipientStatus = "ASSIGNED" | "ACKNOWLEDGED" | "EN_ROUTE" | "ON_SCENE" | "COMPLETED";

export type DispatchStationOption = {
  id: string;
  stationName: string;
  latitude: number;
  longitude: number;
  activeResponderCount: number;
  directDistanceKilometers: number;
  eligible: boolean;
};

export type DispatchReceipt = {
  dispatchId: string;
  incidentId: string;
  status: "RESPONDING";
  stationCount: number;
  recipientCount: number;
  notificationIds: string[];
};

export type ArrivalSample = {
  latitude: number;
  longitude: number;
  accuracyMeters: number;
  sampledAt: Date;
  isMocked: boolean;
};
```

- [ ] **Step 4: Implement server-authoritative arrival evaluation**

Export `evaluateArrivalSample` with constants `ARRIVAL_RADIUS_METERS = 100`, `ARRIVAL_CONFIRMATION_MS = 30_000`, `MAX_ACCURACY_METERS = 50`, and `MAX_SAMPLE_AGE_MS = 60_000`. Use the existing Haversine utility or a focused local helper. Return exactly one of:

```ts
type ArrivalDecision =
  | { action: "START_CANDIDATE"; distanceMeters: number }
  | { action: "KEEP_CANDIDATE"; distanceMeters: number }
  | { action: "CONFIRM_ARRIVAL"; distanceMeters: number }
  | { action: "CLEAR_CANDIDATE"; distanceMeters: number | null };
```

- [ ] **Step 5: Implement dispatch service transaction boundaries**

`createStationTeamDispatch(actorUserId, municipalityId, incidentId, stationIds)` must:

1. normalize/deduplicate UUIDs and reject an empty list;
2. lock the municipality-owned fire report;
3. return the existing active dispatch receipt for an idempotent repeat;
4. load all requested active municipality stations and reject unless every ID matches;
5. load active `MUNICIPAL_STAFF` users through active station assignments;
6. reject stations with zero active responders;
7. create one dispatch, station snapshots, and recipient snapshots;
8. create one `INCIDENT_DISPATCH_ASSIGNED` account notification per recipient with `context: { dispatchId, incidentId, referenceNumber, stationId }`;
9. change the report to `RESPONDING` and append status history once;
10. return `DispatchReceipt` after commit.

`acknowledgeResponderAssignment` must update only the signed-in recipient row, set `ACKNOWLEDGED` and `EN_ROUTE` timestamps idempotently, and move the shared report to `FIRETRUCK_DISPATCHED` only if it has not already reached a later operational status.

`recordResponderLocation` must lock the recipient and report, call `evaluateArrivalSample`, persist only the latest sample/candidate, and append the first `RESPONDER_ARRIVED` history row exactly once.

- [ ] **Step 6: Run focused tests**

```powershell
node --test tests/station-team-dispatch-service.test.mjs tests/fire-report-workflow.test.mjs
```

Expected: PASS.

- [ ] **Step 7: Commit the domain task**

```powershell
git add lib/dispatch lib/fire-reports/validation.ts tests/station-team-dispatch-service.test.mjs tests/fire-report-workflow.test.mjs
git commit -m "feat: add transaction safe dispatch service"
```

---

### Task 3: Add Municipal Administrator dispatch API and station-aware incident detail

**Files:**
- Modify: `mainfile/alab-system/app/api/municipal-bfp/incidents/[id]/respond/route.ts`
- Modify: `mainfile/alab-system/app/api/municipal-bfp/incidents/[id]/route.ts`
- Create: `mainfile/alab-system/tests/station-team-dispatch-api.test.mjs`

**Interfaces:**
- Consumes: `requireMunicipalAdmin`, Task 2 station options/dispatch service.
- Produces: `GET /api/municipal-bfp/incidents/:id/respond`, `POST /api/municipal-bfp/incidents/:id/respond`, and dispatch-aware detail JSON.

- [ ] **Step 1: Write failing route contract tests**

Assert that the respond route:

```js
assert.match(route, /export async function GET/);
assert.match(route, /export async function POST/);
assert.match(route, /requireMunicipalAdmin/);
assert.match(route, /listDispatchStationOptions/);
assert.match(route, /createStationTeamDispatch/);
assert.match(route, /stationIds/);
assert.doesNotMatch(route, /body\.municipalityId/);
```

Assert that the detail query returns `dispatch`, `stations`, and `recipients` without the current single-station `left join municipal_bfp_stations s on s.municipality_id = fr.municipality_id`.

- [ ] **Step 2: Run the test and confirm failure**

```powershell
node --test tests/station-team-dispatch-api.test.mjs
```

Expected: FAIL because the route still responds immediately and accepts no station selection.

- [ ] **Step 3: Implement station-options GET**

Return:

```json
{
  "incident": { "id": "uuid", "referenceNumber": "ALAB-...", "fireType": "HOUSE_BUILDING" },
  "stations": [
    {
      "id": "uuid",
      "stationName": "Hamtic Fire Station",
      "latitude": 10.7,
      "longitude": 122.0,
      "activeResponderCount": 4,
      "directDistanceKilometers": 2.3,
      "eligible": true
    }
  ]
}
```

Sort eligible stations first, then direct distance, then station name.

- [ ] **Step 4: Implement admin-only dispatch POST**

Parse `{ stationIds: unknown }`, require an array of 1–100 UUID strings, call `createStationTeamDispatch`, and return `{ dispatch, push: { status: "PENDING" } }` with 201. Map invalid station selection to 400, foreign/not-found incident to 404, status conflict to 409, and non-admin to the existing 403 response.

- [ ] **Step 5: Return dispatch snapshots in incident detail**

Replace the arbitrary station join with separate queries returning:

```ts
dispatch: null | {
  id: string;
  status: "ACTIVE" | "COMPLETED" | "CANCELLED";
  dispatchedAt: string;
  stationCount: number;
  recipientCount: number;
  acknowledgedCount: number;
  onSceneCount: number;
};
stations: Array<{ id: string; stationName: string; latitude: number; longitude: number }>;
recipients: Array<{ userId: string; displayName: string; stationName: string; status: string }>;
```

- [ ] **Step 6: Run focused API tests**

```powershell
node --test tests/station-team-dispatch-api.test.mjs tests/municipal-incident-access.test.mjs
```

Expected: PASS.

- [ ] **Step 7: Commit the web API task**

```powershell
git add app/api/municipal-bfp/incidents tests/station-team-dispatch-api.test.mjs tests/municipal-incident-access.test.mjs
git commit -m "feat: add municipal station dispatch API"
```

---

### Task 4: Add the station-selection dispatch sheet without redesigning the page

**Files:**
- Create: `mainfile/alab-system/app/_components/municipal-dispatch-sheet.tsx`
- Modify: `mainfile/alab-system/app/_components/municipal-incident-detail.tsx`
- Modify: `mainfile/alab-system/app/_components/municipal-incident-map.tsx`
- Create: `mainfile/alab-system/tests/station-team-dispatch-ui.test.mjs`

**Interfaces:**
- Consumes: Task 3 GET/POST and detail contracts.
- Produces: `MunicipalDispatchSheet` with `incidentId`, `open`, `onClose`, and `onDispatched` props.

- [ ] **Step 1: Write failing UI contract tests**

```js
assert.match(sheet, /Select all eligible stations/);
assert.match(sheet, /activeResponderCount/);
assert.match(sheet, /Dispatch \{selectedStationCount\}/);
assert.match(sheet, /role="dialog"/);
assert.match(sheet, /aria-modal="true"/);
assert.match(detail, /MunicipalDispatchSheet/);
assert.doesNotMatch(detail, /const respond = async \(\) =>/);
```

- [ ] **Step 2: Run the test and confirm failure**

```powershell
node --test tests/station-team-dispatch-ui.test.mjs
```

Expected: FAIL because the current button calls POST immediately.

- [ ] **Step 3: Build the controlled dispatch sheet**

Use the current component's CSS tokens (`#DC2626`, `#FEF2F2`, `#F8FAFC`, `#E2E8F0`, `#0F172A`) and implement:

```ts
type MunicipalDispatchSheetProps = {
  incidentId: string;
  open: boolean;
  onClose: () => void;
  onDispatched: () => Promise<void> | void;
};
```

Desktop behavior: fixed 560px panel aligned right with a dimmed backdrop. Mobile behavior at 768px: full-width bottom sheet with a 92svh maximum. Use one plain station list with dividers, not nested card grids. Disable stations with zero active responders. The sticky footer shows the exact selected station/responder totals and blocks duplicate submission.

- [ ] **Step 4: Wire the existing red hero action to the sheet**

Keep the button in its current hero position and current classes. Change only its action/state:

```tsx
onClick={() => setDispatchOpen(true)}
```

After success, close the sheet, refresh detail/queue, and render `Dispatched to N stations · M responders` in the existing hero action area. Preserve the current BFP responding state styles.

- [ ] **Step 5: Render every selected station on the tactical map**

Change `MunicipalIncidentMap` to accept `stations: Array<{ id; stationName; latitude; longitude }>` and add a blue station marker for each selected origin. Before dispatch, show the nearest eligible station only as a route preview. After dispatch, route preview defaults to the closest selected station and labels the other selected stations.

- [ ] **Step 6: Run UI regression tests**

```powershell
node --test tests/station-team-dispatch-ui.test.mjs tests/municipal-gis-map.test.mjs tests/municipal-bfp-mobile.test.mjs
```

Expected: PASS.

- [ ] **Step 7: Commit the municipal UI task**

```powershell
git add app/_components/municipal-dispatch-sheet.tsx app/_components/municipal-incident-detail.tsx app/_components/municipal-incident-map.tsx tests/station-team-dispatch-ui.test.mjs tests/municipal-gis-map.test.mjs
git commit -m "feat: add station dispatch selection sheet"
```

---

### Task 5: Add server-side FCM delivery and authenticated device registration

**Files:**
- Modify: `mainfile/alab-system/package.json`
- Modify: `mainfile/alab-system/package-lock.json`
- Create: `mainfile/alab-system/lib/push/fcm.ts`
- Create: `mainfile/alab-system/lib/push/delivery.ts`
- Create: `mainfile/alab-system/app/api/mobile-bfp/devices/route.ts`
- Modify: `mainfile/alab-system/lib/notifications/types.ts`
- Modify: `mainfile/alab-system/.env.example`
- Create: `mainfile/alab-system/tests/mobile-push-delivery.test.mjs`

**Interfaces:**
- Consumes: Task 1 device/delivery tables and Task 2 dispatch receipt notification IDs.
- Produces: `registerMobileDevice`, `revokeMobileDevice`, `sendPendingDispatchPushes`, and FCM HTTP v1 calls.

- [ ] **Step 1: Write failing push/security tests**

```js
assert.match(packageJson, /"google-auth-library": "11\.0\.2"/);
assert.match(fcm, /https:\/\/www\.googleapis\.com\/auth\/firebase\.messaging/);
assert.match(fcm, /https:\/\/fcm\.googleapis\.com\/v1\/projects\/\$\{projectId\}\/messages:send/);
assert.match(deviceRoute, /requireMobileMunicipalBfp/);
assert.match(deviceRoute, /installationId/);
assert.match(deviceRoute, /fcmToken/);
assert.doesNotMatch(combined, /NEXT_PUBLIC_FIREBASE_PRIVATE_KEY/);
```

- [ ] **Step 2: Run the test and confirm failure**

```powershell
node --test tests/mobile-push-delivery.test.mjs
```

Expected: FAIL because FCM/device modules do not exist.

- [ ] **Step 3: Install and pin the Google auth dependency**

```powershell
npm install --save-exact google-auth-library@11.0.2
```

Expected: `package.json` and `package-lock.json` record exactly `11.0.2`.

- [ ] **Step 4: Implement server-only FCM HTTP v1 authentication**

Read only `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, and `FIREBASE_PRIVATE_KEY`; normalize escaped newlines in the private key. Use `GoogleAuth`/JWT credentials with scope `https://www.googleapis.com/auth/firebase.messaging`. Send a high-priority Android notification with channel `alab_emergency_dispatch`, notification title `New ALAB incident assignment`, and data containing only `type=INCIDENT_DISPATCH`, `dispatchId`, `incidentId`, and `referenceNumber`.

Classify permanent unregistered/invalid-token responses separately from transient failures. Never log the token, private key, OAuth token, resident phone, or exact resident address.

- [ ] **Step 5: Implement device PUT and DELETE**

`PUT /api/mobile-bfp/devices` accepts:

```json
{
  "installationId": "secure-random-installation-id",
  "platform": "ANDROID",
  "fcmToken": "provider-token",
  "pushEnabled": true
}
```

Upsert only under `session.userId`, rotate conflicting tokens to the current installation, and update `last_seen_at`. `DELETE` accepts `installationId` and sets `revoked_at`, `push_enabled=false`; it cannot revoke another user's device.

- [ ] **Step 6: Create delivery rows and send after dispatch commit**

After Task 3 receives a `DispatchReceipt`, call `sendPendingDispatchPushes(notificationIds)`. Persist one delivery row per active device, send each with bounded concurrency, update `SENT`/`FAILED`/`INVALID_TOKEN`, and revoke permanently invalid device tokens. Return counts to the sheet receipt without rolling back the dispatch.

- [ ] **Step 7: Document safe environment names**

Add to `.env.example` with non-secret example text:

```dotenv
FIREBASE_PROJECT_ID=configure-in-vercel
FIREBASE_CLIENT_EMAIL=configure-in-vercel
FIREBASE_PRIVATE_KEY=configure-in-vercel-with-escaped-newlines
```

State that all three are server-only and must never use `NEXT_PUBLIC_`.

- [ ] **Step 8: Run focused tests**

```powershell
node --test tests/mobile-push-delivery.test.mjs tests/account-notifications.test.mjs
```

Expected: PASS.

- [ ] **Step 9: Commit the push task**

```powershell
git add package.json package-lock.json lib/push lib/notifications/types.ts app/api/mobile-bfp/devices .env.example tests/mobile-push-delivery.test.mjs
git commit -m "feat: deliver mobile dispatch push notifications"
```

---

### Task 6: Add responder assignment, notification, route, and status APIs

**Files:**
- Create: `mainfile/alab-system/app/api/mobile-bfp/assignments/route.ts`
- Create: `mainfile/alab-system/app/api/mobile-bfp/assignments/[dispatchId]/route.ts`
- Create: `mainfile/alab-system/app/api/mobile-bfp/assignments/[dispatchId]/acknowledge/route.ts`
- Create: `mainfile/alab-system/app/api/mobile-bfp/assignments/[dispatchId]/location/route.ts`
- Create: `mainfile/alab-system/app/api/mobile-bfp/assignments/[dispatchId]/route-plan/route.ts`
- Create: `mainfile/alab-system/app/api/mobile-bfp/assignments/[dispatchId]/status/route.ts`
- Create: `mainfile/alab-system/app/api/mobile-bfp/notifications/route.ts`
- Create: `mainfile/alab-system/tests/mobile-dispatch-api.test.mjs`

**Interfaces:**
- Consumes: `requireMobileMunicipalBfp`, Task 2 services, existing OSRM normalization, and notification service.
- Produces: bearer-authenticated mobile JSON contracts scoped to `recipient_user_id = session.userId`.

- [ ] **Step 1: Write failing authorization and scoping tests**

For every assignment route assert `requireMobileMunicipalBfp`; for detail/action queries assert both dispatch ID and session user ID are used. Assert the location route calls `recordResponderLocation` and never accepts a requested incident status. Assert route-plan fetches only the fixed OSRM host.

- [ ] **Step 2: Run the focused test and confirm failure**

```powershell
node --test tests/mobile-dispatch-api.test.mjs
```

Expected: FAIL because mobile dispatch routes do not exist.

- [ ] **Step 3: Implement assignment feed/detail contracts**

Return data shaped as:

```json
{
  "assignments": [{
    "dispatchId": "uuid",
    "incidentId": "uuid",
    "referenceNumber": "ALAB-20260829-...",
    "fireType": "HOUSE_BUILDING",
    "incidentStatus": "RESPONDING",
    "recipientStatus": "ASSIGNED",
    "barangay": "Mapatag",
    "municipality": "Hamtic",
    "landmark": "Anini-y–Tobias Fornier Road",
    "latitude": 10.614591,
    "longitude": 121.970950,
    "assignedAt": "2026-08-29T12:00:00.000Z",
    "selectedStations": [],
    "responders": []
  }]
}
```

`scope=active` excludes completed/cancelled; `scope=history` returns the latest 50 recipient assignments. Detail may include resident emergency contact only after the recipient-scope check succeeds.

- [ ] **Step 4: Implement idempotent acknowledgment and status APIs**

`POST acknowledge` accepts an empty JSON object and returns updated recipient/shared statuses. `POST status` accepts only `UNDER_CONTROL` or `RESOLVED`; validate legal monotonic transitions and authorize either an assigned active responder or Municipal Administrator. Resolution completes the dispatch and stops all remaining recipient tracking.

- [ ] **Step 5: Implement location sample endpoint**

Accept exactly:

```ts
{
  latitude: number;
  longitude: number;
  accuracyMeters: number;
  sampledAt: string;
  isMocked: boolean;
}
```

Return `{ recipientStatus, incidentStatus, distanceMeters, arrivalCandidateStartedAt }`. Rate-limit accepted writes to one per 10 seconds per recipient while still allowing a confirmation sample at/after 30 seconds.

- [ ] **Step 6: Implement assigned route-plan endpoint**

Validate `fromLat/fromLng`, derive destination from the authorized assignment, fetch OSRM with a 10-second abort, and return the existing `RoadRoute` JSON. On failure return `mode: direct`, two coordinates, and direct kilometers.

- [ ] **Step 7: Implement mobile notifications endpoint**

Return only the signed-in user's notifications, unread count, and dispatch context. Support `PATCH { notificationId }` and `PATCH { all: true }` using existing notification service ownership checks.

- [ ] **Step 8: Run focused mobile API tests**

```powershell
node --test tests/mobile-dispatch-api.test.mjs tests/bfp-account-provisioning.test.mjs tests/road-route.test.mjs
```

Expected: PASS.

- [ ] **Step 9: Commit the mobile API task**

```powershell
git add app/api/mobile-bfp/assignments app/api/mobile-bfp/notifications tests/mobile-dispatch-api.test.mjs
git commit -m "feat: add mobile responder assignment APIs"
```

---

### Task 7: Configure Flutter Firebase, notifications, and typed mobile dispatch client

**Files:**
- Modify: `apps/bfp_mobile_app/flutter_application_1/pubspec.yaml`
- Modify: `apps/bfp_mobile_app/flutter_application_1/pubspec.lock`
- Modify: `apps/bfp_mobile_app/flutter_application_1/android/settings.gradle.kts`
- Modify: `apps/bfp_mobile_app/flutter_application_1/android/app/build.gradle.kts`
- Modify: `apps/bfp_mobile_app/flutter_application_1/android/app/src/main/AndroidManifest.xml`
- Modify: `apps/bfp_mobile_app/flutter_application_1/ios/Runner/Info.plist`
- Create through FlutterFire: `apps/bfp_mobile_app/flutter_application_1/lib/firebase_options.dart`
- Create: `apps/bfp_mobile_app/flutter_application_1/lib/models/mobile_dispatch.dart`
- Create: `apps/bfp_mobile_app/flutter_application_1/lib/services/mobile_notification_service.dart`
- Modify: `apps/bfp_mobile_app/flutter_application_1/lib/services/mobile_bfp_api.dart`
- Create: `apps/bfp_mobile_app/flutter_application_1/test/mobile_dispatch_models_test.dart`
- Create: `apps/bfp_mobile_app/flutter_application_1/test/mobile_notification_service_test.dart`

**Interfaces:**
- Consumes: Task 5 device API and Task 6 assignment/notification contracts.
- Produces: typed Dart models, FCM initialization, device registration, push-tap dispatch IDs, and API methods.

- [ ] **Step 1: Write failing model/API tests**

Test parsing of every recipient/incident status, station/responder lists, missing optional fields, notification context, route coordinates, and malformed response rejection. Test notification handling through an injected messaging adapter so unit tests do not require Firebase initialization.

- [ ] **Step 2: Run the focused tests and confirm failure**

```powershell
flutter test test/mobile_dispatch_models_test.dart test/mobile_notification_service_test.dart
```

Expected: FAIL because the models/services do not exist.

- [ ] **Step 3: Add exact Flutter dependencies**

Use exact versions in `pubspec.yaml`:

```yaml
firebase_core: 4.14.0
firebase_messaging: 16.6.0
flutter_local_notifications: 22.3.0
geolocator: 14.0.3
flutter_map: 8.3.2
latlong2: 0.10.1
```

Run:

```powershell
flutter pub get
```

- [ ] **Step 4: Configure the existing app identity in Firebase**

Create a Firebase project for ALAB, register Android application ID `com.example.flutter_application_1`, then run FlutterFire CLI from the Flutter project with Android selected. Keep the generated client configuration in the mobile project; do not place the server service-account private key in any Flutter file.

Expected generated artifacts include `lib/firebase_options.dart` and Android Firebase configuration matching the existing application ID.

- [ ] **Step 5: Add platform permissions/configuration**

Android manifest permissions:

```xml
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_BACKGROUND_LOCATION" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE_LOCATION" />
```

Enable Java 17 desugaring required by `flutter_local_notifications`, retain the current AGP 9.0.1 because it is newer than the package minimum, and add the Google services Gradle plugin. Add clear iOS usage strings for when-in-use and active-dispatch background location plus push/background modes.

- [ ] **Step 6: Implement typed models and API methods**

Extend `MobileBfpApi` with:

```dart
Future<List<MobileDispatchAssignment>> listAssignments(String token, {bool history = false});
Future<MobileDispatchAssignment> getAssignment(String token, String dispatchId);
Future<MobileDispatchAssignment> acknowledgeAssignment(String token, String dispatchId);
Future<LocationSubmissionResult> submitLocation(String token, String dispatchId, MobileLocationSample sample);
Future<MobileRoadRoute> getRoutePlan(String token, String dispatchId, double fromLat, double fromLng);
Future<void> registerDevice(String token, MobileDeviceRegistration registration);
Future<void> revokeDevice(String token, String installationId);
Future<MobileNotificationFeed> listNotifications(String token);
Future<void> markNotificationRead(String token, String notificationId);
```

Reuse `_send`, bearer headers, timeout handling, and secure-session error mapping already present in `mobile_bfp_api.dart`.

- [ ] **Step 7: Implement notification lifecycle**

Initialize Firebase before `runApp`, register a top-level `@pragma('vm:entry-point')` background handler, request permission after successful sign-in, create high-priority channel `alab_emergency_dispatch`, display foreground alerts, listen to `onTokenRefresh`, and handle both `getInitialMessage()` and `onMessageOpenedApp`. Emit only validated UUID `dispatchId` values to the app navigator/controller.

- [ ] **Step 8: Run Flutter tests and analyze**

```powershell
flutter test test/mobile_dispatch_models_test.dart test/mobile_notification_service_test.dart test/mobile_bfp_api_test.dart
flutter analyze
```

Expected: tests PASS and analyze reports no issues.

- [ ] **Step 9: Commit the Flutter foundation task**

```powershell
git add pubspec.yaml pubspec.lock android ios lib/firebase_options.dart lib/models lib/services/mobile_notification_service.dart lib/services/mobile_bfp_api.dart test/mobile_dispatch_models_test.dart test/mobile_notification_service_test.dart
git commit -m "feat: configure mobile dispatch notifications"
```

---

### Task 8: Replace Flutter sample incidents with a shared multi-user assignment controller

**Files:**
- Create: `apps/bfp_mobile_app/flutter_application_1/lib/services/mobile_dispatch_controller.dart`
- Modify: `apps/bfp_mobile_app/flutter_application_1/lib/main.dart`
- Modify: `apps/bfp_mobile_app/flutter_application_1/lib/screens/home_dashboard_screen.dart`
- Modify: `apps/bfp_mobile_app/flutter_application_1/lib/screens/incidents_screen.dart`
- Modify: `apps/bfp_mobile_app/flutter_application_1/lib/screens/incident_detail_sheet.dart`
- Modify: `apps/bfp_mobile_app/flutter_application_1/lib/widgets/incident_hero_card.dart`
- Modify: `apps/bfp_mobile_app/flutter_application_1/lib/widgets/assigned_incident_card.dart`
- Create: `apps/bfp_mobile_app/flutter_application_1/test/mobile_dispatch_controller_test.dart`
- Create: `apps/bfp_mobile_app/flutter_application_1/test/mobile_dispatch_ui_test.dart`

**Interfaces:**
- Consumes: Task 7 models/API and `MobileBfpSession`.
- Produces: one `MobileDispatchController` shared across Home, Incidents, Map, notification taps, and incident details.

- [ ] **Step 1: Write failing controller/UI tests**

Cover initial loading, five-second visible polling, push-triggered immediate refresh, offline preservation of the last good list, assignment selection, idempotent acknowledgment, error display, and disposal. Widget tests must prove hardcoded incident titles are absent when the API returns an empty list and real API fixture data appears when returned.

- [ ] **Step 2: Run the focused tests and confirm failure**

```powershell
flutter test test/mobile_dispatch_controller_test.dart test/mobile_dispatch_ui_test.dart
```

Expected: FAIL because screens still own sample lists.

- [ ] **Step 3: Implement the controller contract**

```dart
class MobileDispatchController extends ChangeNotifier {
  MobileDispatchController({required MobileBfpApi api, required MobileBfpSession session});

  List<MobileDispatchAssignment> get activeAssignments;
  MobileDispatchAssignment? get selectedAssignment;
  bool get isLoading;
  bool get isRefreshing;
  String? get errorMessage;

  Future<void> start();
  Future<void> refresh({bool showSpinner = false});
  Future<void> selectAssignment(String dispatchId);
  Future<void> acknowledgeSelected();
  void handleLifecycle(AppLifecycleState state);
  @override void dispose();
}
```

Poll every five seconds only while the app is resumed. Prevent overlapping requests. Preserve the last good data on transient failure and expose a retry action.

- [ ] **Step 4: Share the controller from `MainNavigationShell`**

Create once in `initState`, start it after session restoration, pass it to Home/Incidents/Map, and dispose it. Route notification taps to `selectAssignment(dispatchId)`, switch to the Incidents tab, and open the real detail sheet after the assignment is authorized and loaded.

- [ ] **Step 5: Replace hardcoded dashboard and incident data**

Keep the current widget hierarchy and colors. Bind the active assignment hero, counts, assigned incident card, updates, and incident filters to controller data. Filters become `Assigned`, `En Route`, `On Scene`, and `Completed`. Empty states use one calm icon/title/action rather than fabricated incidents.

- [ ] **Step 6: Convert incident detail to a real assignment view**

Render reference, fire type, locality, landmark, status timeline, selected stations, responder names/statuses, and route summary from `MobileDispatchAssignment`. For `ASSIGNED`, show one dominant red **Acknowledge & Start Route** action. Disable during request; on success update the controller, open the Map tab, and begin tracking in Task 9.

- [ ] **Step 7: Run Flutter controller/UI regression tests**

```powershell
flutter test test/mobile_dispatch_controller_test.dart test/mobile_dispatch_ui_test.dart test/session_routing_test.dart test/widget_test.dart
flutter analyze
```

Expected: PASS with no sample incident fallback.

- [ ] **Step 8: Commit the live assignment UI task**

```powershell
git add lib/main.dart lib/services/mobile_dispatch_controller.dart lib/screens lib/widgets test/mobile_dispatch_controller_test.dart test/mobile_dispatch_ui_test.dart
git commit -m "feat: connect mobile assignment experience"
```

---

### Task 9: Build the ALAB in-app route and automatic 100-meter arrival tracking

**Files:**
- Create: `apps/bfp_mobile_app/flutter_application_1/lib/services/mobile_location_tracker.dart`
- Modify: `apps/bfp_mobile_app/flutter_application_1/lib/screens/map_screen.dart`
- Modify: `apps/bfp_mobile_app/flutter_application_1/lib/widgets/mini_gis_map.dart`
- Modify: `apps/bfp_mobile_app/flutter_application_1/lib/services/mobile_dispatch_controller.dart`
- Create: `apps/bfp_mobile_app/flutter_application_1/test/mobile_location_tracker_test.dart`
- Modify: `apps/bfp_mobile_app/flutter_application_1/test/mobile_dispatch_ui_test.dart`

**Interfaces:**
- Consumes: Task 6 location/route APIs, Task 7 geolocator/flutter_map packages, and Task 8 selected assignment.
- Produces: `MobileLocationTracker.start`, `stop`, sample stream, route refresh, and automatic on-scene UI.

- [ ] **Step 1: Write failing tracker tests with an injected location source**

Test that tracking:

- refuses to start before acknowledgment;
- requests precise permission and reports denied/denied-forever states;
- configures 10-second/10-meter Android updates and a visible foreground-service notification;
- submits at most one sample per 10 seconds unless movement exceeds 25 meters;
- forwards `Position.isMocked`, accuracy, and timestamp;
- stops on completion, logout, cancellation, or controller disposal;
- never changes to on scene until the server response says `RESPONDER_ARRIVED`.

- [ ] **Step 2: Run the tracker tests and confirm failure**

```powershell
flutter test test/mobile_location_tracker_test.dart
```

Expected: FAIL because the tracker does not exist.

- [ ] **Step 3: Implement privacy-bounded location tracking**

On Android use:

```dart
AndroidSettings(
  accuracy: LocationAccuracy.bestForNavigation,
  distanceFilter: 10,
  intervalDuration: const Duration(seconds: 10),
  foregroundNotificationConfig: const ForegroundNotificationConfig(
    notificationTitle: 'ALAB route active',
    notificationText: 'Location is used only for your active incident assignment.',
    enableWakeLock: true,
  ),
)
```

Do not calculate final arrival on the phone. Submit samples and accept the server's recipient/shared status as authoritative. Surface an audited manual-arrival action only when precise location is unavailable or consistently inaccurate.

- [ ] **Step 4: Replace the painted sample map with `flutter_map`**

Render:

```dart
FlutterMap(
  options: MapOptions(initialCenter: incidentPoint, initialZoom: 15),
  children: [
    TileLayer(
      urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
      userAgentPackageName: 'com.example.flutter_application_1',
    ),
    PolylineLayer(polylines: routePolylines),
    MarkerLayer(markers: responderIncidentAndStationMarkers),
  ],
)
```

Use ALAB red for the road route/incident, blue for the responder and station markers, and the existing pale-slate overlay controls. Display route mode, remaining distance, ETA, location accuracy, and `Arrival detection active · 100 m`.

- [ ] **Step 5: Refresh the route without excessive OSRM calls**

Fetch a route on acknowledgment, when the selected assignment changes, and after the responder moves at least 100 meters from the last route origin. Keep the last valid polyline during transient failures and draw a dashed direct line when `mode=direct`.

- [ ] **Step 6: Connect server-confirmed arrival to all screens**

When location submission returns `RESPONDER_ARRIVED`, stop the arrival candidate UI, keep the map visible, change the responder chip to `On Scene`, refresh the shared assignment, and show one success snackbar. Other users receive the state on their next poll without changing their individual state unless they also arrive.

- [ ] **Step 7: Run map/tracker tests and analyze**

```powershell
flutter test test/mobile_location_tracker_test.dart test/mobile_dispatch_ui_test.dart
flutter analyze
```

Expected: PASS.

- [ ] **Step 8: Commit the route/arrival task**

```powershell
git add lib/services/mobile_location_tracker.dart lib/services/mobile_dispatch_controller.dart lib/screens/map_screen.dart lib/widgets/mini_gis_map.dart test/mobile_location_tracker_test.dart test/mobile_dispatch_ui_test.dart
git commit -m "feat: add in app route and arrival detection"
```

---

### Task 10: Complete multi-user status synchronization and real notification center

**Files:**
- Modify: `apps/bfp_mobile_app/flutter_application_1/lib/screens/home_dashboard_screen.dart`
- Modify: `apps/bfp_mobile_app/flutter_application_1/lib/screens/incident_detail_sheet.dart`
- Modify: `apps/bfp_mobile_app/flutter_application_1/lib/widgets/responder_status_selector.dart`
- Modify: `apps/bfp_mobile_app/flutter_application_1/lib/services/mobile_dispatch_controller.dart`
- Modify: `mainfile/alab-system/app/_components/municipal-incident-detail.tsx`
- Modify: `mainfile/alab-system/lib/dispatch/service.ts`
- Modify: `mainfile/alab-system/tests/station-team-dispatch-service.test.mjs`
- Modify: `apps/bfp_mobile_app/flutter_application_1/test/mobile_dispatch_ui_test.dart`

**Interfaces:**
- Consumes: Task 6 status/notifications APIs and Tasks 8–9 controller.
- Produces: real read/unread notifications, recipient roster updates, and legal shared status completion.

- [ ] **Step 1: Add failing multi-user/status tests**

Backend tests cover two responders acknowledging concurrently, first-arrival shared transition exactly once, later responder individual arrival, invalid backward transition rejection, and resolution completing active tracking rows. Flutter tests cover notification unread count, notification tap, roster changes, and allowed status actions.

- [ ] **Step 2: Run focused tests and confirm failure**

```powershell
node --test tests/station-team-dispatch-service.test.mjs
```

Then run from `apps/bfp_mobile_app/flutter_application_1`:

```powershell
flutter test test/mobile_dispatch_ui_test.dart
```

Expected: new concurrency/notification expectations FAIL.

- [ ] **Step 3: Enforce monotonic shared transitions**

Use this ordering for active operational states:

```ts
const operationalOrder = [
  "RESPONDING",
  "FIRETRUCK_DISPATCHED",
  "RESPONDER_ARRIVED",
  "UNDER_CONTROL",
  "RESOLVED",
] as const;
```

Lock the fire report before comparison. Append history and recipient notifications only when the state actually advances. `RESOLVED` sets dispatch `COMPLETED`, unfinished recipients `COMPLETED`, and a resident-visible history message.

- [ ] **Step 4: Replace sample mobile notifications**

Load the authenticated notification feed in the controller, show unread count in `AppHeader`, render real dispatch notifications in the existing bottom sheet, mark them read on open, and route `context.dispatchId` to the assignment. If push permission is denied, add one non-blocking `Enable phone alerts` settings row while leaving in-app notifications operational.

- [ ] **Step 5: Show multi-user progress on web and mobile**

Render selected stations and compact responder rows with `Assigned`, `En Route`, or `On Scene`. Show summary text such as `3 of 8 acknowledged · 1 on scene`. Keep exact resident details out of push previews and station rosters.

- [ ] **Step 6: Run focused and regression tests**

Backend:

```powershell
node --test tests/station-team-dispatch-service.test.mjs tests/station-team-dispatch-api.test.mjs tests/account-notifications.test.mjs
```

Flutter:

```powershell
flutter test test/mobile_dispatch_controller_test.dart test/mobile_dispatch_ui_test.dart test/mobile_notification_service_test.dart
flutter analyze
```

Expected: PASS.

- [ ] **Step 7: Commit the synchronization task**

```powershell
git add mainfile/alab-system/lib/dispatch mainfile/alab-system/app/_components/municipal-incident-detail.tsx mainfile/alab-system/tests apps/bfp_mobile_app/flutter_application_1/lib apps/bfp_mobile_app/flutter_application_1/test
git commit -m "feat: synchronize multi user incident response"
```

---

### Task 11: Apply security checks, build both apps, and run a two-station/two-phone field test

**Files:**
- Modify: `mainfile/alab-system/README.md`
- Modify: `apps/bfp_mobile_app/flutter_application_1/README.md`
- Modify: `mainfile/alab-system/tests/supabase-setup.test.mjs`

**Interfaces:**
- Consumes: all prior tasks and external Firebase/Supabase configuration.
- Produces: verified deployment/runbook evidence and a release-ready implementation.

- [ ] **Step 1: Add failing configuration documentation assertions**

Assert backend documentation names all three server-only Firebase variables, describes station eligibility and partial push failure, and mobile documentation describes notification/background-location permissions and how to stop tracking.

- [ ] **Step 2: Run documentation test and confirm failure**

```powershell
node --test tests/supabase-setup.test.mjs
```

Expected: FAIL until both runbooks are updated.

- [ ] **Step 3: Document operator setup and privacy behavior**

Backend README must cover migration application, Firebase service-account variables in Vercel, FCM API enablement, and push test procedure. Flutter README must cover FlutterFire configuration for `com.example.flutter_application_1`, notification permission, precise/background location permission, active-route foreground notification, and the rule that ALAB stops tracking after assignment completion/logout.

- [ ] **Step 4: Run database migration verification and advisors**

Discover supported commands first:

```powershell
supabase --version
supabase migration list --help
supabase db --help
```

Apply the generated migration through the project's established local/linked workflow, then run the available database advisors. Verify with SQL that all new tables exist, RLS is enabled, public client roles have no grants, only one active dispatch can exist per incident, and recipient uniqueness holds.

- [ ] **Step 5: Run full backend verification**

From `mainfile/alab-system`:

```powershell
npm test
npm run lint
npm run build
```

Expected: every test passes, lint exits 0, and Next production build exits 0.

- [ ] **Step 6: Run full Flutter verification**

From `apps/bfp_mobile_app/flutter_application_1`:

```powershell
flutter pub get
flutter test
flutter analyze
flutter build apk --debug --dart-define=ALAB_API_BASE_URL=https://alab-fire-responses-bynr.vercel.app
```

Expected: tests pass, analyze reports no issues, and `build/app/outputs/flutter-apk/app-debug.apk` is created.

- [ ] **Step 7: Execute the multi-user field matrix**

Create two eligible stations with two active responder accounts each and use two physical/emulated phones:

1. Dispatch to Station A only; both A users receive in-app/push alerts and Station B users do not.
2. Dispatch a second incident with **All Stations**; all four users receive exactly one alert.
3. Open from terminated-state push; correct assignment opens.
4. A1 acknowledges; shared report becomes `FIRETRUCK_DISPATCHED`; A2/B1/B2 remain individually assigned.
5. A1 follows the in-app route and sends two accurate inside-radius samples 30+ seconds apart; shared report becomes `RESPONDER_ARRIVED` once.
6. A2 later arrives; only A2's recipient row advances with no duplicate shared history.
7. Disable push permission on B1; B1 still receives the in-app notification.
8. Disable network/OSRM; direct-line route fallback remains usable.
9. Deny precise location; manual-arrival fallback is visible and audited.
10. Resolve the incident; all tracking stops and no later location samples are accepted.

- [ ] **Step 8: Commit verification documentation**

```powershell
git add README.md tests/supabase-setup.test.mjs ..\..\apps\bfp_mobile_app\flutter_application_1\README.md
git commit -m "docs: add station dispatch operations runbook"
```

---

## Plan Self-Review

- **Spec coverage:** Tasks 1–4 cover station selection, all-station behavior, UI preservation, transactionality, and multi-user snapshots. Tasks 5–7 cover in-app plus closed-app push notification delivery. Tasks 8–10 replace sample mobile data, add independent acknowledgment, in-app mapping, 100-meter/30-second arrival, shared status, and notification UI. Task 11 covers security, builds, and the required multi-user field scenario.
- **No direct Supabase mobile access:** Every mobile operation uses the existing authenticated Next.js API; all new public-schema tables remain RLS-enabled and unavailable to `anon`/`authenticated`.
- **Type consistency:** `DispatchStatus`/`DispatchRecipientStatus` on the server map directly to `MobileDispatchStatus`/`MobileRecipientStatus` parsing in Flutter. The same `dispatchId` is used by FCM payloads, notification context, mobile routes, controller selection, and deep-link handling.
- **Concurrency:** Shared fire-report transitions lock the report; recipient transitions lock only the matching signed-in recipient; idempotency prevents duplicate dispatch, history, notification, acknowledgment, and arrival records.
- **Failure behavior:** Push, OSRM, background permission, precise GPS, and network failures all have explicit degraded states without claiming a false operational transition.
- **UI constraint:** The plan introduces a single focused web sheet and replaces Flutter sample content inside existing screen structures; it does not redesign the established visual system.
