# Automatic Building-Density Severity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Automatically detect tightly packed mapped structures at resident-reported fire locations, feed the conservative result into severity, and display the evidence on the municipality GIS map.

**Architecture:** Import an Antique extract of Google Research Open Buildings V3 into a private PostGIS schema and assess each resident report with indexed polygon-distance queries. Store the resident answer, automatic result, effective density, and immutable matched geometry separately; municipality-scoped APIs expose only incident-local evidence to a Leaflet overlay.

**Tech Stack:** Next.js 16.2.12, React 19.2.4, TypeScript, Node.js test runner, PostgreSQL/Supabase PostGIS, `pg` 8.16.3, Leaflet 1.9.4.

**Spec:** `docs/superpowers/specs/2026-09-04-automatic-building-density-severity-design.md`

## Global Constraints

- Never scrape Google Maps, tiles, Street View, or business listings.
- Use `GOOGLE_OPEN_BUILDINGS_V3_2023_05` polygons at source confidence `>= 0.75` and display `Building footprints: Google Research Open Buildings V3, CC BY 4.0` wherever evidence geometry appears.
- A dense cluster requires at least three footprints within 30 meters, one within 15 meters of the incident, and connectivity to two neighbors through gaps of 2 meters or less.
- Automatic detection may increase effective density but may never downgrade resident evidence or an existing severity result.
- Report submission must succeed with `INSUFFICIENT_DATA` when density assessment fails.
- Raw footprint tables remain outside the exposed API surface; municipal reads derive scope from the authenticated assignment.
- UI copy says `mapped structures`, never `confirmed houses`.

---

### Task 1: Add the private PostGIS density schema

**Files:**
- Create via `npx supabase migration new automatic_building_density`: `supabase/migrations/<generated_timestamp>_automatic_building_density.sql`
- Create: `tests/building-density-schema.test.mjs`

**Interfaces:**
- Consumes: existing `public.fire_reports` and `HouseDensity` values.
- Produces: `gis.building_footprints`, `gis.fire_report_density_evidence`, and density audit columns on `public.fire_reports`.

- [ ] **Step 1: Write the failing migration contract test**

```js
test("automatic density migration creates private indexed PostGIS evidence", () => {
  const sql = migration("automatic_building_density");
  assert.match(sql, /create extension if not exists postgis/i);
  assert.match(sql, /create schema if not exists gis/i);
  assert.match(sql, /create table if not exists gis\.building_footprints/i);
  assert.match(sql, /geometry\s+geometry\(multipolygon,\s*4326\)/i);
  assert.match(sql, /using gist\s*\(geometry\)/i);
  assert.match(sql, /create table if not exists gis\.fire_report_density_evidence/i);
  assert.match(sql, /reported_house_density/i);
  assert.match(sql, /detected_building_density/i);
  assert.match(sql, /building_density_confidence/i);
  assert.match(sql, /revoke all.*anon/i);
  assert.match(sql, /revoke all.*authenticated/i);
});
```

- [ ] **Step 2: Run the schema test and verify RED**

Run: `node --test tests/building-density-schema.test.mjs`

Expected: FAIL because no migration named `automatic_building_density` exists.

- [ ] **Step 3: Generate and implement the migration**

Run: `npx supabase migration new automatic_building_density`

Populate the generated file with idempotent SQL that:

```sql
create extension if not exists postgis with schema extensions;
create schema if not exists gis;

create table if not exists gis.building_footprints (
  source_feature_id text primary key,
  geometry extensions.geometry(MultiPolygon, 4326) not null,
  source_confidence numeric(4,3) not null check (source_confidence between 0 and 1),
  source_dataset text not null check (source_dataset = 'GOOGLE_OPEN_BUILDINGS_V3_2023_05'),
  imported_at timestamptz not null default now()
);
create index if not exists building_footprints_geometry_gist
  on gis.building_footprints using gist (geometry);

alter table public.fire_reports
  add column if not exists reported_house_density text,
  add column if not exists detected_building_density text,
  add column if not exists building_density_confidence text,
  add column if not exists building_density_building_count integer,
  add column if not exists building_density_minimum_gap_meters numeric(7,2),
  add column if not exists building_density_source text,
  add column if not exists building_density_assessed_at timestamptz;

update public.fire_reports
set reported_house_density = house_density
where reported_house_density is null and house_density is not null;
```

