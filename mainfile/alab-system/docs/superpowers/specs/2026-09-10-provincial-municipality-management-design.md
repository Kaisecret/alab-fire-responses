# Provincial Municipality Management Design

**Status:** Proposed plan; no feature implementation authorized by this document.
**Scope:** Provincial BFP web portal for Antique.
**User decision:** Provincial BFP can manage stations, BFP personnel, resident registrations, and resident application approvals across municipalities.
**Expanded scope:** Include all fire reports from different municipalities, response histories, and province-wide report summaries.

## Outcome

A Provincial officer selects All municipalities or one municipality and sees real, current records. They can open a municipality, inspect every station and its personnel, manage those records, review any resident application, and inspect all fire reports and response histories in provincial scope. Municipal users continue to work with the same records and receive the resulting updates.

This expands administrative authority. Incident dispatch, inter-municipality assistance responses, and incident command remain governed by the existing coordination design.

## Existing implementation

- `app/provincial-bfp/municipal-status/page.tsx`, `responders/page.tsx`, and `firetrucks-stations/page.tsx` contain sample records.
- Provincial municipal-account creation already exists at `app/api/provincial-bfp/municipal-accounts/route.ts`.
- `lib/provincial-bfp/auth.ts` provides the current signed Provincial identity guard.
- Municipal station and personnel operations already exist in `lib/municipal-bfp/stations.ts`.
- Applications are stored in `resident_verifications`, with reviews in `resident_verification_events`. There is no separate `resident_applications` table.
- Resident users, profiles, and addresses are separate from applications. An account can exist without a submitted application.
- Correction messages already use the delivery queue, PhilSMS, and Gmail. The new Provincial workflow must reuse their delivery handling.
- Coordination fixes are committed in `0622434`; their hardening migration must be accounted for when ordering later migrations.
- The Provincial incident API supports `scope=all`, but its current coordination projection is not a complete paginated report registry. The Provincial Reports page contains sample generated-report rows. Extend these existing flows rather than treating the samples as stored report data.

## Approach

Recommended: add Provincial APIs and screens over the existing records, with shared transaction services that enforce an explicit Municipal or Provincial actor scope. This avoids duplicate registries and inconsistent approval logic.

Alternatives considered: a read-only reporting portal would not satisfy the selected management permissions; separate Provincial copies of municipal records would require synchronization and create conflicting approvals. Neither is selected.

## Pages and navigation

| Page | Content and actions |
| --- | --- |
| Provincial Dashboard | Municipality, active station, personnel, registered-resident, pending-application, correction, approved, total fire report, active incident, and resolved totals. Group operational and registration figures clearly. Each card opens its matching filtered list. |
| Municipalities | All Antique municipalities, including those without accounts or stations. Expand into Reports/Incidents, Stations, Personnel, Residents, and Applications tabs. |
| All Municipal Reports | Every persisted fire report in provincial scope, including reports without a dispatch, citizen-app and phone-call reports, pending/active reports, resolved records, and rejected/false/duplicate/closed history. Open report details, timeline, evidence, assigned units, and assistance history. |
| Provincial Reports | Generate real filtered incident summaries, municipal comparisons, station/personnel counts, and registration/application summaries. Preview and export the selected period without sample archive rows. |
| Stations | Province-wide station directory, coordinates, municipality, active/inactive status, assigned-personnel count. Create, edit, deactivate, and reactivate with ownership checks. |
| BFP Personnel | Municipal administrators and staff, including suspended and unassigned staff. Name, rank, official email, municipality, station, assignment role, account status. Create, edit, assign/transfer, suspend/reactivate, and initiate the existing password-reset workflow. |
| Resident Applications | Latest application per resident by default; Pending, Needs correction, Approved, and History views. Inspect protected evidence, approve pending applications, or request corrections with a message. |
| Registered Residents | Account directory showing municipality/barangay, registration date, account status, and latest application state. Open profile/history; correct administrative details or suspend/reactivate an eligible account with a reason. |
| Audit Activity | Provincial administrative actions across these modules, with actor, target, municipality, action, date, and outcome filters. |

