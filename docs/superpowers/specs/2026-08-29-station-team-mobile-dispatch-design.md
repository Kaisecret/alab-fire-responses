# Station-Team Mobile Dispatch Design

## Goal

Extend the existing ALAB incident workflow so a Municipal Administrator can click **Acknowledge & Respond**, choose one or more active BFP stations or **All Stations**, and dispatch the incident to every active BFP responder currently assigned to those stations. Each recipient must receive an in-app notification and a phone push notification, acknowledge the assignment independently, view an in-app road route, and be detected as on scene after a verified 100-meter arrival.

## Confirmed Decisions

- Dispatch is station-team based, not first-claim or individual-person selection.
- Every active Municipal BFP staff account assigned to a selected station becomes a recipient snapshot for that dispatch.
- **All Stations** means every active station in the signed-in administrator's municipality that has at least one active responder.
- Each responder must tap **Acknowledge & Start Route** before operational location tracking starts.
- Notifications include both the existing in-app notification feed and Firebase Cloud Messaging push alerts.
- Routing stays inside the ALAB Flutter app.
- Automatic arrival uses a 100-meter radius and requires qualifying GPS samples spanning at least 30 seconds.
- The first qualifying assigned responder moves the shared fire report to `RESPONDER_ARRIVED`; every responder retains an individual status.
- The current municipal web layout, color palette, typography, spacing language, map, and Flutter visual system remain intact.

## Architecture

The Next.js application remains the sole trusted gateway to PostgreSQL/Supabase. The Flutter application continues to authenticate with the existing signed mobile BFP bearer token and never receives `DATABASE_URL`, a Supabase secret/service-role key, or Firebase server credentials.

Dispatch writes are handled by a focused server domain service inside one database transaction. The service locks the incident, validates the Municipal Administrator and municipality boundary, validates station ownership and eligibility, creates the dispatch/station/recipient snapshots, creates one in-app notification per recipient, appends fire-report status history, and moves the shared incident to `RESPONDING`. FCM sending happens after commit so a push-provider failure never rolls back a valid emergency dispatch.

Mobile clients use authenticated HTTP APIs and refresh active assignments every five seconds while visible. An FCM message immediately triggers the same refresh and opens the correct assignment when tapped. This preserves the project's current server-auth model without introducing direct Supabase Realtime access that would require a separate Supabase Auth/RLS design.

## Data Model

### `incident_dispatches`

One active dispatch operation for a fire report.

- `id`, `fire_report_id`, `municipality_id`
- `status`: `ACTIVE`, `COMPLETED`, or `CANCELLED`
- `dispatched_by_user_id`, `dispatched_at`
- `completed_at`, `cancelled_at`
- timestamps
- partial unique index allowing only one active dispatch per fire report

### `incident_dispatch_stations`

Immutable station snapshots selected for a dispatch.

- `id`, `dispatch_id`, `station_id`
- `station_name_snapshot`, station latitude/longitude snapshots
- `assigned_at`
- unique `(dispatch_id, station_id)`

### `incident_dispatch_recipients`

One row per active responder selected at dispatch time.

- `id`, `dispatch_id`, `dispatch_station_id`, `recipient_user_id`
- `status`: `ASSIGNED`, `ACKNOWLEDGED`, `EN_ROUTE`, `ON_SCENE`, `COMPLETED`
- assigned, acknowledged, en-route, arrived, and completed timestamps
- last latitude/longitude/accuracy/sample time
- arrival-candidate start time and `AUTO`/`MANUAL` arrival method
- unique `(dispatch_id, recipient_user_id)`

Personnel added to a station after dispatch do not silently join an existing incident. Transfers after dispatch also do not remove a responder from the audit snapshot; account suspension prevents further API access.

### `bfp_mobile_devices`

One row per installed/signed-in mobile app instance.

- `id`, `user_id`, stable installation ID, platform
- FCM registration token with a uniqueness constraint
- `push_enabled`, `last_seen_at`, `revoked_at`
- created/updated timestamps

Logout revokes only the current installation. Invalid FCM tokens are revoked automatically after a permanent provider error.

### `push_notification_deliveries`

Delivery audit for each in-app notification/device pair.

- `notification_id`, `device_id`
- `PENDING`, `SENT`, `FAILED`, or `INVALID_TOKEN`
- attempt count, provider message ID, sanitized last error, attempted/sent timestamps

All new `public` tables have RLS enabled and grants revoked from `anon` and `authenticated` because this application uses trusted server-side PostgreSQL access plus custom sessions.

## Incident and Recipient State

The shared incident and individual responder states are deliberately separate.

1. Admin dispatch: report becomes `RESPONDING`; recipients become `ASSIGNED`.
2. Responder acknowledgment: that recipient becomes `ACKNOWLEDGED`, then `EN_ROUTE` when route tracking starts. The first successful start moves the report to `FIRETRUCK_DISPATCHED`.
3. Arrival detection: that recipient becomes `ON_SCENE`. The first qualifying arrival moves the report to `RESPONDER_ARRIVED`.
4. An assigned responder or Municipal Administrator may move the shared report to `UNDER_CONTROL` and then `RESOLVED`.
5. Resolving the report marks the dispatch and unfinished recipient rows `COMPLETED` and stops mobile tracking.

Every transition is idempotent and monotonic. Database row locks prevent two devices from producing duplicate history entries or moving a shared incident backward.

