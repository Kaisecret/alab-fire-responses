# Resident Correction Form and Camera Selfie Implementation Plan

> **For agentic workers:** Use `superpowers:executing-plans` to implement this plan task by task. Check off steps only after verifying their results.

**Goal:** Give residents a polished correction form that preserves their work after a failed request and confirms when their application is back under review.

**Architecture:** Keep the resident application page, existing camera component, bounded JSON request helper, and protected evidence API. Improve the form and recovery flow; investigate the server failure before selecting its root-cause fix.

**Tech stack:** Next.js, React, TypeScript, browser MediaDevices and canvas, existing identity evidence processing, Node test runner.

**Spec:** The screenshot-specific design and acceptance requirements below extend the original September 15 loading and camera-only selfie request.

**Revision:** September 15, 2026. The latest screenshot shows selected ID files, a confirmed selfie, an HTTP 500 message, an unstyled status-check button, and fixed resident navigation.

## 1. Current status

| Area | Evidence in current source | Remaining work |
| --- | --- | --- |
| Bounded requests | Status reads time out after 20 seconds; correction POST requests after 60 seconds. | Preserve these bounds and improve recovery. |
| Submission loading | The page catches failures, clears saving in `finally`, and prevents overlapping POST requests. | Coordinate status checks with submission and uncertain outcomes. |
| Success response | Successful POST responses move the resident to `PENDING` immediately and include `submittedAt`. | Verify the deployed resident and municipal flows. |
| Camera-only selfie | `ResidentSelfieCapture` already opens a full-screen camera and returns a confirmed file under `selfie`. | Refine presentation and verify lifecycle/accessibility behavior. |
| ID uploads | Native file controls sit inside dashed red containers. | Add accessible selected-file states and consistent actions. |
| Recovery | Errors appear as bold red text with a browser-default status-check button. | Add a readable recovery panel and checking state. |
| HTTP 500 | The screenshot wording is the helper's fallback when no usable JSON `error` string is available. | Inspect the failing response and server logs; the screenshot alone does not identify its cause. |

**Plan status:** This revision updates the plan. The UI and server work below remain pending. Earlier test/lint results are historical; rerun checks before reporting implementation complete.

### Global constraints

- Preserve ALAB branding, the existing font, resident navigation, and municipal review workflow.
- Front ID is required; back ID is optional. Keep JPEG, PNG, and WebP support and the existing 6 MiB per-image limit.
- Require explicit confirmation of a camera selfie. Offer no selfie file picker, gallery, paste, or drag/drop path.
- Preserve entered details, selected IDs, and the confirmed selfie after recoverable failures while this page remains open. Do not promise persistence after refresh or sign-out.
- Require a fresh confirmed selfie for a new correction round. Reuse the confirmed photo when retrying the same unsent corrections; retaking clears confirmation.
- Never automatically repeat a POST after timeout, connection failure, invalid success response, or HTTP 5xx. Client timeout does not cancel server processing.
- Preserve protected storage, server image validation, and review watermarking. Do not log identity images, form contents, cookies, credentials, or full request bodies.
- Camera-only UI does not prove liveness; filenames, EXIF, and client capture flags cannot establish it.
- Before implementation, read `mainfile/alab-system/AGENTS.md` and the installed Next.js guides it requires.

## 2. Visual design for the reported screen

### Layout and hierarchy

Use one calm form surface with **Your details**, **Valid ID**, and **New selfie** sections. Use 16–18px headings, 14–16px body text, and line height of at least 1.5. Provide 16px horizontal padding on narrow screens, 24px between sections, and 12px between related controls. Keep two-column fields on wider screens and one column below 640px.

Use neutral solid borders for normal upload states. Reserve red for actual errors and the primary ALAB action, and green for a small selfie-ready indicator. Avoid nested outlines and a large red error competing with the submit button.

### ID upload controls

Each upload row contains a label, short hint, and styled selection action. After selection, show a small preview, filename, file size, and **Change photo**. Add **Remove** for the optional back image.

| Element | Copy |
| --- | --- |
| Front label | Front of ID · Required |
| Back label | Back of ID · Optional |
| Empty actions | Choose front photo / Choose back photo |
| Shared helper | JPG, PNG or WebP. Up to 6 MB per photo. |

Enforce the existing 6 MiB limit in code.

- Retain real file inputs, their `name`, `accept`, and required behavior. Associate each with a visible label or accessible button.
- Keep controls keyboard-operable; do not make a required file input unfocusable with `display: none`. Link field errors with `aria-describedby`.
- Wrap or truncate long filenames within a `min-width: 0` container; keep the full name available to assistive technology.
- Show type/size errors below the affected upload instead of in the server-error panel.
- Ensure replacement changes the submitted file. Removing the back image clears its input, preview, and submission value. Revoke discarded preview URLs.

### Selfie section

Use **New selfie** with helper text **Take a clear photo with your camera so we can review your identity.** Preserve the existing full-screen camera and **Use this photo** confirmation.

After confirmation, show a neutral row containing a 56–64px thumbnail, a green check with **Selfie ready**, and a clearly labeled **Retake** button. This confirms photo selection without implying identity approval. Retake clears the accepted photo and disables submission until the replacement is confirmed.

