# Municipality Water Sources Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace sample water-source screens with a municipality-scoped, database-backed registry of the 148 paper records, creation workflow, and selectable GIS markers.

**Architecture:** Store every hydrant/source in one server-only Postgres table keyed to `municipalities`. Municipal and Provincial routes expose separate authenticated projections over a shared service; the Municipal UI links each scoped card to the existing GIS map through a selected-source query parameter. The GIS map loads the same Municipal endpoint, renders a toggleable Leaflet layer, and safely opens only markers present in the authenticated response.

**Tech Stack:** Next.js 16.2 App Router, React 19, TypeScript, PostgreSQL/Supabase migrations, `pg`, Leaflet 1.9, Node test runner, PGlite test database.

**Spec:** `docs/superpowers/specs/2026-09-23-municipal-water-sources-design.md`

## Global Constraints

- Municipal accounts read only their authenticated municipality; only `MUNICIPAL_ADMIN` creates records.
- Provincial BFP can read all Antique municipalities and all 148 imported records.
- Preserve latitude/longitude to seven decimal places and never accept municipality, creator, or origin from client input.
- Keep one existing GIS map; do not build a duplicate water-source map.
- Cards and popups expose only quantity, location, coordinates, municipality, type/color, and record origin.
- Use white surfaces, crisp blue-gray borders, ALAB red actions, and restrained teal water markers; no gradients.
- No edit, delete, photo, pressure, capacity, or public-access workflow in this version.
- Use only current project dependencies; do not add a UI or map package.
- Create the migration with `supabase migration new`; do not invent or rewrite migration history.
- Every behavior change follows red-green-refactor and every database write is parameterized.

---

### Task 1: Water-source schema and exact 148-row import

**Files:**
- Create via Supabase CLI: the exact path printed by `npx supabase migration new add_water_sources_registry` (suffix `_add_water_sources_registry.sql`)
- Create: `tests/water-source-schema.test.mjs`
- Source: `../../outputs/fire-hydrant-coordinates-antique.md`

**Interfaces:**
- Consumes: existing `public.municipalities(id, name, province)` and `public.users(id)`.
- Produces: `public.water_sources` with the exact columns, constraints, indexes, import origin, and municipality totals defined in the specification.
- Produces: append-only `public.water_source_events` rows for source creation audits.

- [ ] **Step 1: Verify current Supabase guidance and the migration command**

Browse `https://supabase.com/changelog.md`, scan applicable breaking changes, and read the current Supabase migration and RLS documentation before authoring SQL. Then run:

Run:

```powershell
npx supabase --version
npx supabase migration new --help
```

Expected: Supabase CLI reports its version and documents `migration new <name>`.

- [ ] **Step 2: Write the failing schema/import test**

Create `tests/water-source-schema.test.mjs` to locate the migration by suffix and assert the schema and source counts before the migration exists:

```js
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const migrations = join(process.cwd(), "supabase", "migrations");
const migrationPath = () => {
  const name = readdirSync(migrations).find((file) => file.endsWith("_add_water_sources_registry.sql"));
  assert.ok(name, "water-source migration is missing");
  return join(migrations, name);
};

test("water-source migration creates a server-only constrained registry", () => {
  const sql = readFileSync(migrationPath(), "utf8");
  assert.match(sql, /create table public\.water_sources/i);
  assert.match(sql, /source_kind in \('FIRE_HYDRANT', 'WATER_SOURCE'\)/i);
  assert.match(sql, /quantity > 0/i);
  assert.match(sql, /latitude between 4 and 22/i);
  assert.match(sql, /longitude between 116 and 127/i);
  assert.match(sql, /numeric\(10,7\)/i);
  assert.match(sql, /enable row level security/i);
  assert.match(sql, /revoke all on table public\.water_sources from public, anon, authenticated/i);
  assert.match(sql, /water_sources_municipality_location_idx/i);
  assert.match(sql, /water_sources_municipality_coordinates_idx/i);
  assert.match(sql, /create table public\.water_source_events/i);
  assert.match(sql, /prevent_water_source_event_mutation/i);
});

test("paper import contains exactly the approved municipality totals", () => {
  const sql = readFileSync(migrationPath(), "utf8");
  const expected = { "Anini-y": 1, Barbaza: 5, Belison: 19, Bugasong: 2, Caluya: 6, Culasi: 6, Hamtic: 2, Libertad: 2, Pandan: 7, Patnongon: 1, "San Jose de Buenavista": 65, "San Remigio": 9, Sebaste: 5, Sibalom: 7, Tibiao: 3, "Tobias Fornier": 4, Valderrama: 4 };
  const imported = [...sql.matchAll(/\('([^']+)',\s*'FIRE_HYDRANT'/g)].map((match) => match[1]);
  assert.equal(imported.length, 148);
  for (const [municipality, count] of Object.entries(expected)) {
    assert.equal(imported.filter((name) => name === municipality).length, count, municipality);
  }
  assert.doesNotMatch(sql, /\('Laua-an',\s*'FIRE_HYDRANT'/);
});
```

