# Resident correction loading and camera selfie implementation plan

**Goal:** Resident corrections finish with a confirmed review status or a recoverable error; replacement selfies must be taken using the camera, never selected from saved files.

**Architecture:** Keep correction submission in the resident application page. Use bounded JSON requests for status and submission. Add a reusable camera capture component based on the existing signup camera flow; continue sending its captured image through the protected evidence API.

**Tech stack:** Next.js, React, TypeScript, browser MediaDevices and canvas, existing identity evidence processing.

**Request:** September 15 resident correction screenshot showing a stuck “Securing your corrections…” button and an upload control for the selfie. This resident work is separate from municipal reporting exports.

## 1. Loading correction — implemented locally

- [x] Reproduce rejected network requests and HTML error responses leaving submission unresolved with failing component behavior tests.
- [x] Add `mainfile/alab-system/lib/resident-applications/client-request.ts` to bound both fetch and response parsing. Status reads time out after 20 seconds; correction writes after 60 seconds.
- [x] Update `mainfile/alab-system/app/resident/application/page.tsx` to catch errors, always clear saving in `finally`, prevent overlapping submits, preserve entered fields on failure, and offer status checking before another submission.
- [x] Use the successful POST response to show Pending/Under review immediately, without a second status request being required to complete the submission.
- [x] Return the persisted submission timestamp from `app/api/resident/application-status/resubmit/route.ts`.
- [x] Add regression tests in `tests/resident-correction-loading.test.mjs` for network failure, non-JSON failure, successful state transition, and a stalled response body.
- [ ] Verify the original affected resident account on the deployed system. Client timeout does not cancel server-side processing. Do not automatically repeat a POST whose outcome is unknown.

The missing exception handling is confirmed in code and reproduced by tests. The specific production failure (network, upload, database, or proxy error) is not established by the screenshot; inspect server logs for the affected request without logging identity images or credentials.

## 2. Camera-only replacement selfie — planned, not implemented

### Capture component

- [ ] Create `mainfile/alab-system/app/_components/resident-selfie-capture.tsx`. Reference camera opening, frame capture, and cleanup in `app/_components/signup-page.tsx`; avoid copying its entire imperative signup implementation.
- [ ] Provide states: idle, requesting permission, live preview, captured preview, and error. Use buttons labeled Open camera, Take photo, Retake, and Use this photo. Buttons must be `type="button"`.
- [ ] Request camera only after an explicit click using `navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false })`. Use an inline muted video preview and wait for a real frame before enabling capture.
- [ ] Capture a frame into a JPEG Blob/File using canvas; check nonzero dimensions and encoding success. Keep the file in memory and enforce the existing 6 MiB evidence limit. Avoid storing selfie bytes in browser storage or logs.
- [ ] Show a preview for confirmation. Retake clears the accepted file; block submission until the new photo is confirmed. Clear an earlier camera error when retrying.
- [ ] Stop all media tracks after capture, cancellation, navigation, and unmount. Release preview object URLs. If permission resolves after unmount, immediately stop the returned stream.
- [ ] Handle permission denied, no camera, camera busy, insecure context, and encoding failure with accessible messages and retry instructions. Do not fall back to an upload/gallery picker.

### Form integration

- [ ] Replace only the New selfie file input in `app/resident/application/page.tsx` with the capture component. Keep ID front/back upload controls.
- [ ] Set the accepted camera file on the submission FormData under the existing `selfie` field. Check the file before setting saving; disable resubmission while no confirmed selfie exists or a submission is in progress.
- [ ] Preserve the confirmed selfie after a recoverable submission error. Keep the status-check action for uncertain outcomes.
- [ ] Change instructions to “Take a new selfie using your camera.” Use visible labels, keyboard-accessible actions, status announcements, and a responsive preview.

### Server contract and limits

- [ ] Keep server-side MIME, decoded-image, and size validation in `lib/resident-applications/evidence.ts`, and the required selfie check in the resubmit route. Preserve protected storage and review watermarking.
- [ ] Verify fresh capture is required on every correction attempt that replaces evidence. The normal interface must offer no selfie file picker, drag/drop, or paste path.
- [ ] Document accurately: camera-only UI does not prove liveness or prevent a modified client from submitting an existing image. `capture="user"`, filenames, EXIF, and a client-supplied capture flag are not trusted proof. Strong anti-spoof verification requires a separately scoped server-verified challenge or liveness system.

## 3. Acceptance and verification

- [ ] Test permission grant, denial and retry, missing camera, blank video, capture failure, preview confirmation, retake, and stream cleanup using mocked media streams.
- [ ] Test that correction submission cannot proceed without a confirmed camera image, includes that image as `selfie`, and retains both ID upload controls.
- [ ] Verify mobile and desktop browsers with real cameras, including narrow screens and keyboard navigation. Confirm no gallery/file selection is offered for selfies.
- [ ] Confirm a successful resubmission appears as Pending for the resident and enters the municipal review queue with usable protected evidence.
- [ ] Run focused tests, TypeScript and changed-file lint before completion. Do not mark camera-only capture delivered until implementation and device checks are complete.

Current loading checks: four regression tests pass. Targeted lint has no errors and one existing Next.js warning about the logo `<img>` element. Live account and real-device verification remain pending.
