# Inter-Municipality Live Incident Coordination Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** After a municipal dispatch is assigned, expose a privacy-limited live incident to exactly two GPS-selected nearby municipalities, support explicit backup requests and responses, and notify Provincial BFP throughout the coordination lifecycle.

**Architecture:** Extend the existing PostgreSQL dispatch transaction with immutable nearby-municipality observer snapshots selected from active station coordinates. Keep selection, access control, assistance transitions, audit writes, and notifications in focused server-only modules; reuse the existing five-second visible-tab polling for municipal and provincial views.

**Tech Stack:** Next.js 16.2.12 App Router, React 19.2.4, TypeScript 5, PostgreSQL through pg 8.16.3, Supabase migrations, Node 25 built-in test runner.

**Spec:** `docs/superpowers/specs/2026-09-06-inter-municipality-live-coordination-design.md`

## Global Constraints

- Inter-municipality visibility starts only after the responsible municipality creates an active dispatch.
- Select exactly two other municipalities from the incident GPS coordinate and active municipal-station coordinates; exclude the origin municipality.
- Persist the chosen municipality, representative station, station coordinates, distance, and selection time so an active incident never silently changes observers.
- The originating municipality remains incident commander; observers cannot dispatch into the incident without an accepted backup request.
- Observer responses must omit resident identity, phone, email, private address, photos, IP address, device data, and reporter-verification evidence.
- Only the two selected observer municipalities may receive a backup request.
- Provincial BFP receives selection, request, response, cancellation, completion, and degraded-selection notifications.
- Reuse the existing five-second visible-tab refresh and immediate visibility-return refresh; do not add WebSockets or Supabase Realtime.
- A shortage of eligible external municipalities must not block local dispatch; persist all available observers and warn the origin and Provincial BFP.
- Use signed-session server routes and PostgreSQL queries; do not grant the new tables to Supabase anon or authenticated roles.
- Do not add named external personnel or external firetruck assignment in this phase.
- Run all commands below from `mainfile/alab-system`.

## File Structure

### Create

- `supabase/migrations/20260906090000_add_intermunicipality_coordination.sql` â€” observer, assistance-request, and immutable coordination-audit schema plus notification event constraints.
- `lib/intermunicipality/types.ts` â€” shared server/client-safe coordination types and event/status constants.
- `lib/intermunicipality/proximity.ts` â€” pure Haversine ranking and one-station-per-municipality reduction.
- `lib/intermunicipality/audit.ts` â€” immutable coordination audit insertion.
- `lib/intermunicipality/observers.ts` â€” selected-observer persistence, notifications, and observer lifecycle.
- `lib/intermunicipality/assistance-state.ts` â€” pure assistance transition and quantity validation.
- `lib/intermunicipality/assistance.ts` â€” transactional request creation, response, cancellation, completion, audit, and notification orchestration.
- `lib/intermunicipality/incident-access.ts` â€” municipal origin/observer authorization and separate privacy projections.
- `lib/intermunicipality/provincial.ts` â€” province-wide incident and assistance read models.
- `lib/provincial-bfp/auth.ts` â€” reusable Provincial BFP signed-session authorization.
- `app/api/municipal-bfp/incidents/[id]/assistance-requests/route.ts` â€” origin-only request creation.
- `app/api/municipal-bfp/assistance-requests/[requestId]/route.ts` â€” recipient response and origin cancellation.
- `app/api/provincial-bfp/incidents/route.ts` â€” provincial live incident feed.
- `app/api/provincial-bfp/incidents/[id]/route.ts` â€” provincial incident coordination detail.
- `app/api/provincial-bfp/assistance-requests/route.ts` â€” provincial assistance feed.
- `app/_components/intermunicipality-coordination-panel.tsx` â€” origin and observer coordination controls.
- `app/_components/use-provincial-incident-feed.ts` â€” five-second provincial incident polling.
- `app/_components/use-provincial-assistance-feed.ts` â€” five-second provincial assistance polling.
- `tests/intermunicipality-coordination-schema.test.mjs`
- `tests/intermunicipality-proximity.test.mjs`
- `tests/intermunicipality-observers-service.test.mjs`
- `tests/intermunicipality-assistance.test.mjs`
- `tests/intermunicipality-dispatch-integration.test.mjs`
- `tests/intermunicipality-access.test.mjs`
- `tests/intermunicipality-municipal-ui.test.mjs`
- `tests/intermunicipality-provincial.test.mjs`

### Modify

- `lib/notifications/types.ts` â€” add coordination notification events.
- `lib/municipal-bfp/dispatch.ts` â€” create observers during dispatch and end coordination during resolution.
- `lib/municipal-bfp/phone-incidents.ts` â€” create observers in the phone-call dispatch transaction.
- `app/api/municipal-bfp/incidents/route.ts` â€” use the scoped incident read model.
- `app/api/municipal-bfp/incidents/[id]/route.ts` â€” return origin or observer-safe detail.
- `app/_components/use-municipal-incident-feed.ts` â€” model origin and nearby incident rows.
- `app/municipal-bfp/active-incidents/page.tsx` â€” label and filter observed incidents.
- `app/_components/municipal-incident-detail.tsx` â€” enforce origin/observer presentation and mount the coordination panel.
- `app/provincial-bfp/incidents/page.tsx` â€” replace sample incidents with live data.
- `app/provincial-bfp/assistance-requests/page.tsx` â€” replace sample assistance cards with live data.
- `app/_components/provincial-bfp-dashboard.tsx` â€” replace hardcoded incident and assistance summaries.
- `../../BFP_Fire_Response_System_Overview.md` â€” document the implemented selection, monitoring, and backup flow.

---

### Task 1: Add the coordination schema and notification domain

**Files:**
- Create: `supabase/migrations/20260906090000_add_intermunicipality_coordination.sql`
- Create: `tests/intermunicipality-coordination-schema.test.mjs`
- Modify: `lib/notifications/types.ts`
- Modify: `tests/account-notifications.test.mjs`

**Interfaces:**
- Consumes: existing `fire_reports`, `incident_dispatches`, `municipal_bfp_stations`, `municipalities`, `users`, and `account_notifications` tables.
- Produces: `incident_municipal_observers`, `intermunicipal_assistance_requests`, `intermunicipal_coordination_events`, and nine new `NotificationEvent` values.

- [ ] **Step 1: Write the failing schema contract test**

Create `tests/intermunicipality-coordination-schema.test.mjs`:

~~~js
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const migrationPath = join(
  root,
  "supabase",
  "migrations",
  "20260906090000_add_intermunicipality_coordination.sql",
);

test("coordination migration creates secure observer, request, and audit tables", () => {
  const migration = readFileSync(migrationPath, "utf8");
  for (const table of [
    "incident_municipal_observers",
    "intermunicipal_assistance_requests",
    "intermunicipal_coordination_events",
  ]) {
    assert.match(migration, new RegExp("create table public\\\\." + table, "i"));
  }
  assert.match(migration, /unique \(dispatch_id, observer_municipality_id\)/i);
  assert.match(migration, /origin_municipality_id <> observer_municipality_id/i);
  assert.match(migration, /intermunicipal_assistance_one_open_recipient_idx/i);
  assert.match(migration, /where status in \('REQUESTED','ACCEPTED','PARTIALLY_ACCEPTED'\)/i);
  assert.match(migration, /enable row level security/gi);
  assert.doesNotMatch(
    migration,
    /grant .*?(incident_municipal_observers|intermunicipal_assistance_requests|intermunicipal_coordination_events).*?(anon|authenticated)/i,
  );
});

test("coordination migration extends the account notification allowlist", () => {
  const migration = readFileSync(migrationPath, "utf8");
  for (const event of [
    "NEARBY_INCIDENT_ASSIGNED",
    "NEARBY_MONITORING_STARTED",
    "ASSISTANCE_REQUESTED",
    "ASSISTANCE_ACCEPTED",
    "ASSISTANCE_PARTIALLY_ACCEPTED",
    "ASSISTANCE_REJECTED",
    "ASSISTANCE_CANCELLED",
    "ASSISTANCE_COMPLETED",
    "NEARBY_SELECTION_DEGRADED",
  ]) {
    assert.match(migration, new RegExp(event));
  }
});
~~~

- [ ] **Step 2: Run the schema test and confirm the missing migration failure**

Run:

~~~powershell
node --test tests/intermunicipality-coordination-schema.test.mjs
~~~

Expected: FAIL with `ENOENT` for `20260906090000_add_intermunicipality_coordination.sql`.

- [ ] **Step 3: Create the migration with exact constraints and indexes**

Create the migration with these definitions:

~~~sql
create table public.incident_municipal_observers (
  id uuid primary key,
  fire_report_id uuid not null references public.fire_reports(id) on delete restrict,
  dispatch_id uuid not null references public.incident_dispatches(id) on delete restrict,
  origin_municipality_id uuid not null references public.municipalities(id) on delete restrict,
  observer_municipality_id uuid not null references public.municipalities(id) on delete restrict,
  nearest_station_id uuid not null references public.municipal_bfp_stations(id) on delete restrict,
  station_latitude_snapshot numeric(9,6) not null check (station_latitude_snapshot between 4 and 22),
  station_longitude_snapshot numeric(9,6) not null check (station_longitude_snapshot between 115 and 130),
  distance_meters numeric(12,2) not null check (distance_meters >= 0),
  status text not null check (status in ('ACTIVE','ENDED')),
  selected_at timestamptz not null,
  ended_at timestamptz,
  unique (dispatch_id, observer_municipality_id),
  check (origin_municipality_id <> observer_municipality_id),
  check (
    (status = 'ACTIVE' and ended_at is null)
    or (status = 'ENDED' and ended_at is not null)
  )
);

create index incident_municipal_observers_active_queue_idx
  on public.incident_municipal_observers (observer_municipality_id, status, selected_at desc);
create index incident_municipal_observers_report_status_idx
  on public.incident_municipal_observers (fire_report_id, status);

