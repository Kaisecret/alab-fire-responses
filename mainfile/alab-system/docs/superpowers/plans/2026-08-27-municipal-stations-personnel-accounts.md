# Municipal Stations and Personnel Accounts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a Municipal BFP administrator create multiple stations and then issue individual, station-assigned BFP personnel accounts from the Municipal BFP website.

**Architecture:** Keep data access behind the existing Node.js PostgreSQL server layer and signed BFP cookie. Replace the one-station-per-municipality constraint with a station lifecycle model, add historical station assignments, and enforce Municipal Admin and municipality scope in server-side transactions. The Flutter application remains unchanged.

**Tech Stack:** Next.js 16 App Router route handlers, React 19, TypeScript, node-postgres, Supabase Postgres migrations/RLS, Node test runner.

## Global Constraints

- Do not edit `apps/bfp_mobile_app`.
- Provincial BFP issues only the first Municipal Admin account.
- Derive municipality scope from the server session; never accept a municipality ID from Municipal BFP browser input.
- Only `MUNICIPAL_ADMIN` may manage stations/personnel.
- Keep passwords hashed; return a temporary password only once in a successful create/reset response.
- Keep RLS enabled and do not grant Data API access to BFP tables.
- Make related account, assignment, audit, and notification writes in one transaction.

---

### Task 1: Create a safe multi-station schema

**Files:**

- Create: `supabase/migrations/<generated>_add_municipal_station_personnel_assignments.sql`
- Modify: `tests/supabase-schema.test.mjs`

**Interfaces:** Produces multi-row `municipal_bfp_stations` and `bfp_station_assignments` with one active assignment per profile.

- [ ] **Step 1: Write the failing schema test**

Add `tests/supabase-schema.test.mjs` assertions for a migration containing `drop constraint if exists municipal_bfp_stations_municipality_id_key`, `municipal_bfp_stations_active_name_idx`, `create table public.bfp_station_assignments`, active-assignment partial uniqueness, foreign-key indexes, RLS enablement, and `revoke all on table public.bfp_station_assignments from anon, authenticated`.

- [ ] **Step 2: Verify it fails**

Run: `node --test tests/supabase-schema.test.mjs`

Expected: FAIL because the migration is absent.

- [ ] **Step 3: Generate and implement the migration**

Run `supabase migration new add_municipal_station_personnel_assignments`. In its generated SQL, remove the single-station constraint, add `status` (`ACTIVE`/`INACTIVE`) and `deactivated_at`, then create a case-insensitive partial unique index on `(municipality_id, lower(station_name)) where status = 'ACTIVE'`. Create:

```sql
create table public.bfp_station_assignments (
  id uuid primary key default gen_random_uuid(),
  personnel_profile_id uuid not null references public.bfp_personnel_profiles(id) on delete restrict,
  station_id uuid not null references public.municipal_bfp_stations(id) on delete restrict,
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'REVOKED')),
  assigned_by_user_id uuid not null references public.users(id) on delete restrict,
  assigned_at timestamptz not null default now(),
  revoked_by_user_id uuid references public.users(id) on delete restrict,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((status = 'ACTIVE' and revoked_at is null) or (status = 'REVOKED' and revoked_at is not null))
);
create unique index bfp_station_assignments_one_active_personnel_idx
  on public.bfp_station_assignments (personnel_profile_id) where status = 'ACTIVE';
create index bfp_station_assignments_station_status_idx on public.bfp_station_assignments (station_id, status);
alter table public.bfp_station_assignments enable row level security;
revoke all on table public.bfp_station_assignments from anon, authenticated;
```

- [ ] **Step 4: Verify schema work**

Run: `node --test tests/supabase-schema.test.mjs` and `supabase migration list --local`.

Expected: PASS and one generated migration listed.

- [ ] **Step 5: Commit**

Run: `git add supabase/migrations tests/supabase-schema.test.mjs && git commit -m "feat: support municipal station personnel assignments"`

### Task 2: Implement municipal station/personnel services

**Files:**

- Create: `lib/municipal-bfp/stations.ts`
- Create: `tests/municipal-stations-personnel.test.mjs`

**Interfaces:** Exports `listMunicipalStations`, `createMunicipalStation`, `updateMunicipalStation`, `deactivateMunicipalStation`, `listMunicipalPersonnel`, `provisionMunicipalPersonnel`, `transferMunicipalPersonnel`, and `setMunicipalPersonnelStatus`. Provisioning returns `{ userId, displayName, email, stationName, temporaryPassword }`.

- [ ] **Step 1: Write failing service source tests**

Assert that `lib/municipal-bfp/stations.ts` exists; uses `withTransaction`; filters station operations by `municipality_id`; selects only `status = 'ACTIVE'` when assigning; creates `MUNICIPAL_STAFF`; creates `bfp_station_assignments`; and does not place `temporaryPassword` in event metadata.

- [ ] **Step 2: Verify it fails**

Run: `node --test tests/municipal-stations-personnel.test.mjs`

