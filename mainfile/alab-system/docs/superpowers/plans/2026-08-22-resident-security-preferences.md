# Resident Security and Preferences Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every Resident Profile security and notification control persist and operate for only the signed-in resident.

**Architecture:** The profile page controller will call session-owned APIs. A migration adds hashed PIN settings and safe login-activity records; notification switches use the existing notification-preferences row.

**Tech Stack:** Next.js, PostgreSQL/Supabase migrations, Node `scrypt` helpers, Node test runner.

## Global Constraints

- Preserve desktop and mobile layout.
- Require resident session ownership and parameterized SQL.
- Store only a hashed PIN; do not return a PIN, password, or raw IP address.
- Enable RLS for each new public-schema table.

---

### Task 1: Persist security settings and activity

**Files:** Create `supabase/migrations/<generated>_add_resident_security_settings.sql`; modify `tests/resident-profile-data.test.mjs`.

**Produces:** `resident_security_settings(resident_profile_id unique, pin_hash, bfp_contact_allowed, updated_at)` and `resident_login_activity(resident_profile_id, device_label, occurred_at)` indexed by profile and newest timestamp.

- [ ] **Step 1: Write the failing test**

```js
assert.match(migration, /create table public\\.resident_security_settings/);
assert.match(migration, /pin_hash text/);
assert.match(migration, /create table public\\.resident_login_activity/);
assert.match(migration, /enable row level security/);
```

- [ ] **Step 2: Verify RED** — run `node --test tests/resident-profile-data.test.mjs`; it must fail because this migration is absent.

- [ ] **Step 3: Implement the migration** — generate it with `supabase migration new add_resident_security_settings`; use two profile-owned tables with `on delete cascade`, `check (char_length(pin_hash) > 0)`, a descending activity index, and RLS.

- [ ] **Step 4: Verify GREEN** — run `node --test tests/resident-profile-data.test.mjs`; it must pass.

- [ ] **Step 5: Commit** — run `git add supabase/migrations tests/resident-profile-data.test.mjs` then `git commit -m "feat: store resident security preferences"`.

### Task 2: Create owned APIs and activity recording

**Files:** Create `app/api/resident/profile/security/route.ts` and `app/api/resident/profile/activity/route.ts`; modify `app/api/resident/profile/route.ts`, `app/api/auth/login/route.ts`, and `tests/resident-profile-data.test.mjs`.

**Produces:** `GET/PUT /api/resident/profile/security`, `GET /api/resident/profile/activity`, and a notification object accepted by `PUT /api/resident/profile`.

- [ ] **Step 1: Write the failing test**

```js
assert.match(securityRoute, /verifyResidentSession/);
assert.match(securityRoute, /verifyPassword\\(currentPassword, user\\.password_hash\\)/);
assert.match(securityRoute, /hashPassword\\(pin\\)/);
assert.match(activityRoute, /where rp\\.user_id = \\$1/);
assert.match(loginRoute, /insert into resident_login_activity/);
```

- [ ] **Step 2: Verify RED** — run `node --test tests/resident-profile-data.test.mjs`; it must fail because the routes are absent.

- [ ] **Step 3: Implement minimum safe behavior** — session-scope the profile, require current password plus exactly four digits before hashing/upserting PIN, save contact permission, return no hash, insert one user-agent-derived device label after a successful password login, and validate/upsert three notification booleans in the profile route.

- [ ] **Step 4: Verify GREEN** — run `node --test tests/resident-profile-data.test.mjs`; it must pass.

- [ ] **Step 5: Commit** — run `git add app/api/resident/profile app/api/auth/login/route.ts tests/resident-profile-data.test.mjs` then `git commit -m "feat: add resident security settings APIs"`.

### Task 3: Connect the resident controls

**Files:** Modify `app/_content/resident-profile-content.ts`, `app/resident/profile/page.tsx`, and `tests/resident-profile-data.test.mjs`.

**Produces:** `pin-security`, `login-activity`, and `privacy-settings` actions; `data-profile-toggle="push|incidents|emergency"` controls with `aria-pressed`.

- [ ] **Step 1: Write the failing test**

```js
assert.match(content, /data-profile-action="pin-security"/);
assert.match(content, /data-profile-action="login-activity"/);
assert.match(content, /data-profile-action="privacy-settings"/);
assert.match(content, /data-profile-toggle="push"/);
assert.match(page, /"\\/api\\/resident\\/profile\\/security"/);
assert.match(page, /"\\/api\\/resident\\/profile\\/activity"/);
```

- [ ] **Step 2: Verify RED** — run `node --test tests/resident-profile-data.test.mjs`; it must fail because controls are static.

- [ ] **Step 3: Implement dialogs and wiring** — convert controls to buttons, add PIN/activity/privacy dialogs, use keyboard-accessible notification buttons, load safe states, save only after API success, and keep feedback in the active dialog.

- [ ] **Step 4: Verify GREEN** — run `node --test tests/resident-profile-data.test.mjs`; it must pass.

- [ ] **Step 5: Commit** — run `git add app/_content/resident-profile-content.ts app/resident/profile/page.tsx tests/resident-profile-data.test.mjs` then `git commit -m "feat: connect resident profile security controls"`.

### Task 4: Verify and release

- [ ] **Step 1: Validate tree** — run `git diff --check; git status --short`; expect no whitespace errors and only intended files.
- [ ] **Step 2: Run full suite** — run `npm test`; expect zero failures.
- [ ] **Step 3: Release** — push `feature/resident-municipal-approval`, merge into `main` without staging user-owned changes, then push `origin main`.
