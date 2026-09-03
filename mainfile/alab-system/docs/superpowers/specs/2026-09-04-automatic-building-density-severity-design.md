# Automatic Building-Density Severity and Municipal GIS Evidence

## Purpose

ALAB must identify a tightly packed building cluster around a resident-reported fire even when the resident does not select **Dikit-dikit ang mga bahay**. The server uses licensed building-footprint geometry at the submitted coordinates, incorporates a confirmed dense cluster into the existing fire-severity calculation, and shows the evidence to Municipal BFP personnel on the GIS incident map.

This feature is decision support, not a claim that every detected structure is a residence or that the map is complete. Municipal BFP personnel continue to verify conditions at the scene.

## Scope

This feature covers:

- reports submitted through the ALAB resident fire-report workflow;
- automatic building-density assessment at report creation;
- reassessment when resident tactical details are updated;
- storage of the reported answer, automatic result, effective result, evidence, source, and confidence;
- municipality-scoped density indicators and footprint evidence on the Municipal GIS map;
- an idempotent importer and backfill command for the Antique subset of Google Research Open Buildings V3.

This feature does not:

- scrape Google Maps, Google Maps tiles, Street View, or Google business listings;
- use Google Maps imagery as a runtime classification source;
- identify a building as a house when the source provides geometry only;
- implement mall, school, church, gas-station, or other public-facility classification; that is a separate place-risk subsystem;
- block or delay an emergency report when density data is absent or an assessment fails;
- automatically dispatch resources solely from the density result.

## Data Source and Licensing

Use **Google Research Open Buildings V3 Polygons**, not Google Maps. The source provides building polygons and a model confidence score for the Philippines under CC BY 4.0. It does not provide building use, street address, occupancy, or a guarantee that every structure is present.

Only an Antique-area extract is imported. The imported dataset is versioned as `GOOGLE_OPEN_BUILDINGS_V3_2023_05`, and every Municipal GIS surface that displays its geometry includes the attribution **Building footprints: Google Research Open Buildings V3, CC BY 4.0**.

The application continues using Leaflet and OpenStreetMap for the Municipal GIS basemap. Google Maps content and Google Places data are not combined with that map.

## Detection Terminology

The automatic result is called **building density**, not **house density**, because Open Buildings V3 does not identify structure use.

The system exposes these automatic states:

- `DENSE_CLUSTER_DETECTED`: the strict geometry rule passed;
- `NO_DENSE_CLUSTER_DETECTED`: footprint data was available near the report but the strict rule did not pass;
- `INSUFFICIENT_DATA`: no reliable assessment could be made because the dataset was missing, the query failed, or nearby footprint confidence was inadequate.

The resident-facing value remains the existing `HouseDensity` vocabulary. When a dense cluster is detected, the effective tactical value becomes `PACKED_MAGKAKADIKIT` because that is the existing severity engine's representation of rapid structure-to-structure spread risk.

## Exact Dense-Cluster Rule

The assessment operates on footprint polygons with source confidence of at least `0.75`.

1. Build a 50-meter search radius around the validated incident coordinate.
2. Load qualifying footprints whose polygons intersect that radius.
3. Find cluster members within 30 meters of the incident coordinate.
4. Measure polygon-edge-to-polygon-edge distance, not centroid distance.
5. Return `DENSE_CLUSTER_DETECTED` only when all of the following are true:
   - at least three qualifying footprints are within 30 meters of the incident coordinate;
   - at least one qualifying footprint contains the incident coordinate or lies within 15 meters of it;
   - the incident-linked footprint is connected to at least two other footprints through direct or chained gaps of 2 meters or less.
6. Return `NO_DENSE_CLUSTER_DETECTED` when qualifying nearby data exists but the complete rule does not pass.
7. Return `INSUFFICIENT_DATA` when no reliable footprint evidence is available. Absence of a footprint must never be presented as proof of an isolated building.

The stored confidence is deterministic:

- `HIGH` when every cluster member has source confidence at least `0.85` and the pin is inside or within 5 meters of a member;
- `MEDIUM` for every other detected cluster that passes the strict rule;
- `UNAVAILABLE` for `INSUFFICIENT_DATA`.

Both `HIGH` and `MEDIUM` detections affect severity because they pass the same conservative geometry rule. Confidence describes source certainty; it does not weaken a passed fire-spread hazard rule.

## Reported, Detected, and Effective Density

Keep three distinct concepts:

- **Reported density:** what the resident selected, if anything.
- **Detected density:** the automatic building-footprint result.
- **Effective density:** the more conservative of the two inputs used by the severity calculator.

Selection precedence is safety-biased:

1. If automatic detection returns `DENSE_CLUSTER_DETECTED`, effective density is `PACKED_MAGKAKADIKIT`, even when the resident omitted density or selected a less severe option.
2. Otherwise, use the resident-reported density when present.
3. Otherwise, leave effective density unknown and let the existing severity calculator use its baseline.

The resident's original answer is never overwritten. A later resident tactical update recalculates effective density against the stored automatic result, so a detected dense cluster cannot be downgraded accidentally.

