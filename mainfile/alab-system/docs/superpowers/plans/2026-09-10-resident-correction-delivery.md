# Resident Correction Delivery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Notify residents through in-app notifications, PhilSMS, and Resend email when Municipal BFP requests application corrections.

**Architecture:** The correction transaction inserts retry-safe outbound delivery jobs alongside the application decision. After commit, the API processes those jobs through focused PhilSMS and Resend adapters and returns safe per-channel results to the reviewer UI.

**Tech Stack:** Next.js 16 route handlers, TypeScript, PostgreSQL, PhilSMS REST API, Resend REST API, Node test runner.

**Spec:** `docs/superpowers/specs/2026-09-10-resident-correction-delivery-design.md`

## Global Constraints

- External provider failure must not roll back a saved correction decision.
- Provider credentials stay in server-only environment variables.
- SMS must not contain the full correction reason or identity-document details.
- Email HTML must escape all dynamic values.
- Delivery jobs must be idempotent and safe to retry.

---

### Task 1: Delivery queue schema and repository

**Files:**
- Create: `supabase/migrations/20260910090000_add_resident_notification_deliveries.sql`
- Create: `lib/resident-applications/delivery-queue.ts`
- Create: `tests/resident-correction-delivery.test.mjs`

**Interfaces:**
- Produces: `enqueueResidentCorrectionDeliveries(client, input): Promise<string[]>`
- Produces: `claimResidentCorrectionDeliveries(ids): Promise<DeliveryJob[]>`
- Produces: `completeResidentCorrectionDelivery(id, result): Promise<void>`

- [ ] **Step 1: Write a failing schema/source test** asserting the migration has SMS/email channels, `PENDING|PROCESSING|SENT|FAILED` states, attempt metadata, safe error fields, and a unique dedupe key.
- [ ] **Step 2: Run `node --test tests/resident-correction-delivery.test.mjs`** and confirm it fails because the migration and repository do not exist.
- [ ] **Step 3: Add the additive migration and repository** with parameterized queries, `FOR UPDATE SKIP LOCKED`, capped attempts, and deduplicated inserts.
- [ ] **Step 4: Run the focused test** and confirm it passes.

### Task 2: PhilSMS and Resend provider adapters

**Files:**
- Modify: `lib/sms/philsms.ts`
- Create: `lib/email/resend.ts`
- Create: `lib/resident-applications/correction-messages.ts`
- Modify: `tests/resident-correction-delivery.test.mjs`

**Interfaces:**
- Produces: `sendPhilSmsMessage({ phone, message }): Promise<{ providerId: string | null }>`
- Produces: `sendResendEmail({ to, subject, html, text, idempotencyKey }): Promise<{ providerId: string }>`
- Produces: `createCorrectionMessages(input): { sms: string; emailSubject: string; emailHtml: string; emailText: string }`

- [ ] **Step 1: Add failing tests** for Philippine number normalization, PhilSMS request shape, Resend authorization/idempotency headers, HTML escaping, and privacy-safe SMS content.
- [ ] **Step 2: Run the focused test** and confirm the missing adapters fail it.
- [ ] **Step 3: Implement the provider adapters with native `fetch`** using `PHILSMS_API_TOKEN`, `PHILSMS_SENDER_ID`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, and `NEXT_PUBLIC_APP_URL`.
- [ ] **Step 4: Implement correction message rendering** with escaped dynamic values and a resident application link.
- [ ] **Step 5: Run the focused test** and confirm it passes.

### Task 3: Connect delivery to the correction transaction and API

**Files:**
- Modify: `lib/resident-applications/service.ts`
- Create: `lib/resident-applications/delivery-service.ts`
- Modify: `app/api/municipal-bfp/resident-applications/[applicationId]/request-corrections/route.ts`
- Modify: `tests/resident-correction-delivery.test.mjs`

**Interfaces:**
- Changes: `requestResidentApplicationCorrections(...)` returns the saved application plus queued delivery IDs and resident contact details.
- Produces: `deliverResidentCorrectionNotifications(ids): Promise<ChannelDeliveryResult[]>`
- API returns: `{ application, delivery: { sms, email } }`.

- [ ] **Step 1: Add failing tests** that require destinations to come from the locked municipality-scoped resident row and jobs to be created in the same transaction.
- [ ] **Step 2: Add a failing test** requiring provider processing after the transaction and a successful correction response even when providers fail.
- [ ] **Step 3: Run the focused test** and confirm both behaviors are absent.
- [ ] **Step 4: Extend the locked row and correction transaction** to enqueue both jobs with unique keys.
- [ ] **Step 5: Implement the delivery coordinator** to claim, send, and mark each channel independently.
- [ ] **Step 6: Update the route** to return safe channel results after the correction commit.
- [ ] **Step 7: Run the focused test** and confirm it passes.

### Task 4: Municipal delivery feedback and verification

**Files:**
- Modify: `app/municipal-bfp/verification-queue/page.tsx`
- Modify: `tests/resident-correction-delivery.test.mjs`
- Modify: `README.md`

**Interfaces:**
- Consumes: `{ delivery: { sms: DeliveryStatus; email: DeliveryStatus } }` from the correction endpoint.

- [ ] **Step 1: Add a failing UI source test** requiring saved-correction confirmation plus distinct SMS and email delivery feedback.
- [ ] **Step 2: Run the focused test** and confirm the feedback is absent.
- [ ] **Step 3: Update the correction action UI** to show success, pending/retry, or configuration failure without implying the correction failed.
- [ ] **Step 4: Document required environment variables** without including any credential values.
- [ ] **Step 5: Run `node --test tests/resident-correction-delivery.test.mjs`** and confirm it passes.
- [ ] **Step 6: Run `npm test`, `npm run lint`, `npx tsc --noEmit`, and `npm run build`** and fix only failures caused by this feature.
- [ ] **Step 7: Review `git diff --check` and the final diff**, then commit and push `main` for Vercel deployment.
