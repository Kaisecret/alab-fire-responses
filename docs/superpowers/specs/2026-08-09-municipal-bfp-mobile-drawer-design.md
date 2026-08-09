# Municipal BFP Mobile Drawer Design

## Goal

Make the Municipal BFP dashboard comfortable to use on phones while preserving the existing desktop layout and visual treatment.

## Scope

- Apply the navigation change in `MunicipalBfpLayout`, which is shared by every Municipal BFP route.
- Apply dashboard density and overflow fixes in `MunicipalBfpDashboard` at `max-width: 768px` only.
- Keep desktop sidebar dimensions, header arrangement, content spacing, colors, and interactions unchanged.
- Do not add a dependency or change the data shown on the page.

## Mobile Navigation

At `max-width: 768px`, the sidebar becomes an off-canvas drawer with a width capped at 300px. It starts translated off the left edge and slides into view when the hamburger button in the header is pressed.

The drawer has a labeled close button and keeps the full navigation labels visible. A fixed translucent backdrop sits behind the drawer and closes it when pressed. Clicking a navigation link closes the drawer, and pressing Escape closes it when open. The trigger exposes `aria-expanded` and `aria-controls`; the drawer and backdrop use descriptive labels.

The mobile main area uses the full viewport width. The header keeps the ALAB logo, a compact Municipal BFP title, notification and profile actions, and the new menu trigger. The long desktop system title, location pill, and secondary search action are hidden only on mobile to protect tap targets and prevent overflow.

## Mobile Dashboard

The dashboard uses two compact stat columns on phones, a single column for quick actions, and stacked emergency contact actions. The incident table remains readable inside a horizontally scrollable card body instead of widening the page. Verification and resource content keeps `min-width: 0` so text wraps inside the viewport.

## Acceptance Criteria

1. Desktop viewport rules remain unchanged outside the existing mobile media query.
2. On a phone-sized viewport, the main content spans the viewport without a permanent icon rail.
3. The hamburger opens the labeled drawer, the close button/backdrop closes it, and navigation links close it.
4. The dashboard has no page-level horizontal overflow caused by the incident table or action cards.
5. Existing Municipal GIS tests remain green, and the production build succeeds.
