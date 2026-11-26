This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

## Resident signup verification

Signup keeps six steps: personal details, address, both ID sides, guided selfie, account security, and phone verification. A successful ID check opens the selfie step automatically. The selfie camera uses a pinned, locally served MediaPipe Face Landmarker to check centering, face size, head direction and a continuous steady hold before capturing front, right and left views. Inference runs in the browser; frames are not sent to MediaPipe or Gemini. Each photo is confirmed before use and can be retaken separately.

The server requires all three photos and compares only the front selfie with the ID portrait using the bundled OpenCV YuNet/SFace models. Signed verification proofs bind both ID images and all three selfie source files. Registration still requires phone OTP. The three confirmed views are stored as a labelled contact sheet in the existing private evidence bucket; no database migration is needed. Existing resident correction submissions retain their single-selfie capture.

Position and head-turn checks are capture guidance, not certified anti-spoofing or proof that an ID is genuine. Face matching can reject genuine matches or accept incorrect ones; evaluate it with a consented test set before real use. No personal photographs are included in automated tests. Model provenance and licenses are recorded beside the bundled model assets.

## BFP mobile app production connection

The Flutter BFP responder app uses the deployed ALAB API, not a direct Supabase database connection. Keep `DATABASE_URL` and a 32+-character `AUTH_SECRET` configured only in the Vercel project environment. Never place either value, a Supabase secret key, or a service-role key in the Flutter app.

Resident correction notices use the existing PhilSMS account and Gmail/Google Workspace through Nodemailer. Configure these values only in the Vercel project environment:

- `IPROGSMS_API_TOKEN` — iProgSMS API token for registration OTP and password reset codes.
- `PHILSMS_API_TOKEN` — PhilSMS bearer token, used only for correction notices.
- `PHILSMS_SENDER_ID` — approved PhilSMS sender ID, used only for correction notices.
- `GMAIL_USER` — `regalakhing@sac.edu.ph`. Emails display the sender name **ALAB**, using this actual address.
- `GMAIL_APP_PASSWORD` — Google app password for that account (not its regular login password). Enable 2-Step Verification and create it at https://myaccount.google.com/apppasswords. School administrators may restrict app passwords; if unavailable, contact the school administrator.
- `NEXT_PUBLIC_APP_URL` — public ALAB origin used for the resident application link.
- `CRON_SECRET` — random server-only secret for the scheduled correction delivery worker. Vercel sends it in the Authorization header.

Apply `supabase/migrations/20260910090000_add_resident_notification_deliveries.sql` before enabling correction delivery in production. Never commit any provider key to the repository.

No purchased sending domain or Resend credentials are needed for the active Gmail integration. Set the Gmail variables in Production and redeploy. Replies go to the configured school email address. Gmail account limits and school sending policies still apply.

Resident forgot password also uses these Gmail variables. Codes go to the email stored on the resident account, even when the resident enters a username or mobile number. Residents without an email keep SMS recovery through iProgSMS. The code expires after ten minutes and can be used only once; requests have a one-minute cooldown and a five-send hourly limit. The public response does not reveal whether an account exists. Changing Gmail environment variables requires a new Vercel deployment.

Resident profile photos use the existing server-only Supabase storage credentials (`NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SECRET_KEY`, or the legacy service role key). The authenticated `/api/resident/profile/photo` endpoint creates the private `resident-profile-photos` bucket on first upload; no database migration is needed. Photos are decoded, oriented, resized to at most 1024 pixels, stripped of metadata, and saved only under the signed-in resident's ID. The profile and navigation avatar update together. File selection and the existing camera capture both require a successful save before replacing the displayed photo.

The production release also checks the existing `20260821175022_add_resident_security_settings.sql` and `20260822020000_allow_security_preferences_without_pin.sql` migrations through `scripts/apply-resident-profile-migrations.mjs`. Missing security/activity tables previously caused those profile dialogs to return server errors. The runner applies only missing changes in a locked transaction, preserves saved settings, records migration history where available, and verifies RLS and optional PIN storage. Preview builds skip this database setup.

Correction retries run daily via `vercel.json` at `/api/cron/resident-correction-deliveries` (00:00 UTC / 08:00 Manila, within Vercel's scheduling window). Each invocation claims at most five due jobs with row locks and a three-attempt default limit. Unconfigured channels are skipped without spending attempts. A more frequent schedule requires an appropriate Vercel plan. Without `CRON_SECRET`, the worker rejects requests and the UI does not promise scheduled retries.

Provider acceptance and delivery tracking are separate: failure to record a sent message never marks it failed. Ambiguous network/provider outcomes remain `PROCESSING` and are excluded from retries to avoid duplicate SMS. Legacy failures containing raw provider error text also require review because the old code did not distinguish ambiguous responses. Check the provider dashboard before manually reconciling these records; never blindly reset them. `SENT` means the provider accepted the send request, not confirmed receipt on the resident's device. The correction remains saved even if notification delivery or tracking is unavailable.

Build the production Android app with the public API address only:

```powershell
flutter build apk --release --dart-define=ALAB_API_BASE_URL=https://alab-fire-responses-bynr.vercel.app
```

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

### Provincial municipality management

The provincial directories use the existing server-side `DATABASE_URL` and Provincial BFP session. Apply the reviewed migration `supabase/migrations/20260910140000_provincial_management_support.sql`, after its earlier dependencies, before using management mutations, audit history, or exports. These operations need the server-only audit and idempotency tables. Deploying application code does not apply database migrations.

Run `npm test`, `node node_modules/typescript/bin/tsc --noEmit`, and `npm run build` before deployment. The provincial migration execution test uses an isolated PGlite database and never connects to a deployed database. Live multi-session checks and provider delivery checks require a separate test environment. See [the provincial verification record](docs/superpowers/reviews/2026-09-10-provincial-management-verification.md) for the checks actually performed and remaining limitations.

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
