# Resident Report Location Design

## Goal

When a resident opens the fire-report form, request browser location permission and use the result to populate the existing location step without changing the rest of the report workflow.

## User Flow

1. The report page requests `navigator.geolocation` permission after the client view is ready.
2. While waiting, the location card shows a loading state using the existing ALAB/BFP visual language.
3. When permission is granted, the detected coordinates populate the report state, the mini-map centers on the point, and a reverse lookup fills the available barangay and municipality names.
4. Clicking the location card or retry control requests the location again.
5. If permission is denied, unavailable, or times out, the card shows a calm fallback message and a `Detect my location` retry action. Residents can still use the existing manual location controls.

## Scope

- Change only the resident fire-report location step and its client behavior.
- Replace the placeholder location icon with the existing project fire/location icon treatment.
- Show a lightweight Leaflet mini-map with a locating pulse and a project-styled position marker.
- Preserve the landmark, fire-type, description, photo, navigation, and submission UI.
- Use one Nominatim reverse lookup per successful detection to resolve barangay and municipality labels from OpenStreetMap.

## Data and Privacy

- Use the browser Geolocation API only after the resident sees the browser permission prompt.
- Use the Nominatim response only to display the nearby mapped barangay and municipality; retain coordinates as the source location values.
- Keep coordinates in the existing report form state and do not persist them outside the existing submission flow.
- Treat denied, unavailable, and timed-out location as recoverable UI states.
- Treat missing or failed reverse-geocoding fields as recoverable and show the coordinate fallback.

## Verification

- Add focused tests for permission request, successful detection, error fallback, and retry behavior.
- Run the resident report tests and production build.
- Smoke-test the page with geolocation permission allowed and denied.