### Recovery panel and actions

Replace the raw red HTTP message and browser-default button with a subtle tinted panel above the primary action:

```text
We couldn't confirm your submission
Your details and photos are still here. Check your application
status before trying again.

[ Check application status ]
```

- Use a small error icon, a 15–16px semibold title, and normal-weight supporting text. Announce the panel once with `role="alert"`.
- Style **Check application status** as a full-width outlined button at least 44px high. While running, show **Checking status…** and disable repeat checks and submission.
- Put HTTP status and a safe request reference, when available, inside a small expandable **Technical details** area. Never render raw HTML, stack traces, or database/storage messages.
- After an uncertain POST outcome, require a successful fresh status read before allowing a deliberate retry. If status is `PENDING` or approved, leave the correction form. If still `CHANGES_REQUESTED`, retain evidence and show **Corrections are still requested. You can try submitting again.** A status read does not guarantee that an earlier POST has stopped processing.
- If checking fails, preserve the form and show **We couldn't check your status. Try checking again.** Keep the check action available.
- Keep validation errors specific to their fields. For an expired session, provide a styled sign-in action and explain that leaving the page requires selecting photos again.
- Keep **Resubmit for review** as the single filled red action, 48–52px high, with a modest shadow. While submitting, use **Submitting corrections…** and a small spinner.
- Disable editable details and evidence actions while submitting or checking status. Announce progress using `role="status"` and respect reduced motion.

### Mobile and accessibility

- Preserve bottom safe-area padding for fixed navigation, including the raised Report Fire button. The recovery panel and submit action must scroll fully above it.
- Inspect 320, 375, 390, and 430px widths plus desktop: no horizontal overflow, clipped filenames, overlapping actions, or hidden focus targets.
- Keep interactive targets at least 44px in both dimensions, visible keyboard focus, and adequate text contrast.
- Keep the camera dialog above navigation; trap focus, support Escape/Close, and restore focus to its opening control.

## 3. Files and responsibilities

Paths below are relative to `mainfile/alab-system/`.

| File | Responsibility |
| --- | --- |
| `app/resident/application/page.tsx` | Form styling, ID selection state, recovery panel, coordinated submission/status checks. |
| `app/_components/resident-selfie-capture.tsx` | Existing capture flow, confirmed-photo row, media cleanup, focus behavior. |
| `lib/resident-applications/client-request.ts` | Bounded reads, typed HTTP status, safe response handling; preserve compatibility for other callers. |
| `app/api/resident/application-status/resubmit/route.ts` | Exception boundaries, safe error responses, evidence/transaction coordination. |
| `lib/resident-applications/evidence.ts` | Inspect validation/upload/cleanup; modify only if evidence points here. |
| `tests/resident-correction-loading.test.mjs` | Submission, recovery, and request-bound behavior tests. |
| `tests/resident-selfie-capture.test.mjs` | Existing integration checks; extend with lifecycle behavior coverage. |
| `tests/resident-correction-resubmit.test.mjs` (new) | Route failure injection and successful persistence/response contract. |

## 4. Implementation tasks

### Task 1: Investigate HTTP 500 and close exception-handler gaps

**Files:** Resubmit route, request helper, new route tests. Inspect evidence, database, and notification helpers.

**Known code findings:** Application and barangay queries currently run before the upload/transaction `try/catch`; failures there can escape JSON error handling. The current catch also returns raw `Error.message` and awaits evidence cleanup before responding. These are concrete boundaries to test, not proof of the production cause.

- [ ] Reproduce using an authorized test account and test images. Record timestamp, endpoint, status, content type, safe request reference, and whether a new verification persisted. Inspect matching server logs without saving private evidence or credentials.
- [ ] Trace session validation, form parsing, application lookup, locality lookup, evidence processing/upload, transaction, notification creation, and cleanup. Identify the first failing boundary and the actual exception category.
- [ ] Add failing route tests using `tests/helpers/load-server-module.mjs` with mocked session, database, evidence, and notification modules. Inject application lookup, locality lookup, upload, transaction, and cleanup failures individually. Assert safe JSON responses and that an internal sentinel error string never reaches the resident.
- [ ] Place fallible route work under a top-level error boundary, retaining explicit authentication/validation responses. Prevent cleanup failure from replacing the original response. Never delete evidence belonging to a committed verification.
- [ ] Apply the smallest fix supported by reproduction. If configuration or schema differs on the deployment, record the exact mismatch and required correction; do not apply speculative database changes.
- [ ] Add a success case asserting one persisted `PENDING` verification, the reference/timestamp response, and no evidence cleanup. Assert failed transactions leave no partial verification.
- [ ] Run `node --test tests/resident-correction-resubmit.test.mjs`; require all injected-failure and success cases to pass.

**Deliverable:** Consistent JSON handling for application-owned failures. The original HTTP 500 is only resolved after verifying the evidenced fix; runtime/proxy failures can still bypass application handling.

### Task 2: Preserve evidence and coordinate recovery

**Files:** Application page, request helper if needed, loading tests.

