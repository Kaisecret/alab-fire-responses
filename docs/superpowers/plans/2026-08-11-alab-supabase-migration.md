# ALAB Supabase Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Replace Railway PostgreSQL and custom resident sessions with Supabase Auth and Supabase Postgres for ALAB's test deployment.

**Architecture:** Supabase Auth becomes the resident identity store, while RLS-protected public tables hold ALAB profile, address, verification, notification, report, and location data. Cookie-aware Supabase SSR clients and Next.js 16 proxy.ts refresh sessions; resident route handlers authorize through verified claims rather than a Railway pg pool.

**Tech Stack:** Next.js 16.2.12, React 19, TypeScript 5, @supabase/supabase-js, @supabase/ssr, Supabase Postgres/Auth, Node test runner.

## Global Constraints

- Use only NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY as public configuration.
- Keep DATABASE_URL and DIRECT_URL only in the ignored mainfile/alab-system/.env.local. Never commit or log a real password.
- Enable RLS on every public table and scope ownership policies with (select auth.uid()).
- Protect server code using supabase.auth.getClaims(), never raw cookies or getSession().
- Use the Next.js 16 proxy.ts convention; remove middleware.ts after proxy.ts replaces it.
- Keep current resident URLs. Residents sign in using email and password after migration.
- Do not import Railway data, provision Storage buckets, or implement BFP staff auth.

---

### Task 1: Establish an isolated workspace and clean baseline

