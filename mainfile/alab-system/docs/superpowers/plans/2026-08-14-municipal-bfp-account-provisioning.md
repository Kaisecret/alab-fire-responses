# Municipal BFP account provisioning implementation plan

> **For implementation:** Execute this plan task-by-task with tests written before each behavior change.

**Goal:** Give the Provincial BFP a secure way to issue individual Municipal BFP accounts for all 18 municipalities in Antique. Municipal staff can only access the municipality assigned to their account; passwords are never shared or stored in plain text.

**Architecture:** Keep the application's existing server-side `pg` database access and signed `AUTH_SECRET` cookie sessions. Extend the current `users` table with BFP roles, then add BFP personnel, municipality-assignment, and credential-audit tables. A Provincial BFP account issues a temporary password through a protected server route; the recipient must change it before accessing the municipal dashboard.

**Tech stack:** Next.js App Router, TypeScript, PostgreSQL/Supabase, `pg`, Node `scrypt`, Node test runner.

---

## 1. Add the schema with an additive Supabase migration

**Files:**

- Create: `supabase/migrations/<timestamp>_add_bfp_account_provisioning.sql`
- Modify: `supabase/seed.sql`
- Modify: `tests/supabase-schema.test.mjs`

**Step 1: Write the failing schema test.**

Assert that the migration:

- expands `users.role` to `RESIDENT`, `PROVINCIAL_BFP`, and `MUNICIPAL_BFP`;
- keeps resident-only username, phone, and terms requirements without requiring those columns for BFP staff;
- creates `bfp_personnel_profiles`, `bfp_municipality_assignments`, and `bfp_credential_events`;
- includes a partial unique index for one active municipal administrator per municipality;
- enables RLS for every new table; and
- adds Valderrama, `0600618000`, so seed data contains all 18 PSA municipalities of Antique.

**Step 2: Run the focused test and confirm it fails.**

Run: `node --test tests/supabase-schema.test.mjs`

**Step 3: Generate and implement the migration.**

Run: `npx supabase migration new add_bfp_account_provisioning`

In that generated file:

```sql
alter table public.municipalities add column psgc_code text;
create unique index municipalities_psgc_code_key
  on public.municipalities (psgc_code) where psgc_code is not null;

alter table public.users alter column username drop not null;
alter table public.users alter column phone drop not null;
alter table public.users alter column terms_accepted_at drop not null;
alter table public.users drop constraint users_role_check;
alter table public.users add constraint users_role_check
  check (role in ('RESIDENT', 'PROVINCIAL_BFP', 'MUNICIPAL_BFP'));
alter table public.users add constraint users_role_required_fields_check check (
  (role = 'RESIDENT' and username is not null and phone is not null and terms_accepted_at is not null)
  or (role in ('PROVINCIAL_BFP', 'MUNICIPAL_BFP') and username is null and phone is null)
);
```

Create these tables with UUID primary keys, timestamps, restrictive foreign keys, check constraints, and indexes:

- `bfp_personnel_profiles`: one row per BFP user; legal/display name, optional rank, `must_change_password`, `created_by_user_id`.
- `bfp_municipality_assignments`: a BFP personnel profile assigned to exactly one municipality, either `MUNICIPAL_ADMIN` or `MUNICIPAL_STAFF`, status `ACTIVE`/`REVOKED`, issued/revoked actor IDs and timestamps.
- `bfp_credential_events`: append-only audit of account issued, password reset, role changed, suspended, reactivated, and revoked. Store metadata only—never a password or password hash.

Add `bfp_municipality_assignments_one_active_admin_idx` with a `WHERE assignment_role = 'MUNICIPAL_ADMIN' AND status = 'ACTIVE'` predicate. Enable RLS on every new BFP table but add no anonymous or browser-client grants because requests remain server-side.

Update the municipality seed to upsert the 18 verified PSGC codes. Do not invent Valderrama barangays; this account-provisioning task only needs the municipality row.

**Step 4: Re-run the focused test.**

Run: `node --test tests/supabase-schema.test.mjs`

## 2. Make sessions role-aware without weakening resident authentication

**Files:**

- Modify: `lib/auth/session.ts`
- Modify: `proxy.ts`
- Modify: `tests/resident-auth-security.test.mjs`
- Create: `tests/bfp-auth.test.mjs`

