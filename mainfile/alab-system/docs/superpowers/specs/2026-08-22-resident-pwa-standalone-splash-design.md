# Resident PWA Standalone and Splash Design

## Goal

Make the installed ALAB Resident PWA behave like a standalone phone application on every Resident page. Opening the installed app must use the supplied `public/images/iconfor pwa.png` on a white native splash screen, then load the Resident login page.

## Root cause

The current manifest and service worker use `/resident/` as their scope. The Resident Home route is exactly `/resident`, without the trailing slash, so Android treats it as outside the installed PWA scope and displays an out-of-scope browser toolbar. Navigation that continues in that browser surface can make other Resident pages, including Reports, appear with the same toolbar.

## Design

- Change the web-app manifest scope from `/resident/` to `/resident` so both the exact Home route and every nested Resident route remain inside the installed application.
- Change the service-worker registration scope to `/resident` and make its navigation handler include both `/resident` and `/resident/*`.
- Keep `display` set to `standalone`. This removes browser chrome while retaining the phone's normal operating-system status bar.
- Keep `/resident/login` as the start URL.
- Keep the manifest background color white so Android renders a white native PWA splash screen while the login route starts.
- Generate installable 192×192 and 512×512 PNG assets from `public/images/iconfor pwa.png`. Reference those generated assets in the manifest and use the supplied image in the login install banner.
- Do not introduce a timed React loading screen. The native Android splash lasts only as long as the application needs to launch.

## Scope and compatibility

This change applies only to the Resident PWA. Municipal BFP, Provincial BFP, and ordinary browser behavior remain unchanged. Existing Android installations may retain their old icon and scope, so users must remove the old ALAB installation and install it again after deployment.

## Verification

- Add regression assertions for the manifest scope, start URL, standalone display, white background, and new icon assets.
- Add regression assertions for the service-worker registration and exact/nested Resident navigation coverage.
- Run the focused Resident PWA tests, the full relevant test suite, and the production build.
- Verify the deployed manifest, service worker, and icon URLs return successful responses from the production Vercel domain.
