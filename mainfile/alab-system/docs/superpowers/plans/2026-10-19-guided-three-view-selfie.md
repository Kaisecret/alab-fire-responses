# Guided three-view selfie implementation plan

**Goal:** Add guided front/right/left camera captures with live centering and automatic capture inside the existing resident selfie step.

**Architecture:** The browser keeps confirmed photos and previews per view. A local face-landmark model provides position/pose feedback and triggers capture after stable alignment. Only the frontal photo uses the existing ID comparison. The server validates all three images and signs their exact hashes; registration stores a labelled private contact sheet in the existing selfie evidence slot.

**Constraints:** Preserve six signup steps, existing ID/OTP checks and automatic approval. No paid service, no face frames sent to the guidance provider, no database schema change, no new liveness certification claims. Do not use the personal images attached in the conversation for tests. Preserve unrelated local edits; use a tracked-commit snapshot for deployment.

**Interfaces:**

- `startSelfieGuidance({video,guide,view,onUpdate,onReady,signal?})` returns a stoppable browser controller. Updates contain `ready`, `progress`, `message`, `code`; readiness fires once after stable matching geometry. Views are `front`, `right`, `left` referring to the subject.
- Face-check and registration multipart fields retain `frontId`, `backId`, `selfie` (frontal), `idVerificationToken`, and add `selfieRight`, `selfieLeft`.
- Face proof v2 binds `selfieSha256`, `selfieRightSha256`, `selfieLeftSha256` plus both ID hashes, name, score, threshold and expiration.
- Private evidence accepts optional paired side captures; old correction resubmissions with neither remain supported.

## Browser capture and UI

- [ ] Write failing collection/client/integration tests: all views required, exact photo bindings, per-view retake, stale camera/inference/encoding cancellation.
- [ ] Implement pose collection and guided camera state with labelled previews, live progress/feedback, per-view confirmation and retake. Wait for real geometry readiness before automatic or manual capture.
- [ ] Keep each confirmed frame below 400 KiB so five photos fit the deployed request limit.

## Local vision guidance

- [ ] Pin MediaPipe and versioned local model/WASM assets with provenance/licenses/hashes.
- [ ] Test synthetic geometry, visible-frame cover/mirror mapping, wrong pose, multiple/missing faces, stable hold reset and exactly-once capture.
- [ ] Bound inference frequency and cancel callbacks/resources on close/retake/unmount.

## Server proof and private evidence

- [ ] Test and implement mandatory image validation and v2 proof/hash binding before any uploads or account writes.
- [ ] Test labelled contact-sheet generation, optional legacy correction behavior and failure cleanup; keep storage private.

## Review and release

- [ ] Independently review camera lifecycle and server trust boundaries; fix important findings.
- [ ] Run focused/full tests, TypeScript/build and native/model checks. Browser-test responsive UI with synthetic inputs and blocked real API traffic; smoke real guidance on blank frames.
- [ ] Push scoped changes to main, deploy the tracked commit, verify published guidance assets, signup, rejection paths and existing domain/Google checks.
