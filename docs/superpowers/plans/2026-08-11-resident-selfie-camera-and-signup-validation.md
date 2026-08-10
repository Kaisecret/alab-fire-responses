# Resident Selfie Camera and Signup Validation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the embedded selfie preview with a responsive capture screen and prevent generic required-field blocks in resident registration.

**Architecture:** Sign-up markup owns the accessible camera dialog and styles. The React effect owns media streams, capture/review state, and final validation. Node source tests assert the required UI contract.

**Tech Stack:** Next.js 16, React 19, TypeScript, Node test runner.

## Global Constraints

- The camera stays inside sign-up; it never opens a browser tab.
- Camera tracks must stop when capture is closed, cancelled, or confirmed.
- Phone view is full screen at `max-width: 950px`; desktop uses a centered modal.
- Leave existing unrelated resident-report work untouched.

---

### Task 1: Write regression tests

**Files:**

- Modify: `mainfile/alab-system/tests/resident-selfie-camera.test.mjs`
- Create: `mainfile/alab-system/tests/resident-signup-validation.test.mjs`

- [ ] **Step 1: Add failing source assertions**

```js
assert.match(markup, /role="dialog"/);
assert.match(markup, /id="useSelfie"/);
assert.match(markup, /<form id="signupForm" novalidate>/);
assert.match(component, /const validateRegistration = \(\) => \{/);
```

- [ ] **Step 2: Verify red**

Run `node --test tests/resident-selfie-camera.test.mjs tests/resident-signup-validation.test.mjs`.

Expected: failure because the dialog, review controls, `novalidate`, and final validator do not yet exist.

### Task 2: Implement capture dialog

**Files:**

- Modify: `mainfile/alab-system/app/_content/signup-content.ts`
- Modify: `mainfile/alab-system/app/_components/signup-page.tsx`
- Test: `mainfile/alab-system/tests/resident-selfie-camera.test.mjs`

- [ ] **Step 1: Replace the embedded panel with an accessible dialog**

```html
<div id="selfieCameraPanel" class="selfie-camera-panel" role="dialog" aria-modal="true" aria-hidden="true">
  <video id="selfieVideo" autoplay playsinline muted></video>
  <img id="selfiePreview" hidden alt="Your captured verification selfie">
  <button id="captureSelfie" type="button" aria-label="Capture selfie"></button>
  <button id="retakeSelfie" type="button" hidden>Retake</button>
  <button id="useSelfie" type="button" hidden>Use this selfie</button>
</div>
```

- [ ] **Step 2: Style the dialog**

```css
.selfie-camera-panel { position: fixed; inset: 0; display: none; place-items: center; background: rgba(9,12,18,.78); z-index: 1000; }
.selfie-camera-panel.active { display: grid; }
@media (max-width: 950px) { .selfie-camera-panel { padding: 0; } .selfie-camera-card { width: 100%; height: 100%; border-radius: 0; } }
```

- [ ] **Step 3: Implement capture, retake, and confirm handlers**

```ts
const showSelfieReview = (dataUrl: string) => { /* show preview and confirmation controls */ };
const handleUseSelfie = () => { stopSelfieCamera(); showSelfieCaptured(); };
const handleRetakeSelfie = async () => { /* hide preview and resume camera */ };
```

- [ ] **Step 4: Verify green**

Run `node --test tests/resident-selfie-camera.test.mjs`. Expected: PASS.

### Task 3: Implement step-aware final validation

**Files:**

- Modify: `mainfile/alab-system/app/_content/signup-content.ts`
- Modify: `mainfile/alab-system/app/_components/signup-page.tsx`
- Test: `mainfile/alab-system/tests/resident-signup-validation.test.mjs`

- [ ] **Step 1: Mark the multi-step form as `novalidate`**

```html
<form id="signupForm" novalidate>
```

- [ ] **Step 2: Add `validateRegistration` before submit**

```ts
const validateRegistration = () => {
  for (const [index, panel] of panels.entries()) {
    if (!validateStep(panel)) { goToStep(index + 1); return false; }
  }
  if (!frontFile || !selfieTaken || passwordField?.value !== confirmField?.value || !termsCheck?.checked) return false;
  return true;
};
```

- [ ] **Step 3: Make `handleSubmit` use it before the API call**

```ts
e.preventDefault();
formStatus.textContent = "";
if (!validateRegistration()) return;
```

- [ ] **Step 4: Verify green**

Run `node --test tests/resident-selfie-camera.test.mjs tests/resident-signup-validation.test.mjs`. Expected: PASS.

### Task 4: Verify build and commit

- [ ] **Step 1: Run tests and build**

Run `node --test tests/resident-selfie-camera.test.mjs tests/resident-signup-validation.test.mjs && npm run build --prefix mainfile/alab-system`.

Expected: both tests pass and the build exits with code 0.

- [ ] **Step 2: Review and commit**

Run `git diff --check`, then commit only the selfie dialog, validation, and their tests with message `feat: improve resident selfie and signup validation`.

