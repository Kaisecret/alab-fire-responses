# Automatic activation and verified-user directories

Successful resident signup now always creates an ACTIVE account and VERIFIED identity record after the existing ID, face-proof and OTP checks pass. The old optional automatic-approval setting no longer sends successful signups into manual review. The resident completion page and notification say Account verified. Existing pending or suspended residents are not automatically promoted.

Municipal and provincial navigation now opens Verified Users. These pages show only active residents whose latest verification is VERIFIED, with search, refresh and protected read-only details. Review/correction tabs and decision controls are removed. Provincial pagination, municipality filtering and export remain available; bookmarked review statuses normalize to VERIFIED. The provincial dashboard and settings use a dedicated latest-verified active-resident count.

Latest-record selection happens before status filtering and uses submitted_at, created_at and id for deterministic ordering. Historical detail links resolve the current submission. A regression reproduces equal timestamps and changed physical row order so stale verified evidence cannot replace a newer pending record. Municipal polling discards stale responses and cleans up when the page closes. Optional email addresses no longer crash searches.

Production-browser checks exposed an existing municipal reload hydration mismatch caused by reading cached identity before hydration. Cached identity now becomes visible after the first client render matches the server shell. Session cache persistence and fresh identity validation remain intact.

Verification:

- Standard npm test: 1,086 passed, zero failures, one database-only skip. This run preceded the final narrow hydration fix.
- Final focused run, including hydration, tab sessions, both directories, real PGlite latest-record/count queries, legacy delivery and skeleton behavior: 38 passed.
- Final production build passed TypeScript, protected evidence tracing, native Linux face-runtime checks and all seven pinned guidance asset checksums.
- Scoped lint: zero errors; existing image warnings remain.
- Final production-build browser checks passed municipal and provincial directories at 1440x1000 and 390x844: verified-only rows, no manual decisions, protected detail UI, search with null email, reload consistency and responsive layout. No browser errors. APIs were intercepted with synthetic fixtures; no real accounts, notifications or private evidence were accessed.
- Independent UI/backend reviews found no remaining Important or Critical issue. The municipal detail tie-break and hydration follow-up were reviewed after their fixes.

The face-to-ID comparison route, engine, models, matching threshold, selfie guidance and signed face-proof implementation are unchanged. No database migration or bulk account update is included.
