# Inter-Municipality Live Incident Coordination Design

**Date:** 2026-09-06
**Status:** Approved for implementation planning
**Scope:** Municipal BFP and Provincial BFP web portals in Antique

## Goal

After the responsible Municipal BFP assigns a response team or firetruck to an incident, automatically give exactly two nearby municipalities and Provincial BFP near-real-time, privacy-limited visibility of that incident. The responsible municipality may then request backup from either or both selected municipalities, while Provincial BFP monitors the complete request and response lifecycle.

The feature is decision support only. The originating Municipal BFP remains incident commander, and nearby municipalities cannot dispatch resources into the incident until they receive and accept an explicit backup request.

## Agreed Operational Rules

1. A newly submitted report remains visible only to its responsible municipality and Provincial BFP.
2. Inter-municipality visibility begins only when the responsible municipality creates the active dispatch by assigning a BFP team or firetruck.
3. The system selects exactly two other municipalities using the incident's exact GPS coordinates and active municipal-station coordinates.
4. The responsible municipality is always excluded from the nearby-municipality selection.
5. For each candidate municipality, the system uses the distance to its nearest active station. It ranks municipalities by straight-line distance, then by municipality ID as a deterministic tie-breaker.
6. The two selected municipalities receive a limited live incident view and an in-app notification. Provincial BFP receives an in-app notification and retains its province-wide view.
7. The selected municipalities are observers only until the origin sends a backup request.
8. The origin may request backup from either selected municipality or from both. A municipality that was not selected cannot receive a request through this workflow.
9. Each recipient independently accepts, partially accepts, or rejects its request.
10. Provincial BFP is notified when a request is created and whenever its response or completion state changes.
11. Resolving the incident ends observer access and closes any open assistance requests.

Example: after Hamtic BFP assigns responders to a qualifying Hamtic incident, Tobias Fornier BFP and San Jose BFP may be selected as the two nearby observers. They see the response progress, but Hamtic remains in control and must explicitly request their assistance before they can commit resources.

## Selected Approach

### Automatic geographic ranking with a persisted snapshot

Selection runs inside the existing dispatch transaction. The service reads all active stations outside the origin municipality, groups them by municipality, calculates the Haversine distance from the incident coordinate to each station, and keeps the closest station for each municipality. It persists the first two ranked municipalities as observer rows.

Persisting the selection is important: changing a station's location or status later must not silently replace an observer during an active emergency. The snapshot records the chosen municipality, representative station, station coordinates, calculated distance, and selection timestamp.

This approach reuses coordinates already stored by ALAB, is deterministic, and does not require manually maintaining neighbor lists for every barangay.

### Alternatives considered

- **Per-barangay neighbor configuration:** operationally explicit, but every barangay needs maintained mappings and stale mappings could suppress an alert.
- **All shared-boundary municipalities:** geographically understandable, but may notify more than two municipalities and therefore violates the agreed limit.

## Data Model

### `incident_municipal_observers`

Create one row for each selected nearby municipality:

- `id uuid primary key`
- `fire_report_id uuid not null` referencing `fire_reports(id)`
- `dispatch_id uuid not null` referencing `incident_dispatches(id)`
- `origin_municipality_id uuid not null` referencing `municipalities(id)`
- `observer_municipality_id uuid not null` referencing `municipalities(id)`
- `nearest_station_id uuid not null` referencing `municipal_bfp_stations(id)`
- `station_latitude_snapshot numeric(9,6) not null`
- `station_longitude_snapshot numeric(9,6) not null`
- `distance_meters numeric(12,2) not null`
- `status text not null` constrained to `ACTIVE` or `ENDED`
- `selected_at timestamptz not null`
- `ended_at timestamptz null`

Constraints and indexes:

- unique `(dispatch_id, observer_municipality_id)`
- check `origin_municipality_id <> observer_municipality_id`
- index `(observer_municipality_id, status, selected_at desc)` for the municipal live queue
- index `(fire_report_id, status)` for authorization and lifecycle changes
- row-level security enabled, with no direct `anon` or `authenticated` Data API grants because access remains through signed-session server routes

