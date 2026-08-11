# ALAB Supabase Migration Design

## Goal

Replace ALAB's Railway PostgreSQL dependency and custom resident authentication with Supabase Postgres and Supabase Auth for the test deployment.

## Scope

This migration covers the active resident account and dashboard workflows only. Municipal BFP, provincial BFP, firefighter, dispatch, vehicle, water-source, and production storage-upload features remain unchanged.

## Architecture

The Next.js application will use `@supabase/supabase-js` and `@supabase/ssr` with two helpers: a browser client for client components and a cookie-aware server client for route handlers and server components. Next.js 16 calls request interception `proxy.ts`; the existing `middleware.ts` will be replaced with a `proxy.ts` that refreshes Supabase credentials and redirects unauthenticated residents away from protected `/resident/*` pages.

Supabase Auth becomes the source of truth for email/password identity and sessions. Application-specific data stays in Postgres `public` tables. `resident_profiles.user_id` references `auth.users(id)`, giving every resident one auth account and one profile. The application must validate identity through `supabase.auth.getClaims()` on the server; it must not trust a raw cookie or `getSession()` response for authorization.

The Supabase project URL and publishable key are public browser configuration. The database connection strings remain server-only in `.env.local`; no database password, service-role key, or secret key is exposed through a `NEXT_PUBLIC_` variable or committed to Git.

## Data Model

The Railway-specific `users` table is removed. Supabase owns users in `auth.users`; email, password hash, user ID, and last sign-in information are not duplicated in `public` tables.

The initial migration creates the existing resident data model:

- `municipalities` and `barangays` are public reference data, with unique municipality names and unique barangay names within a municipality.
- `resident_profiles` stores the resident's `user_id`, unique username, unique Philippine phone number, name, and terms-acceptance time.
- `resident_addresses` stores resident address information and belongs to a profile; one profile has at most one primary address.
- `resident_verifications` stores private Storage object keys and review state, never document bytes.
- `notification_preferences` stores one preference row per profile.
- `fire_reports`, `fire_report_photos`, and `notifications` preserve the already designed resident workflow schema so existing dashboard queries have a stable target as the reporting screens are connected.

All IDs are UUIDs. Required foreign keys use indexes. Operational report indexes cover reference lookups, a resident's report history, report status, and municipality/time ordering.

## Authorization

Row Level Security is enabled on every table in the exposed `public` schema.

- Anonymous users may read municipality and barangay lookups for sign-up.
- Authenticated residents may create and read only the profile, addresses, verification record, preferences, reports, photos, and notifications that belong to their own `auth.uid()`.
- Residents may update their own profile, addresses, and preferences, but cannot change the owning `user_id`.
- No policy gives a resident access to another resident's verification files or reports.
- No service-role key is used in browser code. Private verification documents remain out of scope until a private Storage bucket and restrictive `storage.objects` policies are added.

## Resident Authentication Flow

1. The existing sign-up screen calls the Supabase Auth email/password sign-up flow.
2. A successful sign-up creates the corresponding profile, initial primary address, pending verification record, and notification preferences under the authenticated user's ID.
3. Sign-in uses Supabase Auth email/password sign-in and lets the SSR cookie helper set the session cookies.
4. `proxy.ts` refreshes expired tokens and redirects visitors without valid claims from protected resident routes to `/resident/login`.
5. Resident API routes use `getClaims()` and query Supabase only for the current user's profile and report data.
6. Sign-out clears the Supabase Auth session instead of deleting a custom HMAC cookie.

For this test deployment, the Supabase dashboard must have the desired email-confirmation setting selected before registration is tested. If email confirmation is enabled, registration creates the Auth user but access begins only after the user confirms their email. If it is disabled, a session is returned immediately.

## Database Deployment

The repository will hold an idempotent Supabase SQL migration and a deterministic Antique municipality/barangay seed. The session-mode `DIRECT_URL` is used only for migration tooling; application connections use the transaction-mode `DATABASE_URL` only where a direct Postgres connection remains necessary. The preferred application data access path is the Supabase SSR client and Data API governed by RLS.

The actual Supabase database password is required in the developer's local `.env.local` before the migration can be applied. It is intentionally not requested in chat and must never be added to `.env.example`, source files, tests, logs, or commits.

## Verification

- Tests first prove the Supabase helpers reject missing configuration and that protected resident requests require validated claims.
- The schema migration is verified against the connected Supabase database with table, RLS, policy, and seed checks that do not log credentials.
- A test resident can sign up, sign in, receive a protected resident session, read only their profile, and cannot read another resident's data.
- `npm test`, `npm run lint`, and `npm run build` pass.

## Out of Scope

- Importing Railway data or maintaining Railway as a fallback.
- Fire-report upload UI, Storage bucket provisioning, and file transfer.
- BFP staff authentication and authorization.
- Production backup, monitoring, custom SMTP, domain, and email-template configuration.