Add idempotent named check constraints for report/density states and nonnegative evidence values. Create `gis.fire_report_density_evidence` with the exact columns from the spec, composite primary key, cascading report foreign key, and `fire_report_id` index. Revoke all table/schema access from `anon` and `authenticated`.

- [ ] **Step 4: Run focused schema verification**

Run: `node --test tests/building-density-schema.test.mjs tests/migration.test.mjs tests/supabase-schema.test.mjs`

Expected: PASS.

- [ ] **Step 5: Commit the schema contract**

```bash
git add supabase/migrations/*_automatic_building_density.sql tests/building-density-schema.test.mjs
git commit -m "feat: add automatic building density schema"
```

### Task 2: Implement deterministic density assessment and precedence

**Files:**
- Create: `lib/fire-reports/building-density.ts`
- Create: `tests/building-density-assessment.test.mjs`

**Interfaces:**
- Consumes: `PoolClient`, validated coordinates, and `HouseDensity`.
- Produces: `assessBuildingDensity(client, latitude, longitude): Promise<BuildingDensityAssessment>`, `resolveEffectiveHouseDensity(reported, detected): HouseDensity | null`, and `densitySeverityFactors(assessment): string[]`.

- [ ] **Step 1: Write failing behavior tests for the public API**

```js
test("three connected footprints at the incident become a dense cluster", async () => {
  const client = fakeClient({ qualifyingCount: 3, incidentLinkedCount: 1, connectedCount: 3, minimumGapMeters: 1.4, allHighConfidence: true, nearestDistanceMeters: 0 });
  const result = await assessBuildingDensity(client, 10.7431, 121.9272);
  assert.equal(result.status, "DENSE_CLUSTER_DETECTED");
  assert.equal(result.confidence, "HIGH");
  assert.equal(result.buildingCount, 3);
});

test("automatic dense evidence wins when the resident omitted density", () => {
  assert.equal(resolveEffectiveHouseDensity(null, "DENSE_CLUSTER_DETECTED"), "PACKED_MAGKAKADIKIT");
});

test("assessment errors return insufficient data without throwing", async () => {
  const client = rejectingClient(new Error("postgis unavailable"));
  assert.equal((await assessBuildingDensity(client, 10.7431, 121.9272)).status, "INSUFFICIENT_DATA");
});
```

Also cover two buildings, a cluster farther than 15 meters, low confidence, medium confidence, invalid coordinates, resident packed evidence with insufficient map data, and literal factor text.

- [ ] **Step 2: Run assessment tests and verify RED**

Run: `node --test tests/building-density-assessment.test.mjs`

Expected: FAIL because `lib/fire-reports/building-density.ts` does not exist.

- [ ] **Step 3: Implement the typed service and indexed SQL**

Define:

```ts
export type BuildingDensityStatus = "DENSE_CLUSTER_DETECTED" | "NO_DENSE_CLUSTER_DETECTED" | "INSUFFICIENT_DATA";
export type BuildingDensityConfidence = "HIGH" | "MEDIUM" | "UNAVAILABLE";
export type BuildingDensityEvidence = { sourceFeatureId: string; geometry: GeoJSON.MultiPolygon; sourceConfidence: number; distanceToIncidentMeters: number };
export type BuildingDensityAssessment = {
  status: BuildingDensityStatus;
  confidence: BuildingDensityConfidence;
  buildingCount: number;
  minimumGapMeters: number | null;
  source: "GOOGLE_OPEN_BUILDINGS_V3_2023_05" | null;
  assessedAt: Date;
  evidence: BuildingDensityEvidence[];
};
```

