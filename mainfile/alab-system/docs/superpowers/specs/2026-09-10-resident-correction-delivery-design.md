# Resident correction delivery design

## Objective

When a Municipal BFP reviewer requests corrections, ALAB must save the decision and notify the resident through the existing in-app channel, PhilSMS, and email. External delivery failures must not roll back the correction decision.

## Architecture

Add a database-backed delivery queue for resident application notifications. The correction transaction will update the application, create its audit event and in-app notification, then insert one SMS job and one email job using the resident's stored phone and email. Each job has a unique deduplication key, status, attempt count, provider identifier, last error, and timestamps.

The request-corrections endpoint will commit the correction first, then process its newly created jobs. PhilSMS will use the existing server-side integration. Email will use Resend's HTTPS API with `RESEND_API_KEY` and `RESEND_FROM_EMAIL`. No credentials or provider responses containing secrets will be exposed to the browser.

## Message content

The in-app notification and email contain the reviewer-entered correction reason. The email includes the resident's first name, application reference, municipality, correction reason, and a link to `/resident/application` based on `NEXT_PUBLIC_APP_URL`.

The SMS stays short and privacy-conscious: it identifies ALAB, says the application needs correction, includes the application reference, and directs the resident to sign in. It does not include identity-document details or the full correction reason.

## Delivery behavior

Provider delivery runs after the database transaction commits. A successful provider response marks the job `SENT`. A temporary or configuration failure marks it `FAILED`, records a safe error, and leaves it eligible for retry. Unique keys prevent duplicate messages if the reviewer or server retries the request.

The endpoint returns per-channel delivery status. The Municipal BFP interface shows that the correction was saved and distinguishes sent, queued/failed, and unavailable channels. A provider outage never changes the application back to pending.

## Security and privacy

API credentials are environment variables only. Logs and database rows store safe provider error summaries, never tokens. Email HTML escapes all resident and reviewer-provided values. Destination email and phone values come from the municipality-scoped locked application record, not request input. SMS avoids sensitive correction details.

## Testing

Tests cover job creation in the correction transaction, deduplication, PhilSMS and Resend request shape, HTML escaping, delivery status handling, external failure without transaction rollback, API response status, and Municipal BFP feedback. Existing authentication, municipality-scoping, notification, type-check, lint, and production build checks must continue to pass.
