# Phone-Call Incident Intake and Responder Assignment

## Purpose

Municipal BFP staff need to record incidents reported by telephone when the caller has not used the ALAB resident app. The staff member must be able to identify the exact fire location on a map and dispatch selected responders from a municipal station immediately.

## Scope

This feature adds a municipal-only phone-call intake path. It reuses the existing active incident, station dispatch, responder mobile notification, status, map, and resolution workflows.

It does not add a public emergency calling service, a call recording system, or automatic caller identity verification.

## User Flow

1. A Municipal BFP administrator opens **Active Incidents** and selects **New Phone Call Incident**.
2. The Phone Call Incident workspace opens with a map and an intake/dispatch panel.
3. The dispatcher zooms, pans, clicks, or drags the fire pin to the reported location. The selected coordinates are saved as the official incident location.
4. The dispatcher records caller name, caller phone number, fire classification, barangay, address or landmark, notes, and reported time.
5. Once a valid pin and required incident details are present, the dispatcher selects an active municipal station.
6. The system loads active responders assigned to that station. The dispatcher selects the individual responders who will respond.
7. Selecting **Create & Dispatch** creates one official incident, assigns the chosen responders, and sends the existing mobile dispatch notifications.
8. The map, active queue, incident detail, and responder view display the source label **From Phone Caller**. The incident then uses the existing responder status and municipal resolution workflow.

## Experience Design

The workspace uses a two-column desktop layout and collapses to a single-column mobile layout:

- **Map panel:** Leaflet map centered on the assigned municipality, zoom controls, a draggable red fire marker, and a short location accuracy message. Users can click the map to move the marker or drag the marker for precise placement.
- **Call intake panel:** Caller and incident fields in a compact form, followed by station selection and a responder checklist grouped beneath the selected station.
- **Dispatch summary:** A persistent footer shows the chosen location, station, and responder count. The primary action is disabled until the form, location, and responder selection are valid.
- **Visual distinction:** A red phone icon and the text **From Phone Caller** distinguish these incidents from app reports without making phone reports appear less urgent.

## Data Model

`fire_reports` remains the canonical incident record. It gains fields that distinguish the source and store information that does not require an ALAB resident profile:

- `report_source`: `ALAB_APP` or `PHONE_CALL`, defaulting to `ALAB_APP`.
- Nullable `resident_profile_id` for reports entered by Municipal BFP.
- `caller_name` and `caller_phone` for phone-call reports. Existing reporter snapshot fields remain available for app reports and are populated compatibly for phone reports.
- `created_by_user_id` to identify the Municipal BFP staff member who created a phone incident.
- `reported_at` to preserve the time provided by the caller, distinct from the record creation time.

Database checks enforce a valid source-specific shape: app reports require a resident profile, while phone reports require caller name, caller phone, and the staff creator. Existing reports are unchanged and default to the app source.

The migration adds indexes appropriate for municipality queue queries and source filtering. Server-side access remains protected by the existing municipal authorization checks.

## Server Behavior

Add a municipal-only endpoint to create and dispatch a phone-call incident atomically. It will:

1. Validate the session, Municipal Admin authorization, municipality scope, caller/contact data, fire type, coordinates, barangay, station, and selected responder IDs.
2. Verify that the selected station and responders are active and assigned to the caller's municipality/station.
3. Insert the phone-source `fire_reports` row, `incident_dispatches`, its station snapshot, responder recipient rows, and status history within one transaction.
4. Set the incident to `RESPONDING`, create responder and provincial notifications, and send mobile push notifications after the transaction succeeds.
5. Skip resident notifications because phone callers do not have an ALAB resident account.

Existing `dispatchIncidentToStations` and resolution paths must be made resident-optional so that they neither join against nor notify a missing resident record. Existing app-origin behavior remains unchanged.

## Permissions and Audit

Only Municipal BFP admins may create or dispatch phone-call incidents. The new record stores the creating user and participates in the existing status history and account-notification audit trail. The API must never accept a municipality ID from the client as authority; it uses the authenticated assignment.

## Errors and Recovery

- Invalid or unplaced location: explain that the pin must be placed within the authorized municipality.
- Incomplete caller or incident details: identify the missing field inline.
- No station or responder selected: block dispatch and retain entered form values.
- Station or personnel availability changes: return a clear conflict message and refresh only the affected picker.
- Save/dispatch failure: the transactional endpoint leaves no partially-created incident or assignment.

## Tests

- Unit tests for source-specific validation and coordinate/phone validation.
- Route and service tests for municipal authorization, scope enforcement, responder membership, required selection, atomic creation, and no resident notifications for phone incidents.
- Migration tests for constraints, defaults, nullability, and indexes.
- UI tests for the call-intake entry point, source label, draggable/clickable map pin, validation, station/responder selection, and disabled/enabled dispatch action.
- Regression tests for app-created reports, station-team dispatch, mobile responder assignment, resolution, active queue, and GIS map rendering.

## Acceptance Criteria

- A Municipal BFP admin can create a phone-reported incident from one workspace.
- The map pin can be zoomed, panned, clicked, and dragged before dispatch.
- Caller name and phone number are recorded.
- A selected station exposes its active responders for individual selection.
- Creating the incident dispatches only the selected responders and creates no resident notification.
- The incident displays **From Phone Caller** throughout municipal operations and appears in the GIS map and active queue.
- The normal responder lifecycle and municipal resolution flow work for the phone-origin incident.
