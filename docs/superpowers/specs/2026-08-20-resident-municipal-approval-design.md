# Resident Municipal Approval Design

## Goal

Require Municipal BFP approval before a newly registered resident can access the protected resident application. Municipal reviewers must see only applications assigned to their municipality, review the resident's submitted information and protected identity evidence, approve the account, or request corrections. Residents whose application is not yet approved must see a clear application status instead of a misleading login failure or verified label.

## Design direction

This is a preserve-mode redesign of the existing ALAB municipal and resident interfaces.

- Visual language: established ALAB emergency red, slate text, cool tinted surfaces, and Plus Jakarta Sans.
- Design system: existing application components with Impeccable Product Mode guidance for the operational review interface.
- Design variance: 3. The workflow stays predictable and symmetrical.
- Motion intensity: 2. Motion is limited to state feedback, dialogs, and loading transitions.
- Visual density: 5. The queue is efficient without becoming a cramped command console.
- Status colors: amber for Under Review, red for Changes Requested, and green only for Approved.
- Shape system: use the established moderate card and control radii. Avoid nested cards and decorative gradients.

## Existing behavior being corrected

The current registration transaction creates a `resident_verifications` row with `PENDING`, but it also creates the user with `account_status = 'ACTIVE'`, issues a normal resident session cookie, and redirects directly to `/resident`.

The current login route blocks only suspended residents. A pending verification therefore does not prevent access.

The current Municipal BFP Verification Queue is static sample UI. Its buttons do not read or update resident applications.

The current signup process records simulated document paths based on file names. It does not upload the actual ID front, ID back, or selfie evidence needed by the reviewer.

## Account and verification states

### User account state

`users.account_status` remains the login access gate.

- `PENDING_REVIEW`: credentials exist, but normal resident access is blocked.
- `ACTIVE`: Municipal BFP approved the latest application.
- `SUSPENDED`: an administrator disabled an approved account.

Existing active resident accounts are grandfathered. Only registrations created after the migration enter `PENDING_REVIEW`.

### Verification state

`resident_verifications.status` records the review lifecycle.

- `PENDING`: submitted and waiting for Municipal BFP review.
- `VERIFIED`: approved by an authorized reviewer.
- `CHANGES_REQUESTED`: the resident must correct information or replace identity evidence.

Each correction submission creates a new verification record. Previous records remain immutable review history except for the review decision fields written while the record is pending.

The visible label `Verified` appears only when the latest verification is `VERIFIED` and the account is `ACTIVE`.

## Registration flow

1. The resident completes the existing five-step signup flow and phone OTP.
2. The browser sends the verified registration identifier and actual identity files to the final registration endpoint as controlled multipart form data.
3. The server validates required registration fields, locality ownership, file type, file size, and image decodability.
4. The server creates the resident user, profile, primary address, notification preferences, and pending verification transactionally.
5. The user is created with `account_status = 'PENDING_REVIEW'`.
6. Original evidence files are uploaded to a private Supabase Storage bucket.
7. Watermarked review copies are generated and stored in a separate protected review prefix.
8. Registration returns application status and municipality information. It does not issue a normal resident session.
9. The signup interface changes to an `Application under review` completion state.

If database creation succeeds but a required identity upload fails, registration must not report success. Compensating cleanup removes any uploaded objects and rolls back the database transaction where possible.

## Identity evidence and watermarking

### Private originals

The original ID front and ID back files remain private and unchanged so their evidentiary integrity is preserved. The original storage keys are never returned to browsers and are never used to build public URLs.

The server records:

- original private object key
- watermarked review object key
- MIME type
- file size
- SHA-256 digest of the original bytes
- upload timestamp

The selfie remains private and is viewable only through a short-lived signed URL. The requested watermark applies to ID front and ID back images.

### Review watermark

Municipal BFP reviewers receive only the watermarked ID copies. The watermark is rendered into the image bytes on the server, not added as a removable CSS overlay.

The watermark contains:

- `ALAB MUNICIPAL BFP REVIEW ONLY`
- application reference
- submission date in Asia/Manila time

The text is repeated diagonally at controlled opacity. It must remain visible on light and dark document areas without obscuring the portrait, name, document number, or expiry information needed for review.

The watermark must not contain the resident's full name, phone number, or complete address. This avoids adding personal data to derived images.

The image pipeline preserves orientation, strips unnecessary EXIF metadata, limits output dimensions, and produces a review-safe WebP derivative. Watermark generation must run only on the server.

### Protected access

- The Supabase secret key remains server-only.
- Signed review URLs expire after a short interval.
- Municipal review APIs return signed URLs only after confirming the signed-in BFP account is assigned to the resident's municipality.
- A Hamtic Municipal BFP account cannot receive a signed URL for a San Jose application.
- Browser and CDN responses for protected evidence use private caching directives.

## Pending resident access

Correct credentials do not automatically imply resident dashboard access.

### Pending review

After password verification, login returns a typed `ACCOUNT_UNDER_REVIEW` response and creates a limited applicant session cookie. This cookie grants access only to the resident application-status and correction routes. It does not grant access to `/resident`, fire reporting, profiles, or resident APIs.

The login interface displays a calm amber status dialog:

- `Application under review`
- assigned reviewing municipality
- submitted date
- explanation that the resident can sign in after approval
- action to view application status

This state is not presented as `Login failed`.

### Changes requested

After valid credential verification, login returns `APPLICATION_CHANGES_REQUESTED` and creates the same limited applicant session.

The resident status page displays:

- the Municipal BFP review reason
- the fields or documents needing correction
- a `Correct application` action
- the date of the request

