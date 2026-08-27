# Municipal Stations and Personnel Accounts Design

**Date:** 27 August 2026

## Goal

Allow each Municipal BFP administrator to create and manage multiple BFP stations within their own municipality, then create individual BFP personnel accounts assigned to one of those stations. This increment is limited to the Municipal BFP website and its backend; the Flutter mobile application is not changed.

## Authority model

- Provincial BFP creates the initial `MUNICIPAL_ADMIN` account for each municipality.
- A Municipal Admin may manage only stations and personnel belonging to their active municipality.
- Municipal Admins may create, update, deactivate, and list stations; create personnel accounts; reassign personnel between their municipality's stations; reset a personnel password; and suspend or reactivate a personnel account.
- A Municipal Staff or ordinary personnel account cannot manage stations or personnel.
- Provincial BFP retains its existing municipal account provisioning responsibilities and does not gain cross-municipality access through Municipal APIs.

## Workflow

1. Provincial BFP provisions the first Municipal Admin account for a municipality.
2. The Municipal Admin signs into the Municipal BFP website.
3. The admin creates one or more stations, supplying a station name and optional location/contact details.
4. The admin opens the personnel page, selects an active station, and supplies a staff member's display name, rank/position, official email, and temporary password.
5. The server creates an individual Municipal BFP account, assigns it to the municipality and chosen station, and returns the temporary password once for approved handover.
6. The admin can later transfer the person to another station, reset their password, suspend/reactivate their account, or deactivate a station after its personnel have been moved.

## Data model

### Stations

`municipal_bfp_stations` changes from one station per municipality to many stations per municipality. The municipality foreign key remains required, but its single-station uniqueness constraint is removed. Station names are unique within a municipality. A station has an active/inactive lifecycle so operational history is retained.

### Personnel station assignment

Add `bfp_station_assignments`:

- `id` UUID primary key
- `personnel_profile_id` FK to `bfp_personnel_profiles`
- `station_id` FK to `municipal_bfp_stations`
- `status` (`ACTIVE` or `REVOKED`)
- `assigned_by_user_id`, `assigned_at`, `revoked_by_user_id`, `revoked_at`
- timestamps

An active Municipal BFP personnel account has exactly one active station assignment. A partial unique index enforces this, while retaining revoked assignments for audit history. The station and the personnel's active municipality assignment must always refer to the same municipality; this is enforced in server-side transactional operations.

### Auditing and credentials

Use the existing `users`, `bfp_personnel_profiles`, `bfp_municipality_assignments`, and `bfp_credential_events` tables. Add safe events for station creation/update/deactivation and personnel station assignment/transfer. Passwords continue to be hashed server-side and are never logged, stored in event metadata, or shown again after the creation/reset response.

## Backend

Create Municipal BFP server endpoints for stations and personnel. Every endpoint resolves the signed-in identity on the server and requires an active Municipal Admin assignment. It derives the municipality from that identity instead of accepting a municipality identifier from the browser.

- Station endpoints list, create, update, and deactivate stations in the caller's municipality.
- Personnel endpoints list personnel with their station, create a personnel account and station assignment in one transaction, transfer a person, reset a temporary password, and change account status.
- A station cannot be deactivated while active personnel remain assigned to it; the user receives an actionable message to transfer personnel first.
- Duplicate email addresses and duplicate active station names are rejected with clear validation errors.

## Website

Add two protected pages to the Municipal BFP portal:

- **Stations**: a table of the municipality's stations and a form to add/edit/deactivate them.
- **BFP Personnel**: a station-filtered table and form for creating personnel accounts. The station selector lists only active stations in the current municipality. Account creation is disabled until a station exists.

Existing mobile UI and its demo login remain out of scope.

## Security and error handling

- No Supabase service-role credentials or direct database access are exposed in the browser.
- Existing BFP session and forced temporary-password-change controls continue to apply.
- Municipality scope is checked in every server query and mutation.
- Only Municipal Admins receive management endpoints; all other roles receive authorization errors.
- Deactivated stations cannot receive new personnel assignments.

## Validation

- Schema tests cover multiple stations per municipality, station-name uniqueness within a municipality, active station assignment uniqueness, indexes, and RLS.
- API tests cover Municipal Admin authorization, municipality isolation, create/transfer/suspend flows, deactivation protection, and no-password leakage in events.
- UI tests cover the no-stations empty state, adding a station, creating a personnel account, and displaying the credentials once.
