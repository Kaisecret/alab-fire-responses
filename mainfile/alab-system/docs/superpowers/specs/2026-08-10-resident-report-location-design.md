# Resident Report Location Design

## Goal

When a resident opens the fire-report form, request browser location permission and use the result to populate the existing location step without changing the rest of the report workflow.

## User Flow

1. The report page requests `navigator.geolocation` permission after the client view is ready.
2. While waiting, the location card shows a loading state using the existing ALAB/BFP visual language.
3. When permission is granted, the detected coordinates populate the report state and the card shows the detected location and accuracy.
4. Clicking the location card or retry control requests the location again.
5. If permission is denied, unavailable, or times out, the card shows a calm fallback message and a `Detect my location` retry action. Residents can still use the existing manual location controls.

## Scope

- Change only the resident fire-report location step and its client behavior.
- Replace the placeholder location icon with the existing project fire/location icon treatment.
- Preserve the landmark, fire-type, description, photo, navigation, and submission UI.
- Do not add a persistent map, third-party geocoder, or new location data source.

## Data and Privacy

- Use the browser Geolocation API only after the resident sees the browser permission prompt.
- Keep coordinates in the existing report form state and do not persist them outside the existing submission flow.
- Treat denied, unavailable, and timed-out location as recoverable UI states.

## Verification

- Add focused tests for permission request, successful detection, error fallback, and retry behavior.
- Run the resident report tests and production build.
- Smoke-test the page with geolocation permission allowed and denied.
