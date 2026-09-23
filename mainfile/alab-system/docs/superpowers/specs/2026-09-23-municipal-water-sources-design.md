# Municipality-Scoped Water Sources and Hydrant Map Design

**Status:** Approved for implementation planning.
**Scope:** Municipal and Provincial BFP web portals for Antique.
**Source record:** `outputs/fire-hydrant-coordinates-antique.md`, transcribed from the three-page BFP locator chart supplied by the user.
**User decision:** Municipal accounts see and manage only their own municipality; Provincial BFP can view all records province-wide.

## Outcome

The Water Sources module becomes a real database-backed hydrant and water-source registry. A Municipal BFP user sees only the records assigned to the municipality in their authenticated account. For example, a Hamtic account sees the two Hamtic records from the paper. A Provincial BFP user sees all 148 imported records grouped by municipality.

Selecting a source card opens the existing GIS map, enables the water-source layer, zooms to the selected marker, and opens a detail popup. Municipal administrators can add a fire hydrant or other water source by entering its location, coordinates, quantity, and type/color. The server always derives municipality ownership from the authenticated account rather than trusting a client-supplied municipality.

## Existing implementation

- `app/municipal-bfp/water-sources/page.tsx` is a client page containing six hard-coded sample cards.
- `app/provincial-bfp/water-sources/page.tsx` is a hard-coded six-row province-wide sample table.
- `app/municipal-bfp/gis-map/page.tsx` renders the existing Leaflet-based `MunicipalGisOperationsMap`.
- The municipal GIS map already supports incidents and station markers but does not load persisted water-source markers.
- Municipal authentication and municipality scoping are available through `lib/municipal-bfp/auth.ts` and the signed BFP session.
- The application uses imperative Supabase/Postgres migrations and server-side `pg` queries through `lib/db.ts`.
- There is no persisted hydrant or water-source table.

## Selected approach

Extend the existing GIS map and introduce one authoritative `water_sources` table. Do not create a second map or duplicate data per portal. Municipal and Provincial APIs read the same rows through separate authorization scopes.

Alternatives considered:

1. A dedicated water-source-only map would isolate the feature, but it would duplicate Leaflet setup and create two operational maps.
2. Embedding a map directly in the Water Sources page would be visually convenient, but it would not satisfy the requested card-to-GIS workflow and would increase page weight.
3. Client-side filtering of province-wide data would be simple, but it would expose other municipalities' records to Municipal accounts and is rejected.

## Data model

Create `public.water_sources` with:

| Column | Purpose |
| --- | --- |
| `id uuid primary key` | Stable marker and API identifier. |
| `municipality_id uuid not null` | Foreign key to `municipalities(id)`. |
| `source_kind text not null` | `FIRE_HYDRANT` or `WATER_SOURCE`. |
| `quantity integer not null default 1` | Positive number of physical sources represented by the row. |
| `exact_location text not null` | Location/address from the paper or later field entry. |
| `latitude numeric(10,7) not null` | Geographic latitude with the source precision preserved. |
| `longitude numeric(10,7) not null` | Geographic longitude with the source precision preserved. |
| `type_color text not null` | Combined construction/type/color description, such as `Wet Barrel/Yellow`. |
| `record_origin text not null` | `BFP_LOCATOR_CHART_2018` for imported rows and `MUNICIPAL_ENTRY` for new entries. |
| `created_by_user_id uuid null` | Authenticated creator for manually added records; null for the document import. |
| `created_at`, `updated_at` | UTC audit timestamps. |

Constraints reject blank locations/type-color values, non-positive quantities, latitudes outside 4–22, and longitudes outside 116–127. Add indexes on `(municipality_id, exact_location, id)` for scoped lists and `(municipality_id, latitude, longitude)` for map reads. Do not expose this table directly to browser clients; all access passes through authenticated Next.js API routes.

The first migration seeds the 148 imported rows and resolves municipality IDs by exact normalized municipality name. It must fail instead of silently dropping a row when a required municipality is absent. Imported counts are:

| Municipality | Records |
| --- | ---: |
| Anini-y | 1 |
| Barbaza | 5 |
| Belison | 19 |
| Bugasong | 2 |
| Caluya | 6 |
| Culasi | 6 |
| Hamtic | 2 |
| Libertad | 2 |
| Pandan | 7 |
| Patnongon | 1 |
| San Jose de Buenavista | 65 |
| San Remigio | 9 |
| Sebaste | 5 |
| Sibalom | 7 |
| Tibiao | 3 |
| Tobias Fornier | 4 |
| Valderrama | 4 |
| **Total** | **148** |

The paper's Laua-an row is marked `0 / NEGATIVE`; it is not inserted as a water source. Duplicate-looking rows and coordinate pairs remain separate when the paper lists separate hydrants. Latitude/longitude pairs use the normalized geographic order from the approved transcription.

## Authorization and API behavior

### Municipal API

