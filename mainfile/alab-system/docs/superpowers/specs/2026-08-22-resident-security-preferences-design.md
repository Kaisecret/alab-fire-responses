# Resident Security and Preferences Design

## Goal

Make every visible Resident Profile security and notification control useful, persistent, and scoped to the signed-in resident.

## Resident experience

- **Change Password** continues to require the current password and updates the account password.
- **PIN / Security Settings** opens a dialog where a resident can create or replace a four-digit PIN after confirming their password. The PIN is stored only as a password hash and is not used as a replacement for the normal sign-in password.
- **Login Activity** opens a read-only dialog showing the resident's most recent successful sign-ins, with a safe device label and date/time.
- **Privacy Settings** opens a dialog with a persisted choice that controls whether Municipal BFP staff may use the resident's saved contact details for emergency follow-up.
- **Push Notifications**, **Incident Updates**, and **Emergency Alerts** become accessible buttons. They load from and save to the existing notification-preferences record without a page refresh.

## Architecture

The resident profile page remains a small client controller over the existing static markup. It fetches a single security-and-preferences payload on load, updates each dialog or switch immediately after a successful API response, and keeps error feedback inside the affected dialog.

A session-owned resident settings API handles PIN and privacy data. A dedicated login-activity API returns only the current resident's most recent events. Successful resident password logins append one safe activity event. The existing profile API owns notification switches because it already returns the notification preferences.

## Data and security

- A `resident_security_settings` row belongs to exactly one `resident_profiles` row and stores `pin_hash` plus `bfp_contact_allowed`.
- A `resident_login_activity` row belongs to exactly one resident profile and stores a short server-derived device label and the successful-login timestamp. It stores neither raw IP addresses nor passwords.
- Both tables have RLS enabled. The application server additionally enforces ownership from the signed resident session on every read and write.
- PIN changes require the account's current password, validate exactly four digits, and use the existing `scrypt` password helpers.

## Error handling and testing

- Missing or expired sessions return 401; malformed PIN/password/privacy input returns 400; an absent profile returns 404.
- Database writes are parameterized and use an upsert only for the security-settings row linked to the signed-in resident profile.
- Tests cover the server ownership checks, password/PIN validation and hashing, successful-login activity recording, persistent notification updates, and the client actions/dialogs.