## Municipal Web Experience

The incident detail page keeps its existing header, profile cards, situation report, and tactical map. The red **Acknowledge & Respond** button opens a focused dispatch sheet instead of immediately changing status.

On desktop the sheet is a 560-pixel right-side command panel; on narrow screens it becomes a full-width bottom sheet. It contains:

- incident reference, fire type, and reported locality;
- **Select all eligible stations** control with selected/total count;
- compact station rows showing station name, approximate direct distance, active responder count, and eligibility;
- disabled rows for inactive/empty stations with an explanation;
- sticky **Cancel** and **Dispatch N Stations / N Responders** actions;
- submission progress, inline error recovery, and a success receipt with station, recipient, and push-delivery counts.

The visual thesis is a calm municipal command surface: white and pale-slate layers, existing dark navy typography, ALAB red reserved for emergency action, blue reserved for route information, restrained borders, and no redesign of the surrounding page.

## Flutter Experience

The Flutter screens stop using sample incident maps and lists and consume authenticated assignment models.

- A push tap opens the assigned incident directly from foreground, background, or terminated state.
- The notification center shows persisted assignment notifications and read state.
- Home shows the highest-priority active assignment using the existing hero/card language.
- Incidents provides Assigned, En Route, On Scene, and Completed filters.
- Incident detail shows report facts, selected stations, responder progress, and the primary **Acknowledge & Start Route** action.
- The Map tab uses `flutter_map` with OpenStreetMap tiles, the responder's live marker, incident marker, OSRM route polyline, remaining distance, and ETA.
- A foreground-service notification remains visible while an acknowledged assignment is tracking in the background.

Location collection starts only after acknowledgment and stops on completion, cancellation, logout, or explicit tracking failure. ALAB does not continuously track responders who have no active acknowledged dispatch.

## Arrival Validation

The phone sends throttled samples containing latitude, longitude, horizontal accuracy, sample timestamp, and whether Android reports a mocked provider. The server is authoritative.

A sample qualifies only when:

- the responder is assigned to the dispatch;
- the dispatch is active;
- distance to the incident is at most 100 meters;
- reported accuracy is at most 50 meters;
- the sample is not older than 60 seconds or unreasonably in the future;
- the sample is not marked as mocked.

The first qualifying sample starts the arrival candidate. A later qualifying sample at least 30 seconds afterward confirms automatic arrival. Leaving the radius or receiving an inaccurate sample clears the candidate. A visible manual fallback remains available when precise location cannot be obtained and is audited as `MANUAL`.

## Push Notifications

Flutter uses `firebase_core`, `firebase_messaging`, and `flutter_local_notifications`. Android 13+ notification permission is requested after sign-in with explanatory ALAB copy. Foreground notifications use a high-priority `alab_emergency_dispatch` channel. Token creation and token refresh are registered through the authenticated device endpoint.

The server uses FCM HTTP v1 with `google-auth-library`. `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, and `FIREBASE_PRIVATE_KEY` are server-only environment variables. Push payload data contains only opaque IDs and short operational labels; private resident phone/address details are fetched only after the mobile API re-authorizes the user.

## Error Handling

- No eligible station: dispatch remains unchanged and the sheet explains how to assign active personnel.
- Stale or foreign station ID: the server rejects the entire operation with no partial assignment.
- Duplicate click/request: the active-dispatch constraint and idempotent service return the existing dispatch receipt.
- Push failure: the assignment and in-app notification remain valid; delivery status is recorded and the admin receipt reports partial delivery.
- Notification permission denied: the app continues in-app alerts and shows a non-blocking settings action.
- Route service unavailable: the map shows both markers and a dashed direct line with direct distance.
- GPS unavailable/inaccurate: tracking displays an actionable permission/service state and offers audited manual arrival.
- Offline mobile device: the last assignment remains readable from local memory; state-changing actions wait for a server response and never claim success optimistically.
- Concurrent responders: recipient updates remain independent; shared incident history is appended once per actual transition.

## Security and Privacy

- Only `MUNICIPAL_ADMIN` may create a station dispatch.
- Every selected station must be active and belong to the administrator's municipality.
- Mobile assignment APIs require an active `MUNICIPAL_STAFF`/Municipal BFP identity and a matching recipient row.
- The server calculates distance and arrival; the client cannot submit an `ON_SCENE` status directly for automatic arrival.
- No service-role, database, or Firebase private credential is shipped to Flutter.
- FCM tokens and location samples are server-only operational data.
- Exact mobile location is retained only as the recipient's latest operational sample rather than an unlimited tracking history.

## Verification and Success Criteria

- Admin can select one, several, or all eligible stations without altering the rest of the current incident UI.
- Every active responder in those stations receives exactly one recipient assignment and one in-app notification.
- Phones with permission receive a push notification while foregrounded, backgrounded, or terminated, subject to platform force-stop limitations.
- Tapping the push opens the correct incident.
- Each responder acknowledges independently and sees an ALAB in-app road route.
- The first verified 100-meter/30-second arrival changes the shared incident to `RESPONDER_ARRIVED` exactly once.
- Multiple responders can operate simultaneously without overwriting each other's state.
- Push, OSRM, permission, and GPS failures degrade safely.
- Backend tests, Flutter tests, lint/analyze, Next build, and a two-station/two-phone field scenario pass before deployment.
