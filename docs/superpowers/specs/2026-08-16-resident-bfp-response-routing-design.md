# Resident-to-Municipal BFP Response Routing Design

## Goal

Build the first live emergency-report workflow between a resident and a Municipal BFP station: a resident submits an incident with photo and GPS coordinates; authorized Municipal BFP personnel can inspect it, view the reporter profile, open its location on a map, see a road route and direct line from their station, and mark the incident as responding. The resident immediately sees the response status.

## Scope

This phase includes:

- Resident fire-report submission with one optional incident photo, current GPS location, detected barangay and municipality, landmark, fire type, and short description.
- A protected Municipal BFP incident queue and incident-details view.
- An incident map with a red resident incident marker, a blue handling-station marker, a real road route with distance and estimated travel time from OSRM, and a direct-line fallback with straight-line distance.
- A protected **Respond** action that stores the handling BFP user, handling station, and response-start time, then changes the report status to RESPONDING.
- A resident report-status page that displays the current status and the message “BFP is responding to your fire report.”
- Authorized Municipal BFP access to the reporting resident’s emergency-relevant profile, contact details, submitted location, active report, and prior report history.
- Server-side authorization checks for every BFP report/profile/action request.

## Explicitly Deferred

- Automatic municipality-boundary routing from GPS coordinates.
- Restricting each report to the municipality determined by GIS boundary polygons.
- Provincial BFP all-municipality monitoring changes.
- Firetruck assignment, responder arrival, or later operational status buttons beyond the initial RESPONDING action.
- Push/SMS notifications.

Until the municipality-boundary phase is implemented, the incident is available in the Municipal BFP operational workflow; it is not yet automatically assigned by a legal municipality polygon.

## Data Model

The existing fire_reports and fire_report_photos tables are extended rather than replaced.

- fire_reports.status gains the operational values PENDING_VERIFICATION, VERIFIED, RESPONDING, FIRETRUCK_DISPATCHED, RESPONDER_ARRIVED, UNDER_CONTROL, and RESOLVED, while retaining legacy values required for already-created rows.
- Each report stores responding_bfp_user_id, responding_station_name, and response_started_at.
- A report status-history table captures each status transition, actor, timestamp, and optional public resident message.
- A station-location table stores one location per municipality/station for route origins.
- fire_report_photos remains metadata-only; files live in a private Supabase Storage bucket. The server generates authorized, time-limited access URLs.

All new exposed-schema tables have RLS enabled. The current application uses a server-side PostgreSQL client and signed custom BFP cookies, so API routes enforce the role and municipality relationship before returning private resident information.

## API Contract

- POST /api/resident/fire-reports creates the report and uploads photo metadata after validating the resident session, current position, file type, file size, required report fields, and derived locality.
- GET /api/resident/fire-reports returns only the signed-in resident’s reports and current operational status.
- GET /api/resident/fire-reports/:id returns only the signed-in resident’s own report, including status history and its own photo URL.
- GET /api/municipal-bfp/incidents returns incidents available to the signed-in Municipal BFP session.
- GET /api/municipal-bfp/incidents/:id returns an authorized incident, resident emergency profile, photo access URL, station origin, and route-ready coordinates.
- POST /api/municipal-bfp/incidents/:id/respond transitions a permitted incident to RESPONDING transactionally and records the actor, station, response time, and resident-visible message.
- GET /api/routes/road proxies an OSRM route request after coordinate validation. It never accepts arbitrary external URLs.

## Resident Flow

1. The resident opens **Report Fire**.
2. GPS detection obtains coordinates and reverse geocoding populates barangay, municipality, and landmark suggestion.
3. The resident adds an optional photo, fire type, landmark, and short description.
4. The resident submits the report.
5. The report-status screen displays Report Submitted / Pending Verification.
6. When Municipal BFP selects **Respond**, the same report displays Responding and “BFP is responding to your fire report.”

## Municipal BFP Flow

1. A Municipal BFP user opens the incident queue.
2. The user opens one incident to view the resident name, contact information, emergency address, barangay, landmark, GPS coordinates, photo, description, prior reports, and current active report.
3. The map displays the incident marker, handling station marker, direct line, route distance, and estimated drive time.
4. The user clicks **Respond**.
5. The action updates the incident transactionally and returns the new status to both Municipal BFP and resident views.

## Error Handling

- A failed GPS read, geocode lookup, photo validation, storage upload, database write, or route request returns an actionable error without creating a partial report.
- An unavailable OSRM service leaves the incident marker, station marker, and direct-line distance available, with an explicit “Road route unavailable” notice.
- Unauthorized BFP accounts never receive resident profile details, submitted locations, photo URLs, or respond controls.
- Status transitions are validated server-side; RESPONDING is only allowed from a report that has not been resolved, rejected, or closed.

## Verification

- Unit tests cover request validation, report status transition validation, direct-line-distance calculation, OSRM route payload normalization, and authorization helper behavior.
- Route/API tests prove residents can see only their own reports and that a Municipal BFP session must be present to view/respond to an incident.
- UI tests assert the report form photo/location controls, Municipal BFP details/Respond control, route fallback state, and resident Responding state.
- npm test, npm run lint, and npm run build must succeed before release.

## Success Criteria

- A resident can submit a report with a photo and GPS location.
- Municipal BFP can open the submitted report, map the resident location, inspect their emergency profile, and see a road route plus direct line from the station.
- Clicking **Respond** changes the report to RESPONDING, records the action, and appears on the resident report-status screen.
- No municipality polygon-based assignment is claimed or implemented in this phase.
