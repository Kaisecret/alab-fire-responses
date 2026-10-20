# Side selfie framing

Right and left camera views now hide the oval and accept a usable, fully visible face anywhere in the camera preview. A short note explains the free positioning, existing arrows guide a gentle turn, and a small progress bar shows the steady hold. The front view keeps its oval and original framing checks, including when retaking the front photo.

The cause was shared framing logic: side poses still had to fit and center inside the front-view oval. Side evaluation now ignores the oval entirely, including its zero-sized layout when hidden. It measures positioning and hold movement against the visible video instead. The face must remain inside both the source image and the cover-cropped preview and measure at least 64 by 80 pixels in the actual inference image. CSS enlargement cannot satisfy that minimum.

Automatic capture retains the 900ms/four-detection steady hold, one-face check, finite geometry, correct gentle turn and level-head checks. Model scheduling and reuse, server matching, matching threshold, signed evidence, OTP and signup steps are unchanged.

Verification:

- Regression tests first reproduced the side framing failure, then passed with the fix.
- All 62 focused geometry, runtime, cue and signup interaction tests passed.
- Standard `npm test`: 1,049 passed, zero failures, one database integration skip because `DATABASE_URL` was absent.
- Production build passed TypeScript, native face-runtime verification and all seven pinned guidance asset checksums.
- Scoped ESLint: zero errors and two existing unused-variable warnings in signup-page.tsx.
- Browser signup flows passed at 1440x1000, 390x844, 375x667 and 844x390 with off-center right and left faces and no side oval. Confirmed automatic capture, one reused detector, front retake, mismatch retry, Back/edit, OTP and registration evidence fields, with no browser errors. All APIs were intercepted and all camera geometry was synthetic; no accounts, SMS or personal photos were used.
- Independent review found no Important or Critical issue.

Synthetic geometry verifies the capture behavior and rejection rules. These checks do not measure real-world face-match accuracy or establish certified liveness.
