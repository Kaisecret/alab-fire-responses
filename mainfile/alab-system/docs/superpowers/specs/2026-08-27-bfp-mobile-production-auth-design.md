# BFP Mobile Production Authentication Design

## Goal

Allow Municipal BFP personnel to sign in to the Flutter responder app using the email and temporary password issued by their Municipal BFP administrator on the ALAB website. The first successful temporary-password login must require a new password before the responder can open the app dashboard.

## Architecture

The Flutter app calls the production ALAB API at `https://alab-fire-responses-bynr.vercel.app`. The Next.js API validates credentials with the server-only `DATABASE_URL` connection to the Supabase PostgreSQL database. The app never contains `DATABASE_URL`, `AUTH_SECRET`, Supabase secret keys, or a service-role key.

The server returns a signed, time-limited BFP session token only after validating an active `MUNICIPAL_BFP` account. Flutter stores that token with `flutter_secure_storage` and sends it as a Bearer token for password changes and session restoration.

## Server API

### `POST /api/mobile-bfp/login`

Input: `{ "email": string, "password": string }`.

The route applies the existing BFP rate limiter, checks `MUNICIPAL_BFP` credentials, and responds with the signed session token plus safe identity details. It does not return a password hash or a Supabase credential.

### `GET /api/mobile-bfp/me`

Requires `Authorization: Bearer <session-token>`. It verifies the BFP session and returns the current active Municipal BFP identity. Flutter uses it only to restore a secure persisted session at app start.

### `POST /api/mobile-bfp/change-password`

Requires `Authorization: Bearer <session-token>`. Input: `{ "currentPassword": string, "nextPassword": string }`. The route calls the existing password-change service, clears `must_change_password`, writes the credential audit event, and returns a refreshed session token with `mustChangePassword: false`.

## Flutter Flow

1. The login screen submits email and temporary password to the production login API.
2. A successful normal login stores the token securely and continues to the existing terms screen.
3. A successful first login opens a dedicated `Set New Password` screen in the current ALAB red visual system.
4. The password screen requires the temporary password, a 12-character minimum replacement password, and matching confirmation before calling the API.
5. On success it replaces the stored token, then continues to terms and the main navigation shell.
6. The app restores a valid token on launch; invalid or expired tokens return to login.

## Error Handling

The mobile screens show the server-safe error message for invalid credentials, invalid password length, expired sessions, and network failures. The login button cannot submit more than one request at a time. Tokens are cleared on a 401 response.

## Production Constraints

- Flutter has a public `ALAB_API_BASE_URL` compile-time setting, defaulting to the documented production URL.
- The Vercel project must retain valid `DATABASE_URL` and `AUTH_SECRET` production environment variables. They are never placed in Flutter or committed to Git.
- The existing Supabase migration for BFP profiles and station assignments must be run before issuing mobile personnel accounts.
- The production URL must use HTTPS.

## Verification

- Server tests prove that mobile routes reject missing/invalid Bearer tokens and only accept active Municipal BFP users.
- Server tests prove the password route clears the required-change flag through the existing service.
- Flutter analysis and widget tests cover route selection for normal and temporary-password sessions.
- A production smoke request verifies the deployed API returns a controlled response without exposing database errors.
