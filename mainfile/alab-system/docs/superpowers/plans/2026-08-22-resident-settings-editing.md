# Resident Settings Editing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a signed-in resident update only their email and mobile number, and change their password after proving their current password.

**Architecture:** Keep name, municipality, and barangay display-only. Add authenticated resident-owned API mutations for contact data and password changes, then connect every desktop and mobile settings trigger to focused dialogs in the existing profile page.

**Tech Stack:** Next.js 16 route handlers, React 19 client page, PostgreSQL via `pg`, Node `scrypt`, Node test runner.

## Global Constraints

- Only the session-owning resident may update their own account.
- Name, municipality, and barangay must not be accepted by the contact update API or rendered as editable fields.
- Contact updates accept a normalized email and Philippine mobile number; duplicate email/phone values are rejected.
- Password changes require the current password, a new password of at least eight characters, and a matching confirmation.

---

### Task 1: Add resident settings mutation coverage and secure APIs

**Files:**

- Create: `app/api/resident/profile/password/route.ts`
- Modify: `app/api/resident/profile/route.ts`
- Modify: `tests/resident-profile-data.test.mjs`

- [ ] Write source-level tests that require session ownership checks, a contact-only update, duplicate-safe validation, password verification, password hashing, and no address/profile-name mutations.
- [ ] Run `node --test tests/resident-profile-data.test.mjs` and verify the new assertions fail.
- [ ] Implement `PUT /api/resident/profile` for email/phone and `PUT /api/resident/profile/password` for current-password-confirmed changes.
- [ ] Re-run the focused test and then `npm test`.

### Task 2: Connect desktop and mobile settings UI

**Files:**

- Modify: `app/_content/resident-profile-content.ts`
- Modify: `app/resident/profile/page.tsx`
- Modify: `tests/resident-profile-data.test.mjs`

- [ ] Add tests requiring profile and password actions, read-only name/barangay fields, and requests to the protected API routes.
- [ ] Run the focused test and verify the UI assertions fail.
- [ ] Add accessible dialogs and client event handlers for all Edit Profile and Change Password triggers.
- [ ] Re-run the focused test and `npm test`.