create table public.intermunicipal_assistance_requests (
  id uuid primary key,
  fire_report_id uuid not null references public.fire_reports(id) on delete restrict,
  dispatch_id uuid not null references public.incident_dispatches(id) on delete restrict,
  observer_id uuid not null references public.incident_municipal_observers(id) on delete restrict,
  requester_municipality_id uuid not null references public.municipalities(id) on delete restrict,
  recipient_municipality_id uuid not null references public.municipalities(id) on delete restrict,
  requested_by_user_id uuid not null references public.users(id) on delete restrict,
  requested_firetrucks smallint not null default 0 check (requested_firetrucks >= 0),
  requested_personnel smallint not null default 0 check (requested_personnel >= 0),
  request_note text check (request_note is null or char_length(request_note) <= 500),
  status text not null check (
    status in ('REQUESTED','ACCEPTED','PARTIALLY_ACCEPTED','REJECTED','CANCELLED','COMPLETED')
  ),
  offered_firetrucks smallint check (offered_firetrucks is null or offered_firetrucks >= 0),
  offered_personnel smallint check (offered_personnel is null or offered_personnel >= 0),
  response_note text check (response_note is null or char_length(response_note) <= 500),
  responded_by_user_id uuid references public.users(id) on delete restrict,
  requested_at timestamptz not null,
  responded_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz not null,
  check (requested_firetrucks > 0 or requested_personnel > 0),
  check (requester_municipality_id <> recipient_municipality_id)
);

create unique index intermunicipal_assistance_one_open_recipient_idx
  on public.intermunicipal_assistance_requests (dispatch_id, recipient_municipality_id)
  where status in ('REQUESTED','ACCEPTED','PARTIALLY_ACCEPTED');
create index intermunicipal_assistance_origin_idx
  on public.intermunicipal_assistance_requests (requester_municipality_id, requested_at desc);
create index intermunicipal_assistance_recipient_idx
  on public.intermunicipal_assistance_requests (recipient_municipality_id, requested_at desc);

create table public.intermunicipal_coordination_events (
  id uuid primary key,
  fire_report_id uuid not null references public.fire_reports(id) on delete restrict,
  dispatch_id uuid not null references public.incident_dispatches(id) on delete restrict,
  assistance_request_id uuid references public.intermunicipal_assistance_requests(id) on delete restrict,
  actor_user_id uuid references public.users(id) on delete restrict,
  origin_municipality_id uuid not null references public.municipalities(id) on delete restrict,
  recipient_municipality_id uuid references public.municipalities(id) on delete restrict,
  event_type text not null check (
    event_type in (
      'OBSERVERS_SELECTED','SELECTION_DEGRADED','ASSISTANCE_REQUESTED',
      'ASSISTANCE_ACCEPTED','ASSISTANCE_PARTIALLY_ACCEPTED','ASSISTANCE_REJECTED',
      'ASSISTANCE_CANCELLED','ASSISTANCE_COMPLETED','OBSERVER_ACCESS_ENDED'
    )
  ),
  old_status text,
  new_status text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null
);

create index intermunicipal_coordination_events_report_idx
  on public.intermunicipal_coordination_events (fire_report_id, created_at desc);
create index intermunicipal_coordination_events_created_idx
  on public.intermunicipal_coordination_events (created_at desc);

alter table public.incident_municipal_observers enable row level security;
alter table public.intermunicipal_assistance_requests enable row level security;
alter table public.intermunicipal_coordination_events enable row level security;

revoke all on table public.incident_municipal_observers from anon, authenticated;
revoke all on table public.intermunicipal_assistance_requests from anon, authenticated;
revoke all on table public.intermunicipal_coordination_events from anon, authenticated;

alter table public.account_notifications
  drop constraint if exists account_notifications_event_type_check;
alter table public.account_notifications
  add constraint account_notifications_event_type_check check (
    event_type in (
      'FIRE_REPORT_CREATED','FIRE_RESPONSE_STARTED','INCIDENT_DISPATCH_ASSIGNED',
      'INCIDENT_DISPATCH_STATUS_CHANGED','RESIDENT_APPLICATION_SUBMITTED',
      'RESIDENT_APPLICATION_RESUBMITTED','RESIDENT_APPLICATION_APPROVED',
      'RESIDENT_APPLICATION_CHANGES_REQUESTED','MUNICIPAL_ACCOUNT_CREATED',
      'NEARBY_INCIDENT_ASSIGNED','NEARBY_MONITORING_STARTED','ASSISTANCE_REQUESTED',
      'ASSISTANCE_ACCEPTED','ASSISTANCE_PARTIALLY_ACCEPTED','ASSISTANCE_REJECTED',
      'ASSISTANCE_CANCELLED','ASSISTANCE_COMPLETED','NEARBY_SELECTION_DEGRADED'
    )
  );
~~~

- [ ] **Step 4: Add the notification events to the TypeScript domain**

Append the nine migration event values to `NOTIFICATION_EVENTS` in `lib/notifications/types.ts`. Add the same nine values to the event loop in `tests/account-notifications.test.mjs`.

~~~ts
"NEARBY_INCIDENT_ASSIGNED",
"NEARBY_MONITORING_STARTED",
"ASSISTANCE_REQUESTED",
"ASSISTANCE_ACCEPTED",
"ASSISTANCE_PARTIALLY_ACCEPTED",
"ASSISTANCE_REJECTED",
"ASSISTANCE_CANCELLED",
"ASSISTANCE_COMPLETED",
"NEARBY_SELECTION_DEGRADED",
~~~

- [ ] **Step 5: Run the focused tests**

Run:

~~~powershell
node --test tests/intermunicipality-coordination-schema.test.mjs tests/account-notifications.test.mjs
~~~

Expected: both test files PASS.

- [ ] **Step 6: Commit the schema and notification domain**

~~~powershell
git add supabase/migrations/20260906090000_add_intermunicipality_coordination.sql tests/intermunicipality-coordination-schema.test.mjs lib/notifications/types.ts tests/account-notifications.test.mjs
git commit -m "feat(coordination): add intermunicipality data model"
~~~

---

### Task 2: Implement deterministic nearby-municipality selection

**Files:**
- Create: `lib/intermunicipality/types.ts`
- Create: `lib/intermunicipality/proximity.ts`
- Create: `lib/intermunicipality/audit.ts`
- Create: `lib/intermunicipality/observers.ts`
- Create: `tests/intermunicipality-proximity.test.mjs`
- Create: `tests/intermunicipality-observers-service.test.mjs`

**Interfaces:**
- Consumes: `createAccountNotifications`, `listMunicipalNotificationRecipients`, `listProvincialNotificationRecipients`, a transaction client, incident GPS, origin municipality, dispatch ID, actor, reference, and barangay.
- Produces: `rankNearbyMunicipalities(stations, incident, limit)`, `createNearbyIncidentObservers(client, input)`, `endIncidentObservers(client, input)`, and `recordCoordinationEvent(client, input)`.

- [ ] **Step 1: Write the failing proximity behavior test**

Create `tests/intermunicipality-proximity.test.mjs`:

~~~js
import assert from "node:assert/strict";
import test from "node:test";

import {
  distanceMeters,
  rankNearbyMunicipalities,
} from "../lib/intermunicipality/proximity.ts";

test("distanceMeters returns zero for identical coordinates", () => {
  assert.equal(distanceMeters(10.7, 122.0, 10.7, 122.0), 0);
});

test("ranking excludes the origin and returns one nearest station for each of two municipalities", () => {
  const stations = [
    { stationId: "h1", stationName: "Hamtic", municipalityId: "hamtic", municipalityName: "Hamtic", latitude: 10.70, longitude: 122.00 },
    { stationId: "s-far", stationName: "San Jose North", municipalityId: "san-jose", municipalityName: "San Jose", latitude: 10.80, longitude: 122.00 },
    { stationId: "s-near", stationName: "San Jose South", municipalityId: "san-jose", municipalityName: "San Jose", latitude: 10.71, longitude: 122.00 },
    { stationId: "t1", stationName: "Tobias Fornier", municipalityId: "tobias", municipalityName: "Tobias Fornier", latitude: 10.69, longitude: 122.00 },
    { stationId: "a1", stationName: "Anini-y", municipalityId: "anini-y", municipalityName: "Anini-y", latitude: 10.60, longitude: 122.00 },
  ];

  const ranked = rankNearbyMunicipalities(
    stations,
    { latitude: 10.70, longitude: 122.00, originMunicipalityId: "hamtic" },
    2,
  );

  assert.deepEqual(
    ranked.map((candidate) => [candidate.municipalityId, candidate.stationId]),
    [["san-jose", "s-near"], ["tobias", "t1"]],
  );
});

test("ranking is deterministic when two candidates have equal distance", () => {
  const ranked = rankNearbyMunicipalities(
    [
      { stationId: "b", stationName: "B Station", municipalityId: "municipality-b", municipalityName: "B", latitude: 10.71, longitude: 122.00 },
      { stationId: "a", stationName: "A Station", municipalityId: "municipality-a", municipalityName: "A", latitude: 10.69, longitude: 122.00 },
    ],
    { latitude: 10.70, longitude: 122.00, originMunicipalityId: "origin" },
    2,
  );
  assert.deepEqual(ranked.map((candidate) => candidate.municipalityId), [
    "municipality-a",
    "municipality-b",
  ]);
});
~~~

- [ ] **Step 2: Run the proximity test and confirm the missing-module failure**

Run:

~~~powershell
node --test tests/intermunicipality-proximity.test.mjs
~~~

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `lib/intermunicipality/proximity.ts`.

- [ ] **Step 3: Define shared coordination types**

Create `lib/intermunicipality/types.ts` with these public shapes:

~~~ts
export const ASSISTANCE_STATUSES = [
  "REQUESTED",
  "ACCEPTED",
  "PARTIALLY_ACCEPTED",
  "REJECTED",
  "CANCELLED",
  "COMPLETED",
] as const;

export type AssistanceStatus = typeof ASSISTANCE_STATUSES[number];
export type MunicipalIncidentAccessScope = "ORIGIN" | "OBSERVER";

export type StationCandidate = {
  stationId: string;
  stationName: string;
  municipalityId: string;
  municipalityName: string;
  latitude: number;
  longitude: number;
};

export type NearbyMunicipalityCandidate = StationCandidate & {
  distanceMeters: number;
};

export type NearbyObserver = {
  observerId: string;
  municipalityId: string;
  municipalityName: string;
  stationId: string;
  stationName: string;
  distanceMeters: number;
  status: "ACTIVE" | "ENDED";
  assistanceStatus: AssistanceStatus | null;
};

export type AssistanceRequestSummary = {
  id: string;
  recipientMunicipalityId: string;
  recipientMunicipalityName: string;
  requestedFiretrucks: number;
  requestedPersonnel: number;
  offeredFiretrucks: number | null;
  offeredPersonnel: number | null;
  requestNote: string | null;
  responseNote: string | null;
  status: AssistanceStatus;
  requestedAt: string;
  respondedAt: string | null;
  completedAt: string | null;
};
~~~