Reuse `/municipal-status`, `/firetrucks-stations`, and `/responders` URLs to preserve navigation. Their visible labels can become Municipalities, Stations, and BFP Personnel. Add `/resident-applications` and `/residents` under Provincial Administration. Keep `/incidents` for the live operational queue; add `/incident-reports` for the all-status registry, and use `/reports` for generated summaries. All three use shared server query rules and open the same report detail to avoid divergent records. Keep the existing municipal-account page functional and link it to the personnel directory.

Station and personnel records must not manufacture firetruck inventory, duty shifts, readiness, or staffing availability. Show only persisted facts; show Not recorded when a requested display field has no data source. Firetruck inventory management requires its own verified data model if not already persisted.

## Data and counting rules

1. Read municipalities from `municipalities`, filtered to Antique. Do not hardcode municipality names or count.
2. Read stations from `municipal_bfp_stations`, personnel from `users` and `bfp_personnel_profiles`, and assignments from `bfp_municipality_assignments` and `bfp_station_assignments`.
3. Count distinct personnel user IDs. Include administrators without station assignments; use left joins rather than hiding them.
4. Count each resident profile once. Select its primary address and deterministic latest verification using `submitted_at DESC, created_at DESC, id DESC`.
5. Separate account status from application status. `VERIFIED` means an approved application; `ACTIVE` means an active account. Do not translate account activation into application approval.
6. Application views map persisted `PENDING`, `CHANGES_REQUESTED`, and `VERIFIED` states to user-facing labels. Historical legacy states remain labeled history; do not invent new terminal states or silently approve them.
7. Use current primary-address municipality for current resident ownership, matching existing municipal services. Audit entries retain the municipality at the time of the action.
8. In this Antique deployment, incomplete registrations without a primary address appear in a separate Unassigned group. Never infer their municipality from a name. A municipality reassignment must be audited and must update address/ownership atomically; records known to belong outside Antique are excluded.
9. Totals must use the same filters as their lists and cannot be calculated from a single page of rows. Aggregate stations, personnel, and residents separately before joining to avoid multiplying counts.

## All municipal reports and summaries

- Include every `fire_reports` record owned by an Antique municipality, irrespective of dispatch existence or report source. Use the report's stored municipality, not the reporter's current address, to preserve incident jurisdiction after a resident moves.
- The all-report registry defaults to All municipalities and All statuses with no implicit date cutoff; pagination controls volume. The live Incidents queue keeps its active-only default.
- Provide filters for municipality, barangay, submission-date range, exact persisted status, fire type, calculated severity, and `ALAB_APP`/`PHONE_CALL`. Search reference number and public location text. Label administrative outcomes separately from active emergencies.
- Show reference, municipality/barangay, source, fire type, severity, status, submitted time, response-start time, and most recent dispatch summary. Every row retains its report ID; joins to photos, dispatch recipients, and audit events must not multiply rows or totals.
- Detail includes report description, permitted reporter/caller contact information for authorized Provincial work, private incident photographs on demand, status timeline, station/personnel assignment snapshots, arrival/resolution timestamps when recorded, observer acknowledgments, and assistance lifecycle. Do not include resident identity-verification documents, device fingerprints, IP addresses, credentials, or storage keys in the report endpoint. Resident verification evidence remains behind the application review endpoint.
- Use one canonical read service for report detail, used by the live queue and historical registry. New reports without a dispatch must still open. Historical reports retain their original assignment snapshots after personnel/station edits.
- Report oversight does not add dispatch, resolution, or assistance-acceptance authority to Provincial BFP; those actions remain with the responsible municipality under the existing incident-command rules. Administrative directory/application management retains the previously selected Provincial powers.
- Provincial Reports offers a real preview for a selected dataset, municipality, and date range, followed by CSV download and a print-friendly view. Default summaries use the current calendar month in Asia/Manila and display that period explicitly; All time is selectable.
- Convert local date filters to inclusive start/exclusive next-day UTC boundaries. Label metrics precisely: reports received, active incidents, resolved reports, false reports, rejected reports, duplicate reports, and recorded response time. Report counts are distinct report IDs; false/duplicate outcomes are not silently counted as confirmed fires. Return Not available for a timing metric whose required timestamps are missing.
- Include a municipality comparison table covering all Antique municipalities, including zero totals. Each total links to the exact underlying filtered report list.
- Do not show a Download or Archived badge for a nonexistent generated file. The first version generates previews/exports on demand and audits them. Durable PDF archival, scheduled email reports, or document signing require a separate explicitly defined storage/workflow extension.