The resident can update allowed registration fields and replace identity evidence. A successful resubmission creates a new pending verification record and returns to the Under Review state.

### Approved

Only an `ACTIVE` resident whose latest verification is `VERIFIED` receives the normal resident session and enters `/resident`.

## Municipal BFP application queue

The existing `Verification Queue` route becomes the functional `Resident Applications` screen inside the existing Municipal BFP shell.

### Municipality scope

Every list, detail, evidence, approval, and correction query derives municipality scope from the signed BFP session and `bfp_municipality_assignments`. The client cannot supply or override the municipality ID.

Applications join through the resident's primary address:

`BFP assignment -> municipality -> resident primary address -> resident profile -> latest verification`

### Queue layout

The desktop layout uses an operational data table with:

- resident name
- barangay
- submitted time
- evidence completeness
- application status
- review action

Controls include search and Pending, Changes Requested, and Approved filters. Counts are calculated from live scoped data. Empty, loading, retry, and permission states are explicit.

On narrow screens the same data becomes a compact stacked list without changing information priority.

### Review panel

Opening an application presents a focused review dialog or side panel with:

- full resident name and username
- email and phone
- municipality, barangay, and complete address
- ID front watermarked review copy
- ID back watermarked review copy when provided
- private selfie preview
- application submission and previous review history
- Approve Resident action
- Request Corrections action

Identity previews use fixed aspect-ratio containers, zoom controls, descriptive fallback states, and no automatic full-screen expansion.

### Approval

Approval requires a confirmation dialog. The server performs a guarded transaction that:

1. locks or conditionally updates the latest pending verification
2. verifies municipal ownership again
3. writes `VERIFIED`, reviewer user ID, and review timestamp
4. writes `users.account_status = 'ACTIVE'`
5. records a review audit event
6. creates a resident notification

Concurrent duplicate approval attempts return the current application state without applying a second decision.

### Request corrections

Request Corrections opens a dialog with a required reason and optional structured issue selections. The server:

1. verifies municipal ownership
2. updates only the latest pending verification to `CHANGES_REQUESTED`
3. records reviewer identity, review timestamp, and reason
4. keeps the user in `PENDING_REVIEW`
5. records an audit event
6. creates a resident notification

The action is described as `Request corrections`, not permanent rejection, because the approved workflow allows resubmission.

## API surface

The implementation adds protected routes equivalent to:

- `GET /api/municipal-bfp/resident-applications`
- `GET /api/municipal-bfp/resident-applications/[id]`
- `POST /api/municipal-bfp/resident-applications/[id]/approve`
- `POST /api/municipal-bfp/resident-applications/[id]/request-corrections`
- `GET /api/resident/application-status`
- `POST /api/resident/application-resubmit`

The final registration and resident login routes are updated to enforce the new state model.

API responses use stable machine-readable codes so the UI does not infer security state from prose:

- `ACCOUNT_UNDER_REVIEW`
- `APPLICATION_CHANGES_REQUESTED`
- `ACCOUNT_SUSPENDED`
- `APPLICATION_ALREADY_REVIEWED`
- `APPLICATION_MUNICIPALITY_MISMATCH`

## Database changes

The migration will:

- extend `users.account_status` with `PENDING_REVIEW`
- extend `resident_verifications.status` with `CHANGES_REQUESTED`
- add evidence metadata and watermarked review keys
- add indexes supporting municipality-scoped pending queues
- add a resident application review event table or equivalent immutable audit records
- preserve current resident and BFP records

Foreign-key columns used by joins receive supporting indexes. Queue indexes use selective ordering for pending municipality lookups. RLS remains enabled, while the current application continues to access these records through authorized server-side PostgreSQL queries and protected storage helpers.

## Error handling

- Invalid credentials remain a generic authentication error.
- Pending and correction states are shown only after credentials are verified.
- Missing BFP assignment returns forbidden and never falls back to another municipality.
- Failed signed URL creation keeps text details visible and shows an evidence retry state.
- Failed approval does not optimistically show Approved.
- Failed resubmission preserves the resident's entered corrections and explains which step failed.
- Storage cleanup failures are logged without exposing object keys or secrets to the user.

## Accessibility and performance

- All actions are reachable by keyboard and have visible focus treatment.
- Dialogs trap focus, close predictably, and restore focus to their trigger.
- Status is conveyed by text and icon in addition to color.
- Touch targets are at least 38 pixels, with larger primary actions on mobile.
- Images are lazy-loaded inside the review panel and receive reserved dimensions to avoid layout shift.
- Search is client-side for the loaded page or server-debounced without triggering a request for every keystroke.
- No background animation or continuous polling is added to the application review screen.

## Verification strategy

Tests must prove:

- new registrations are pending and do not receive normal resident sessions
- approved residents can log in
- pending residents receive only an applicant session
- correction-requested residents can resubmit
- existing active residents remain usable
- municipal lists and actions are restricted to the BFP assignment
- approval activates the user and verifies the latest application atomically
- correction requests require a reason and retain prior review history
- actual evidence is uploaded privately
- review ID files are watermarked server-side
- original ID bytes are not served to Municipal BFP browsers
- signed review URLs are short-lived and municipality-scoped
- UI presents accurate pending, correction, and approved labels

The focused tests, full Node test suite, lint checks, production build, and formatting-safe diff must pass before merge.

## Deployment and rollback

The database migration is applied before deploying application code that writes `PENDING_REVIEW`.

Required server environment variables include the existing Supabase URL and server-only secret key. No secret key is exposed through a `NEXT_PUBLIC_` variable.

Rollback must not delete applications or evidence. If the feature must be disabled, registration is paused or the application code is rolled back while the expanded database constraints remain compatible with existing records.