`GET /api/municipal-bfp/water-sources` returns only rows whose `municipality_id` matches the authenticated Municipal account. It includes municipality name, total represented quantity, and source rows ordered by location then ID.

`POST /api/municipal-bfp/water-sources` requires `MUNICIPAL_ADMIN`. The body contains source kind, quantity, exact location, latitude, longitude, and type/color. Municipality and creator are assigned server-side from the authenticated identity. Invalid values return field-specific 400 responses; duplicate submission protection returns 409 when the same municipality, coordinates, normalized location, and active record already exist.

### Provincial API

`GET /api/provincial-bfp/water-sources` requires an active Provincial BFP identity. It returns province-wide municipality summaries and rows, optionally filtered by municipality ID. Municipalities with zero records remain visible with a zero count.

No unauthenticated public read, update, or delete operation is introduced. Editing and deletion are outside this version; newly entered mistakes can be addressed in a later audited correction workflow.

## Municipal Water Sources UI

Replace the sample grid with a clean operational registry:

- Header: municipality name, short explanatory copy, and a primary `Add fire hydrant / water source` action.
- Summary strip: total represented sources, fire-hydrant rows, other water-source rows, and imported/manual record counts.
- Search input: filters the visible list by location or type/color without changing server authorization.
- Cards: exact location as the title; source-kind label; quantity; type/color; complete latitude/longitude; origin label; and a `View on map` affordance.
- Hamtic therefore renders exactly two imported source cards for a Hamtic account.
- Loading, empty, saved, validation-error, and retry states are explicit and retain the last successful data during transient refresh errors.

The visual language uses white surfaces, crisp blue-gray borders, restrained ALAB red for primary actions, and teal only for water-source markers and badges. Cards use no gradients. Layout is responsive, keyboard accessible, and respects reduced motion.

## Add-source workflow

The primary action opens an accessible dialog with:

- Source category: Fire hydrant or Other water source.
- Quantity, default 1.
- Exact location/address.
- Latitude and longitude, preserving up to seven decimal places.
- Type/color.

Client validation improves feedback, but server validation is authoritative. The dialog retains entered values after a failed request, focuses the error summary for multiple errors, closes only after a successful insert, and immediately adds the returned row to the visible list. The UI identifies the authenticated municipality and does not provide a municipality selector.

## GIS integration

Extend `MunicipalGisOperationsMap` with an authenticated fetch to the Municipal water-source endpoint. Add a Water Sources layer toggle and a distinct teal droplet marker that cannot be confused with red incidents or blue stations.

Each marker popup contains only the requested operational fields: location, quantity, type/color, latitude, longitude, municipality, and record origin. It also provides a copy-coordinates action.

Water-source cards navigate to `/municipal-bfp/gis-map?layer=water-sources&waterSource=<uuid>`. The map validates that the selected ID is present in the scoped response, enables the layer, fits or pans to the point, and opens that marker's popup. An inaccessible or unknown ID is ignored without revealing whether another municipality owns it.

The Provincial Water Sources page uses municipality cards with counts and type breakdowns. Opening a municipality shows its source list and map-ready coordinates; province-wide GIS integration may reuse the same marker presentation but must use the Provincial authorized endpoint.

## Error handling and integrity

- API errors return stable error codes plus safe user-facing messages.
- Database writes use parameterized SQL and a transaction when the source row and audit entry are created.
- Add an immutable administrative audit event containing actor, municipality, new source ID, and a whitelist of non-sensitive created fields.
- Never trust client-provided municipality IDs, creator IDs, or record origin.
- Coordinate fields remain numeric from form to database to map; no locale-specific comma conversion is applied.
- The imported seed is idempotent through deterministic uniqueness for its origin/location/coordinates, so reapplying the migration cannot multiply rows.

## Testing and verification

Implementation follows test-driven development:

1. Migration/schema tests verify constraints, indexes, exact municipality totals, the 148-row total, and Laua-an exclusion.
2. Service tests verify municipality-scoped reads, Provincial grouping, validation, duplicate handling, and server-assigned ownership.
3. Route tests verify Municipal authentication, admin-only creation, Provincial authentication, and cross-municipality isolation.
4. UI source tests verify removal of hard-coded samples, Hamtic count rendering from API data, add-dialog behavior, map links, and accessible labels.
5. GIS tests verify the water-source layer, selected-marker deep link, distinct legend/marker semantics, and safe handling of inaccessible IDs.
6. Run focused tests first, then the full test suite, lint, and production build.
7. Complete an authenticated browser walkthrough with a Hamtic Municipal account and a Provincial account at desktop and mobile widths.

## Delivery boundaries

This version imports the approved 148-row transcription, supports scoped reading, creates new records, and displays them on the existing GIS map. It does not add bulk editing, deletion, photo uploads, inspection scheduling, pressure/capacity fields absent from the approved extraction, or public access.

Production migration application and deployment remain separate operational actions unless explicitly requested. The repository will contain the migration, services, routes, UI, and tests needed to deploy safely.
