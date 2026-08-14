# Municipal BFP Account Provisioning Design

**Date:** 14 August 2026

## Goal

Give Provincial BFP the sole authority to issue, reset, suspend, and audit Municipal BFP credentials while enforcing municipality-only access for each assigned Municipal BFP account.

## Evidence and scope

- The capstone proposal requires role-based and municipality-based access: Provincial BFP can monitor all municipalities, while Municipal BFP personnel can access only their assigned municipality except during authorized assistance coordination.
- The current Municipal BFP UI is a visual prototype. It hard-codes `San Jose de Buenavista` and `Station Commander`; it has no account-specific session or municipality filter.
- The current `public.users` table supports only `RESIDENT`, and its resident-only `username`, `phone`, and terms fields cannot represent an email-and-password-only BFP staff account correctly.
- The current locality seed has 17 municipalities. The authoritative PSGC list has 18; `Valderrama` must be added without renaming existing application values.

## Approved model

Use **individual staff accounts**, not a shared municipal password.

- Each municipality starts with one `MUNICIPAL_ADMIN` account, issued by a Provincial BFP administrator.
- Provincial BFP may later issue additional `MUNICIPAL_STAFF` accounts for the same municipality.
- Every issued account has an email, temporary password, active/suspended state, forced password change on first login, and an auditable provisioning history.
- Passwords are hashed with the existing server-side password utility. Plaintext passwords are never stored, logged, returned, or seeded.
- The first Provincial BFP administrator is created through a one-time, operator-run bootstrap command using values supplied at deployment time. No default production credential is committed to Git.

## Data design

### Existing tables to extend

`public.users`

- Extend `role` to `RESIDENT`, `PROVINCIAL_BFP`, and `MUNICIPAL_BFP`.
- Make `username`, `phone`, and `terms_accepted_at` nullable for BFP roles while preserving the current required fields for `RESIDENT` rows through a role-aware check constraint.
- Keep `email` unique, normalized to lowercase, and keep `password_hash`, `account_status`, login timestamp, and creation timestamps.

`public.municipalities`

- Add `psgc_code text unique`.
- Seed the official 18 Antique municipalities with their stable PSGC codes, including `Valderrama` (`0600618000`).
- Preserve existing display names used by resident signup; do not silently rename municipality values in a destructive migration.

### New tables

`public.bfp_personnel_profiles`

- One row per non-resident BFP account.
- Fields: `id`, `user_id` (unique FK to `users`), `display_name`, `rank_or_position`, `must_change_password`, `created_by_user_id`, `created_at`, and `updated_at`.
- `must_change_password` is true for Provincial-issued temporary credentials and false only after a successful password-change operation.

`public.bfp_municipality_assignments`

- Links a Municipal BFP personnel profile to one municipality.
- Fields: `id`, `bfp_personnel_profile_id`, `municipality_id`, `assignment_role` (`MUNICIPAL_ADMIN` or `MUNICIPAL_STAFF`), `assignment_status` (`ACTIVE` or `REVOKED`), `assigned_by_user_id`, `assigned_at`, and `revoked_at`.
- A partial unique index permits only one active `MUNICIPAL_ADMIN` per municipality, while allowing additional active staff accounts.
- Foreign-key columns, municipality filters, and RLS predicate columns receive indexes.

`public.bfp_credential_events`

- Append-only audit history for `ACCOUNT_CREATED`, `PASSWORD_RESET`, `PASSWORD_CHANGED`, `ACCOUNT_SUSPENDED`, `ACCOUNT_ACTIVATED`, `ASSIGNMENT_GRANTED`, and `ASSIGNMENT_REVOKED`.
- Fields: `id`, `target_user_id`, `actor_user_id`, `municipality_id`, `event_type`, `metadata jsonb`, and `created_at`.
- Metadata contains safe context such as the selected role or reason; it never contains passwords or password hashes.

## Access control

The system continues using the existing server-side PostgreSQL client and signed session cookie. The new BFP tables remain protected by RLS and receive no direct Data API grants.

- A Provincial BFP session has province-wide scope and can call only Provincial account-management endpoints.
- A Municipal BFP session carries its active municipality assignment. Every Municipal BFP API query filters by that assignment; the browser never chooses the municipality identifier.
- Municipal BFP cannot create accounts, switch municipality, inspect other municipalities, reset another account, or alter an assignment.
- Provincial BFP can provision, reset, suspend, reactivate, and replace municipality administrators. Every such operation writes an audit event in the same database transaction.
- A later inter-municipality assistance feature will use explicit, time-bounded assistance records. It will not weaken the default municipality filter.

## UI and workflow

### Provincial BFP

Add a **Municipal Accounts** page to the existing Provincial BFP module.

1. It lists all 18 municipalities, account status, primary administrator, and latest credential event.
2. A Provincial user selects a municipality and chooses **Create account**, **Reset password**, **Suspend**, **Activate**, or **Replace administrator**.
3. The create form requires staff display name, rank/position, official email, temporary password, and assignment role.
4. The confirmation view shows the credentials once for secure handover, then they are not retrievable from the system.

### Municipal BFP

1. Add a dedicated Municipal BFP email/password login route.
2. On first login, force a password change before allowing dashboard access.
3. Replace hard-coded municipality, name, and rank labels in the existing Municipal BFP layout with values from the authenticated session/profile.
4. Protect every Municipal BFP route and API endpoint with a Municipal BFP role and municipality-scope check.

## Migration and rollout

1. Add the role-aware account schema, BFP tables, indexes, RLS, and audit table in one reviewed imperative Supabase migration.
2. Update the locality seed idempotently with all 18 PSGC codes and Valderrama.
3. Add a bootstrap command for exactly one Provincial BFP administrator; the operator supplies the real email and temporary password through environment variables.
4. Deploy the Provincial account-management UI and APIs.
5. Provincial BFP issues one initial `MUNICIPAL_ADMIN` account for each municipality. No shared credentials or hard-coded passwords are inserted in the seed.
6. Deploy Municipal BFP login, forced password change, session role checks, and data-scope enforcement.

## Validation and tests

- Migration tests verify all three roles, 18 municipality records, Valderrama’s PSGC code, foreign keys, partial-admin uniqueness, RLS enabled, and required indexes.
- API tests verify only Provincial BFP can provision/reset/suspend accounts; Municipal BFP cannot create or manage accounts.
- Session tests verify first-login password-change enforcement and route/API rejection for missing or wrong roles.
- Scope tests verify a Municipal BFP account can read only its own municipality’s rows and cannot submit a different municipality ID.
- Audit tests verify each account action creates exactly one safe credential event and contains no plaintext password.

## Non-goals for this increment

- No shared station credentials.
- No self-registration for Municipal BFP personnel.
- No direct browser access to BFP account tables.
- No automatic email/SMS delivery of passwords; Provincial BFP hands credentials over through an approved channel.
- No implementation of inter-municipality assistance permissions yet; that receives a separate design and migration.
