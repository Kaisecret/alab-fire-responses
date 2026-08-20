# Cross-Role In-App Notifications Implementation Plan

> **For Codex:** Execute this plan with `superpowers:executing-plans` and use test-driven development for behavioral code.

**Goal:** Replace hardcoded notification badges and sample content with secure, connected in-app notifications for Resident, Municipal BFP, and Provincial BFP portals, including an authenticated Municipal settings surface.

**Architecture:** Add one server-owned `account_notifications` table, a shared notification service, role-specific APIs using existing signed session cookies, and shared client UI components. Emit notification rows inside the same transaction as reports, responses, application reviews, and account provisioning.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, PostgreSQL/Supabase, custom signed-cookie auth, CSS Modules, Node test runner.

---

## Task 1: Database schema and contracts

**Files:**
- Create through Supabase CLI: the migration file printed by `npx supabase migration new add_account_notifications`
- Create: `lib/notifications/types.ts`
- Test: `tests/account-notifications.test.mjs`

1. Read the official Supabase changelog and relevant migration/RLS docs.
2. Run `npx supabase migration new --help`, then create the migration through the CLI.
3. Write a failing schema test for constraints, recipient indexes, dedupe uniqueness, and RLS.
4. Add the `account_notifications` migration without Data API grants.
5. Add typed notification categories, events, feed items, and API response contracts.
6. Run the focused schema test until it passes.

## Task 2: Server notification service

**Files:**
- Create: `lib/notifications/service.ts`
- Create: `lib/notifications/session.ts`
- Test: `tests/account-notifications.test.mjs`

1. Write failing tests for safe action paths, recipient scoping, feed ownership, unread counts, and mark-read ownership.
2. Implement validated notification creation with dedupe keys.
3. Implement Municipal recipient lookup by active municipality assignment.
4. Implement Provincial recipient lookup by active role.
5. Implement user-scoped feed, unread count, mark-one-read, and mark-all-read queries.
6. Implement Resident, Municipal, and Provincial session resolvers using existing cookies.
7. Run focused tests until green.

## Task 3: Role-specific notification APIs

**Files:**
- Create: `app/api/resident/notifications/route.ts`
- Create: `app/api/municipal-bfp/notifications/route.ts`
- Create: `app/api/provincial-bfp/notifications/route.ts`
- Test: `tests/account-notifications.test.mjs`

1. Write failing route contract tests for GET and PATCH ownership behavior.
2. Implement role-specific handlers deriving the user from the signed session.
3. Support `limit`, unread count, mark-one-read, and mark-all-read.
4. Return controlled 401, 400, and 500 responses without exposing private data.
5. Run focused tests until green.

## Task 4: Emit connected notification events

**Files:**
- Modify: `lib/fire-reports/service.ts`
- Modify: `app/api/municipal-bfp/incidents/[id]/respond/route.ts`
- Modify: `lib/resident-applications/service.ts`
- Modify the resident application submission and resubmission routes discovered during implementation
- Modify: `lib/auth/bfp-accounts.ts`
- Test: `tests/account-notifications.test.mjs`

1. Write failing tests asserting every approved event emits a short, deduplicated notification.
2. Notify assigned Municipal and Provincial users after a fire report is saved.
3. Notify the reporting Resident and Provincial users when Municipal BFP responds.
4. Notify assigned Municipal users when an application is submitted or resubmitted.
5. Notify the Resident when approved or sent back for corrections.
6. Notify a newly provisioned Municipal account.
7. Keep writes in the existing domain transactions and rerun focused tests.

## Task 5: Shared notification UI

**Files:**
- Create: `app/_components/notifications/use-notifications.ts`
- Create: `app/_components/notifications/notification-bell.tsx`
- Create: `app/_components/notifications/notification-card.tsx`
- Create: `app/_components/notifications/notification-center.tsx`
- Create: `app/_components/notifications/notification-ui.module.css`
- Test: `tests/notification-ui.test.mjs`

1. Write failing tests for the five-second visible-tab refresh, unread badge, shared report-style cards, accessible labels, and short-copy rules.
2. Implement a hook that fetches immediately, polls every five seconds only while visible, and refreshes when the tab becomes visible.
3. Implement optimistic mark-one and mark-all behavior with rollback on error.
4. Implement a desktop popover/mobile bottom sheet bell UI.
5. Implement compact 8px-gap cards with category icon tiles, unread treatment, relative time, and actions.
6. Implement the full filterable notification center with loading, empty, stale-data retry, and manual refresh states.
7. Run focused UI tests until green.

## Task 6: Integrate Resident, Municipal, and Provincial portals

**Files:**
- Modify: `app/resident/layout.tsx`
- Create: `app/resident/notifications/page.tsx`
- Modify: `app/_components/municipal-bfp-layout.tsx`
- Replace: `app/municipal-bfp/notifications/page.tsx`
- Modify: `app/_components/provincial-bfp-layout.tsx`
- Create: `app/provincial-bfp/notifications/page.tsx`
- Test: `tests/notification-ui.test.mjs`

1. Write failing integration tests proving all hardcoded notification badges and Municipal sample rows are removed.
2. Mount the shared bell in all three persistent layouts with each role API and notification route.
3. Add the three notification center pages using the same UI and each portal accent.
4. Ensure the bell panel and pages link only to authorized role routes.
5. Run focused tests until green.

## Task 7: Municipal settings UI

**Files:**
- Modify: `app/api/municipal-bfp/me/route.ts`
- Replace: `app/municipal-bfp/profile/page.tsx`
- Test: `tests/municipal-notification-settings.test.mjs`

1. Write a failing test rejecting the current fake station profile and requiring authenticated identity fields.
2. Return the authenticated Municipal email and identity from `/api/municipal-bfp/me`.
3. Replace fake settings data with real account, municipality, and role data.
4. Add a compact notification settings section showing in-app delivery active, five-second live updates, and covered categories, plus a link to the real notification center.
5. Match existing Municipal surfaces with consistent 8px section gaps and responsive spacing.
6. Run the focused settings test until green.

## Task 8: Verification, migration, and deployment

**Files:**
- Modify tests only if verification exposes a real regression
- Update: `docs/superpowers/plans/2026-08-21-cross-role-in-app-notifications.md`

1. Run focused notification tests.
2. Run the full test suite, lint, and production build.
3. Inspect the full diff and scan for placeholders, hardcoded counts, secrets, and unrelated changes.
4. Inspect Supabase migration status, then apply only the new pending migration through the supported CLI workflow when safe.
5. Commit the implementation, merge it into local `main`, and push `main` to GitHub.
6. Confirm the remote commit and report any environment or migration action still required.