Use one parameterized PostGIS query with `ST_DWithin(...::geography, ..., 50)`, source confidence filtering, edge distance via `ST_Distance(...::geography, ...::geography)`, and a recursive connected component constrained to 2-meter edges. Apply a 3-second statement timeout locally to the transaction. Normalize `geometry` from `ST_AsGeoJSON` and catch missing-table, missing-extension, timeout, and query failures as `INSUFFICIENT_DATA`.

Implement precedence exactly as:

```ts
export function resolveEffectiveHouseDensity(reported: HouseDensity | string | null | undefined, detected: BuildingDensityStatus) {
  if (detected === "DENSE_CLUSTER_DETECTED") return "PACKED_MAGKAKADIKIT" as const;
  return reported || null;
}
```

- [ ] **Step 4: Run density and severity tests**

Run: `node --test tests/building-density-assessment.test.mjs tests/severity-ahp-calculation.test.mjs`

Expected: PASS.

- [ ] **Step 5: Commit the assessment service**

```bash
git add lib/fire-reports/building-density.ts tests/building-density-assessment.test.mjs
git commit -m "feat: assess mapped building density"
```

### Task 3: Apply automatic density during resident report creation and enrichment

**Files:**
- Modify: `lib/fire-reports/service.ts`
- Modify: `tests/resident-severity-integration.test.mjs`

**Interfaces:**
- Consumes: Task 2 assessment helpers and Task 1 audit/evidence schema.
- Produces: resident reports whose `house_density` is the effective value and whose reported/detected evidence remains independently auditable.

- [ ] **Step 1: Add failing service integration tests**

Add tests that execute an extracted `prepareDensitySeverityContext` helper with literal assessment fixtures and assert:

```js
assert.equal(context.reportedHouseDensity, null);
assert.equal(context.effectiveHouseDensity, "PACKED_MAGKAKADIKIT");
assert.equal(context.severity.level, "HIGH");
assert.ok(context.severity.factors.includes("Automatic map assessment: dense building cluster detected"));
```

Add a tactical-update test proving a resident `ISOLATED_FAR` update cannot replace an automatic packed result.

- [ ] **Step 2: Run resident integration tests and verify RED**

Run: `node --test tests/resident-severity-integration.test.mjs`

Expected: FAIL because automatic density is not wired into resident report creation.

- [ ] **Step 3: Integrate assessment into the transaction**

In `createResidentFireReport`, call `assessBuildingDensity(client, input.latitude, input.longitude)` before severity calculation. Derive effective density, calculate severity with it, append density factors without duplicates, and extend the insert with reported/detected/evidence audit columns.

After inserting `fire_reports`, insert each immutable evidence row with parameterized values and `ST_GeomFromGeoJSON`, normalized to SRID 4326 multipolygons. Keep evidence writes inside the same transaction.

In `updateResidentReportTacticalDetails`, load `reported_house_density` and `detected_building_density`, update only the reported value, reapply `resolveEffectiveHouseDensity`, and recalculate severity. Preserve automatic assessment fields and immutable geometry.

- [ ] **Step 4: Run resident workflow regressions**

Run: `node --test tests/building-density-assessment.test.mjs tests/resident-severity-integration.test.mjs tests/fire-report-workflow.test.mjs tests/resident-report-ui-integration.test.mjs`

Expected: PASS, including non-blocking submission when density returns `INSUFFICIENT_DATA`.

- [ ] **Step 5: Commit report integration**

```bash
git add lib/fire-reports/service.ts tests/resident-severity-integration.test.mjs
git commit -m "feat: apply automatic density to resident severity"
```

### Task 4: Expose municipality-scoped density summaries and immutable evidence

**Files:**
- Modify: `app/api/municipal-bfp/incidents/route.ts`
- Modify: `app/_components/use-municipal-incident-feed.ts`
- Modify: `app/api/municipal-bfp/incidents/[id]/route.ts`
- Create: `app/api/municipal-bfp/incidents/[id]/building-density/route.ts`
- Create: `tests/municipal-building-density-api.test.mjs`

