# PhilSMS OTP Resident Registration Design

## Goal

Require a resident to verify ownership of their Philippine phone number with a PhilSMS-delivered OTP before the application creates the resident account.

## Selected approach

Use the existing custom resident authentication and Supabase PostgreSQL connection. PhilSMS is used only as the server-side SMS delivery provider; Supabase Auth is not introduced.

This is preferred over creating the account first because unverified accounts and password hashes are never persisted if a resident abandons the verification flow.

## Registration flow

1. The resident completes the existing profile, locality, credential, document-name, selfie, and terms fields.
2. `POST /api/auth/register/start` validates the submitted data and rejects an existing email, username, or phone before an SMS is sent.
3. The server creates a random six-digit OTP, stores only an HMAC hash with the pending registration payload in `registration_otps`, and sends the OTP with PhilSMS.
4. The UI switches to a branded OTP screen with six accessible digit inputs, a five-minute countdown, a 60-second resend cooldown, and an edit-number/back action.
5. `POST /api/auth/register/verify` validates the OTP. A valid, unused, unexpired OTP creates all existing resident records in one transaction, consumes the OTP, issues the existing protected session cookie, and returns success.
6. Invalid verification attempts are counted. The code becomes unusable after five failed attempts. An expired/consumed code cannot create an account.

## Data model

Add `registration_otps` with a UUID primary key, normalized phone/email/username, a JSONB pending-registration payload, OTP hash, expiry timestamp, attempt count, consumed timestamp, send timestamp, and timestamps. A unique phone constraint is not used because retry histories must be retained briefly; an index supports active lookup by normalized phone and expiry.

The existing account tables remain unchanged. Pending data has a five-minute lifetime and is deleted by the server when it is expired or superseded.

## Server integration

The PhilSMS request runs only from the Node.js route handler. The deployment receives `PHILSMS_API_TOKEN` and `PHILSMS_SENDER_ID` as non-public Vercel environment variables. If either value is absent, the start route returns a safe configuration error and does not create an account.

Phone values are normalized from Philippine `09...` form to the PhilSMS recipient format `639...`. The browser never receives the provider token or the generated OTP.

## UI

The existing ALAB sign-up design remains. After details validation, it transitions to a dedicated verification panel using the same emergency-red palette, high-contrast copy, clear numeric OTP boxes, countdown/progress feedback, resend state, and an explanatory note showing a masked phone number. It works on mobile and desktop and keeps keyboard/focus behavior accessible.

## Error handling

- Existing account: show a field-specific message before sending an SMS.
- Delivery failure: do not show a generic success state; keep the resident on the details screen and allow a safe retry.
- Wrong/expired/locked code: stay on the verification screen with a clear message and no account creation.
- Missing PhilSMS configuration: show an administrator configuration message without leaking secret values.

## Tests

Automated tests will cover migration constraints/indexes, server-only PhilSMS token use, validation before delivery, hashed OTP storage, expiry/attempt limits, account creation after successful verification only, and the OTP UI’s accessibility/resend elements. Existing signup tests must keep passing.