Expected: FAIL because the service is missing.

- [ ] **Step 3: Implement the service**

In `lib/municipal-bfp/stations.ts`, validate UUIDs and bounded text. Use `municipality_id = $1` in every list query and add `and municipality_id = $2` to every mutation. Deactivate a station only when no active assignment exists. Provision account/profile/municipality assignment/station assignment/audit events/notification in one `withTransaction`. Verify chosen stations using:

```sql
select id, station_name from municipal_bfp_stations
where id = $1 and municipality_id = $2 and status = 'ACTIVE';
```

Transfer by revoking the current assignment and inserting a replacement within the same transaction. Municipal personnel are always `MUNICIPAL_STAFF`; this feature cannot create admins.

- [ ] **Step 4: Verify service tests**

Run: `node --test tests/municipal-stations-personnel.test.mjs`

Expected: PASS.

- [ ] **Step 5: Commit**

Run: `git add lib/municipal-bfp/stations.ts tests/municipal-stations-personnel.test.mjs && git commit -m "feat: add municipal station personnel services"`

### Task 3: Add protected municipal route handlers

**Files:**

- Create: `app/api/municipal-bfp/stations/route.ts`
- Create: `app/api/municipal-bfp/stations/[stationId]/route.ts`
- Create: `app/api/municipal-bfp/personnel/route.ts`
- Create: `app/api/municipal-bfp/personnel/[personnelId]/route.ts`
- Modify: `tests/municipal-stations-personnel.test.mjs`

**Interfaces:** `GET/POST /api/municipal-bfp/stations`; `PATCH /api/municipal-bfp/stations/:stationId`; `GET/POST /api/municipal-bfp/personnel`; `PATCH /api/municipal-bfp/personnel/:personnelId`.

- [ ] **Step 1: Write failing authorization tests**

Assert every route calls `getBfpIdentity`, checks `identity.assignmentRole !== 'MUNICIPAL_ADMIN'`, derives `identity.municipalityId`, and does not take a `municipalityId` from its request body.

- [ ] **Step 2: Verify it fails**

Run: `node --test tests/municipal-stations-personnel.test.mjs`

Expected: FAIL because the handlers are missing.

- [ ] **Step 3: Implement handlers**

Export `runtime = 'nodejs'`. Verify the existing Municipal BFP signed cookie, resolve a current identity, and return 401 for no session or 403 for non-admin/inactive identity. Return 400 for validation errors, 409 for duplicate station/email or deactivation with active personnel, and 201 containing only safe account fields plus the temporary password on account creation. Do not return password hashes, all assignment history, or other municipalities’ rows.

- [ ] **Step 4: Verify route tests**

Run: `node --test tests/municipal-stations-personnel.test.mjs`

Expected: PASS.

- [ ] **Step 5: Commit**

Run: `git add app/api/municipal-bfp tests/municipal-stations-personnel.test.mjs && git commit -m "feat: add municipal station management APIs"`

### Task 4: Build the municipal website pages

**Files:**

- Create: `app/_components/municipal-stations-manager.tsx`
- Create: `app/_components/municipal-personnel-manager.tsx`
- Create: `app/municipal-bfp/stations/page.tsx`
- Modify: `app/municipal-bfp/responders/page.tsx`
- Modify: `app/_components/municipal-bfp-layout.tsx`
- Modify: `tests/municipal-stations-personnel.test.mjs`

**Interfaces:** `MunicipalStationsManager` reads/mutates `/api/municipal-bfp/stations`; `MunicipalPersonnelManager` reads active stations and `/api/municipal-bfp/personnel`; the personnel form is disabled if there are no stations.

- [ ] **Step 1: Write failing UI source tests**

Assert navigation includes `Stations` pointing to `/municipal-bfp/stations`; responders imports `MunicipalPersonnelManager`; station manager fetches `/api/municipal-bfp/stations`; personnel manager fetches both APIs, renders a station `<select>`, disables account creation for no stations, and keeps the returned password in React state only for an issued-credentials dialog.

- [ ] **Step 2: Verify it fails**

Run: `node --test tests/municipal-stations-personnel.test.mjs`

Expected: FAIL because the client components/navigation are absent.

- [ ] **Step 3: Implement the pages**

Use the existing municipal page styling: responsive tables, modal forms, inline errors, loading states, and `cache: 'no-store'` reads. Stations supports add/edit/deactivate. Personnel lists name, rank, email, station, and status; it creates a staff account assigned to an active station and displays credentials once, then clears the password from state on dialog close.

- [ ] **Step 4: Verify focused tests**

Run: `node --test tests/municipal-stations-personnel.test.mjs`

Expected: PASS.

- [ ] **Step 5: Run full verification**

Run: `npm test`, `npm run lint`, and `npm run build` from `mainfile/alab-system`.

Expected: every command exits 0.

- [ ] **Step 6: Commit**

Run: `git add app tests/municipal-stations-personnel.test.mjs && git commit -m "feat: manage municipal stations and personnel accounts"`