An active dispatch should normally have exactly two observer rows. If Antique has fewer than two eligible external municipalities with active station coordinates, the transaction records every available observer, reports the degraded selection to Provincial BFP and the origin, and does not block the local emergency dispatch.

### `intermunicipal_assistance_requests`

Create one row per recipient municipality so each municipality can respond independently:

- `id uuid primary key`
- `fire_report_id uuid not null` referencing `fire_reports(id)`
- `dispatch_id uuid not null` referencing `incident_dispatches(id)`
- `observer_id uuid not null` referencing `incident_municipal_observers(id)`
- `requester_municipality_id uuid not null` referencing `municipalities(id)`
- `recipient_municipality_id uuid not null` referencing `municipalities(id)`
- `requested_by_user_id uuid not null` referencing `users(id)`
- `requested_firetrucks smallint not null default 0`
- `requested_personnel smallint not null default 0`
- `request_note text null` limited to 500 characters
- `status text not null` constrained to `REQUESTED`, `ACCEPTED`, `PARTIALLY_ACCEPTED`, `REJECTED`, `CANCELLED`, or `COMPLETED`
- `offered_firetrucks smallint null`
- `offered_personnel smallint null`
- `response_note text null` limited to 500 characters
- `responded_by_user_id uuid null` referencing `users(id)`
- `requested_at timestamptz not null`
- `responded_at timestamptz null`
- `completed_at timestamptz null`
- `updated_at timestamptz not null`

Validation rules:

- At least one of `requested_firetrucks` or `requested_personnel` must be greater than zero.
- Requested and offered quantities cannot be negative.
- `ACCEPTED` requires offered quantities equal to the requested quantities.
- `PARTIALLY_ACCEPTED` requires a positive offered quantity below at least one requested quantity.
- `REJECTED` requires both offered quantities to be zero.
- A partial unique index permits only one open request per dispatch and recipient municipality, where open means `REQUESTED`, `ACCEPTED`, or `PARTIALLY_ACCEPTED`.
- The requester municipality must match the observer row's origin, and the recipient must match its observer municipality.
- Row-level security and grants follow the same server-only policy as observer records.

### Audit records

Observer selection, request creation, request response, cancellation, and completion must write immutable audit entries containing the actor, incident, origin municipality, recipient municipality, old state, new state, and timestamp. Automated selection uses the dispatching user as the initiating actor and identifies the selection action as system-calculated.

## Selection and Dispatch Transaction

Extend the existing `dispatchIncidentToStations` transaction in this order:

1. Lock and validate the report and responsible municipality.
2. Validate the selected local stations and personnel.
3. Create the local dispatch, station snapshots, recipients, and current resident/provincial notifications.
4. Rank eligible external municipalities from active station coordinates.
5. Insert up to two immutable observer-selection rows.
6. Create one deduplicated notification for each active Municipal BFP account assigned to a selected municipality.
7. Create a deduplicated Provincial BFP notification describing that nearby-municipality monitoring has started.
8. Commit all dispatch, observer, audit, and notification records atomically.

If observer ranking or notification insertion fails unexpectedly, roll back the transaction so the UI can retry safely. The only exception is an insufficient number of eligible external municipalities: local dispatch proceeds with a visible degraded-selection warning because withholding local response would be unsafe.

Phone-call incidents already create a dispatch during intake. They must call the same observer-selection service in their transaction so citizen-app and phone-call incidents follow identical rules.

## Authorization and Privacy

### Responsible municipality

The origin keeps its current full incident access and exclusive authority to:

- assign or change local responders;
- request or cancel inter-municipality assistance;
- manage incident status and resolution;
- view resident and reporter information allowed by existing policy.

### Selected observer municipality

Active personnel assigned to a selected observer municipality may see only:

- incident reference number;
- fire type and calculated severity;
- barangay, public map label, landmark, latitude, and longitude;
- report source;
- submitted and dispatch timestamps;
- incident and dispatch status;
- origin municipality;
- public-safe assigned-unit summary and live response progress;
- the assistance request addressed to their municipality and its own response.