**Files:**
- Verify: repository worktree state
- Test: all mainfile/alab-system/tests/*.test.mjs

**Interfaces:**
- Consumes: docs/superpowers/specs/2026-08-11-alab-supabase-migration-design.md
- Produces: an isolated branch with a known test baseline

- [ ] **Step 1: Detect worktree isolation before changes**

Run:

~~~powershell
git rev-parse --git-dir
git rev-parse --git-common-dir
git rev-parse --show-superproject-working-tree
git branch --show-current
~~~

Expected: if git-dir differs from git-common-dir and the superproject command is empty, use the existing worktree. Otherwise ask the user for consent before creating a worktree, because the current checkout contains unrelated edits.

- [ ] **Step 2: Create a worktree only with user consent**

Run:

~~~powershell
git check-ignore -q .worktrees
git worktree add '.worktrees/alab-supabase-migration' -b 'feat/alab-supabase-migration'
~~~

Expected: an ignored .worktrees/alab-supabase-migration checkout on feat/alab-supabase-migration. If .worktrees is not ignored, add only .worktrees/ to .gitignore and commit that change first.

- [ ] **Step 3: Install and verify the existing application**

Run from mainfile/alab-system:

~~~powershell
npm install
npm test
~~~

Expected: npm install changes no dependency versions and all existing tests pass. Stop and report any existing failure.

### Task 2: Add tested Supabase SSR clients and a session-refresh proxy

**Files:**
- Modify: mainfile/alab-system/package.json
- Modify: mainfile/alab-system/package-lock.json
- Modify: mainfile/alab-system/.env.example
- Delete: mainfile/alab-system/middleware.ts
- Create: mainfile/alab-system/utils/supabase/client.ts
- Create: mainfile/alab-system/utils/supabase/server.ts
- Create: mainfile/alab-system/utils/supabase/proxy.ts
- Create: mainfile/alab-system/proxy.ts
- Create: mainfile/alab-system/tests/supabase-setup.test.mjs

**Interfaces:**
- Consumes: public Supabase URL/key and Supabase auth cookies.
- Produces: createClient() browser/server helpers and updateSupabaseSession(request).

- [ ] **Step 1: Write the failing setup test**

Create tests/supabase-setup.test.mjs:

~~~javascript
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const source = (path) => readFileSync(join(root, path), "utf8");

test("Supabase clients use public configuration and cookie adapters", () => {
  const browser = source("utils/supabase/client.ts");
  const server = source("utils/supabase/server.ts");
  assert.match(browser, /createBrowserClient/);
  assert.match(browser, /NEXT_PUBLIC_SUPABASE_URL/);
  assert.match(browser, /NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY/);
  assert.match(server, /createServerClient/);
  assert.match(server, /getAll\(\)/);
  assert.match(server, /setAll\(cookiesToSet\)/);
});

test("Next 16 proxy refreshes claims and protects resident routes", () => {
  assert.equal(existsSync(join(root, "proxy.ts")), true);
  assert.match(source("proxy.ts"), /updateSupabaseSession/);
  const helper = source("utils/supabase/proxy.ts");
  assert.match(helper, /auth\.getClaims\(\)/);
  assert.match(helper, /\/resident\/login/);
  assert.match(helper, /NextResponse\.redirect/);
});
~~~

- [ ] **Step 2: Run the test and confirm the expected RED failure**

Run:

~~~powershell
node --test tests/supabase-setup.test.mjs
~~~

Expected: FAIL because the Supabase helper and proxy files do not exist.

- [ ] **Step 3: Install pinned Supabase runtime packages**

Run:

~~~powershell
npm install --save-exact @supabase/supabase-js @supabase/ssr
~~~

Expected: package.json and package-lock.json include exact runtime versions.

- [ ] **Step 4: Add the browser and server client helpers**

Create utils/supabase/client.ts:

~~~typescript
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
~~~

Create utils/supabase/server.ts:

~~~typescript
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Server Components cannot set cookies; proxy.ts persists refreshes.
          }
        },
      },
    },
  );
}
~~~

- [ ] **Step 5: Add the verified session refresh and route protection**

Create utils/supabase/proxy.ts with a cookie-aware createServerClient. It must:
1. copy request cookies through getAll/setAll;
2. call await supabase.auth.getClaims();
3. return NextResponse.next() for /resident/login and /resident/signup;
4. redirect unauthenticated protected resident requests to /resident/login with a next parameter; and
5. return the response carrying any refreshed auth cookies.

Create proxy.ts:

~~~typescript
import { type NextRequest } from "next/server";
import { updateSupabaseSession } from "./utils/supabase/proxy";

export async function proxy(request: NextRequest) {
  return updateSupabaseSession(request);
}

export const config = { matcher: ["/resident/:path*"] };
~~~

Delete middleware.ts only after this proxy implementation exists.

- [ ] **Step 6: Document safe local configuration**

Replace .env.example with:

~~~ini
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your-project-key

DATABASE_URL=postgresql://postgres.your-project-ref:YOUR_PASSWORD@aws-0-region.pooler.supabase.com:6543/postgres?pgbouncer=true
DIRECT_URL=postgresql://postgres.your-project-ref:YOUR_PASSWORD@aws-0-region.pooler.supabase.com:5432/postgres
~~~

Set the real URL/key and connection strings in the ignored .env.local without staging it.

- [ ] **Step 7: Verify the GREEN state and commit**

Run:

~~~powershell
node --test tests/supabase-setup.test.mjs
npm test
git add package.json package-lock.json .env.example utils/supabase proxy.ts middleware.ts tests/supabase-setup.test.mjs
git commit -m "feat: add Supabase SSR session setup"
~~~

Expected: tests pass and the commit contains no secret.

### Task 3: Create RLS-protected ALAB resident tables and seed Antique reference data

**Files:**
- Create: the timestamped `create_alab_resident_schema.sql` path emitted by the Supabase CLI in `mainfile/alab-system/supabase/migrations/`
- Create: mainfile/alab-system/supabase/seed.sql
- Create: mainfile/alab-system/tests/supabase-schema.test.mjs

**Interfaces:**
- Consumes: auth.users(id), the approved data model, and app/_content/antique-barangays.ts.
- Produces: nine RLS-protected public tables and a repeatable location seed.

- [ ] **Step 1: Write a failing schema-content test**

Create tests/supabase-schema.test.mjs. It locates the only migration in supabase/migrations and asserts the SQL contains these tables: municipalities, barangays, resident_profiles, resident_addresses, resident_verifications, notification_preferences, fire_reports, fire_report_photos, notifications. Assert it contains references auth.users(id), enables RLS on each table, and contains TO authenticated plus (select auth.uid()). Assert seed.sql uses INSERT INTO public.municipalities and INSERT INTO public.barangays with ON CONFLICT.

- [ ] **Step 2: Confirm the RED failure**

Run:

~~~powershell
node --test tests/supabase-schema.test.mjs
~~~

Expected: FAIL because no Supabase migration or seed exists.

- [ ] **Step 3: Have the CLI create the migration filename**

Run:

~~~powershell
npx supabase migration new create_alab_resident_schema
~~~

Expected: exactly one CLI-generated timestamped SQL file below supabase/migrations. Use that path rather than inventing a timestamp.

- [ ] **Step 4: Implement the version-controlled schema**

Create enums verification_status (PENDING, VERIFIED, REJECTED), fire_type (HOUSE_BUILDING, GRASS, FOREST, VEHICLE, OTHER), fire_report_status (SUBMITTED, UNDER_VERIFICATION, CONFIRMED, REJECTED, FALSE_REPORT, DUPLICATE, NEEDS_MORE_INFO, CLOSED), and location_method (GPS, MANUAL_PIN).

Create all nine tables with UUID primary keys, timestamptz audit columns, these required relationships, and constraints:
- resident_profiles.user_id references auth.users(id), is unique, and stores username, phone, first_name, last_name, terms_accepted_at;
- barangays.municipality_id references municipalities;
- addresses, verifications, preferences, reports, notifications each reference resident_profiles;
- reports reference municipality and barangay; photos reference reports;
- latitude/longitude checks reject invalid coordinates;
- a partial unique index allows only one primary address per profile.

Include the operational report indexes:

~~~sql
create index fire_reports_resident_submitted_idx
  on public.fire_reports (resident_profile_id, submitted_at desc);
create index fire_reports_status_submitted_idx
  on public.fire_reports (status, submitted_at desc);
create index fire_reports_municipality_submitted_idx
  on public.fire_reports (municipality_id, submitted_at desc);
create unique index resident_addresses_one_primary_idx
  on public.resident_addresses (resident_profile_id) where is_primary;
~~~

- [ ] **Step 5: Apply RLS with explicit least-privilege policies**

Enable RLS on every created public table. Grant anonymous/authenticated SELECT only to municipalities and barangays. Use direct ownership policies for profiles:

~~~sql
create policy "Residents read their profile"
on public.resident_profiles for select to authenticated
using ((select auth.uid()) = user_id);

create policy "Residents create their profile"
on public.resident_profiles for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy "Residents update their profile"
on public.resident_profiles for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
~~~

Use an EXISTS query through resident_profiles for address, verification, preference, report, photo, and notification policies. Residents cannot insert or update notifications, cannot access another profile, and cannot change an owning ID. Do not use auth.role(), SECURITY DEFINER, a service-role browser key, or a blanket authenticated policy.

- [ ] **Step 6: Create a repeatable locality seed**

Generate supabase/seed.sql from antiqueBarangays. Insert every municipality using province Antique and ON CONFLICT (name) DO UPDATE. Insert each barangay via its municipality lookup with ON CONFLICT (municipality_id, name) DO NOTHING. Do not delete rows.

- [ ] **Step 7: Run schema test, apply database changes, and verify**

Run only after .env.local contains a real DIRECT_URL:

~~~powershell
node --test tests/supabase-schema.test.mjs
$migrationPath = (Get-ChildItem supabase/migrations/*_create_alab_resident_schema.sql).FullName
psql "$env:DIRECT_URL" -v ON_ERROR_STOP=1 -f $migrationPath
psql "$env:DIRECT_URL" -v ON_ERROR_STOP=1 -f supabase/seed.sql
psql "$env:DIRECT_URL" -Atc "select count(*) from public.municipalities; select count(*) from public.barangays;"
~~~

Expected: schema test passes; SQL succeeds; 18 municipality records and all supplied barangays are present. If the URL contains YOUR_PASSWORD, stop without running psql.

- [ ] **Step 8: Commit**

Run:

~~~powershell
git add supabase/migrations supabase/seed.sql tests/supabase-schema.test.mjs
git commit -m "feat: add Supabase resident schema"
~~~

Expected: a database-only commit with no local env file.

### Task 4: Replace Railway APIs and custom cookies with Supabase Auth and claims

**Files:**
- Modify: mainfile/alab-system/app/api/auth/register/route.ts
- Modify: mainfile/alab-system/app/api/auth/login/route.ts
- Create: mainfile/alab-system/app/api/auth/logout/route.ts
- Modify: mainfile/alab-system/app/api/resident/dashboard/route.ts
- Modify: mainfile/alab-system/app/api/resident/profile/route.ts
- Modify: mainfile/alab-system/app/_components/login-page.tsx
- Modify: mainfile/alab-system/app/resident/layout.tsx
- Delete: mainfile/alab-system/lib/db.ts
- Delete: mainfile/alab-system/lib/auth/session.ts
- Delete: mainfile/alab-system/lib/auth/password.ts
- Delete: mainfile/alab-system/lib/auth/login-rate-limit.ts
- Modify: mainfile/alab-system/tests/resident-auth-security.test.mjs
- Modify: mainfile/alab-system/tests/resident-profile-data.test.mjs

**Interfaces:**
- Consumes: server createClient(), getClaims(), RLS, and the Task 3 schema.
- Produces: Supabase-backed registration, email/password login/logout, profile, and dashboard behavior.

- [ ] **Step 1: Write failing behavioral tests for the Supabase contract**

Replace legacy static checks for INSERT INTO users, hashPassword, verifyResidentSession, and middleware.ts. The new tests must assert:
- registration imports the server client and calls auth.signUp;
- login calls auth.signInWithPassword;
- logout calls auth.signOut;
- profile and dashboard call auth.getClaims and query profiles by user_id;
- proxy.ts exists and middleware.ts does not;
- login-page sends email, not a username-or-email identifier.

- [ ] **Step 2: Confirm the expected RED failure**

Run:

~~~powershell
node --test tests/resident-auth-security.test.mjs tests/resident-profile-data.test.mjs
~~~

Expected: FAIL because Railway/custom-session code is still in use.

- [ ] **Step 3: Implement password registration and application profile creation**

Keep the existing registration validation. Replace custom hashing and pg transaction with:

~~~typescript
const supabase = await createClient();
const { data, error } = await supabase.auth.signUp({
  email,
  password,
  options: { data: { first_name: firstName, last_name: lastName } },
});
if (error || !data.user) {
  return NextResponse.json(
    { error: error?.message ?? "Unable to create the resident account." },
    { status: 400 },
  );
}
~~~

Using the authenticated Supabase client, look up the chosen municipality/barangay and insert resident_profiles, one primary resident_addresses row, one PENDING resident_verifications row, and one notification_preferences row. Preserve the current document-key placeholders only; do not upload documents. If email confirmation is enabled and returns no session, return a confirmation-required response before profile inserts; test registration after either disabling confirmation for this test project or confirming the email.

- [ ] **Step 4: Implement login, logout, and claims-backed data routes**

Login accepts email/password and calls:

~~~typescript
const supabase = await createClient();
const { error } = await supabase.auth.signInWithPassword({ email, password });
if (error) return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
return NextResponse.json({ ok: true });
~~~

Logout POST calls await supabase.auth.signOut() and returns { ok: true }.

For profile and dashboard routes, call getClaims before data access and return 401 without claims.sub. Query resident_profiles with eq("user_id", claims.sub).single(), then produce the existing response JSON shape with embedded address/location, verification/preferences, and report queries. RLS is the second authorization boundary.

- [ ] **Step 5: Update resident UI integration**

Change the login label, placeholder, request property, and error text from username/identifier to email. Retain the existing visual popup. Replace the resident layout logout link with a button that POSTs to /api/auth/logout and then sends the browser to /. Do not change other resident UI styles.

- [ ] **Step 6: Remove Railway code only after green tests**

Delete lib/db.ts and all four listed custom-auth files. Run:

~~~powershell
npm uninstall pg @types/pg
~~~

Expected: no app API route imports pg, getDatabase, withTransaction, or a custom HMAC session helper.

- [ ] **Step 7: Verify and commit**

Run:

~~~powershell
node --test tests/resident-auth-security.test.mjs tests/resident-profile-data.test.mjs
npm test
npm run lint
npm run build
git add app/api app/_components/login-page.tsx app/resident/layout.tsx lib package.json package-lock.json tests
git commit -m "feat: migrate resident auth to Supabase"
~~~

Expected: all verification passes and the resident app has no Railway runtime dependency.

### Task 5: Final safety and connected-project verification

**Files:**
- Verify: mainfile/alab-system/.env.local
- Verify: mainfile/alab-system/.gitignore
- Verify: all migration changes

**Interfaces:**
- Consumes: complete Supabase schema and resident application migration.
- Produces: verified test deployment and no committed secret.

- [ ] **Step 1: Scan tracked files for forbidden configuration**

Run:

~~~powershell
git grep -n -E "postgres(ql)?://|service_role|sb_secret|railway\.app" -- ':!package-lock.json'
git check-ignore -v .env.local
~~~

Expected: no tracked credential, secret key, or Railway hostname. The local env file is ignored.

- [ ] **Step 2: Manually test both authorization and sessions**

With Confirm email disabled for this temporary test project or after confirming the address:
1. Create resident A at /resident/signup.
2. Sign out, then sign in with resident A's email/password.
3. Confirm /resident and /resident/profile load.
4. Create resident B and use browser developer tools to confirm B cannot retrieve A's profile/report records.
5. Sign out and confirm /resident redirects to /resident/login.

- [ ] **Step 3: Run final verification and review commits**

Run:

~~~powershell
npm test
npm run lint
npm run build
git log --oneline -3
git status --short
~~~

Expected: all commands exit 0, only focused migration commits appear, and no unrelated user changes are staged.
