# Resident Report Fire Form Redesign

## Goal

Redesign the resident fire-incident reporting screen as a focused, responsive emergency form. Preserve the current report-flow behavior, including GPS detection, map and pin adjustment, landmark confirmation, fire-type selection, photo controls, and send/cancel actions.

## Scope

- Show only the main reporting form. Remove the current surrounding navigation, account, assistance, safety, and incident side panels from this screen.
- Use the ALAB warm-white, deep-navy, emergency-red (`#DB1B0D`), and soft-pink visual language.
- Keep all existing data attributes and controls that the location logic uses.
- Add a Reason (optional) control with: Electrical malfunction, Cooking accident, Open flame or cigarette, and Unknown / Other.
- Make the UI fully responsive without changing report-system behavior.

## Desktop design

- Center a wide white form card on a warm off-white background; use a subtle border, rounded corners, and restrained shadow.
- Add a concise heading, helper copy, and a branded Fire Emergency safety banner.
- Place Location and Nearest Landmark as equal two-column cards. The location card retains GPS state, accuracy feedback, map preview, pin adjustment, and refresh controls. Landmark uses the existing live suggestion and confirmation controls, presented as a selection card.
- Present fire categories as large icon-led selectable cards: House/Building, Grass Fire, Forest Fire, Vehicle Fire, and Other.
- Arrange Reason, description, and photo upload in a clean three-column detail row when space permits.
- Place a high-emphasis red Send Fire Alert button beside a quiet outlined Cancel button.

## Mobile design

- Collapse all form content into one vertical flow with the emergency banner first.
- Keep touch targets at least 44px high and retain clear numbered section labels.
- Use a full-width map panel, horizontally compact fire-type grid, and stacked details fields.
- Keep the Send Fire Alert action visually dominant and easy to reach at the end of the form.

## Interaction and data flow

- Existing geolocation, reverse geocoding, map rendering, landmark confirmation, manual pin adjustment, and report action continue to use their existing selectors and data attributes.
- Fire-type selection keeps its current selected state behavior.
- The Reason control is optional and must never block submitting the current form.
- Photo buttons keep their current behavior and visual affordances.

## Error and state treatment

- GPS states use compact, readable badges and status copy rather than changing existing validation logic.
- Low-accuracy and location-error states retain red/pink visual emphasis.
- Disabled landmark controls remain clearly disabled, but use the same component language as enabled controls.

## Testing

- Add a source-level regression test that verifies the focused form structure and responsive design hooks.
- Run the report-location tests, full test suite, and production build.

## Review notes

- No table, schema, API, authentication, or incident-submission behavior changes are included.
- The form has no sidebar, navigation menu, account panel, or extra content outside the reporting workflow.