## Shared list experience

Use a consistent toolbar: municipality, search, status, optional station/barangay, date range, and Clear filters. Persist filters in the URL. Defaults: 25 rows per page; supported sizes 25, 50, 100. Sort deterministically with ID as the final tie-breaker. Validate station and barangay filters against the selected municipality.

Show total results, loading, empty, error, last-updated, and manual refresh states. Retain the last successful list after transient failures; clear protected data on authorization failures. Poll visible application/status pages every five seconds; poll reference directories every 30 seconds and refresh immediately on visibility return or successful mutation. Changing municipality resets dependent filters and page and cancels stale requests.

Detail drawers/pages should preserve list filters on return. Tables adapt to small screens, dialogs support keyboard/focus handling, status is communicated with text as well as color, and action buttons clearly state the target municipality.

## Authorization and administrative operations

- Every Provincial endpoint validates a signed, active `PROVINCIAL_BFP` identity on each request. No public-preview or client-supplied actor bypass is permitted.
- Route filters may select a municipality but do not confer access. Resolve the target record and prove its province server-side.
- Use separate Provincial endpoints; do not turn a municipal endpoint into a province-wide endpoint by accepting `scope=all`.
- Shared writes require an authenticated actor context and validate target ownership inside the transaction. Preserve municipal-only checks for municipal callers.
- One action writes the domain change and audit event atomically. Notifications are queued in that transaction and delivered after commit. Delivery failure must not turn a saved review into an apparent failed review.
- Edit operations include a version token derived from the record revision. A stale edit returns 409 with refresh guidance. Application reviews also check expected application status and submission number under row lock.
- Concurrent Municipal and Provincial reviews have one winner. Repeating the same idempotency key and payload returns the stored result; changing the payload under that key returns 409. A different review cannot overwrite the first decision.
- A station with assigned personnel or an active dispatch cannot be deactivated. Reactivation rechecks municipality and station invariants. Historical dispatch/observer snapshots are never changed by station edits.
- Personnel transfer closes old assignments and creates valid new ones atomically. Transfers between municipalities require an explicit destination, active destination station, reason, and checks against active dispatch participation and municipal-administrator uniqueness. Block unsafe transfers with 409.
- Suspend rather than delete accounts. Suspended users lose access even if an old signed cookie remains. Do not expose passwords, password hashes, session tokens, or temporary credentials in list/export responses.
- Account reactivation cannot bypass pending resident verification; only approved residents can be restored to active access through an account-status action. Profile changes that affect identity or jurisdiction require re-verification using the existing resident workflow.
- Provincial application detail may load protected review evidence through the existing short-lived URL service. Lists and exports must not contain evidence URLs, storage keys, ID images, device/IP details, or raw authentication fields.
- Keep PhilSMS/Gmail configuration unchanged and reuse correction-message delivery statuses. Do not add Resend back into this feature.

## Audit and reporting

Store a stable action ID, actor ID/role, target kind/ID, source and destination municipality where applicable, whitelisted before/after changes, mandatory reason for account status changes/transfers, and timestamp. Audit records are immutable and server-only. Do not put document images, credentials, or full arbitrary request bodies in audit metadata.

Provide filtered CSV export of directory, application-status, fire-report metadata, and aggregate summary fields through authenticated Provincial routes. Export safe text values to prevent spreadsheet formulas, enforce a bounded row limit, log export actions, and omit identity documents, residential address detail, incident photo URLs, and reporter/resident contact fields from default exports.

## Delivery boundaries

This request produces a plan only. No production code, schema, environment variable, deployment, or permissions are changed for the new management feature.

Implementation must first confirm the actual production migration state. New indexes/audit/idempotency schema use new CLI-generated migrations; do not rewrite applied migrations or add public Data API grants. Test changes against local PostgreSQL/Supabase before production application.

Acceptance requires an authenticated walkthrough using Provincial BFP and two different Municipal BFP accounts: province-wide reads, scoped municipal reads, all-status report browsing, app/phone report details, aggregate/list reconciliation, station/personnel management, resident approval/correction, conflicting edits, notifications, and audit records. Passing source-string tests alone does not establish these behaviors.