- [ ] **Step 3: Run the test and verify RED**

Run: `node --test tests/water-source-schema.test.mjs`

Expected: FAIL with `water-source migration is missing`.

- [ ] **Step 4: Generate the migration and implement the schema**

Run: `npx supabase migration new add_water_sources_registry`, then edit the exact path printed by the CLI. Create the table with `numeric(10,7)`, checks, foreign keys, RLS, explicit revokes, the two required indexes, and an insert-select that resolves each tuple's municipality by `lower(m.name) = lower(imported.municipality_name)` and `m.province = 'Antique'`. Create `water_source_events` with source, municipality, actor, action, whitelisted metadata, and timestamp; enable RLS, revoke public/Data API roles, and add a trigger that raises on update or delete.

Build the data CTE by converting each Markdown table row mechanically: municipality comes from the location's municipality grouping, `source_kind` is `FIRE_HYDRANT`, quantity is the first numeric column, location is copied verbatim, normalized latitude/longitude are numeric literals, and type/color is copied verbatim. Use this exact tuple shape:

```sql
with imported(municipality_name, source_kind, quantity, exact_location, latitude, longitude, type_color) as (
  values
    ('Anini-y', 'FIRE_HYDRANT', 1, 'Poblacion, Anini-y, Antique', 10.4308860, 121.9280140, 'Black'),
    ('Hamtic', 'FIRE_HYDRANT', 1, 'Poblacion 3, Hamtic, Antique (in back of ARC''s Pizza Hub)', 10.7013427, 121.9817124, 'Wet Barrel / 2"'),
    ('Hamtic', 'FIRE_HYDRANT', 1, 'Poblacion 2, Hamtic, Antique (in front of Anteaues Bestea)', 10.7011186, 121.9817536, 'Wet Barrel / 2"')
)
```

Generate the full column lists instead of leaving ellipses in production SQL:

```sql
insert into public.water_sources
  (municipality_id, source_kind, quantity, exact_location, latitude, longitude, type_color, record_origin)
select
  m.id, imported.source_kind, imported.quantity, imported.exact_location,
  imported.latitude, imported.longitude, imported.type_color, 'BFP_LOCATOR_CHART_2018'
from imported
join public.municipalities m
  on lower(m.name) = lower(imported.municipality_name)
 and m.province = 'Antique'
on conflict do nothing;
```

Before insert, use a `DO` block to compare imported municipality names with Antique municipalities and raise an exception on any missing match. Add an origin/location/coordinates unique index so reruns cannot multiply imported rows.

- [ ] **Step 5: Run migration tests and inspect the generated SQL**

Run:

```powershell
node --test tests/water-source-schema.test.mjs
git diff --check -- supabase/migrations tests/water-source-schema.test.mjs
```

Expected: PASS; imported total 148; no whitespace errors.

- [ ] **Step 6: Commit**

```powershell
git add supabase/migrations tests/water-source-schema.test.mjs
git commit -m "feat(water-sources): add hydrant registry and paper import"
```

### Task 2: Shared validation and scoped data service