**Step 1: Write failing tests.**

Cover a signed BFP session that carries `userId`, `role`, display name, municipality assignment where appropriate, and expiry. Assert that a resident cookie cannot access `/municipal-bfp` or `/provincial-bfp`, a municipal cookie cannot access a different municipality, and a suspended or malformed session is denied.

**Step 2: Implement shared session primitives.**

Keep `RESIDENT_SESSION_COOKIE` and its existing resident functions for backwards compatibility. Add a separate `ALAB_BFP_SESSION_COOKIE` plus a typed BFP session (`PROVINCIAL_BFP` or `MUNICIPAL_BFP`). Use the existing HMAC signing code, eight-hour duration, `httpOnly`, `sameSite=lax`, `secure` in production, and path `/`.

Extend `proxy.ts` to guard `/municipal-bfp/:path*` and `/provincial-bfp/:path*`, while leaving explicit BFP login and password-change pages public. Use a lightweight edge-compatible payload check only; every API repeats role validation against the database.

**Step 3: Run auth tests.**

Run: `node --test tests/resident-auth-security.test.mjs tests/bfp-auth.test.mjs`

## 3. Add password-safe BFP account services and protected APIs

**Files:**

- Create: `lib/auth/bfp-accounts.ts`
- Create: `app/api/auth/bfp/login/route.ts`
- Create: `app/api/auth/bfp/change-password/route.ts`
- Create: `app/api/auth/bfp/logout/route.ts`
- Create: `app/api/provincial-bfp/municipal-accounts/route.ts`
- Create: `app/api/provincial-bfp/municipal-accounts/[userId]/route.ts`
- Create: `app/api/municipal-bfp/me/route.ts`
- Create: `tests/bfp-account-api.test.mjs`

**Step 1: Write failing API behavior tests.**

Test that only an active Provincial BFP session can list or provision municipal staff; provisioning creates the user, personnel profile, assignment, and audit event in one transaction; the returned temporary password appears only in that one successful response; no API returns `password_hash`; Municipal BFP staff must change a temporary password before using the dashboard; and a user can only retrieve their own assigned municipality profile.

**Step 2: Implement the server service.**

`lib/auth/bfp-accounts.ts` owns input validation and the atomic provisioning transaction:

1. normalize and validate email, display name, rank, municipality UUID, and BFP role;
2. generate a cryptographically random temporary password on the server if the Provincial BFP does not supply one;
3. hash it with the existing `hashPassword` helper;
4. insert `users` with role `MUNICIPAL_BFP`, status `ACTIVE`, and null resident-only fields;
5. insert profile, assignment, and audit event in the same transaction;
6. return the one-time temporary password to the authenticated Provincial BFP response only.

The API must never email, text, log, or persist a raw password. The Province gives the temporary password to the person using an approved offline channel.

`/api/auth/bfp/login` only selects BFP roles, verifies the stored `scrypt` hash, checks account and assignment status, updates `last_login_at`, and writes the BFP cookie. `/change-password` verifies the old password, writes a new `scrypt` hash, clears `must_change_password`, and appends an audit event. Use the existing login throttling helper for BFP login failures.

**Step 3: Run API tests.**

Run: `node --test tests/bfp-account-api.test.mjs tests/bfp-auth.test.mjs`

## 4. Connect the Provincial BFP UI to real account provisioning

**Files:**

- Modify: `app/_content/user-modules.ts`
- Modify: `app/_components/provincial-bfp-module.tsx`
- Create: `app/provincial-bfp/municipal-accounts/page.tsx`
- Create: `app/_components/provincial-municipal-accounts.tsx`
- Create: `tests/provincial-municipal-accounts-ui.test.mjs`

**Step 1: Write the failing UI test.**

Assert the Provincial module exposes a “Municipal Accounts” route and that the page has all 18 municipalities, a clear “Not provisioned” state, role/status, issue/reset/suspend actions, and no raw password persisted in component state beyond the one-use success dialog.

**Step 2: Implement the page.**

Add a Provincial navigation item and page with a searchable roster. Seeded municipality records show “Not provisioned” until the Provincial BFP creates its first staff account. The provision dialog collects:

- municipality;
- staff name and rank;
- official email;
- Municipal Admin or Staff role; and
- optional operator-provided temporary password (otherwise the server creates one).