**Interfaces:**
- Consumes: density fields and `gis.fire_report_density_evidence` from Tasks 1–3.
- Produces: feed fields `detectedBuildingDensity`, `buildingDensityConfidence`, `buildingDensityBuildingCount`, `buildingDensityMinimumGapMeters`, `calculatedSeverity`; detail density fields; and `{ assessment, evidence: FeatureCollection<MultiPolygon> }` from the evidence endpoint.

- [ ] **Step 1: Write failing authorization and payload tests**

Test the extracted response mapper with literal database rows and verify numeric conversion/null handling. Add route contract coverage proving invalid IDs return 400, missing municipal sessions return 401, cross-municipality rows return 404, and evidence features contain source confidence and distance but no resident identity.

- [ ] **Step 2: Run API tests and verify RED**

Run: `node --test tests/municipal-building-density-api.test.mjs tests/municipal-incident-access.test.mjs`

Expected: FAIL because the feed fields, mapper, and endpoint do not exist.

- [ ] **Step 3: Implement scoped feed/detail/evidence reads**

Select density summary columns in both feed query paths and update `MunicipalIncident` with nullable typed fields. Extend incident detail queries with the same audit values.

Implement the evidence endpoint with the existing municipal cookie/session pattern. Query `fire_reports` by both incident ID and authenticated `municipality_id`, left join only that incident's `gis.fire_report_density_evidence`, convert stored geometry with `ST_AsGeoJSON`, and map the rows to a GeoJSON FeatureCollection. Do not accept `municipalityId` from query parameters or request bodies.

- [ ] **Step 4: Run API and access regressions**

Run: `node --test tests/municipal-building-density-api.test.mjs tests/municipal-incident-access.test.mjs tests/municipal-gis-map.test.mjs`

Expected: PASS.

- [ ] **Step 5: Commit the scoped API**

```bash
git add app/api/municipal-bfp/incidents app/_components/use-municipal-incident-feed.ts tests/municipal-building-density-api.test.mjs
git commit -m "feat: expose municipal density evidence"
```

### Task 5: Render live density risk and evidence on the Municipal GIS map

**Files:**
- Modify: `app/_components/municipal-gis-operations-map.tsx`
- Modify: `app/_components/municipal-gis-incident-modal.tsx`
- Modify: `tests/municipal-gis-map.test.mjs`

**Interfaces:**
- Consumes: Task 4 incident summaries and `GET /api/municipal-bfp/incidents/:id/building-density`.
- Produces: dense-risk marker styling, selected footprint and 30-meter radius overlays, legend, and automatic assessment details.

- [ ] **Step 1: Add failing map behavior tests**

Extract and test `densityRiskClass(incident)` with dense/non-dense/unavailable fixtures. Test `densityAssessmentCopy` with literal expected labels. Extend the Municipal GIS source contract test to require a dedicated evidence layer, endpoint fetch, `L.geoJSON`, `L.circle`, attribution, and cleanup when selection closes.

- [ ] **Step 2: Run Municipal GIS tests and verify RED**

Run: `node --test tests/municipal-gis-map.test.mjs`

Expected: FAIL because no density risk or evidence overlay exists.

- [ ] **Step 3: Implement marker, overlay, refresh, and modal behavior**

Add `is-dense-risk` to any incident cluster containing `DENSE_CLUSTER_DETECTED`. Add a compact `Dense mapped structures` legend.

Create a separate Leaflet `LayerGroup` for density evidence. When an incident is selected, fetch its evidence endpoint with `cache: "no-store"`, clear the previous evidence, add immutable footprint geometry through `L.geoJSON`, and add a 30-meter `L.circle` around the incident. Ignore stale fetch responses after another incident is selected or the modal closes. A failed evidence request leaves incident markers visible and passes an inline error to the modal.

Extend `MunicipalGisIncidentModal` props with optional assessment/loading/error data and render the exact labels from the spec, source attribution, effective severity, count, gap, confidence, and `Verify actual conditions on scene`.

The existing `Live refresh` keeps its current manual behavior and redraws incidents from the updated feed; newly submitted alerts therefore appear on the next refresh without a page reload.