**Files:**
- Create: `lib/water-sources/types.ts`
- Create: `lib/water-sources/service.ts`
- Create: `tests/water-source-service.test.mjs`

**Interfaces:**
- Produces `WaterSource`, `WaterSourceSummary`, `CreateWaterSourceInput`, `validateWaterSourceInput(raw)`, `listMunicipalWaterSources(municipalityId)`, `listProvincialWaterSources(filters?)`, and `createMunicipalWaterSource(actorUserId, municipalityId, raw)`.
- `createMunicipalWaterSource` returns the inserted `WaterSource` and throws `INVALID_WATER_SOURCE_INPUT` or a PostgreSQL `23505` duplicate error.

- [ ] **Step 1: Write failing validation and scoping tests**

Use `tests/helpers/load-server-module.mjs` with a query-recording database stub. Assert that validation trims text, accepts seven-decimal coordinates, rejects invalid kinds/counts/ranges, and that query parameters contain the session municipality rather than `raw.municipalityId`.

```js
test("creation ignores client ownership and inserts the authenticated municipality", async () => {
  const calls = [];
  const db = { query: async (sql, params) => { calls.push({ sql, params }); return { rows: [{ id: "source-1", municipalityId: "hamtic-id" }] }; } };
  const mod = loadServerModule("lib/water-sources/service.ts", {
    "../db": { getDatabase: () => db, withTransaction: async (work) => work(db) },
  });
  await mod.createMunicipalWaterSource("actor-1", "hamtic-id", { municipalityId: "other-id", sourceKind: "FIRE_HYDRANT", quantity: 1, exactLocation: "Municipal Hall", latitude: 10.7, longitude: 121.98, typeColor: "Wet Barrel" });
  assert.ok(calls.some((call) => call.params?.includes("hamtic-id")));
  assert.ok(calls.every((call) => !call.params?.includes("other-id")));
});
```

- [ ] **Step 2: Verify RED**

Run: `node --test tests/water-source-service.test.mjs`

Expected: FAIL because the modules do not exist.

- [ ] **Step 3: Implement minimal typed service**

Implement strict parsing without coercing blank strings to zero. Use `withTransaction` for source insert plus a `water_source_events` audit row with action `CREATED`. Select numeric columns with `::float` and alias snake_case to camelCase. Provincial summaries must start from Antique municipalities and left join pre-aggregated water-source counts so zero-count municipalities remain visible.

- [ ] **Step 4: Verify GREEN**

Run: `node --test tests/water-source-service.test.mjs`

Expected: PASS with municipality-scoped parameters and validation behavior.

- [ ] **Step 5: Commit**

```powershell
git add lib/water-sources tests/water-source-service.test.mjs
git commit -m "feat(water-sources): add scoped registry service"
```

### Task 3: Authenticated Municipal and Provincial API routes

**Files:**
- Create: `app/api/municipal-bfp/water-sources/route.ts`
- Create: `app/api/provincial-bfp/water-sources/route.ts`
- Create: `tests/water-source-api.test.mjs`
- Modify: `lib/municipal-bfp/auth.ts` only if a read guard for Municipal staff is not already available.

**Interfaces:**
- Municipal `GET` returns `{ municipality, summary, sources }` for the signed municipality.
- Municipal `POST` returns `{ source }` with status 201; only `MUNICIPAL_ADMIN`.
- Provincial `GET` returns `{ municipalities, sources }`, with optional validated `municipalityId` query filtering.

- [ ] **Step 1: Write failing route authorization/source tests**

Assert the route source uses the Municipal session identity for reads/writes, uses `requireMunicipalAdmin` for POST, uses `requireProvincialBfp` for Provincial reads, never reads `body.municipalityId`, maps `23505` to 409, and sets `runtime = "nodejs"`.

- [ ] **Step 2: Verify RED**

Run: `node --test tests/water-source-api.test.mjs`

Expected: FAIL because both route files are missing.

- [ ] **Step 3: Implement the routes**

First locate and read the relevant Route Handler guidance under `node_modules/next/dist/docs/` as required by `AGENTS.md`. Use safe JSON parsing and these status rules: 401 unauthenticated, 403 wrong role, 400 invalid fields/filter, 409 duplicate, 500 unexpected database failure. Do not return SQL messages or another municipality's existence.