Observer responses must never expose resident name, phone number, address records beyond the incident's public-safe location label, identity images, IP address, device information, or internal reporter-verification evidence.

An observer cannot modify the incident, assign its personnel to the origin's dispatch, view another observer's response details, or request assistance on behalf of the origin.

### Provincial BFP

Authorized Provincial BFP accounts retain province-wide read access to the incident, observer selections, requests, and responses. In this scope, Provincial BFP monitors and coordinates but does not accept a request on behalf of a municipality or override the origin's incident command.

Every API derives the user and municipality from the signed session. No request body may choose the acting user or requester municipality.

## Server Interfaces

### Shared services

Create focused server-only modules:

- an observer-selection service that ranks municipalities and creates selection snapshots;
- an observer-access service that verifies origin, observer, or provincial scope and returns the correct data projection;
- an assistance-request service that validates state transitions and writes notifications and audit records.

### Municipal incident APIs

Extend the existing municipal incident feed and detail routes:

- `GET /api/municipal-bfp/incidents` includes incidents owned by the signed-in municipality plus active observed incidents.
- Each item exposes `accessScope: "ORIGIN" | "OBSERVER"` so the interface can show the correct actions.
- `GET /api/municipal-bfp/incidents/[id]` uses a full origin projection or the privacy-limited observer projection.
- Historical observed incidents are omitted from the normal active queue after observer access ends.

Add request routes:

- `POST /api/municipal-bfp/incidents/[id]/assistance-requests` accepts one or two selected observer municipality IDs, requested firetruck/personnel counts, and an optional note. It is origin-only.
- `PATCH /api/municipal-bfp/assistance-requests/[requestId]` accepts a valid action and response quantities. The recipient controls accept, partial accept, or reject; the origin controls cancellation; incident resolution completes remaining accepted requests.

### Provincial APIs

Extend provincial incident detail and notification targets so Provincial BFP can view both selected observers and the complete assistance lifecycle. Existing province-wide incident access remains unchanged.

## Notification Events

Extend the `account_notifications.event_type` allowlist with:

- `NEARBY_INCIDENT_ASSIGNED`
- `NEARBY_MONITORING_STARTED`
- `ASSISTANCE_REQUESTED`
- `ASSISTANCE_ACCEPTED`
- `ASSISTANCE_PARTIALLY_ACCEPTED`
- `ASSISTANCE_REJECTED`
- `ASSISTANCE_CANCELLED`
- `ASSISTANCE_COMPLETED`
- `NEARBY_SELECTION_DEGRADED`

Recipient rules:

- `NEARBY_INCIDENT_ASSIGNED`: active Municipal BFP accounts in each selected observer municipality.
- `NEARBY_MONITORING_STARTED`: active Provincial BFP accounts.
- `ASSISTANCE_REQUESTED`: active Municipal BFP accounts in the addressed recipient municipality and active Provincial BFP accounts.
- Response events: active origin-municipality accounts and active Provincial BFP accounts.
- `NEARBY_SELECTION_DEGRADED`: active origin-municipality and Provincial BFP accounts.

Notification content remains short and excludes protected resident information. Dedupe keys include the event, dispatch or request ID, recipient municipality when applicable, and recipient user ID through the existing per-recipient unique index.

## Near-Real-Time Interface

The municipal dashboard keeps the existing five-second visible-tab refresh. Therefore, a selected municipality sees a newly assigned incident and subsequent status changes within the next five-second refresh while its tab is visible. Returning to a hidden tab triggers an immediate refresh.

Origin incidents and observed incidents appear in the same operational queue but are visibly distinguished:

- `Your incident` for origin-controlled records;
- `Nearby incident` with the origin municipality name for observer records.

Observer detail pages replace dispatch and resolution controls with a read-only live-status panel. Before a request, the panel states `Monitoring only—no assistance requested`. After a request, it shows requested resources and the recipient's allowed response actions.

The origin detail page receives a `Nearby municipalities` panel containing the two selected municipalities, their distance snapshots, monitoring status, and request state. The **Request Backup** action permits selecting either or both observers.