- [ ] **Step 4: Run map and UI regressions**

Run: `node --test tests/municipal-gis-map.test.mjs tests/municipal-building-density-api.test.mjs tests/resident-severity-integration.test.mjs`

Expected: PASS.

- [ ] **Step 5: Commit the Municipal GIS experience**

```bash
git add app/_components/municipal-gis-operations-map.tsx app/_components/municipal-gis-incident-modal.tsx tests/municipal-gis-map.test.mjs
git commit -m "feat: show dense building risk on municipal map"
```

### Task 6: Add safe import/backfill operations and verify the feature

**Files:**
- Create: `scripts/import-open-buildings.mjs`
- Create: `scripts/backfill-building-density.mjs`
- Create: `tests/building-density-operations.test.mjs`
- Modify: `package.json`

**Interfaces:**
- Consumes: a local licensed Google Open Buildings V3 GeoJSON/NDJSON extract and the Task 1–3 schema/services.
- Produces: `npm run gis:import-buildings -- --file <path> [--dry-run]` and `npm run gis:backfill-density [-- --dry-run]`.

- [ ] **Step 1: Write failing executable-operation tests**

Use a temporary fixture containing one valid Antique polygon, one out-of-bounds polygon, and one malformed record. Execute the importer in `--dry-run` mode and assert exit code 0, zero database writes, and literal summary counts. Execute normal mode against an injected test writer and assert repeat imports upsert rather than duplicate. Test backfill selection excludes `PHONE_CALL` and already-assessed rows.

- [ ] **Step 2: Run operation tests and verify RED**

Run: `node --test tests/building-density-operations.test.mjs`

Expected: FAIL because importer and backfill scripts do not exist.

- [ ] **Step 3: Implement streaming import and idempotent backfill**

Parse FeatureCollection JSON and newline-delimited features without loading a province-wide file into the browser. Validate `Polygon`/`MultiPolygon`, confidence, identifier, and Antique bounding-box intersection. Convert polygons to multipolygons, batch upsert through parameterized SQL, print `{ imported, updated, skipped, rejected }`, and require `DATABASE_URL` only outside dry-run.

The backfill selects only `report_source = 'ALAB_APP' and detected_building_density is null`, processes bounded batches ordered by ID, reuses the production assessment and severity functions, supports dry-run, and prints assessed/dense/insufficient/failed counts without reporter fields.

Add scripts:

```json
"gis:import-buildings": "node scripts/import-open-buildings.mjs",
"gis:backfill-density": "node scripts/backfill-building-density.mjs"
```

- [ ] **Step 4: Run focused and full verification**

Run: `node --test tests/building-density-*.test.mjs tests/resident-severity-integration.test.mjs tests/municipal-gis-map.test.mjs tests/municipal-incident-access.test.mjs`

Run: `npm run lint`

Run: `npm test`

Run: `npm run build`

Run: `git diff --check`

Expected: every command exits 0. Record separately if a live migration/import cannot run because local Supabase or a licensed Antique extract is unavailable; do not describe production density detection as populated until both are applied.

- [ ] **Step 5: Commit operations and verification**

```bash
git add scripts/import-open-buildings.mjs scripts/backfill-building-density.mjs tests/building-density-operations.test.mjs package.json package-lock.json
git commit -m "feat: add building footprint import and backfill"
```

## Plan Self-Review

- Spec coverage: schema/audit in Task 1; strict rule and fallback in Task 2; resident alert and severity integration in Task 3; municipal scope in Task 4; live map update/evidence/attribution in Task 5; import, backfill, and operational verification in Task 6.
- Placeholder scan: the migration filename is intentionally generated by the required Supabase CLI command; every production interface, rule, command, error behavior, and test expectation is otherwise explicit.
- Type consistency: `BuildingDensityStatus`, `BuildingDensityConfidence`, `BuildingDensityEvidence`, `BuildingDensityAssessment`, `assessBuildingDensity`, `resolveEffectiveHouseDensity`, and the feed summary field names are used consistently across tasks.
