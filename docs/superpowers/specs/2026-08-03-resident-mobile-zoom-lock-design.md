# Resident Mobile Zoom Lock

## Goal

Prevent pinch and double-tap browser zoom on phone-sized resident routes so the existing interface and fixed bottom navigation remain stable within the device screen.

## Scope

- Apply the behavior only under `/resident`.
- Keep the current resident UI visually unchanged.
- Keep normal vertical page scrolling and navigation interactions.
- Keep the bottom navigation fixed to the screen edge.

## Design

Use a nested `app/resident/layout.tsx` to export resident-only Next.js viewport metadata with device width, scale `1`, and user scaling disabled. Add `touch-action: pan-x pan-y` to the existing resident mobile root as a gesture fallback while preserving one-finger scrolling. The existing fixed navigation containment rules remain unchanged.

This route-level approach is selected over changing the global application viewport because municipal and provincial pages are outside the request. JavaScript gesture listeners are rejected because native metadata and CSS provide the required behavior without event-management complexity.

## Verification

- Add a regression test for the resident viewport export and mobile touch action.
- Verify the test fails before implementation and passes afterward.
- Run all tests and the production build.
- Deploy to Railway and confirm the live `/resident` HTML includes `maximum-scale=1` and `user-scalable=no`.

