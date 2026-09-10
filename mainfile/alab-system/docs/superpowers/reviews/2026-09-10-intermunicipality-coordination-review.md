# Inter-municipality coordination review

Reviewed the implementation present at `ea84f71` against the approved 2026-09-06 design, including the municipal detail view, observer access, assistance services, Provincial read models, and coordination migration. The fixes below are in the working tree for integration with the ongoing implementation.

## Confirmed findings and fixes

| Finding | Result after the fix |
| --- | --- |
| Provincial queries referenced nonexistent `fire_reports.barangay`, `fire_reports.landmark`, `bfp_stations`, observer `rank`/`degraded`/`observer_station_id`, and request `responder_user_id`. | Queries join the actual barangay and municipal station tables, use stored observer distance, derive degraded selection from audit events, and read `responded_by_user_id`. |
| Provincial completion dates were inferred from request/response time; accepted requests were displayed as merely requested. | Read the actual `completed_at` and current assistance status. |
| Origin cancellation wrote zero offers although the database requires NULL for cancellation. | Cancellation commits with NULL offers, preserves retry behavior, and notifies the recipient as well as origin and province. |
| Different request quantities/notes or response notes could silently return an earlier operation as a success. | Conflicting retries return a controlled conflict; identical retries remain idempotent. |
| A pending request could be answered after observer access had ended. | Require an active observer and dispatch and a nonterminal incident; serialize transitions with resolution by locking the report first. |
| Open municipal details loaded once and did not receive live request/status updates. | Poll every five seconds while visible, refresh on returning to the tab, cancel stale loads, retain the last successful detail on transient errors, and clear data when access ends. |
| Ended observer links produced an ambiguous not-found state. | Return HTTP 410 with a specific ended-incident message. |
| Observer detail/history included unreviewed resident descriptions and resident messages. | Observer responses omit these free-text fields while retaining status/time history. Origin access retains its existing projection. |
| The coordination panel's own Request Backup button could not open an externally controlled modal. Deselecting the last recipient automatically reselected it. | Either entry point opens the form, and checkbox choices persist. |
| Degraded-selection notices sent Provincial users to a Municipal URL. Observers with no assistance request received no final monitoring notification. | Role-specific links and final notifications for affected observers and Provincial BFP. |
| PostgreSQL's NULL handling let incomplete accepted/completed offers pass the original CHECK. Independent foreign keys permitted inconsistent request scope; selection snapshots could be overwritten. | A follow-up migration requires response counts, enforces dispatch/observer/request scope with composite foreign keys, and protects selection snapshots and recorded acknowledgments. |

## Verification

- `npm test`: 342 passed, one external database concurrency test skipped.
- Production build and TypeScript validation run for the change.
- Added executable regression tests for services, route responses, modal interactions, and refresh lifecycle.
- Added pinned development-only PGlite 0.5.8. Tests run production Provincial queries and cancellation service against isolated PostgreSQL using the actual coordination table migration; they also check migration replay, invalid offers, scope constraints, snapshot/audit immutability, and denied anonymous table access. Tests do not connect to a deployed database.
- Existing lint baseline: eight errors and three warnings in the municipal detail, incident API, and incident-access files. Comparing the reviewed revision confirmed these findings predate this change.

## Deployment and remaining verification

Apply `supabase/migrations/20260910121800_harden_intermunicipality_coordination.sql` after the existing migrations. It validates existing data and does not silently repair or remove inconsistent historical records.

The working-tree changes and migration have not been deployed or applied to production by this review. A full local Supabase reset/pgTAP run, a real multi-connection concurrency run, and an authenticated live test with origin, observer, and Provincial accounts are still required before claiming the entire plan has passed end-to-end verification. Embedded PostgreSQL coverage does not establish those results.
