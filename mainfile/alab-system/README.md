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

## BFP mobile app production connection

The Flutter BFP responder app uses the deployed ALAB API, not a direct Supabase database connection. Keep `DATABASE_URL` and a 32+-character `AUTH_SECRET` configured only in the Vercel project environment. Never place either value, a Supabase secret key, or a service-role key in the Flutter app.

Resident correction notices use the existing PhilSMS account and Resend. Configure these values only in the Vercel project environment:

- `PHILSMS_API_TOKEN` — PhilSMS bearer token.
- `PHILSMS_SENDER_ID` — approved PhilSMS sender ID.
- `RESEND_API_KEY` — Resend server API key.
- `RESEND_FROM_EMAIL` — verified sender, such as `ALAB <updates@your-domain.gov.ph>`.
- `NEXT_PUBLIC_APP_URL` — public ALAB origin used for the resident application link.

Apply `supabase/migrations/20260910090000_add_resident_notification_deliveries.sql` before enabling correction delivery in production. Never commit any provider key to the repository.

Build the production Android app with the public API address only:

```powershell
flutter build apk --release --dart-define=ALAB_API_BASE_URL=https://alab-fire-responses-bynr.vercel.app
```

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