- [ ] **Step 4: Verify GREEN**

Run: `node --test tests/water-source-api.test.mjs tests/water-source-service.test.mjs`

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add app/api/municipal-bfp/water-sources app/api/provincial-bfp/water-sources tests/water-source-api.test.mjs lib/municipal-bfp/auth.ts
git commit -m "feat(water-sources): expose scoped APIs"
```

### Task 4: Municipal registry UI and add-source dialog

**Files:**
- Create: `app/_components/municipal-water-sources.tsx`
- Modify: `app/municipal-bfp/water-sources/page.tsx`
- Create: `tests/municipal-water-sources-ui.test.mjs`

**Interfaces:**
- `MunicipalWaterSources` fetches `/api/municipal-bfp/water-sources`, renders summaries and cards, and POSTs the exact `CreateWaterSourceInput` fields.
- Card links target `/municipal-bfp/gis-map?layer=water-sources&waterSource=${source.id}`.

- [ ] **Step 1: Generate and record the focused design guidance**

Run:

```powershell
python ..\..\.agents\skills\ui-ux-pro-max\scripts\search.py "emergency operations water source registry clean dashboard" --design-system --density 7 -p "ALAB Water Sources"
python ..\..\.agents\skills\ui-ux-pro-max\scripts\search.py "keyboard focus modal validation" --domain ux
python ..\..\.agents\skills\ui-ux-pro-max\scripts\search.py "client data fetching accessible dialog" --stack nextjs
```

Apply the result within the approved white/red/teal direction without changing the global navigation style.

- [ ] **Step 2: Write the failing UI source test**

Assert the page renders `MunicipalWaterSources`; the component uses the API; includes loading, empty, retry, search, and error-summary states; uses a semantic `<dialog>` or accessible `role="dialog"`; includes every form label; and builds the map deep link. Assert the old hard-coded names and CSS gradient are absent.

- [ ] **Step 3: Verify RED**

Run: `node --test tests/municipal-water-sources-ui.test.mjs`

Expected: FAIL because the component is missing and the page contains sample cards.

- [ ] **Step 4: Implement the clean responsive registry**

First locate and read the current Next.js client-component and navigation guidance under `node_modules/next/dist/docs/`. Use `municipalTabFetch`, controlled search, stable card keys, and semantic buttons/links. Keep the last successful payload if refresh fails. The dialog's municipality is display-only, quantity defaults to 1, coordinate inputs use `step="0.0000001"`, and unsuccessful POSTs retain values. On success prepend/sort the returned source and update summary counts from response data or a fresh GET.

- [ ] **Step 5: Verify GREEN**

Run: `node --test tests/municipal-water-sources-ui.test.mjs`

Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add app/_components/municipal-water-sources.tsx app/municipal-bfp/water-sources/page.tsx tests/municipal-water-sources-ui.test.mjs
git commit -m "feat(water-sources): build municipal registry UI"
```

### Task 5: Water-source layer, selected marker, and popup on the Municipal GIS map

**Files:**
- Modify: `app/_components/municipal-gis-operations-map.tsx`
- Modify: `tests/gis-map-operations.test.mjs`

**Interfaces:**
- Fetches the Municipal water-source `sources` array.
- Reads `layer=water-sources` and the UUID-valued `waterSource` query parameter with `useSearchParams`.
- Adds `drawWaterSources(L, map, layer, sources, selectedId)` that returns the selected Leaflet marker or null.

- [ ] **Step 1: Add failing GIS behavior tests**

Assert the component has a dedicated water-source layer ref and toggle, fetches `/api/municipal-bfp/water-sources`, uses `useSearchParams`, renders teal droplet markers, binds escaped popup content for the approved fields, includes a water-source legend key, and opens only a marker found in the scoped array.

- [ ] **Step 2: Verify RED**

Run: `node --test tests/gis-map-operations.test.mjs`

Expected: FAIL on the new water-source assertions.

- [ ] **Step 3: Implement the map layer**

