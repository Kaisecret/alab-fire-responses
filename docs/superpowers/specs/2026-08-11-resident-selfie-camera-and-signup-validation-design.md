# Resident Selfie Camera and Signup Validation Design

## Goal

Give residents a familiar, distraction-free selfie capture experience and make the registration form clearly identify any missing requirement instead of blocking submission with a generic browser message.

## Scope

- Keep the camera in the resident sign-up page; it does not open a browser tab.
- On phones, the camera opens as a full-screen capture view.
- On laptops and tablets, it opens in a centered, large modal with a dimmed backdrop.
- The view shows a live front-camera preview, close control, guidance text, and a large shutter control.
- After capture, residents can confirm use of the photo or retake it. Closing or cancelling stops every camera track and preserves the prior verification state.
- Native form validation is disabled for this multi-step form. The app validates fields step-by-step and validates all requirements before account creation.
- If a field is missing or invalid, the app navigates to that step, focuses the field, and explains the exact problem in the existing form-status area.

## Root Cause

The sign-up form contains required controls for all five steps. Native HTML form validation runs before the submit listener and validates hidden panels too. That means the browser can prevent submission with a generic required-field prompt instead of letting the app show its intended step-aware validation.

## Design

### Camera capture view

The existing embedded `.selfie-camera-panel` becomes a fixed `role="dialog"` capture layer. It has a dark backdrop, a portrait-oriented video view with a soft oval face guide, a close button, concise safety copy, and a prominent circular capture button. On a viewport at or below 950px the layer reaches every viewport edge. Wider viewports center a 34rem camera card with rounded corners.

Capturing freezes a frame from the video stream, switches the camera layer to a review state, and shows that captured image. The resident chooses **Use this selfie** to mark the selfie complete, or **Retake** to resume the front-camera preview. A close or cancel action stops the stream and returns to the registration step.

### Registration validation

`validateStep` continues to govern the Next buttons. A new final validator checks every required input/select/textarea in order, then checks the front ID, captured selfie, matched password, and terms checkbox. It sends the resident to the applicable step and sets a specific, friendly status message. The sign-up `<form>` uses `novalidate` so native browser validation cannot block this flow before the application handler executes.

## Error Handling

- Camera permission denial or missing camera support displays the existing clear camera-access message and does not mark a selfie as captured.
- A capture request before video metadata is ready shows the existing wait message.
- Invalid or missing field feedback names the field and focuses it after navigating to its step.
- Registration API errors continue to use the server-provided safe message.

## Verification

- Extend the selfie-camera source test to assert a dialog-style capture layer, full-screen responsive styles, capture review controls, and camera-track cleanup.
- Add a sign-up validation source test that asserts `novalidate` and the final step-aware validator are present.
- Run the focused tests and `npm run build --prefix mainfile/alab-system`.