## Severity Behavior

The existing AHP severity calculation remains the single severity engine. Automatic density is passed into it as the effective `houseDensity`; a second independent severity system is not introduced.

For a house/building fire with no reported structure material, the existing calculator already treats a packed cluster as high density and assumes elevated combustible-spread risk. With baseline weather and access inputs this produces at least `HIGH`. If other factors produce `CRITICAL`, the incident remains `CRITICAL`.

The density evidence is appended to `severity_factors` using factual wording:

- `Automatic map assessment: dense building cluster detected`
- `3 mapped structures within 30 m; minimum mapped gap 1.4 m`
- `Google Open Buildings confidence: High`

The system never writes `houses confirmed` because the dataset does not contain building-use information.

## Database Design

Enable PostGIS in the repository's established Supabase migration workflow. Keep geospatial source data in a non-exposed `gis` schema and use the server database connection for all reads.

Create `gis.building_footprints` with:

- `source_feature_id text primary key`;
- `geometry geometry(MultiPolygon, 4326) not null`;
- `source_confidence numeric(4,3) not null` constrained from `0` through `1`;
- `source_dataset text not null` constrained to `GOOGLE_OPEN_BUILDINGS_V3_2023_05`;
- `imported_at timestamptz not null`.

Add a GiST index on `geometry`. Revoke access from `anon` and `authenticated`; no public Data API policy exposes raw footprints.

Create `gis.fire_report_density_evidence` as the immutable assessment snapshot with:

- `fire_report_id uuid not null` referencing `public.fire_reports(id)` with cascade deletion;
- `source_feature_id text not null`;
- `geometry geometry(MultiPolygon, 4326) not null` copied from the footprint version used by the assessment;
- `source_confidence numeric(4,3) not null`;
- `distance_to_incident_meters numeric(7,2) not null`;
- a composite primary key on `(fire_report_id, source_feature_id)`.

Index `fire_report_id` for the authorized incident-evidence lookup. Keep this table in the non-exposed `gis` schema and revoke `anon` and `authenticated` access. Copying only the small matched set preserves the exact evidence used for an incident even after the source footprint import is refreshed.

Extend `fire_reports` with:

- `reported_house_density text null`, using the existing house-density values;
- `detected_building_density text null`, constrained to the three automatic states;
- `building_density_confidence text null`, constrained to `HIGH`, `MEDIUM`, or `UNAVAILABLE`;
- `building_density_building_count integer null`, constrained to zero or greater;
- `building_density_minimum_gap_meters numeric(7,2) null`, constrained to zero or greater;
- `building_density_source text null`;
- `building_density_assessed_at timestamptz null`.

Existing `house_density` remains the effective value consumed by current read models and the severity engine. Existing rows are not fabricated: copy their current `house_density` to `reported_house_density`, leave automatic fields null, and backfill automatic assessments separately.

## Import and Refresh

Add a server-side script that accepts a licensed Open Buildings V3 GeoJSON or newline-delimited GeoJSON extract, validates every polygon and confidence value, clips records to Antique bounds, converts polygons to multipolygons, and imports in batches with idempotent upserts keyed by `source_feature_id`.

The importer must:

- reject malformed or out-of-bounds geometry without aborting valid batches;
- print imported, updated, skipped, and rejected counts;
- run only with server database credentials;
- never commit the province-wide source extract or secrets to Git;
- record the exact dataset version used for every row;
- support a dry-run mode.

Dataset refresh is an explicit administrative operation, not a request-time download. After a successful import, an idempotent backfill command assesses existing `ALAB_APP` reports that have no automatic result. It recalculates severity only when the effective density changes and logs counts without exposing resident identity.

## Server Components and Data Flow

Create a focused building-density service responsible only for geospatial assessment. Its public interface accepts validated latitude and longitude and returns a typed result containing status, confidence, building count, minimum gap, source, assessment time, and the small set of matched footprint polygons needed for authorized display.

Resident report creation becomes:

1. Validate the authenticated resident submission and municipality as it does today.
2. Assess building density using the server-owned coordinates.
3. Derive effective density from reported and detected values.
4. Run the existing AHP severity calculator with effective density.
5. Insert the report, immutable matched-footprint evidence, density audit fields, severity, and notifications atomically.
6. Return success even when density assessment is `INSUFFICIENT_DATA`.

If the geospatial query throws or exceeds its short timeout, the service returns `INSUFFICIENT_DATA`; it does not propagate a failure that blocks submission.

Resident tactical enrichment becomes:

1. Store the resident's new value in `reported_house_density`.
2. Reapply automatic precedence.
3. Recalculate severity and factors.
4. Preserve all automatic evidence fields.

## Municipal API and Authorization

Add density summary fields to the existing municipality-scoped incident feed so the map can style incident markers without making one detail request per marker.

Add an authorized incident-density endpoint that returns only the matched evidence for a selected incident:

`GET /api/municipal-bfp/incidents/:id/building-density`

The endpoint:

- requires the existing Municipal BFP session;
- derives municipality authority from that session;
- verifies that the incident belongs to the assigned municipality;
- returns the stored assessment summary plus only the immutable matched polygons used for that incident's assessment;
- never accepts a client-supplied municipality as authority;
- never exposes bulk footprint browsing or raw province-wide downloads.

## Municipal GIS Experience

The existing Municipal GIS incident map remains the primary surface.

- Incidents with `DENSE_CLUSTER_DETECTED` use a visually distinct red-and-amber risk ring while preserving active/history marker meaning.
- The selected incident draws the assessed nearby footprints with a restrained amber outline and shows the 30-meter analysis area.
- A compact map legend explains **Dense mapped structures**.
- The incident modal adds a **Automatic Map Assessment** section containing:
  - `Dense building cluster detected`, `No dense cluster detected`, or `Map density unavailable`;
  - effective severity;
  - number of mapped structures within 30 meters;
  - minimum mapped gap;
  - confidence;
  - source/version and attribution;
  - `Verify actual conditions on scene`.
- The UI uses **mapped structures**, not **confirmed houses**.
- Multiple reports at identical coordinates retain the existing cluster selector; selecting a report replaces the footprint evidence with that report's assessment.
- Closing the modal removes the density evidence layer without disturbing incident markers.

The map remains usable on small screens. Density evidence must not cover zoom controls, incident selection, or the modal close action.

## Failure and Recovery Behavior

- Missing footprint import: submit the report, store `INSUFFICIENT_DATA`, calculate severity from other available inputs, and show `Map density unavailable` to Municipal BFP.
- Spatial query timeout or database error: follow the same non-blocking path and log a server-safe diagnostic.
- Invalid source geometry during import: skip that feature, count it as rejected, and continue the batch.
- No nearby mapped footprints: do not claim the area is isolated; show `No dense cluster detected from available mapped structures` only when reliable nearby footprint coverage exists.
- Evidence endpoint failure: keep the Municipal GIS incident markers and modal operational, show an inline evidence error, and allow retry.
- Dataset/version change: import idempotently, then explicitly rerun the backfill command. Do not silently rewrite historical assessments during ordinary map viewing.

## Testing

### Geometry and severity unit tests

- three qualifying footprints linked by gaps of 2 meters or less produce `DENSE_CLUSTER_DETECTED`;
- two footprints do not pass;
- three footprints farther than 30 meters from the incident do not pass;
- a cluster without a member within 15 meters of the incident does not pass;
- low-confidence polygons are excluded;
- polygon-edge distance is used instead of centroid distance;
- a detected dense cluster wins over omitted, moderate, or isolated resident input;
- a resident `PACKED_MAGKAKADIKIT` value remains effective when automatic data is insufficient;
- automatic density cannot reduce an existing `CRITICAL` result.

### Migration and import tests

- PostGIS objects, checks, and GiST index exist;
- neither `gis` table is accessible to `anon` or `authenticated`;
- existing report density is preserved in `reported_house_density`;
- refreshing source footprints does not rewrite immutable incident evidence;
- importer dry-run writes nothing;
- repeated import is idempotent;
- malformed and out-of-Antique features are rejected without losing valid rows;
- backfill touches only eligible `ALAB_APP` reports without an automatic result.

### Service and API tests

- report submission stores reported, detected, and effective values independently;
- assessment failure does not fail report creation;
- tactical updates preserve automatic evidence and cannot downgrade a detected cluster;
- municipal feed returns density summary fields only for the authenticated municipality;
- evidence endpoint rejects cross-municipality incidents and returns only incident-local polygons.

### Municipal GIS tests

- dense-cluster incidents receive the risk marker treatment;
- selecting an incident loads and displays footprint evidence and the 30-meter analysis area;
- selecting another report replaces the evidence layer;
- modal copy uses `mapped structures`, includes attribution, and avoids claiming confirmed houses;
- unavailable evidence does not hide the incident;
- closing the modal clears only the evidence layer;
- map controls and evidence remain usable on mobile.

### Regression verification

Run the focused density, resident severity, resident report workflow, Municipal GIS, authorization, migration, and schema tests. Then run lint, the complete test suite, a production build, migration checks, a test import, an indexed PostGIS query, and `git diff --check`.

## Acceptance Criteria

1. A resident can omit the house-density question and still submit the emergency report normally.
2. The server automatically evaluates licensed building footprints around the submitted coordinates.
3. A qualifying dense cluster makes `PACKED_MAGKAKADIKIT` the effective density and feeds the existing severity calculation.
4. Resident-reported and automatically detected values remain separately auditable.
5. A later resident update cannot downgrade a detected dense cluster.
6. The Municipal GIS map visibly distinguishes dense-cluster incidents and displays incident-local footprint evidence.
7. Municipal staff see building count, minimum mapped gap, confidence, source, severity, and an on-scene verification warning.
8. Cross-municipality users cannot read incident density evidence or raw footprint data.
9. Missing or failed density data never blocks an emergency report or hides an incident.
10. Google Maps is not scraped, and required Open Buildings attribution is visible wherever its geometry is displayed.