Provincial incident detail shows the origin, two selected observers, current request states, offered resources, and timestamps in one coordination panel.

## Assistance State Transitions

Allowed transitions are:

- `REQUESTED -> ACCEPTED`
- `REQUESTED -> PARTIALLY_ACCEPTED`
- `REQUESTED -> REJECTED`
- `REQUESTED -> CANCELLED` by the origin before a recipient response
- `ACCEPTED -> COMPLETED` when the incident is resolved
- `PARTIALLY_ACCEPTED -> COMPLETED` when the incident is resolved
- `REQUESTED -> CANCELLED` automatically when the incident is resolved without a response

Terminal requests cannot be edited. Retried requests and responses are idempotent: repeating the same accepted operation returns the current result without creating duplicate notifications; conflicting retries return a controlled state-conflict response.

This phase records committed resource counts and request status. Assigning named personnel or a specific recipient firetruck to the origin's dispatch remains a later extension because cross-municipality personnel ownership and field-routing changes require a separate design.

## Incident Completion

When the origin resolves the incident, the existing resolution transaction must:

1. complete accepted or partially accepted assistance requests;
2. cancel unanswered requests;
3. mark active observer rows `ENDED` with `ended_at`;
4. create final deduplicated notifications for affected municipalities and Provincial BFP;
5. retain all snapshots and audit records for reporting.

Ending observer access removes the incident from the neighboring municipality's active queue. Direct access through an old notification returns a controlled `This nearby incident is no longer active` state rather than exposing archived incident details.

## Failure Handling

- Missing or invalid incident coordinates block assignment using the existing dispatch validation because safe proximity ranking is impossible.
- Stations without valid coordinates are excluded and logged.
- Fewer than two eligible municipalities produces a visible degraded-selection warning but does not block local dispatch.
- A notification failure inside an otherwise valid transaction rolls the transaction back and returns a retryable server error.
- A five-second refresh failure retains the last successful feed and shows the existing compact retry state.
- Concurrent assistance responses use row locks; only the first valid transition commits.
- A request against an ended observer selection, resolved incident, unselected municipality, or mismatched session returns a controlled authorization or state-conflict error without revealing hidden records.

## Reporting

Municipal and Provincial reporting may count:

- incidents exposed to nearby municipalities;
- backup requests by origin and recipient municipality;
- accepted, partial, rejected, cancelled, and completed requests;
- requested versus offered firetrucks and personnel;
- request-to-response time.

Reports use the persisted distance and state snapshots so later station edits do not rewrite historical results.

## Verification

Automated tests must cover:

- schema constraints, indexes, RLS enablement, and revoked Data API grants;
- exact selection of two unique external municipalities using nearest active stations;
- exclusion of the origin, inactive stations, and invalid station coordinates;
- deterministic tie-breaking and persisted distance snapshots;
- safe degraded behavior when fewer than two eligible municipalities exist;
- observer creation only after a dispatch is assigned, including phone-call dispatches;
- atomic dispatch, observer, audit, and notification writes;
- origin, selected-observer, unselected-municipality, and provincial authorization;
- strict omission of protected reporter data from observer responses;
- origin-only request creation and cancellation;
- recipient-only accept, partial accept, and reject transitions;
- request quantity validation, idempotent retries, and concurrent transition protection;
- notification recipients, event types, action links, and dedupe behavior;
- five-second visible-tab refresh and immediate refresh after tab visibility returns;
- origin, observer, and provincial coordination panels and allowed actions;
- incident-resolution cleanup and removal from the observer's active queue;
- existing resident, municipal dispatch, mobile responder, notification, and provincial flows remaining green;
- TypeScript compilation and production build.

## Out of Scope

- automatic dispatch by a nearby municipality;
- notifying more than two nearby municipalities;
- manual replacement of an observer during an active dispatch;
- cross-province assistance;
- Provincial BFP accepting or rejecting on behalf of a municipality;
- assigning named external personnel or specific external firetrucks;
- SMS, email, notification sound, or new push-notification channels;
- replacing the current five-second visible-tab refresh with WebSockets or Supabase Realtime.
