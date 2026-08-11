# PhilSMS OTP Registration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Verify a resident phone with PhilSMS before creating the resident account.

**Architecture:** Existing custom authentication remains. A pending registration and HMAC-hashed OTP live in Supabase PostgreSQL until verification succeeds and the existing transaction creates the resident records.

**Tech Stack:** Next.js 16, React 19, TypeScript, PostgreSQL via `pg`, Supabase, Node `crypto`, PhilSMS REST API.

## Global Constraints

- Server-only secrets: `PHILSMS_API_TOKEN`, `PHILSMS_SENDER_ID`, and `OTP_SECRET`; never use a `NEXT_PUBLIC_` prefix.
- Six digits, five-minute expiry, 60-second resend cooldown, and five failed attempts.
- Store an HMAC hash only; never save or return the plaintext OTP. Hash the password before it enters the pending JSON payload.
- Do not create a resident account until successful verification.

### Task 1: Pending OTP schema

**Files:** Create `mainfile/alab-system/supabase/migrations/20260812090000_add_registration_otps.sql`; modify `mainfile/alab-system/tests/supabase-schema.test.mjs`.

- [ ] Write a failing schema test matching `create table public.registration_otps`, `code_hash text not null`, `attempt_count integer not null default 0`, and its phone/expiry index.
- [ ] Run `node --test tests/supabase-schema.test.mjs`; expect the missing migration test to fail.
- [ ] Add the table with UUID primary key, normalized phone, JSONB payload, HMAC code hash, expiry, attempt count check, send/consume timestamps, RLS, and `(phone, expires_at desc)` index.
- [ ] Re-run the test; expect pass. Commit: `feat: add pending registration OTP schema`.

### Task 2: OTP and PhilSMS server modules

**Files:** Create `mainfile/alab-system/lib/auth/registration-otp.ts`, `mainfile/alab-system/lib/sms/philsms.ts`, and `mainfile/alab-system/tests/registration-otp.test.mjs`.

- [ ] Write failing tests for converting `09171234567` to `639171234567`, six-digit code generation, and HMAC verification success/failure.
- [ ] Run `node --test tests/registration-otp.test.mjs`; expect missing-module failure.
- [ ] Implement `normalizePhilippinePhone`, `createOtpCode`, `hashOtp`, `verifyOtpHash`, and server-only `sendPhilSmsOtp` using PhilSMS `/api/v3/sms/send`.
- [ ] Re-run tests; expect pass. Commit: `feat: add PhilSMS OTP helpers`.

### Task 3: Start and verify endpoints

**Files:** Create `mainfile/alab-system/app/api/auth/register/start/route.ts` and `verify/route.ts`; extract shared registration validation/persistence from `register/route.ts`; modify `tests/resident-auth-security.test.mjs`.

- [ ] Write failing source-contract tests asserting both routes exist, start uses `sendPhilSmsOtp` and persists `registration_otps`, while verify checks attempts/expiry then inserts users.
- [ ] Run `node --test tests/resident-auth-security.test.mjs`; expect failure.
- [ ] Implement start: validate, check duplicates, hash the password, supersede old pending request, HMAC/store new code, then send SMS.
- [ ] Implement verify: lock pending record, reject expired/used/locked code, atomically increase invalid attempts, consume valid code, run existing resident transaction, and set the existing session cookie.
- [ ] Re-run focused tests; expect pass. Commit: `feat: verify resident registration by OTP`.

### Task 4: Branded OTP signup UI

**Files:** Modify `mainfile/alab-system/app/_components/signup-page.tsx`, `app/_content/signup-content.ts`, and `tests/resident-signup-validation.test.mjs`.

- [ ] Write a failing test for calls to `/api/auth/register/start` and `/verify`, `otpDigits` state, `resendOtp`, and accessible OTP digit labels.
- [ ] Run `node --test tests/resident-signup-validation.test.mjs`; expect failure.
- [ ] Add the ALAB-red OTP verification panel: six keyboard-friendly digit inputs, masked phone, countdown, resend cooldown, clear Back/Edit action, loading state, and error/success feedback.
- [ ] Re-run the test; expect pass. Commit: `feat: add branded resident OTP signup UI`.

### Task 5: Verification

- [ ] Run `node --test tests/registration-otp.test.mjs tests/resident-auth-security.test.mjs tests/resident-signup-validation.test.mjs tests/supabase-schema.test.mjs`; expect all pass.
- [ ] Run `npm run build`; expect a successful Next.js production build.
- [ ] Mark this plan complete and commit the documentation verification record.
