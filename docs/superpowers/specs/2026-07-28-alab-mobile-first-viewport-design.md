# ALAB Mobile First-Viewport Design

## Goal

Fit the hero’s main actions into the initial mobile viewport by reducing vertical space while preserving the visual hierarchy.

## Approved design

- Apply only at `640px` and below.
- Reduce headline, rule, paragraph, and inter-section spacing moderately.
- Shorten the artwork scene to `clamp(12.5rem, 52vw, 18rem)`.
- Reduce and top-align the phone and BFP firefighter again.
- Tighten the trust strip and CTA spacing.
- Add an additional `max-height: 750px` breakpoint for phones with short usable browser viewports.
- Keep both CTA labels and tap targets readable.
- Preserve tablet and desktop.

## First-viewport behavior

- On standard phones, the first CTA should appear without scrolling and the second should be fully visible or immediately adjacent to the viewport edge.
- On short mobile browser viewports, both CTAs should be brought into view by the height-aware compact rules.
- The artwork remains recognizable and the trust strip remains legible.

## Acceptance criteria

- No large empty gap remains between copy and artwork.
- Phone and firefighter are visibly smaller and start near the top of the scene.
- CTA controls move substantially upward.
- Mobile-only media queries contain all changes.
- Tests, lint, and production build pass.
