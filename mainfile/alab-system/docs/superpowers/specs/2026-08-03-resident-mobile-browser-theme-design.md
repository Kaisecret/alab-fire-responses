# Resident Mobile Browser Theme Design

## Goal

Color supported mobile and tablet browser chrome with the requested ALAB red while keeping the resident application UI unchanged.

## Scope

- Apply browser theme color `#DD2213` to routes under `/resident`.
- Limit the theme color to phone and tablet viewports up to `1024px` wide.
- Keep desktop browser chrome and all in-page colors, spacing, and layout unchanged.
- Preserve the existing resident-only viewport zoom lock.

## Implementation

Extend the resident route's Next.js `Viewport` export in `app/resident/layout.tsx` with a media-qualified `themeColor` entry:

- Media query: `(max-width: 1024px)`
- Color: `#DD2213`

This emits the standard `theme-color` metadata used by supported browsers. The setting remains isolated to the resident route tree because it lives in the resident nested layout.

## Verification

- Add a focused test for the exact color and tablet media query.
- Run the resident tests and full test suite.
- Run a production build and inspect generated resident HTML for the media-qualified theme-color metadata.
- Deploy the exact commit through Railway and verify the live resident HTML.
