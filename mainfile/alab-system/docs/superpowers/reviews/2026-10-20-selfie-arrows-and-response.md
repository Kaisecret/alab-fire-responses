# Selfie arrows and detection response

Camera guidance now shows distinct curved head-turn arrows, straight framing arrows, distance instructions and a green hold indicator. Front/Right/Left phase markers show progress. Directions refer to the mirrored preview; the labels still describe the resident's anatomical sides. Decorative graphics have equivalent live status text and respect reduced-motion preferences. Guidance remains within the existing selfie step.

Investigation reproduced two usability problems with synthetic geometry: an otherwise valid side face shifted 20px in a 200px oval was rejected as off-center, and a hold could reset after only 5.5px of movement. Eye depth from one pair could also change the pose classification. Center tolerance is now 24% of the oval radius and hold movement tolerance 11%; the full face must still fit the oval and visible frame. Pose uses the median of three symmetric eye pairs. Missing/malformed geometry, extra faces, wrong turns and interrupted holds still fail closed; the 900ms/four-detection hold and pose limits remain.

One dialog owns one lazily initialized detector through all three confirmed views, including preview/retake. Cancel, navigation, final completion, errors and unmount close it. Per-view cancellation silences callbacks without rebuilding the model. An in-flight old frame is discarded before another view sends a frame. The worker now targets a 120ms start-to-start interval rather than adding 180ms after inference. Slow main-thread fallback yields time for paint. These are scheduling improvements, not measured recognition-accuracy claims.

## Verification

- Standard `npm test`: 1,034 passed, one existing database-only skip, zero failures.
- Final focused camera/cue/geometry/runtime run: 47 passed.
- Root repository tests: 11 passed.
- Final production build passed TypeScript, native Linux CPU face-model tracing/inference and all seven pinned asset checksums.
- Scoped ESLint: zero errors; two existing unused-variable warnings in signup-page.tsx.
- Production-build browser flow passed at 1440×1000, 390×844, 375×667 and 844×390. Verified both arrows, no cue/oval overlap, automatic captures, one detector for three views, retake/retry, Back/edit, OTP and bound registration fields. All API calls were intercepted; no accounts, SMS or personal images were used. No browser errors.
- Independent review found no Important/Critical issue in model ownership, cancellation, directions, rejection rules or accessible feedback.

The first broad run used a direct Node command that triggered the test suite's explicit database-only failure outside npm. The corrected standard command produced the passing result above. No production database was used to resolve that configuration issue.

This update improves capture guidance. Face-match accuracy and certified liveness are not established by these synthetic tests. Server-side identity comparison, its matching threshold, evidence binding, OTP and private storage were not changed.

## Loading follow-up

Live checks found healthy cold model loads taking 45–77 seconds over the test connection, while the existing 25-second worker deadline would stop and restart initialization on the main thread. A warm load in the same browser took 725ms. These observations describe that connection and test device, not a guaranteed load time.

Initialization now shares one 90-second budget across the worker and any explicit worker-error fallback. Budget expiry asks for a retry without starting CPU initialization again. Cancellation and late-created task cleanup remain bounded. The UI shows an indeterminate loading ring. Only checksum-pinned versioned vendor JS, WASM and model bytes receive immutable caching; ALAB's worker and manifest remain revalidated.

The standard full-suite result above precedes this bounded follow-up. Its final focused run passed all 55 camera, pose, cue and loading tests; the production build and scoped ESLint passed. A real-model production-build browser check confirmed the cache headers, retained worker revalidation and zero faces on blank cold/warm frames. Independent review found no Important issue. No vendor bytes, pose rules, match threshold or signup steps changed in the follow-up.