**Interfaces:** Preserve `requestResidentApplicationJson<T>(url, init, timeoutMs)`, `ResidentApplicationRequestError.status`, and FormData fields `firstName`, `lastName`, `barangay`, `address`, `frontId`, `backId`, and `selfie`.

- [ ] Extend behavior tests for HTML HTTP 500, safe JSON HTTP 500, stalled body/timeout, network failure, invalid success body, expired session, failed status read, status still requiring changes, and status becoming `PENDING`. Assert preserved evidence and no automatic second POST.
- [ ] Separate initial-load error, submission error, and checking progress. Track uncertain outcomes explicitly. Guard against overlapping GET/POST operations, repeated checks, and stale responses overwriting newer state.
- [ ] Map failures to the recovery copy in section 2; keep technical details secondary. Check other callers before changing shared helper behavior.
- [ ] Implement the fresh-status requirement and disabled states. Capture FormData before disabling inputs: disabled controls are omitted from native FormData.
- [ ] Keep the correction form mounted while status remains `CHANGES_REQUESTED`. Status refresh must not reset entered fields, selected IDs, or the confirmed selfie.
- [ ] Update existing loading assertions: they currently expect immediate submit re-enabling after network/HTML failure. Uncertain outcomes must require a successful status read first.
- [ ] Run `node --test tests/resident-correction-loading.test.mjs`; verify bounded requests, one request for duplicate clicks, retained evidence, and immediate transition after confirmed success.

**Deliverable:** Residents see a clear next action and keep their work during recovery.

### Task 3: Polish the form and verify camera behavior

**Files:** Application page, existing selfie capture component, related behavior tests.

**Interface:** Preserve `ResidentSelfieCapture({ onCapture, disabled })` with `onCapture(file: File | null)`. Only **Use this photo** supplies a file. Retaking clears it until reconfirmation.

- [ ] Implement the layout, upload states, selfie-ready row, recovery panel, and action hierarchy in section 2 using existing local styling.
- [ ] Replace invalid button shorthand such as `font:800 1rem inherit` with separate `font-family: inherit`, `font-size`, and `font-weight` declarations in touched controls.
- [ ] Validate type/size before accepting a replacement; preserve server decoding as authoritative. Test that an invalid selection cannot leave displayed and submitted evidence out of sync.
- [ ] Add behavior tests for changing/removing ID files, object URL cleanup, and selfie confirmation/retake. Inspect submitted FormData. Ensure all secondary actions use `type="button"`.
- [ ] Verify capture remains disabled until video has a real frame. Cover permission denial/retry, missing/busy camera, zero-size video, encoding failure, and cancellation while permission or encoding is pending.
- [ ] Stop streams on all error/cancel/unmount paths and ignore late results from a cancelled capture attempt. Revoke discarded preview URLs.
- [ ] Verify dialog focus trapping/restoration and keyboard access throughout. Existing source-pattern tests alone do not establish these behaviors.
- [ ] Inspect populated form, confirmed selfie, HTTP 500 recovery, checking, and submitting states at all required viewports. Save before/after screenshots using test images only.

**Deliverable:** Consistent controls, readable spacing, and accessible actions above mobile navigation.

### Task 4: Verify the complete journey

- [ ] From `mainfile/alab-system/`, run focused tests:

```powershell
node --test tests/resident-correction-loading.test.mjs tests/resident-selfie-capture.test.mjs tests/resident-selfie-camera.test.mjs tests/resident-correction-resubmit.test.mjs
```

- [ ] Run TypeScript and changed-file lint:

```powershell
npx tsc --noEmit
npx eslint app/resident/application/page.tsx app/_components/resident-selfie-capture.tsx lib/resident-applications/client-request.ts app/api/resident/application-status/resubmit/route.ts tests/resident-correction-loading.test.mjs tests/resident-selfie-capture.test.mjs tests/resident-correction-resubmit.test.mjs
```

- [ ] Include additional changed files in lint. Record actual failures and pre-existing warnings separately.
- [ ] Verify real mobile and desktop cameras: permission, capture, confirmation, retake, cancellation, stream shutdown, and navigation. Confirm no selfie gallery option.
- [ ] Verify failed requests retain details, selected IDs, and selfie; status checking either shows the saved application or enables deliberate recovery.
- [ ] Confirm successful resubmission shows **Under review** and enters the municipal queue with usable protected, watermarked evidence.
- [ ] Recheck the originally affected deployed flow after deploying the identified fix. Record environment/date; leave unchecked until verified.

## 5. Completion criteria

- [ ] Original HTTP 500 has an evidenced cause and verified fix, or an explicitly recorded external blocker.
- [ ] Neutral upload styling, readable filenames, and clear Change/Remove actions fit narrow screens.
- [ ] Selfie preview and Retake are clear; replacement still requires confirmation.
- [ ] Failures use the designed recovery panel and styled status-check action.
- [ ] Uncertain outcomes never trigger automatic POST retries; status checks cannot overlap submission or erase evidence.
- [ ] Navigation obscures no controls; keyboard and real-camera journeys work.
- [ ] Fresh test, type-check, lint, visual, and device results are recorded. Pending deployment/device work remains unchecked.
