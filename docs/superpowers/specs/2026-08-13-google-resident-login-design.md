# Google Resident Login Design

## Goal

Allow a resident to sign in with Google. Existing residents go directly to the resident home page. New Google users enter the existing five-step resident signup with Google name and email prefilled, then complete ID upload and phone OTP verification before their account is created.

## Authentication flow

1. The Google button calls Supabase Auth `signInWithOAuth` with the Google provider and the ALAB callback URL.
2. The callback exchanges the authorization code server-side and obtains the authenticated Supabase user.
3. The callback uses the Google provider subject identifier and verified email to look up a resident record.
4. If a linked Google subject exists, or an existing ALAB resident has the same verified email, the server links the subject when needed, creates the existing signed resident session cookie, and redirects to `/resident`.
5. If no ALAB resident exists, the server creates a short-lived, signed signup-prefill cookie containing only the Google subject, verified email, and display-name parts, then redirects to `/resident/signup`.
6. The signup page reads the prefill cookie through a server route, fills Step 1 name/email, retains all five existing steps, requires ID/selfie/phone OTP, and stores the Google subject only when successful registration creates the resident account.

## Data model

Add nullable `google_subject text unique` to `public.users`. The value is the provider identity from Supabase Auth and is used for subsequent Google logins. It is not user-editable profile metadata. Existing password residents remain supported and can be linked to Google only after a verified Google callback matches their existing email.

## Security

- Google callback uses the server Supabase client and code exchange; browser-supplied email alone is never trusted.
- Google identity lookup prioritizes `google_subject`; matching email is allowed only when Supabase marks the email as verified.
- New-user prefill cookie is signed, HTTP-only, short-lived, and holds no password, access token, secret, or ID document data.
- Existing protected resident routes continue using the existing signed resident session cookie.
- The Google Client Secret remains only in Supabase provider configuration, never source code or Vercel browser variables.

## UI

The existing Google button shows a loading label during redirect. A first-time Google user sees a small notice at signup Step 1 that Google has filled their name and email; they still complete the normal five-step flow. Successful existing Google residents open the resident home directly.

## Errors and tests

- OAuth error or missing configuration returns to resident login with a clear error message.
- An unverified Google email cannot auto-link an existing resident account.
- Tests cover the migration, OAuth initiation, callback identity checks, safe prefill handling, existing account session creation, and preservation of ID/OTP signup requirements.
