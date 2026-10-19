# Guided three-view selfie verification

The resident signup selfie step now collects confirmed front, right and left camera photos. Local face landmarks guide centering, framing and modest head turns; a capture requires at least four stable detections over at least 900 ms. Each view can be retaken independently. The six main steps, paired ID check, phone OTP and configured automatic approval remain in place.

The face-check and registration endpoints require all three images. Version 2 proofs bind both ID photos and all three source hashes. Only the frontal selfie is compared with the ID portrait. Private evidence stores a labelled 1800×880 contact sheet using the existing storage fields; no schema migration is included. Correction resubmissions without side photos retain their previous behavior.

## Checks performed

- Full application regression run: 1,014 passed, one existing skip, zero failures.
- Final focused run after review fixes: 63 passed, zero failures. Covers proof tampering and legacy rejection, private contact sheet and cleanup, six-step/OTP flow, per-view retakes, cancelled permission/encoding/preparation, geometry and worker lifecycle.
- Root repository tests: 11 passed.
- Final production build passed, including TypeScript, native Linux CPU face-runtime tracing/inference and hashes for all seven pinned browser assets.
- Scoped ESLint: zero errors; two existing unused-variable warnings in signup-page.tsx.
- Production-build browser checks passed on desktop (1440×1000) and mobile (390×844) using fake camera hardware, synthetic landmark geometry, and intercepted API responses. Covered automatic three-view captures, comparison rejection/retry, preserved side photos, Back/edit, account security, OTP and registration fields. No browser errors or real account/SMS mutations.
- Actual bundled CPU Face Landmarker loaded in Chromium from the production build and returned zero faces for a white 640×360 frame. Five same-origin asset requests; zero page errors. No personal photos used.

Independent review identified slow-device hold starvation and accepting an in-flight frame after backgrounding. Fixes allow up to 1,000 ms between samples while requiring four stable detections, recheck camera state after inference, and terminate stalled worker inference after ten seconds. Regression tests passed after reproducing the failures.

## Limits

Geometry checks provide capture guidance. They do not certify liveness, document authenticity or face-match accuracy. No accuracy evaluation on real people was performed, and the personal photos supplied in chat were not used for tests. Camera fallback paths have controlled lifecycle tests; the actual model smoke test used Chromium's CPU worker. Live release checks are performed after deployment from a tracked main-branch snapshot.
