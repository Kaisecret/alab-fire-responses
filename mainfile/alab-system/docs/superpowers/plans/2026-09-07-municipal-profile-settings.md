# Municipal BFP Profile & Settings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable Municipal BFP officers to update their profile details (display name, rank/position), upload or reset their profile picture/avatar, change password securely, and enjoy a modern, unique civic-emergency UI adhering to UI/UX Pro Max and Impeccable guidelines.

**Architecture:** Extend backend BFP accounts library to update display name and rank with session refresh; add municipal profile photo upload & removal routes using Supabase `bfp-profile-photos` storage; revamp `/municipal-bfp/profile` with an interactive officer badge, live photo studio, quick-rank chips, in-page security modal/drawer, and sleek toast alerts.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, PostgreSQL (pg), Supabase Storage, Vanilla CSS Design System, Node test runner.

**Spec:** [docs/superpowers/specs/2026-09-07-municipal-profile-settings-design.md](file:///c:/Users/janna/OneDrive/Documents/Bestcapstone%20for%20us/mainfile/alab-system/docs/superpowers/specs/2026-09-07-municipal-profile-settings-design.md)

## Global Constraints

- Must follow `/using-superpowers` with explicit user approval before implementation.
- Must preserve all existing assertions in `tests/municipal-notification-settings.test.mjs`.
- High visual aesthetics: crisp typography, ALAB civic red accents (`#E23632`), slate darks (`#0F172A`), no pure black/gray, and minimal text clutter ("less text make it nice").
- Must support photo upload (JPEG, PNG, WebP up to 5MB) and reverting to the default avatar.
- Zero TypeScript diagnostics errors (`npx tsc --noEmit`) and 100% passing tests (`npm test`).

---

### Task 1: Backend Profile & Photo Management APIs

**Files:**
- Modify: `lib/auth/bfp-accounts.ts`
- Modify: `lib/auth/bfp-profile-photos.ts`
- Modify: `app/api/municipal-bfp/me/route.ts`
- Create: `app/api/municipal-bfp/profile/photo/route.ts`
- Create: `tests/municipal-profile-settings.test.mjs`

- [ ] **Step 1: Write the failing automated tests**
  Create `tests/municipal-profile-settings.test.mjs` asserting:
  - `PATCH /api/municipal-bfp/me` updates display name and rank, refreshes session cookie, and returns updated user.
  - `POST /api/municipal-bfp/profile/photo` validates photo and uploads to Supabase storage.
  - `DELETE /api/municipal-bfp/profile/photo` removes custom photo and clears URL cache.
  - `GET /api/municipal-bfp/me` includes `photoUrl`.

- [ ] **Step 2: Run test to verify failure**
  Run: `node --test tests/municipal-profile-settings.test.mjs`
  Expected: FAIL

- [ ] **Step 3: Implement backend functions & endpoints**
  - In `lib/auth/bfp-accounts.ts`: Export `updateBfpProfile(userId, { displayName, rankOrPosition })`.
  - In `lib/auth/bfp-profile-photos.ts`: Export `deleteBfpProfilePhoto(userId)`.
  - In `app/api/municipal-bfp/me/route.ts`:
    - In `GET`: Include `photoUrl: await createBfpProfilePhotoUrl(session.userId)`.
    - Add `PATCH`: Validate session, invoke `updateBfpProfile`, re-issue session cookie with new display name, and return updated user.
  - In `app/api/municipal-bfp/profile/photo/route.ts`:
    - Add `POST`: Handle multipart upload, call `uploadBfpProfilePhoto`, return `{ ok: true, photoUrl }`.
    - Add `DELETE`: Remove photo via `deleteBfpProfilePhoto`, return `{ ok: true, photoUrl: null }`.

- [ ] **Step 4: Run test to verify it passes**
  Run: `node --test tests/municipal-profile-settings.test.mjs`
  Expected: PASS

---

### Task 2: Ultra-Modern, Interactive Profile & Settings UI

**Files:**
- Modify: `app/municipal-bfp/profile/page.tsx`
- Modify: `app/_components/municipal-bfp-layout.tsx` (optional display photo in sidebar footer if available)
- Test: `tests/municipal-notification-settings.test.mjs`
- Test: `tests/municipal-profile-settings.test.mjs`

- [ ] **Step 1: Enhance `app/municipal-bfp/profile/page.tsx`**
  - Implement Officer Command Badge:
    - Interactive Avatar Studio with photo display, hover camera overlay, file picker trigger, and "Reset to Default" button.
    - Prominent officer name and rank badge with live "Active Duty" pulse pill (`#10B981`).
    - Inline quick-edit mode for Officer Display Name and Rank/Position.
    - Quick-select rank chips: `Municipal Fire Marshal`, `Senior Fire Officer`, `Fire Inspector`, `Fire Officer` + custom field.
    - Action buttons: "Save Profile" (with loading state) and "Cancel".
  - Implement Security & Password Section:
    - Clean status pill ("Active / Secure").
    - "Update Password" button triggering an inline drawer/modal with Current Password, New Password, Confirm Password, visibility toggle, and 12-char validation.
    - Submission to `/api/auth/bfp/change-password`.
  - Implement Streamlined Notification Status Card:
    - Crisp "Live Dispatch Sync • 5s" heartbeat badge.
    - Minimal coverage indicators with smooth hover glow.
    - Direct action to notification center.
  - Implement Floating Toast Feedback system:
    - Smooth slide-in toast for success / error alerts without layout shift.
  - Ensure all required CSS classes and DOM markers (`.municipal-settings__avatar`, `data-municipal-profile-avatar`, neutral avatar colors) are preserved for existing tests.

- [ ] **Step 2: Verify existing tests and new tests**
  Run: `node --test tests/municipal-notification-settings.test.mjs tests/municipal-profile-settings.test.mjs`
  Expected: PASS (All assertions satisfied)

---

### Task 3: Full Verification, TypeScript Check & Deployment

**Files:**
- All modified files

- [ ] **Step 1: Run TypeScript check**
  Run: `npx tsc --noEmit`
  Expected: Zero errors

- [ ] **Step 2: Run entire test suite**
  Run: `npm test`
  Expected: All 272+ tests pass

- [ ] **Step 3: Commit and push**
  Run:
  `git add .`
  `git commit -m "feat(municipal-bfp): interactive profile settings, avatar studio and modern ui"`
  `git push origin main`
