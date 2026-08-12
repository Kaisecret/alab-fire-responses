# Google Resident Login Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Support Google login for existing residents and prefilled five-step signup for new Google users.

**Architecture:** Supabase handles the Google OAuth exchange in a server callback. The callback links the verified Google subject to a resident account, creates the existing custom resident session for known accounts, or creates a short-lived signed prefill cookie for new accounts.

**Tech Stack:** Next.js 16, React 19, TypeScript, Supabase SSR, PostgreSQL via pg, Node crypto.

## Global Constraints

- Store Google provider identity in a nullable unique `users.google_subject` column.
- Link by email only when Supabase returns a verified Google email.
- Never expose Google Client Secret, Supabase secret key, OAuth code, or Supabase access token.
- Preserve the current five-step signup, required ID/selfie, and phone OTP verification.
- Existing protected resident pages continue using the current signed resident session.

---

### Task 1: Google identity schema and tests

**Files:** Create `mainfile/alab-system/supabase/migrations/20260813090000_add_google_resident_identity.sql`; modify `mainfile/alab-system/tests/supabase-schema.test.mjs`.

- [x] Write a failing test matching `add column if not exists google_subject text` and a unique index.
- [x] Run `node --test tests/supabase-schema.test.mjs`; expect failure.
- [x] Add nullable `google_subject` and a partial unique index for non-null values.
- [x] Re-run test; expect pass.

### Task 2: OAuth routes and identity linking

**Files:** Create `mainfile/alab-system/app/auth/callback/route.ts` and `app/api/auth/google/start/route.ts`; modify `lib/auth/session.ts`, `app/api/auth/register/route.ts`, and `tests/resident-auth-security.test.mjs`.

- [x] Write failing contract tests for OAuth initiation, server code exchange, verified-email lookup, Google-subject link, resident session, and signed signup-prefill cookie.
- [x] Run `node --test tests/resident-auth-security.test.mjs`; expect failure.
- [x] Implement start redirect, callback, existing-account custom session, safe new-user prefill cookie, and Google-subject persistence at successful registration.
- [x] Re-run test; expect pass.

### Task 3: Login and signup UI integration

**Files:** Modify `mainfile/alab-system/app/_components/login-page.tsx`, `app/_components/signup-page.tsx`, and `tests/resident-signup-validation.test.mjs`.

- [x] Write failing tests asserting Google button redirects to `/api/auth/google/start` and signup consumes Google prefill while retaining ID/OTP requirements.
- [x] Run `node --test tests/resident-signup-validation.test.mjs`; expect failure.
- [x] Replace placeholder alert with OAuth redirect and add Google-prefill notice/name/email behavior in Step 1.
- [x] Re-run test; expect pass.

### Task 4: Final verification

- [x] Run `node --test tests/supabase-schema.test.mjs tests/resident-auth-security.test.mjs tests/resident-signup-validation.test.mjs`.
- [x] Run `npm run build`.
- [x] Commit and push the verified result to GitHub `main` for Vercel.