- [ ] **Step 4: Implement the pure ranking module**

Create `lib/intermunicipality/proximity.ts`:

~~~ts
import type {
  NearbyMunicipalityCandidate,
  StationCandidate,
} from "./types";

type IncidentPoint = {
  latitude: number;
  longitude: number;
  originMunicipalityId: string;
};

function validCoordinate(latitude: number, longitude: number) {
  return Number.isFinite(latitude)
    && Number.isFinite(longitude)
    && latitude >= -90
    && latitude <= 90
    && longitude >= -180
    && longitude <= 180;
}

export function distanceMeters(
  fromLatitude: number,
  fromLongitude: number,
  toLatitude: number,
  toLongitude: number,
) {
  const radians = (value: number) => value * Math.PI / 180;
  const latitudeDelta = radians(toLatitude - fromLatitude);
  const longitudeDelta = radians(toLongitude - fromLongitude);
  const a = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(radians(fromLatitude))
    * Math.cos(radians(toLatitude))
    * Math.sin(longitudeDelta / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function rankNearbyMunicipalities(
  stations: StationCandidate[],
  incident: IncidentPoint,
  limit = 2,
): NearbyMunicipalityCandidate[] {
  if (!validCoordinate(incident.latitude, incident.longitude)) {
    throw new Error("INVALID_INCIDENT_COORDINATES");
  }

  const nearestByMunicipality = new Map<string, NearbyMunicipalityCandidate>();
  for (const station of stations) {
    if (
      station.municipalityId === incident.originMunicipalityId
      || !validCoordinate(station.latitude, station.longitude)
    ) {
      continue;
    }
    const candidate = {
      ...station,
      distanceMeters: distanceMeters(
        incident.latitude,
        incident.longitude,
        station.latitude,
        station.longitude,
      ),
    };
    const current = nearestByMunicipality.get(station.municipalityId);
    if (
      !current
      || candidate.distanceMeters < current.distanceMeters
      || (
        candidate.distanceMeters === current.distanceMeters
        && candidate.stationId.localeCompare(current.stationId) < 0
      )
    ) {
      nearestByMunicipality.set(station.municipalityId, candidate);
    }
  }

  return [...nearestByMunicipality.values()]
    .sort((left, right) => (
      left.distanceMeters - right.distanceMeters
      || left.municipalityId.localeCompare(right.municipalityId)
    ))
    .slice(0, Math.max(0, Math.trunc(limit)));
}
~~~

- [ ] **Step 5: Run the proximity behavior test**

Run:

~~~powershell
node --test tests/intermunicipality-proximity.test.mjs
~~~

Expected: all three proximity tests PASS.

- [ ] **Step 6: Write the failing observer-service contract test**

Create `tests/intermunicipality-observers-service.test.mjs`:

~~~js
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const source = (path) => readFileSync(join(process.cwd(), path), "utf8");

test("observer service persists ranked snapshots and emits scoped notifications", () => {
  const service = source("lib/intermunicipality/observers.ts");
  assert.match(service, /rankNearbyMunicipalities/);
  assert.match(service, /status = 'ACTIVE'/);
  assert.match(service, /municipality_id <> \$1/);
  assert.match(service, /insert into incident_municipal_observers/i);
  assert.match(service, /listMunicipalNotificationRecipients/);
  assert.match(service, /listProvincialNotificationRecipients/);
  assert.match(service, /NEARBY_INCIDENT_ASSIGNED/);
  assert.match(service, /NEARBY_MONITORING_STARTED/);
  assert.match(service, /NEARBY_SELECTION_DEGRADED/);
  assert.match(service, /recordCoordinationEvent/);
});

test("observer lifecycle ends access without deleting snapshots", () => {
  const service = source("lib/intermunicipality/observers.ts");
  assert.match(service, /export async function endIncidentObservers/);
  assert.match(service, /set status = 'ENDED'/);
  assert.match(service, /ended_at = \$1/);
  assert.doesNotMatch(service, /delete from incident_municipal_observers/i);
});
~~~

- [ ] **Step 7: Run the observer test and confirm missing files**

Run:

~~~powershell
node --test tests/intermunicipality-observers-service.test.mjs
~~~

Expected: FAIL with `ENOENT` for `lib/intermunicipality/observers.ts`.

- [ ] **Step 8: Implement audit and observer services**

Create `lib/intermunicipality/audit.ts` with:

~~~ts
import "server-only";

import { randomUUID } from "node:crypto";
import type { PoolClient } from "pg";

type Queryable = Pick<PoolClient, "query">;

export type CoordinationAuditInput = {
  fireReportId: string;
  dispatchId: string;
  assistanceRequestId?: string | null;
  actorUserId?: string | null;
  originMunicipalityId: string;
  recipientMunicipalityId?: string | null;
  eventType:
    | "OBSERVERS_SELECTED"
    | "SELECTION_DEGRADED"
    | "ASSISTANCE_REQUESTED"
    | "ASSISTANCE_ACCEPTED"
    | "ASSISTANCE_PARTIALLY_ACCEPTED"
    | "ASSISTANCE_REJECTED"
    | "ASSISTANCE_CANCELLED"
    | "ASSISTANCE_COMPLETED"
    | "OBSERVER_ACCESS_ENDED";
  oldStatus?: string | null;
  newStatus?: string | null;
  metadata?: Record<string, unknown>;
  createdAt: Date;
};

export async function recordCoordinationEvent(
  client: Queryable,
  input: CoordinationAuditInput,
) {
  await client.query(
    `insert into intermunicipal_coordination_events (
       id, fire_report_id, dispatch_id, assistance_request_id, actor_user_id,
       origin_municipality_id, recipient_municipality_id, event_type,
       old_status, new_status, metadata, created_at
     ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,$12)`,
    [
      randomUUID(),
      input.fireReportId,
      input.dispatchId,
      input.assistanceRequestId ?? null,
      input.actorUserId ?? null,
      input.originMunicipalityId,
      input.recipientMunicipalityId ?? null,
      input.eventType,
      input.oldStatus ?? null,
      input.newStatus ?? null,
      JSON.stringify(input.metadata ?? {}),
      input.createdAt,
    ],
  );
}
~~~

Create `lib/intermunicipality/observers.ts` with these exact exported contracts:

~~~ts
export type CreateNearbyObserversInput = {
  fireReportId: string;
  dispatchId: string;
  originMunicipalityId: string;
  originMunicipalityName: string;
  actorUserId: string;
  referenceNumber: string;
  barangay: string | null;
  latitude: number;
  longitude: number;
  createdAt: Date;
};

export type CreateNearbyObserversResult = {
  observers: NearbyObserver[];
  degraded: boolean;
};

export async function createNearbyIncidentObservers(
  client: Queryable,
  input: CreateNearbyObserversInput,
): Promise<CreateNearbyObserversResult>;

export async function endIncidentObservers(
  client: Queryable,
  input: {
    fireReportId: string;
    dispatchId: string;
    originMunicipalityId: string;
    actorUserId: string;
    endedAt: Date;
  },
): Promise<string[]>;
~~~

The creation function must execute this candidate query, pass its rows to `rankNearbyMunicipalities(..., 2)`, and insert one observer row per result:

~~~sql
select station.id as "stationId",
       station.station_name as "stationName",
       station.municipality_id as "municipalityId",
       municipality.name as "municipalityName",
       station.latitude::float as latitude,
       station.longitude::float as longitude
  from municipal_bfp_stations station
  join municipalities municipality on municipality.id = station.municipality_id
 where station.status = 'ACTIVE'
   and station.municipality_id <> $1
 order by station.municipality_id, station.id
~~~

For every selected observer, look up active accounts with `listMunicipalNotificationRecipients` and create `NEARBY_INCIDENT_ASSIGNED` using action `/municipal-bfp/active-incidents?incident=<fireReportId>`. Notify Provincial BFP once with `NEARBY_MONITORING_STARTED` and action `/provincial-bfp/incidents?incident=<fireReportId>`. If fewer than two are selected, notify origin and Provincial BFP with `NEARBY_SELECTION_DEGRADED`. Use dedupe keys:

~~~text
nearby-incident:<dispatchId>:<observerMunicipalityId>
nearby-monitoring:<dispatchId>:provincial
nearby-selection:<dispatchId>:degraded
~~~

`endIncidentObservers` must update active rows to `ENDED`, set `ended_at`, record `OBSERVER_ACCESS_ENDED` for each observer, and return the ended observer municipality IDs. It must never delete an observer snapshot.

- [ ] **Step 9: Run observer, proximity, and TypeScript checks**

Run:

~~~powershell
node --test tests/intermunicipality-proximity.test.mjs tests/intermunicipality-observers-service.test.mjs
npx tsc --noEmit
~~~

Expected: both test files PASS and TypeScript exits 0.

- [ ] **Step 10: Commit deterministic observer selection**

~~~powershell
git add lib/intermunicipality/types.ts lib/intermunicipality/proximity.ts lib/intermunicipality/audit.ts lib/intermunicipality/observers.ts tests/intermunicipality-proximity.test.mjs tests/intermunicipality-observers-service.test.mjs
git commit -m "feat(coordination): select two nearby municipalities"
~~~

---

### Task 3: Implement the assistance request state machine

**Files:**
- Create: `lib/intermunicipality/assistance-state.ts`
- Create: `lib/intermunicipality/assistance.ts`
- Create: `tests/intermunicipality-assistance.test.mjs`

**Interfaces:**
- Consumes: observer snapshots, municipal identity, notification recipient lookup, audit writer, and PostgreSQL transactions.
- Produces: `createAssistanceRequests(input)`, `transitionAssistanceRequest(input)`, and `closeIncidentAssistance(client, input)`.

- [ ] **Step 1: Write the failing state-machine and service tests**

Create `tests/intermunicipality-assistance.test.mjs`:

~~~js
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import {
  validateAssistanceTransition,
  validateRequestedResources,
} from "../lib/intermunicipality/assistance-state.ts";

const source = (path) => readFileSync(join(process.cwd(), path), "utf8");

test("request validation requires at least one resource", () => {
  assert.throws(
    () => validateRequestedResources(0, 0),
    /ASSISTANCE_RESOURCES_REQUIRED/,
  );
  assert.deepEqual(validateRequestedResources(1, 4), {
    requestedFiretrucks: 1,
    requestedPersonnel: 4,
  });
});

test("transition validation enforces accepted, partial, rejected, and cancel quantities", () => {
  assert.equal(
    validateAssistanceTransition("REQUESTED", "ACCEPT", 1, 4, 1, 4).nextStatus,
    "ACCEPTED",
  );
  assert.equal(
    validateAssistanceTransition("REQUESTED", "PARTIAL_ACCEPT", 1, 4, 0, 2).nextStatus,
    "PARTIALLY_ACCEPTED",
  );
  assert.equal(
    validateAssistanceTransition("REQUESTED", "REJECT", 1, 4, 0, 0).nextStatus,
    "REJECTED",
  );
  assert.equal(
    validateAssistanceTransition("REQUESTED", "CANCEL", 1, 4, 0, 0).nextStatus,
    "CANCELLED",
  );
  assert.throws(
    () => validateAssistanceTransition("ACCEPTED", "REJECT", 1, 4, 0, 0),
    /ASSISTANCE_STATE_CONFLICT/,
  );
});

test("assistance service locks rows, scopes actors, audits, and deduplicates notifications", () => {
  const service = source("lib/intermunicipality/assistance.ts");
  assert.match(service, /for update/i);
  assert.match(service, /observer_municipality_id = any\(\$[0-9]+::uuid\[\]\)/i);
  assert.match(service, /requester_municipality_id = \$[0-9]+/i);
  assert.match(service, /recipient_municipality_id = \$[0-9]+/i);
  assert.match(service, /recordCoordinationEvent/);
  assert.match(service, /ASSISTANCE_REQUESTED/);
  assert.match(service, /ASSISTANCE_PARTIALLY_ACCEPTED/);
  assert.match(service, /on conflict/i);
});
~~~

- [ ] **Step 2: Run the test and confirm the missing-module failure**

Run:

~~~powershell
node --test tests/intermunicipality-assistance.test.mjs
~~~

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `assistance-state.ts`.

- [ ] **Step 3: Implement pure quantity and transition validation**

Create `lib/intermunicipality/assistance-state.ts` with:

~~~ts
import type { AssistanceStatus } from "./types";

export type AssistanceAction =
  | "ACCEPT"
  | "PARTIAL_ACCEPT"
  | "REJECT"
  | "CANCEL";

function resourceCount(value: number) {
  if (!Number.isInteger(value) || value < 0 || value > 500) {
    throw new Error("INVALID_ASSISTANCE_QUANTITY");
  }
  return value;
}

export function validateRequestedResources(
  requestedFiretrucks: number,
  requestedPersonnel: number,
) {
  const result = {
    requestedFiretrucks: resourceCount(requestedFiretrucks),
    requestedPersonnel: resourceCount(requestedPersonnel),
  };
  if (result.requestedFiretrucks === 0 && result.requestedPersonnel === 0) {
    throw new Error("ASSISTANCE_RESOURCES_REQUIRED");
  }
  return result;
}

export function validateAssistanceTransition(
  currentStatus: AssistanceStatus,
  action: AssistanceAction,
  requestedFiretrucks: number,
  requestedPersonnel: number,
  offeredFiretrucks: number,
  offeredPersonnel: number,
) {
  if (currentStatus !== "REQUESTED") {
    throw new Error("ASSISTANCE_STATE_CONFLICT");
  }
  const offered = {
    offeredFiretrucks: resourceCount(offeredFiretrucks),
    offeredPersonnel: resourceCount(offeredPersonnel),
  };
  if (action === "CANCEL") {
    if (offered.offeredFiretrucks !== 0 || offered.offeredPersonnel !== 0) {
      throw new Error("CANCELLED_ASSISTANCE_MUST_OFFER_ZERO");
    }
    return { nextStatus: "CANCELLED" as const, ...offered };
  }
  if (action === "REJECT") {
    if (offered.offeredFiretrucks !== 0 || offered.offeredPersonnel !== 0) {
      throw new Error("REJECTED_ASSISTANCE_MUST_OFFER_ZERO");
    }
    return { nextStatus: "REJECTED" as const, ...offered };
  }
  if (action === "ACCEPT") {
    if (
      offered.offeredFiretrucks !== requestedFiretrucks
      || offered.offeredPersonnel !== requestedPersonnel
    ) {
      throw new Error("ACCEPTED_ASSISTANCE_MUST_MATCH_REQUEST");
    }
    return { nextStatus: "ACCEPTED" as const, ...offered };
  }
  const positive = offered.offeredFiretrucks > 0 || offered.offeredPersonnel > 0;
  const withinRequest = offered.offeredFiretrucks <= requestedFiretrucks
    && offered.offeredPersonnel <= requestedPersonnel;
  const isPartial = offered.offeredFiretrucks < requestedFiretrucks
    || offered.offeredPersonnel < requestedPersonnel;
  if (!positive || !withinRequest || !isPartial) {
    throw new Error("INVALID_PARTIAL_ASSISTANCE");
  }
  return { nextStatus: "PARTIALLY_ACCEPTED" as const, ...offered };
}
~~~

- [ ] **Step 4: Implement transactional assistance orchestration**

Create `lib/intermunicipality/assistance.ts` with these exact inputs:

~~~ts
export type CreateAssistanceRequestsInput = {
  fireReportId: string;
  requesterMunicipalityId: string;
  actorUserId: string;
  recipientMunicipalityIds: string[];
  requestedFiretrucks: number;
  requestedPersonnel: number;
  requestNote?: string | null;
};

export type TransitionAssistanceRequestInput = {
  requestId: string;
  actorMunicipalityId: string;
  actorUserId: string;
  action: AssistanceAction;
  offeredFiretrucks: number;
  offeredPersonnel: number;
  responseNote?: string | null;
};

export async function createAssistanceRequests(
  input: CreateAssistanceRequestsInput,
): Promise<AssistanceRequestSummary[]>;

export async function transitionAssistanceRequest(
  input: TransitionAssistanceRequestInput,
): Promise<AssistanceRequestSummary>;

export async function closeIncidentAssistance(
  client: Queryable,
  input: {
    fireReportId: string;
    dispatchId: string;
    originMunicipalityId: string;
    actorUserId: string;
    closedAt: Date;
  },
): Promise<void>;
~~~

`createAssistanceRequests` must:

1. validate UUIDs, deduplicate one or two recipient IDs, validate resource quantities, and trim notes to 500 characters;
2. lock the active dispatch/report and require its municipality to equal `requesterMunicipalityId`;
3. lock active observer rows using `observer_municipality_id = any($n::uuid[])`;
4. reject any recipient not present in those rows with `UNSELECTED_ASSISTANCE_RECIPIENT`;
5. insert one request per observer with `on conflict (dispatch_id, recipient_municipality_id) where status in ('REQUESTED','ACCEPTED','PARTIALLY_ACCEPTED') do nothing returning id`, then load and return the existing open row when the insert reports no row;
6. notify the addressed municipality and Provincial BFP with `ASSISTANCE_REQUESTED`;
7. write `ASSISTANCE_REQUESTED` audit rows.

`transitionAssistanceRequest` must lock the request and joined observer/report. Require the recipient municipality for `ACCEPT`, `PARTIAL_ACCEPT`, and `REJECT`; require the requester municipality for `CANCEL`. Apply `validateAssistanceTransition`, update exactly once, and return the existing row when a retry repeats the already-committed state and quantities. Notify the origin and Provincial BFP with the matching event and write the matching audit row.

This repeated-state comparison is the idempotent retry path. The row-level FOR UPDATE lock must remain held through validation, update, notification, and audit insertion so two concurrent responses cannot both commit.

`closeIncidentAssistance` must update `ACCEPTED` and `PARTIALLY_ACCEPTED` to `COMPLETED`, update unanswered `REQUESTED` rows to `CANCELLED`, write one audit row per changed request, and create deduplicated origin/recipient/provincial notifications.

Use these dedupe-key formats:

Use these action targets:

- assistance-request notifications sent to the recipient municipality: "/municipal-bfp/active-incidents?incident=<fireReportId>";
- acceptance, partial-acceptance, rejection, and cancellation notifications sent to the origin: "/municipal-bfp/active-incidents?incident=<fireReportId>";
- every assistance lifecycle notification sent to Provincial BFP: "/provincial-bfp/assistance-requests?request=<requestId>".

~~~text
assistance:<requestId>:requested
assistance:<requestId>:accepted
assistance:<requestId>:partially-accepted
assistance:<requestId>:rejected
assistance:<requestId>:cancelled
assistance:<requestId>:completed
~~~

- [ ] **Step 5: Run assistance and TypeScript checks**

Run:

~~~powershell
node --test tests/intermunicipality-assistance.test.mjs
npx tsc --noEmit
~~~

Expected: the assistance test passes and TypeScript exits 0.

- [ ] **Step 6: Commit the assistance domain**

~~~powershell
git add lib/intermunicipality/assistance-state.ts lib/intermunicipality/assistance.ts tests/intermunicipality-assistance.test.mjs
git commit -m "feat(coordination): add backup request workflow"
~~~

---

### Task 4: Integrate observers with both dispatch paths and resolution

**Files:**
- Modify: `lib/municipal-bfp/dispatch.ts`
- Modify: `lib/municipal-bfp/phone-incidents.ts`
- Create: `tests/intermunicipality-dispatch-integration.test.mjs`
- Modify: `tests/station-team-dispatch-service.test.mjs`
- Modify: `tests/phone-call-incident-service.test.mjs`
- Modify: `tests/municipal-incident-resolution.test.mjs`

**Interfaces:**
- Consumes: `createNearbyIncidentObservers`, `closeIncidentAssistance`, and `endIncidentObservers`.
- Produces: observer snapshots in the same transaction as app-report and phone-call dispatches; completed assistance and ended observer access in the resolution transaction.

- [ ] **Step 1: Write the failing integration contract test**

Create `tests/intermunicipality-dispatch-integration.test.mjs`:

~~~js
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const source = (path) => readFileSync(join(process.cwd(), path), "utf8");

test("both dispatch transactions create nearby observers after assignment", () => {
  for (const path of [
    "lib/municipal-bfp/dispatch.ts",
    "lib/municipal-bfp/phone-incidents.ts",
  ]) {
    const service = source(path);
    assert.match(service, /createNearbyIncidentObservers/);
    assert.match(service, /latitude/);
    assert.match(service, /longitude/);
    assert.match(service, /withTransaction/);
  }
});

test("municipal resolution closes assistance before ending observer access", () => {
  const service = source("lib/municipal-bfp/dispatch.ts");
  const closeIndex = service.indexOf("closeIncidentAssistance");
  const endIndex = service.indexOf("endIncidentObservers");
  assert.ok(closeIndex >= 0);
  assert.ok(endIndex > closeIndex);
});
~~~

- [ ] **Step 2: Run the integration test and confirm it fails**

Run:

~~~powershell
node --test tests/intermunicipality-dispatch-integration.test.mjs
~~~

Expected: FAIL because the dispatch services do not call `createNearbyIncidentObservers`.

- [ ] **Step 3: Extend the resident/app dispatch transaction**

In `dispatchIncidentToStations`, add `fr.latitude::float as latitude` and `fr.longitude::float as longitude` to the locked report query. After the dispatch, station, recipient, report-status, and status-history writes, call:

~~~ts
const nearbySelection = await createNearbyIncidentObservers(client, {
  fireReportId: input.fireReportId,
  dispatchId,
  originMunicipalityId: input.municipalityId,
  originMunicipalityName: input.municipalityName,
  actorUserId: input.actorUserId,
  referenceNumber: report.reference_number,
  barangay: report.barangay,
  latitude: report.latitude,
  longitude: report.longitude,
  createdAt: now,
});
~~~

Include these fields in the returned dispatch result:

~~~ts
nearbyObservers: nearbySelection.observers,
nearbySelectionDegraded: nearbySelection.degraded,
~~~

Do not add observer user IDs to `sendDispatchPush`; observers receive the in-app events defined by the specification, while field-dispatch FCM remains scoped to assigned responders and current provincial recipients.

- [ ] **Step 4: Extend the phone-call dispatch transaction**

After creating its dispatch, dispatch station, recipients, and status history, call:

~~~ts
const nearbySelection = await createNearbyIncidentObservers(client, {
  fireReportId,
  dispatchId,
  originMunicipalityId: scope.municipalityId,
  originMunicipalityName: scope.municipalityName,
  actorUserId: scope.actorUserId,
  referenceNumber: reference,
  barangay: barangay.name,
  latitude: input.latitude,
  longitude: input.longitude,
  createdAt: now,
});
~~~

Return `nearbySelection.observers` and `nearbySelection.degraded` inside the transaction result for logging and API visibility, without adding observer accounts to responder FCM delivery.

- [ ] **Step 5: Extend municipal resolution atomically**

Add `dispatch_id` to the locked resolution query by joining the active `incident_dispatches` row. Before marking the dispatch completed, call:

~~~ts
await closeIncidentAssistance(client, {
  fireReportId: input.fireReportId,
  dispatchId: row.dispatch_id,
  originMunicipalityId: input.municipalityId,
  actorUserId: input.actorUserId,
  closedAt: now,
});
await endIncidentObservers(client, {
  fireReportId: input.fireReportId,
  dispatchId: row.dispatch_id,
  originMunicipalityId: input.municipalityId,
  actorUserId: input.actorUserId,
  endedAt: now,
});
~~~

If no active dispatch ID exists, preserve the existing valid non-dispatch resolution behavior and skip both calls.

- [ ] **Step 6: Update existing dispatch and resolution assertions**

Add assertions to the existing tests:

~~~js
assert.match(service, /createNearbyIncidentObservers/);
assert.match(service, /nearbySelectionDegraded/);
assert.match(service, /closeIncidentAssistance/);
assert.match(service, /endIncidentObservers/);
~~~

Place dispatch assertions in station-team and phone-call service tests. Place lifecycle assertions in the municipal-resolution test.

- [ ] **Step 7: Run all dispatch-focused checks**

Run:

~~~powershell
node --test tests/intermunicipality-dispatch-integration.test.mjs tests/station-team-dispatch-service.test.mjs tests/phone-call-incident-service.test.mjs tests/municipal-incident-resolution.test.mjs
npx tsc --noEmit
~~~

Expected: all listed tests PASS and TypeScript exits 0.

- [ ] **Step 8: Commit dispatch integration**

~~~powershell
git add lib/municipal-bfp/dispatch.ts lib/municipal-bfp/phone-incidents.ts tests/intermunicipality-dispatch-integration.test.mjs tests/station-team-dispatch-service.test.mjs tests/phone-call-incident-service.test.mjs tests/municipal-incident-resolution.test.mjs
git commit -m "feat(coordination): activate nearby monitoring on dispatch"
~~~

---

### Task 5: Add privacy-safe municipal incident access

**Files:**
- Create: `lib/intermunicipality/incident-access.ts`
- Create: `tests/intermunicipality-access.test.mjs`
- Modify: `app/api/municipal-bfp/incidents/route.ts`
- Modify: `app/api/municipal-bfp/incidents/[id]/route.ts`
- Modify: `tests/municipal-incident-access.test.mjs`

**Interfaces:**
- Consumes: signed-in municipal identity, active observer rows, existing origin-owned report queries, dispatch status, and assistance summaries.
- Produces: `resolveMunicipalIncidentAccess`, `listScopedMunicipalIncidents`, `getObserverIncidentDetail`, and `getIncidentCoordinationContext`.

- [ ] **Step 1: Write the failing authorization and privacy test**

Create `tests/intermunicipality-access.test.mjs`:

~~~js
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const source = (path) => readFileSync(join(process.cwd(), path), "utf8");

test("municipal incident access resolves origin and selected observer scopes", () => {
  const service = source("lib/intermunicipality/incident-access.ts");
  assert.match(service, /export async function resolveMunicipalIncidentAccess/);
  assert.match(service, /origin_municipality_id = \$[0-9]+/i);
  assert.match(service, /observer_municipality_id = \$[0-9]+/i);
  assert.match(service, /observer\.status = 'ACTIVE'/i);
  assert.match(service, /"ORIGIN"/);
  assert.match(service, /"OBSERVER"/);
});

test("observer detail query never selects protected reporter fields", () => {
  const service = source("lib/intermunicipality/incident-access.ts");
  const start = service.indexOf("const OBSERVER_INCIDENT_QUERY");
  const end = service.indexOf("const COORDINATION_CONTEXT_QUERY");
  assert.ok(start >= 0 && end > start);
  const observerQuery = service.slice(start, end);
  for (const forbidden of [
    "resident_profiles",
    "resident_addresses",
    "caller_name",
    "caller_phone",
    "reporter_name_snapshot",
    "reporter_phone_snapshot",
    "reporter_ip_address",
    "reporter_device_summary",
    "fire_report_photos",
  ]) {
    assert.doesNotMatch(observerQuery, new RegExp(forbidden, "i"));
  }
});

test("municipal APIs delegate scope decisions to the access service", () => {
  const queue = source("app/api/municipal-bfp/incidents/route.ts");
  const detail = source("app/api/municipal-bfp/incidents/[id]/route.ts");
  assert.match(queue, /listScopedMunicipalIncidents/);
  assert.match(detail, /resolveMunicipalIncidentAccess/);
  assert.match(detail, /getObserverIncidentDetail/);
  assert.match(detail, /getIncidentCoordinationContext/);
});
~~~

- [ ] **Step 2: Run the access test and confirm the missing-service failure**

Run:

~~~powershell
node --test tests/intermunicipality-access.test.mjs
~~~

Expected: FAIL with `ENOENT` for `lib/intermunicipality/incident-access.ts`.

- [ ] **Step 3: Implement access resolution and the scoped queue**

Create `lib/intermunicipality/incident-access.ts`. Export:

~~~ts
export type ScopedMunicipalIncident = {
  id: string;
  referenceNumber: string;
  reportSource: "ALAB_APP" | "PHONE_CALL";
  residentName: string | null;
  fireType: string;
  status: string;
  barangay: string | null;
  landmark: string | null;
  submittedAt: string;
  latitude: number;
  longitude: number;
  calculatedSeverity: string | null;
  accessScope: "ORIGIN" | "OBSERVER";
  originMunicipality: string;
};

export type ObserverIncidentDetail = {
  id: string;
  referenceNumber: string;
  status: string;
  fireType: string;
  description: string | null;
  landmark: string | null;
  latitude: number;
  longitude: number;
  submittedAt: string;
  responseStartedAt: string | null;
  respondingStationName: string | null;
  reportSource: "ALAB_APP" | "PHONE_CALL";
  structureMaterial: string | null;
  houseDensity: string | null;
  routeAccessibility: string | null;
  calculatedSeverity: string | null;
  severityScore: number | null;
  severityFactors: string[] | null;
  barangay: string | null;
  municipality: string;
  accessScope: "OBSERVER";
};

export async function resolveMunicipalIncidentAccess(
  fireReportId: string,
  municipalityId: string,
): Promise<"ORIGIN" | "OBSERVER" | null>;

export async function listScopedMunicipalIncidents(
  municipalityId: string,
  includeHistory: boolean,
): Promise<ScopedMunicipalIncident[]>;

export async function getObserverIncidentDetail(
  fireReportId: string,
  municipalityId: string,
): Promise<ObserverIncidentDetail | null>;

export async function getIncidentCoordinationContext(
  fireReportId: string,
  municipalityId: string,
  accessScope: "ORIGIN" | "OBSERVER",
): Promise<{
  observers: NearbyObserver[];
  assistanceRequests: AssistanceRequestSummary[];
}>;
~~~

Use one `UNION ALL` queue query:

~~~sql
select fr.id,
       fr.reference_number as "referenceNumber",
       fr.report_source as "reportSource",
       coalesce(fr.caller_name, fr.reporter_name_snapshot) as "residentName",
       fr.fire_type as "fireType",
       fr.status,
       barangay.name as barangay,
       fr.nearest_landmark as landmark,
       fr.submitted_at as "submittedAt",
       fr.latitude::float as latitude,
       fr.longitude::float as longitude,
       fr.calculated_severity as "calculatedSeverity",
       'ORIGIN'::text as "accessScope",
       origin.name as "originMunicipality"
  from fire_reports fr
  join municipalities origin on origin.id = fr.municipality_id
  left join barangays barangay on barangay.id = fr.barangay_id
 where fr.municipality_id = $1
union all
select fr.id,
       fr.reference_number as "referenceNumber",
       fr.report_source as "reportSource",
       null::text as "residentName",
       fr.fire_type as "fireType",
       fr.status,
       barangay.name as barangay,
       fr.nearest_landmark as landmark,
       fr.submitted_at as "submittedAt",
       fr.latitude::float as latitude,
       fr.longitude::float as longitude,
       fr.calculated_severity as "calculatedSeverity",
       'OBSERVER'::text as "accessScope",
       origin.name as "originMunicipality"
  from incident_municipal_observers observer
  join fire_reports fr on fr.id = observer.fire_report_id
  join municipalities origin on origin.id = observer.origin_municipality_id
  left join barangays barangay on barangay.id = fr.barangay_id
 where observer.observer_municipality_id = $1
   and observer.status = 'ACTIVE'
~~~

Apply the existing terminal-status filter to both branches unless `includeHistory` is true. Even when history is requested, do not return ended observer rows.

- [ ] **Step 4: Implement a strict observer detail projection**

Declare `const OBSERVER_INCIDENT_QUERY` and `const COORDINATION_CONTEXT_QUERY` as separate strings so the privacy test can isolate the observer projection. The observer query may select only:

~~~sql
select fr.id,
       fr.reference_number as "referenceNumber",
       fr.status,
       fr.fire_type as "fireType",
       fr.description,
       fr.nearest_landmark as landmark,
       fr.latitude::float as latitude,
       fr.longitude::float as longitude,
       fr.submitted_at as "submittedAt",
       fr.response_started_at as "responseStartedAt",
       fr.responding_station_name as "respondingStationName",
       fr.report_source as "reportSource",
       fr.structure_material as "structureMaterial",
       fr.house_density as "houseDensity",
       fr.route_accessibility as "routeAccessibility",
       fr.calculated_severity as "calculatedSeverity",
       fr.severity_score as "severityScore",
       fr.severity_factors as "severityFactors",
       barangay.name as barangay,
       origin.name as municipality,
       'OBSERVER'::text as "accessScope"
  from incident_municipal_observers observer
  join fire_reports fr on fr.id = observer.fire_report_id
  join municipalities origin on origin.id = observer.origin_municipality_id
  left join barangays barangay on barangay.id = fr.barangay_id
 where fr.id = $1
   and observer.observer_municipality_id = $2
   and observer.status = 'ACTIVE'
 limit 1
~~~

Load public-safe status history and assigned-unit counts separately. Do not load photos or previous resident reports for an observer. `getIncidentCoordinationContext` returns both observers to the origin, but filters assistance rows to the signed observer municipality when `accessScope === "OBSERVER"`.

- [ ] **Step 5: Refactor both municipal incident APIs**

In the queue route, replace inline SQL with:

~~~ts
const incidents = await listScopedMunicipalIncidents(
  identity.municipalityId,
  includeHistory,
);
return NextResponse.json({
  municipality: identity.municipalityName,
  incidents,
});
~~~

In the detail route:

1. resolve access before loading any incident data;
2. retain the existing full origin-only query and photo/history behavior for `ORIGIN`;
3. call `getObserverIncidentDetail` for `OBSERVER`;
4. attach `getIncidentCoordinationContext` to both projections;
5. return 404 when neither scope exists;
6. return `Cache-Control: private, no-store`.

The response shape must include:

~~~ts
{
  incident: {
    ...incident,
    accessScope,
    nearbyObservers: coordination.observers,
    assistanceRequests: coordination.assistanceRequests,
  }
}
~~~

- [ ] **Step 6: Update the existing municipal-access contract**

Keep the current origin-query assertions in `tests/municipal-incident-access.test.mjs` and add:

~~~js
assert.match(queue, /listScopedMunicipalIncidents/);
assert.match(detail, /resolveMunicipalIncidentAccess/);
assert.match(detail, /getObserverIncidentDetail/);
assert.match(detail, /Cache-Control/);
~~~

- [ ] **Step 7: Run access and regression checks**

Run:

~~~powershell
node --test tests/intermunicipality-access.test.mjs tests/municipal-incident-access.test.mjs
npx tsc --noEmit
~~~

Expected: both test files PASS and TypeScript exits 0.

- [ ] **Step 8: Commit scoped municipal access**

~~~powershell
git add lib/intermunicipality/incident-access.ts tests/intermunicipality-access.test.mjs app/api/municipal-bfp/incidents/route.ts "app/api/municipal-bfp/incidents/[id]/route.ts" tests/municipal-incident-access.test.mjs
git commit -m "feat(coordination): expose privacy-safe nearby incidents"
~~~

---

### Task 6: Expose backup APIs and municipal coordination UI

**Files:**
- Create: `app/api/municipal-bfp/incidents/[id]/assistance-requests/route.ts`
- Create: `app/api/municipal-bfp/assistance-requests/[requestId]/route.ts`
- Create: `app/_components/intermunicipality-coordination-panel.tsx`
- Create: `tests/intermunicipality-municipal-ui.test.mjs`
- Modify: `app/_components/use-municipal-incident-feed.ts`
- Modify: `app/municipal-bfp/active-incidents/page.tsx`
- Modify: `app/_components/municipal-incident-detail.tsx`

**Interfaces:**
- Consumes: scoped incident DTOs, `createAssistanceRequests`, `transitionAssistanceRequest`, and `requireMunicipalAdmin`.
- Produces: origin-only request creation, recipient-only response, origin cancellation, query-string incident opening, and role-correct coordination controls.

- [ ] **Step 1: Write the failing route and UI contract test**

Create `tests/intermunicipality-municipal-ui.test.mjs`:

~~~js
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const source = (path) => readFileSync(join(root, path), "utf8");

test("municipal assistance routes require administrators and derive municipality from session", () => {
  const createPath = "app/api/municipal-bfp/incidents/[id]/assistance-requests/route.ts";
  const updatePath = "app/api/municipal-bfp/assistance-requests/[requestId]/route.ts";
  assert.equal(existsSync(join(root, createPath)), true);
  assert.equal(existsSync(join(root, updatePath)), true);
  const combined = source(createPath) + source(updatePath);
  assert.match(combined, /requireMunicipalAdmin/);
  assert.match(combined, /createAssistanceRequests/);
  assert.match(combined, /transitionAssistanceRequest/);
  assert.doesNotMatch(combined, /body\.(actorUserId|requesterMunicipalityId|actorMunicipalityId)/);
});

test("municipal UI distinguishes owned and nearby incidents", () => {
  const feed = source("app/_components/use-municipal-incident-feed.ts");
  const page = source("app/municipal-bfp/active-incidents/page.tsx");
  const detail = source("app/_components/municipal-incident-detail.tsx");
  const panel = source("app/_components/intermunicipality-coordination-panel.tsx");
  assert.match(feed, /accessScope: "ORIGIN" \| "OBSERVER"/);
  assert.match(page, /Nearby incident/);
  assert.match(page, /searchParams\.get\("incident"\)/);
  assert.match(detail, /IntermunicipalityCoordinationPanel/);
  assert.match(detail, /incident\.accessScope === "ORIGIN"/);
  assert.match(panel, /Request Backup/);
  assert.match(panel, /Monitoring only/);
  assert.match(panel, /PARTIAL_ACCEPT/);
});
~~~

- [ ] **Step 2: Run the test and confirm missing routes/components**

Run:

~~~powershell
node --test tests/intermunicipality-municipal-ui.test.mjs
~~~

Expected: FAIL because the assistance routes and coordination panel do not exist.

- [ ] **Step 3: Add origin-only request creation route**

Implement `POST /api/municipal-bfp/incidents/[id]/assistance-requests` with `requireMunicipalAdmin`. Parse only:

~~~ts
type RequestBody = {
  recipientMunicipalityIds?: unknown;
  requestedFiretrucks?: unknown;
  requestedPersonnel?: unknown;
  requestNote?: unknown;
};
~~~

Call:

~~~ts
const requests = await createAssistanceRequests({
  fireReportId: id,
  requesterMunicipalityId: identity.municipalityId,
  actorUserId: identity.userId,
  recipientMunicipalityIds,
  requestedFiretrucks,
  requestedPersonnel,
  requestNote,
});
return NextResponse.json({ requests }, { status: 201 });
~~~

Map errors exactly:

- `INVALID_ASSISTANCE_INPUT` and `ASSISTANCE_RESOURCES_REQUIRED` â†’ 400.
- `INCIDENT_NOT_FOUND` â†’ 404.
- `UNSELECTED_ASSISTANCE_RECIPIENT` â†’ 403.
- `INCIDENT_NOT_ACTIVE` and `ASSISTANCE_ALREADY_OPEN` â†’ 409.
- unexpected errors â†’ 500 with a server log containing the incident ID.

- [ ] **Step 4: Add recipient-response and origin-cancellation route**

Implement `PATCH /api/municipal-bfp/assistance-requests/[requestId]` with `requireMunicipalAdmin`. Accept:

~~~ts
type ResponseBody = {
  action?: "ACCEPT" | "PARTIAL_ACCEPT" | "REJECT" | "CANCEL";
  offeredFiretrucks?: number;
  offeredPersonnel?: number;
  responseNote?: string;
};
~~~

Call `transitionAssistanceRequest` with `identity.municipalityId` and `identity.userId`; never accept either value from the body. Map invalid input to 400, hidden/not-found records to 404, actor-scope violations to 403, state conflicts to 409, and unexpected failures to 500.

- [ ] **Step 5: Extend the municipal incident feed**

Add these fields to `MunicipalIncident`:

~~~ts
accessScope: "ORIGIN" | "OBSERVER";
originMunicipality: string;
~~~

Keep the five-second interval unchanged. Include `accessScope` and `originMunicipality` in the session cache. On the active page:

- read `incident` from `useSearchParams()` and open that row after it appears in the feed;
- move the hook-using body into an inner component and render it inside React `Suspense` so the Next.js production build can prerender the page safely;
- label observer rows `Nearby incident Â· <originMunicipality>`;
- disable resident-name search for rows whose `residentName` is null;
- add `OWNED` and `NEARBY` filters mapped to `accessScope`;
- preserve the existing loading, retry, and manual refresh behavior.

- [ ] **Step 6: Build the focused coordination panel**

Create `IntermunicipalityCoordinationPanel` with:

~~~ts
type Props = {
  incidentId: string;
  accessScope: "ORIGIN" | "OBSERVER";
  observers: NearbyObserver[];
  assistanceRequests: AssistanceRequestSummary[];
  onChanged: () => Promise<void> | void;
};

export function IntermunicipalityCoordinationPanel(props: Props): React.ReactElement;
~~~

For `ORIGIN`:

- show exactly the persisted observers, station name, rounded kilometer distance, and assistance state;
- open a request form with checkboxes for either or both observers;
- require requested firetrucks or personnel to be positive;
- send one POST request and refresh detail after success;
- show Cancel only for `REQUESTED`.

For `OBSERVER`:

- show `Monitoring onlyâ€”no assistance requested` when no request is addressed to the signed municipality;
- show Accept, Partially Accept, and Reject only for `REQUESTED`;
- require exact requested quantities for Accept;
- require a positive quantity below at least one requested value for Partially Accept;
- send one PATCH request and refresh detail after success;
- render terminal states read-only.

Use a live region for success/error messages, native labels for every quantity field, and disabled controls while a request is in flight.

- [ ] **Step 7: Enforce origin/observer rendering in incident detail**

Extend the `Incident` type with `accessScope`, `nearbyObservers`, and `assistanceRequests`. Mount the new panel below the incident hero.

Define `const canControlIncident = incident.accessScope === "ORIGIN";` after loading the incident. Use that exact predicate to wrap the existing reporter-information card, contact links, full address, IP/device fields, photos, previous reports, building-density recalculation, dispatch button, and resolution button.

For an observer, render the map, public-safe location, severity, status history, assigned-unit summary, and coordination panel. Never render the reporter, phone, email, private address, IP/device, photos, previous reports, dispatch, density-recalculation, or resolution controls.

- [ ] **Step 8: Run municipal UI, access, and TypeScript checks**

Run:

~~~powershell
node --test tests/intermunicipality-municipal-ui.test.mjs tests/intermunicipality-access.test.mjs tests/municipal-incident-access.test.mjs tests/municipal-incident-dispatch-ui.test.mjs
npx tsc --noEmit
~~~

Expected: all listed tests PASS and TypeScript exits 0.

- [ ] **Step 9: Commit municipal coordination**

~~~powershell
git add "app/api/municipal-bfp/incidents/[id]/assistance-requests/route.ts" "app/api/municipal-bfp/assistance-requests/[requestId]/route.ts" app/_components/intermunicipality-coordination-panel.tsx tests/intermunicipality-municipal-ui.test.mjs app/_components/use-municipal-incident-feed.ts app/municipal-bfp/active-incidents/page.tsx app/_components/municipal-incident-detail.tsx
git commit -m "feat(coordination): add municipal backup controls"
~~~

---

### Task 7: Add Provincial BFP live coordination APIs

**Files:**
- Create: `lib/provincial-bfp/auth.ts`
- Create: `lib/intermunicipality/provincial.ts`
- Create: `app/api/provincial-bfp/incidents/route.ts`
- Create: `app/api/provincial-bfp/incidents/[id]/route.ts`
- Create: `app/api/provincial-bfp/assistance-requests/route.ts`
- Create: `tests/intermunicipality-provincial.test.mjs`

**Interfaces:**
- Consumes: Provincial BFP session cookie, province-wide fire reports, observer snapshots, and assistance requests.
- Produces: `requireProvincialBfp`, `listProvincialCoordinationIncidents`, `getProvincialCoordinationIncident`, and `listProvincialAssistanceRequests`.

- [ ] **Step 1: Write the failing provincial server test**

Create `tests/intermunicipality-provincial.test.mjs`:

~~~js
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const source = (path) => readFileSync(join(root, path), "utf8");

test("provincial routes require the signed provincial identity", () => {
  const paths = [
    "app/api/provincial-bfp/incidents/route.ts",
    "app/api/provincial-bfp/incidents/[id]/route.ts",
    "app/api/provincial-bfp/assistance-requests/route.ts",
  ];
  for (const path of paths) {
    assert.equal(existsSync(join(root, path)), true, path + " is missing");
    assert.match(source(path), /requireProvincialBfp/);
  }
});

test("provincial read model joins observer and assistance lifecycle data", () => {
  const service = source("lib/intermunicipality/provincial.ts");
  assert.match(service, /incident_municipal_observers/);
  assert.match(service, /intermunicipal_assistance_requests/);
  assert.match(service, /listProvincialCoordinationIncidents/);
  assert.match(service, /getProvincialCoordinationIncident/);
  assert.match(service, /listProvincialAssistanceRequests/);
});

test("provincial coordination APIs are read-only", () => {
  const combined = [
    "app/api/provincial-bfp/incidents/route.ts",
    "app/api/provincial-bfp/incidents/[id]/route.ts",
    "app/api/provincial-bfp/assistance-requests/route.ts",
  ].map(source).join("\n");
  assert.match(combined, /export async function GET/);
  assert.doesNotMatch(combined, /export async function (POST|PATCH|DELETE)/);
});
~~~

- [ ] **Step 2: Run the test and confirm missing routes**

Run:

~~~powershell
node --test tests/intermunicipality-provincial.test.mjs
~~~

Expected: FAIL because the provincial incident and assistance APIs do not exist.

- [ ] **Step 3: Create reusable provincial authorization**

Create `lib/provincial-bfp/auth.ts` mirroring the municipal helper:

~~~ts
import { NextRequest, NextResponse } from "next/server";

import { getBfpIdentity, type BfpIdentity } from "../auth/bfp-accounts";
import { bfpSessionCookieName, verifyBfpSession } from "../auth/session";

export type ProvincialBfpIdentity = BfpIdentity & {
  role: "PROVINCIAL_BFP";
};

export async function requireProvincialBfp(
  request: NextRequest,
): Promise<ProvincialBfpIdentity | NextResponse> {
  const session = verifyBfpSession(
    request.cookies.get(bfpSessionCookieName("PROVINCIAL_BFP"))?.value,
  );
  if (!session || session.role !== "PROVINCIAL_BFP") {
    return NextResponse.json(
      { error: "Provincial BFP sign-in is required." },
      { status: 401 },
    );
  }
  const identity = await getBfpIdentity(session.userId);
  if (!identity || identity.role !== "PROVINCIAL_BFP") {
    return NextResponse.json(
      { error: "Your provincial access is no longer active." },
      { status: 403 },
    );
  }
  return identity as ProvincialBfpIdentity;
}

export function isProvincialAuthorizationResponse(
  value: ProvincialBfpIdentity | NextResponse,
): value is NextResponse {
  return value instanceof NextResponse;
}
~~~

- [ ] **Step 4: Implement the provincial read model**

Create `lib/intermunicipality/provincial.ts` with:

~~~ts
export type ProvincialIncidentSummary = {
  id: string;
  referenceNumber: string;
  originMunicipality: string;
  barangay: string | null;
  fireType: string;
  calculatedSeverity: string | null;
  status: string;
  submittedAt: string;
  dispatchedAt: string | null;
  assignedStationCount: number;
  observers: NearbyObserver[];
  openAssistanceCount: number;
  nearbySelectionDegraded: boolean;
};

export type ProvincialIncidentDetail = ProvincialIncidentSummary & {
  latitude: number;
  longitude: number;
  landmark: string | null;
  assignedRecipientCount: number;
  assistanceRequests: ProvincialAssistanceRequest[];
  coordinationEvents: Array<{
    eventType: string;
    recipientMunicipality: string | null;
    oldStatus: string | null;
    newStatus: string | null;
    createdAt: string;
  }>;
};

export type ProvincialAssistanceRequest = AssistanceRequestSummary & {
  fireReportId: string;
  referenceNumber: string;
  requesterMunicipalityId: string;
  requesterMunicipalityName: string;
};

export async function listProvincialCoordinationIncidents(
  includeHistory: boolean,
): Promise<ProvincialIncidentSummary[]>;

export async function getProvincialCoordinationIncident(
  fireReportId: string,
): Promise<ProvincialIncidentDetail | null>;

export async function listProvincialAssistanceRequests(
  includeClosed: boolean,
): Promise<ProvincialAssistanceRequest[]>;
~~~

The incident list must return real report reference, municipality, barangay, fire type, severity, status, report/dispatch times, assigned station count, selected observers, open-assistance count, and degraded-selection state. The detail adds observer distance snapshots, every assistance request and response, public-safe dispatch status, and coordination audit timestamps.

The assistance list joins requester and recipient municipality names and sorts open requests before terminal requests, then by `requested_at desc`. Neither service mutates data.

- [ ] **Step 5: Implement three read-only APIs**

Each route calls `requireProvincialBfp`, returns 401/403 from the helper, validates UUIDs where applicable, and sends:

~~~ts
{
  headers: {
    "Cache-Control": "private, no-store",
  },
}
~~~

Query behavior:

- `GET /api/provincial-bfp/incidents?scope=all` includes history; the default excludes terminal incidents.
- `GET /api/provincial-bfp/incidents/[id]` returns 404 for a missing incident.
- `GET /api/provincial-bfp/assistance-requests?scope=all` includes terminal requests; the default returns `REQUESTED`, `ACCEPTED`, and `PARTIALLY_ACCEPTED`.

- [ ] **Step 6: Run provincial server and TypeScript checks**

Run:

~~~powershell
node --test tests/intermunicipality-provincial.test.mjs tests/web-role-routes.test.mjs
npx tsc --noEmit
~~~

Expected: both test files PASS and TypeScript exits 0.

- [ ] **Step 7: Commit provincial APIs**

~~~powershell
git add lib/provincial-bfp/auth.ts lib/intermunicipality/provincial.ts app/api/provincial-bfp/incidents/route.ts "app/api/provincial-bfp/incidents/[id]/route.ts" app/api/provincial-bfp/assistance-requests/route.ts tests/intermunicipality-provincial.test.mjs
git commit -m "feat(coordination): expose provincial oversight APIs"
~~~

---

### Task 8: Replace provincial sample data with live monitoring

**Files:**
- Create: `app/_components/use-provincial-incident-feed.ts`
- Create: `app/_components/use-provincial-assistance-feed.ts`
- Modify: `app/provincial-bfp/incidents/page.tsx`
- Modify: `app/provincial-bfp/assistance-requests/page.tsx`
- Modify: `app/_components/provincial-bfp-dashboard.tsx`
- Modify: `tests/intermunicipality-provincial.test.mjs`

**Interfaces:**
- Consumes: the three provincial GET APIs and existing notification links.
- Produces: five-second live provincial incidents, live assistance oversight, notification deep-link opening, and real dashboard counts.

- [ ] **Step 1: Extend the failing provincial test for client behavior**

Append:

~~~js
test("provincial pages use live five-second feeds and no sample incidents", () => {
  const incidentHook = source("app/_components/use-provincial-incident-feed.ts");
  const assistanceHook = source("app/_components/use-provincial-assistance-feed.ts");
  const incidentsPage = source("app/provincial-bfp/incidents/page.tsx");
  const assistancePage = source("app/provincial-bfp/assistance-requests/page.tsx");
  const dashboard = source("app/_components/provincial-bfp-dashboard.tsx");
  assert.match(incidentHook, /REFRESH_INTERVAL_MS = 5_000/);
  assert.match(assistanceHook, /REFRESH_INTERVAL_MS = 5_000/);
  assert.match(incidentHook, /visibilitychange/);
  assert.match(assistanceHook, /visibilitychange/);
  assert.match(incidentsPage, /useProvincialIncidentFeed/);
  assert.match(incidentsPage, /searchParams\.get\("incident"\)/);
  assert.match(assistancePage, /useProvincialAssistanceFeed/);
  assert.match(dashboard, /useProvincialIncidentFeed/);
  assert.match(dashboard, /useProvincialAssistanceFeed/);
  assert.doesNotMatch(incidentsPage, /const initialIncidents/);
  assert.doesNotMatch(assistancePage, /AID-2026-003/);
});
~~~

- [ ] **Step 2: Run the client test and confirm missing hooks**

Run:

~~~powershell
node --test tests/intermunicipality-provincial.test.mjs
~~~

Expected: FAIL with `ENOENT` for the provincial feed hooks.

- [ ] **Step 3: Create both five-second feed hooks**

Model the existing municipal hook. Each hook must:

- fetch immediately with `cache: "no-store"`;
- retain the last successful rows on a failed refresh;
- set a compact error without replacing the rows;
- poll every `5_000` milliseconds only while `document.visibilityState === "visible"`;
- refresh immediately on `visibilitychange` back to visible;
- expose `rows`, `loading`, `checking`, `error`, `lastCheckedAt`, and `refresh(manual?: boolean)`;
- clear its interval and listener on unmount.

Use these exported names:

~~~ts
export type ProvincialIncidentFeedState = {
  rows: ProvincialIncidentSummary[];
  loading: boolean;
  checking: boolean;
  error: string;
  lastCheckedAt: Date | null;
  refresh: (manual?: boolean) => Promise<void>;
};

export type ProvincialAssistanceFeedState = {
  rows: ProvincialAssistanceRequest[];
  loading: boolean;
  checking: boolean;
  error: string;
  lastCheckedAt: Date | null;
  refresh: (manual?: boolean) => Promise<void>;
};

export const REFRESH_INTERVAL_MS = 5_000;
export function useProvincialIncidentFeed(options?: {
  includeHistory?: boolean;
}): ProvincialIncidentFeedState;
export function useProvincialAssistanceFeed(options?: {
  includeClosed?: boolean;
}): ProvincialAssistanceFeedState;
~~~

- [ ] **Step 4: Connect the provincial incident page**

Remove `initialIncidents`. Populate KPI totals, filters, search, table rows, and selected-incident modal from `useProvincialIncidentFeed`.

Read `incident` with `useSearchParams()`; once the matching row arrives, open it and fetch `/api/provincial-bfp/incidents/<id>`. The modal must show:

Place the hook-using incident page body inside React `Suspense` with the existing page loader as its fallback so query-string deep links pass the Next.js production build.

- origin municipality and barangay;
- live incident/dispatch status;
- exactly the persisted observer selections or the degraded warning;
- distance snapshots;
- assistance request status and offered resources;
- request, response, and completion times.

Keep the existing responsive visual structure, but remove invented alarm levels, officers, casualty counts, apparatus, and water-supply values unless returned by the API.

- [ ] **Step 5: Connect the assistance oversight page**

Remove both sample cards. Render `useProvincialAssistanceFeed` rows with origin, recipient, incident reference, requested/offered quantities, status, notes, and timestamps. Add Open and All filters, manual refresh, loading skeleton, retained-data retry state, and `No inter-municipality assistance requests` empty state.

Read the "request" query parameter with useSearchParams(), wrap the hook-using body in React Suspense, and highlight and scroll to the matching request after the feed loads so Provincial BFP notification actions open the relevant record.

The page is read-only: it must not render accept, reject, cancel, dispatch, or override controls.

- [ ] **Step 6: Connect provincial dashboard summaries**

Use the two hooks with default active/open scope. Replace hardcoded active incident, mutual-aid, and recent incident values with:

~~~ts
const activeIncidentCount = incidents.length;
const openAssistanceCount = assistanceRequests.filter((request) =>
  ["REQUESTED", "ACCEPTED", "PARTIALLY_ACCEPTED"].includes(request.status)
).length;
~~~

Render at most the three newest incident rows. Preserve the municipal-readiness table until its separate data source is implemented; do not change unrelated readiness sample content in this task.

- [ ] **Step 7: Run provincial UI and notification tests**

Run:

~~~powershell
node --test tests/intermunicipality-provincial.test.mjs tests/notification-ui.test.mjs tests/account-notifications.test.mjs
npx tsc --noEmit
~~~

Expected: all listed tests PASS and TypeScript exits 0.

- [ ] **Step 8: Commit live provincial monitoring**

~~~powershell
git add app/_components/use-provincial-incident-feed.ts app/_components/use-provincial-assistance-feed.ts app/provincial-bfp/incidents/page.tsx app/provincial-bfp/assistance-requests/page.tsx app/_components/provincial-bfp-dashboard.tsx tests/intermunicipality-provincial.test.mjs
git commit -m "feat(coordination): add live provincial monitoring"
~~~

---

### Task 9: Verify the complete workflow and update system documentation

**Files:**
- Modify: `../../BFP_Fire_Response_System_Overview.md`
- Modify: `tests/intermunicipality-dispatch-integration.test.mjs`
- Modify: `tests/intermunicipality-access.test.mjs`
- Modify: `tests/intermunicipality-assistance.test.mjs`
- Modify: `tests/intermunicipality-provincial.test.mjs`

**Interfaces:**
- Consumes: every schema, service, route, and UI contract introduced in Tasks 1â€“8.
- Produces: one documented and regression-verified end-to-end flow.

- [ ] **Step 1: Add one cross-file end-to-end contract test**

Append to `tests/intermunicipality-dispatch-integration.test.mjs`:

~~~js
test("assigned incident connects selection, monitoring, backup, provincial oversight, and closure", () => {
  const files = {
    dispatch: source("lib/municipal-bfp/dispatch.ts"),
    observers: source("lib/intermunicipality/observers.ts"),
    assistance: source("lib/intermunicipality/assistance.ts"),
    access: source("lib/intermunicipality/incident-access.ts"),
    provincial: source("lib/intermunicipality/provincial.ts"),
  };
  assert.match(files.dispatch, /createNearbyIncidentObservers/);
  assert.match(files.observers, /NEARBY_INCIDENT_ASSIGNED/);
  assert.match(files.access, /observer_municipality_id/);
  assert.match(files.assistance, /ASSISTANCE_REQUESTED/);
  assert.match(files.provincial, /intermunicipal_assistance_requests/);
  assert.match(files.dispatch, /closeIncidentAssistance/);
  assert.match(files.dispatch, /endIncidentObservers/);
});
~~~

- [ ] **Step 2: Run the end-to-end contract test**

Run:

~~~powershell
node --test tests/intermunicipality-dispatch-integration.test.mjs
~~~

Expected: PASS.

- [ ] **Step 3: Update the system overview with the implemented rules**

In the Inter-Municipality Assistance and Notifications sections of `../../BFP_Fire_Response_System_Overview.md`, state:

~~~markdown
After the responsible Municipal BFP assigns a response team or firetruck,
ALAB automatically selects the two nearest external municipalities from the
incident GPS point and active BFP-station coordinates. Those municipalities
receive privacy-limited live monitoring access. They cannot dispatch resources
until the responsible municipality sends a backup request and they accept or
partially accept it. Provincial BFP receives the selection, request, response,
and completion events for province-wide oversight.
~~~

Also document the five-second visible-tab refresh and that selected observers are persisted for the life of the dispatch.

- [ ] **Step 4: Run every focused inter-municipality test**

Run:

~~~powershell
node --test tests/intermunicipality-*.test.mjs
~~~

Expected: all inter-municipality tests PASS.

- [ ] **Step 5: Run related regression suites**

Run:

~~~powershell
node --test tests/account-notifications.test.mjs tests/notification-ui.test.mjs tests/station-team-dispatch-schema.test.mjs tests/station-team-dispatch-service.test.mjs tests/phone-call-incident-service.test.mjs tests/municipal-incident-access.test.mjs tests/municipal-incident-dispatch-ui.test.mjs tests/municipal-incident-resolution.test.mjs tests/mobile-station-dispatch.test.mjs tests/mobile-fcm-dispatch.test.mjs tests/mobile-dispatch-resolution.test.mjs tests/web-role-routes.test.mjs
~~~

Expected: all related regression tests PASS.

- [ ] **Step 6: Run the complete test, type, lint, and production-build gates**

Run:

~~~powershell
npm test
npx tsc --noEmit
npm run lint
npm run build
~~~

Expected: all tests pass, TypeScript and ESLint exit 0, and Next.js reports a successful production build.

- [ ] **Step 7: Review the final diff for privacy and scope**

Run:

~~~powershell
git diff --check 37ab0ef..HEAD
git diff --stat 37ab0ef..HEAD
rg -n "residentName|caller_phone|reporter_phone_snapshot|reporter_ip_address|reporter_device_summary|fire_report_photos" lib/intermunicipality app/api/municipal-bfp
~~~

Expected:

- `git diff --check` produces no output.
- Observer SQL contains none of the protected columns.
- Any protected-field matches remain only inside the existing origin-owned incident query.
- No observer account is added to responder FCM recipients.

- [ ] **Step 8: Commit documentation and final test coverage**

~~~powershell
git add ../../BFP_Fire_Response_System_Overview.md tests/intermunicipality-dispatch-integration.test.mjs tests/intermunicipality-access.test.mjs tests/intermunicipality-assistance.test.mjs tests/intermunicipality-provincial.test.mjs
git commit -m "docs(coordination): document nearby municipal response flow"
~~~