Escape popup text before interpolating HTML. Maintain `waterSourceLayerRef` separately from incident/station layers. Default the toggle on when `layer=water-sources`; when a selected scoped source exists, call `map.setView([lat, lon], 17, { animate: false })` and `marker.openPopup()`. Ignore unknown IDs and never request an unscoped detail endpoint.

- [ ] **Step 4: Verify GREEN**

Run: `node --test tests/gis-map-operations.test.mjs tests/municipal-water-sources-ui.test.mjs`

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add app/_components/municipal-gis-operations-map.tsx tests/gis-map-operations.test.mjs
git commit -m "feat(water-sources): map municipal hydrant markers"
```

### Task 6: Province-wide municipality cards and filtered details

**Files:**
- Create: `app/_components/provincial-water-sources.tsx`
- Modify: `app/provincial-bfp/water-sources/page.tsx`
- Create: `tests/provincial-water-sources-ui.test.mjs`

**Interfaces:**
- `ProvincialWaterSources` fetches `/api/provincial-bfp/water-sources`.
- Municipality cards show count plus hydrant/other breakdown; selection filters the source list without granting write actions.

- [ ] **Step 1: Write the failing Provincial UI test**

Assert the sample `WS-ANT-*` rows and false `128 verified` text are removed, all municipality summaries can render including zero counts, cards are buttons with `aria-pressed`, selected municipality rows expose coordinates/type-color, and no add/edit/delete action is present.

- [ ] **Step 2: Verify RED**

Run: `node --test tests/provincial-water-sources-ui.test.mjs`

Expected: FAIL against the current sample table.

- [ ] **Step 3: Implement the Provincial registry view**

Use a compact card grid followed by a selected-municipality details panel. Default to `All municipalities`, display the authoritative total from the API, and preserve clear loading/error/empty states.

- [ ] **Step 4: Verify GREEN**

Run: `node --test tests/provincial-water-sources-ui.test.mjs tests/water-source-api.test.mjs`

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add app/_components/provincial-water-sources.tsx app/provincial-bfp/water-sources/page.tsx tests/provincial-water-sources-ui.test.mjs
git commit -m "feat(water-sources): add provincial municipality view"
```

### Task 7: Database and application integration verification

**Files:**
- Modify only files revealed by failing verification; every fix begins with a focused failing regression test.

**Interfaces:**
- Confirms schema, service, routes, both portal views, and GIS layer work together without regressing the existing application.

- [ ] **Step 1: Verify migration safety against the local database**

Run the available local migration command discovered through CLI `--help`; if no local database runtime is available, report that separately and still execute the PGlite/schema tests.

- [ ] **Step 2: Run focused tests**

```powershell
node --test tests/water-source-schema.test.mjs tests/water-source-service.test.mjs tests/water-source-api.test.mjs tests/municipal-water-sources-ui.test.mjs tests/gis-map-operations.test.mjs tests/provincial-water-sources-ui.test.mjs
```

Expected: all focused tests PASS.

- [ ] **Step 3: Run the full verification suite**

```powershell
npm test
npm run lint
npm run build
```

Expected: all tests pass, ESLint reports no errors, and the Next.js production build completes.

- [ ] **Step 4: Perform the authenticated browser walkthrough**

Run the existing local preview/development workflow, then verify:

1. Hamtic Municipal account shows exactly two imported cards.
2. Search filters location/type without fetching province-wide data.
3. Card click opens the GIS map at the exact marker with the popup open.
4. Water-source toggle and legend work independently of incidents/stations.
5. Add dialog rejects invalid coordinates and retains fields.
6. Valid creation appears in the list and map after refresh.
7. Provincial page shows 148 imported rows grouped by the 17 listed municipalities and shows zero-count municipalities.
8. Desktop and 375px layouts have no clipping; dialog focus/escape and reduced motion work.

- [ ] **Step 5: Final audit and commit**

```powershell
git status --short
git diff --check
git add mainfile/alab-system
git commit -m "feat: deliver municipality water source registry"
```

Do not stage unrelated workspace files such as `outputs/` unless the user explicitly asks to commit them.
