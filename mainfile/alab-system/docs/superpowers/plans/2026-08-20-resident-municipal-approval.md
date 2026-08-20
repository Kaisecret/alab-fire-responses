# Resident Municipal Approval Implementation Plan

> **For Codex:** Execute this plan test-first. Preserve existing resident/BFP session separation and municipality scoping.

**Goal:** Require Municipal BFP approval of a resident's identity application before full resident login, while supporting protected ID review, correction requests, and resubmission.

**Architecture:** Extend `users.account_status` and `resident_verifications`; keep immutable review attempts and audit events. Registration stores private originals plus server-generated watermarked review images, creates a pending applicant account, and issues a limited applicant cookie. Municipal APIs authorize the signed BFP assignment and scope every query/update through the resident's primary municipality. Full resident sessions are issued only to `ACTIVE` accounts.

**Tech Stack:** Next.js 16 App Router, React 19, PostgreSQL/Supabase Storage, `sharp`, signed HTTP-only cookies.

---

### Task 1: Approval schema and tests

- [ ] Add failing source/migration tests in `tests/resident-municipal-approval.test.mjs`.
- [ ] Add `supabase/migrations/20260820090000_add_resident_municipal_approval.sql` with pending-account state, correction state, evidence metadata, application reference, event history, FK indexes, and municipality queue index.
- [ ] Run the focused test and confirm it passes.

### Task 2: Protected evidence pipeline

- [ ] Add failing tests for evidence validation and a visible watermarked derivative.
- [ ] Add `sharp` as a direct dependency.
- [ ] Add `lib/resident-applications/evidence.ts` to validate image MIME/size/decoding, hash originals, generate tiled review-only watermarks, upload originals/review derivatives, produce signed review URLs, and clean up partial uploads.
- [ ] Keep originals private and never return original object keys or URLs to the municipal client.

### Task 3: Limited applicant session and login gate

- [ ] Extend `lib/auth/session.ts` with a signed `alab_resident_application` cookie and verifier.
- [ ] Update resident login and Google callback so `PENDING_REVIEW` accounts receive only applicant access and a typed approval/correction response.
- [ ] Keep existing `ACTIVE` residents working and continue blocking suspended accounts.

### Task 4: Multipart registration and under-review completion

- [ ] Retain the captured selfie Blob in `app/_components/signup-page.tsx`.
- [ ] Submit front ID, optional back ID, and selfie as `FormData` after OTP verification.
- [ ] Update `app/api/auth/register/route.ts` to upload evidence, create `PENDING_REVIEW` user/profile/address/verification/event rows transactionally, and issue only the applicant cookie.
- [ ] Replace the immediate resident redirect with an accessible ALAB under-review success state.

### Task 5: Municipality-scoped Municipal BFP review API

- [ ] Add `lib/resident-applications/service.ts` with latest-application list/detail and transactional approval/correction commands.
- [ ] Add `app/api/municipal-bfp/resident-applications/route.ts` and `[applicationId]`, `approve`, and `request-corrections` handlers.
- [ ] Require the signed municipal BFP session and active database assignment for every call; constrain every operation to that municipality.

### Task 6: Municipal resident-application UI

- [ ] Replace the static fire verification queue with a real Resident Applications workspace.
- [ ] Add a compact queue, status filters, application detail dialog, watermarked evidence viewer, Approve action, and required correction-reason dialog.
- [ ] Use amber for review, red for corrections, green only for approved; never display “Verified” before approval.

### Task 7: Resident status and correction/resubmission UI

- [ ] Add applicant-only status/detail and resubmission APIs.
- [ ] Add `/resident/application` with Under review, Approved, and Changes requested states.
- [ ] Allow requested profile/address/ID corrections and create a new immutable verification attempt on resubmission.
- [ ] Clear applicant access and allow normal resident login after approval.

### Task 8: Integration and verification

- [ ] Update proxy/public-route behavior for the applicant status page without granting access to other resident pages.
- [ ] Run focused tests, full `npm test`, `npm run lint`, and `npm run build`.
- [ ] Inspect the final diff for secrets and unrelated changes.
- [ ] Commit the feature, merge it into `main`, push GitHub `main`, and report the Supabase migration/storage prerequisites.