After successful creation, show a single “Record this temporary password now” dialog. Closing it clears that password from browser memory. Add confirmation dialogs before suspend/revoke/reset actions.

**Step 3: Run the UI test.**

Run: `node --test tests/provincial-municipal-accounts-ui.test.mjs`

## 5. Connect the Municipal BFP UI to the signed-in staff account

**Files:**

- Create: `app/municipal-bfp/login/page.tsx`
- Create: `app/municipal-bfp/change-password/page.tsx`
- Modify: `app/municipal-bfp/layout.tsx`
- Modify: `app/_components/municipal-bfp-layout.tsx`
- Modify: `app/_components/municipal-bfp-dashboard.tsx`
- Create: `tests/municipal-bfp-session-ui.test.mjs`

**Step 1: Write the failing UI test.**

Verify login accepts an official BFP email and password, the first successful temporary-password login redirects to `/municipal-bfp/change-password`, and completed-password-change users go to `/municipal-bfp`. Verify the layout uses the signed-in staff name, role, and assigned municipality—not the hard-coded “San Jose de Buenavista / Station Commander”.

**Step 2: Implement pages and dynamic identity.**

Add a clean municipal login page and a mandatory password-change page. Fetch `/api/municipal-bfp/me` in the client layout after the proxy guard admits the session, then render the actual municipality, staff name, and role in the header/sidebar. On identity fetch failure, clear the BFP cookie through the logout endpoint and return to municipal login.

Do not change existing incident/GIS/firetruck business behavior in this work. This task establishes the authenticated municipal boundary and dynamic municipality identity so later incident queries can be scoped by the assignment.

**Step 3: Run the UI test.**

Run: `node --test tests/municipal-bfp-session-ui.test.mjs`

## 6. Bootstrap the first Provincial BFP account safely

**Files:**

- Create: `scripts/bootstrap-provincial-bfp.mjs`
- Modify: `.env.example`
- Modify: `README.md` or `docs/superpowers/plans/2026-08-14-municipal-bfp-account-provisioning.md`
- Modify: `tests/bfp-account-api.test.mjs`

**Step 1: Add a failing safety test.**

Assert the script requires `DATABASE_URL`, `PROVINCIAL_BFP_EMAIL`, `PROVINCIAL_BFP_NAME`, and `PROVINCIAL_BFP_TEMP_PASSWORD`, refuses to run when a Provincial BFP already exists, and never prints the temporary password.

**Step 2: Implement the one-time command.**

The script creates only the initial Provincial BFP account using the same password hashing and database constraints. It must be run by the deployment operator once using environment variables—not committed credentials. It writes a credential audit event.

Use:

```powershell
$env:PROVINCIAL_BFP_EMAIL = 'official-email@example.gov.ph'
$env:PROVINCIAL_BFP_NAME = 'Provincial BFP Administrator'
$env:PROVINCIAL_BFP_TEMP_PASSWORD = '<unique temporary password>'
npm run bootstrap:provincial-bfp
```

Add the script to `package.json`. Document that real Municipal BFP emails and staff names are deliberately not invented; the Provincial BFP creates them after bootstrap.

**Step 3: Run the focused test.**

Run: `node --test tests/bfp-account-api.test.mjs`

## 7. Apply, verify, and release

**Files:**

- Modify: `docs/superpowers/plans/2026-08-14-municipal-bfp-account-provisioning.md` only if implementation differs from plan.

1. Apply the migration using the configured Supabase project (`npx supabase db push`) only after a migration review confirms it is additive and current production data satisfies its new check constraints.
2. Execute `npm test`, `npm run lint`, and `npm run build` from `mainfile/alab-system`.
3. Manually test: Provincial login, initial provisioning, first municipal login, mandatory password change, municipality header values, suspended account denial, and resident login regression.
4. Commit the migration, application code, tests, and documentation together. Push only after successful verification.

---

## Security decisions

- One named staff account per person; never one shared municipality password.
- A temporary password is returned exactly once and is never saved in audit data or logs.
- Provincial BFP controls municipal provisioning, suspension, role changes, and resets.
- A municipal session and API identity always carry its assigned municipality, preventing cross-municipality data access when operational queries are added.
- The initial Provincial BFP identity comes from deployment-time environment variables; no default credential is shipped in Git.

