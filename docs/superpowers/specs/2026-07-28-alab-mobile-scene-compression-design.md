# ALAB Mobile Scene Compression Design

## Goal

Remove the large empty space above the mobile hero artwork and create a compact, top-aligned response scene like the approved reference.

## Approved design

- Apply only at `640px` and below.
- Reduce the visual scene height from `clamp(25rem, 118vw, 39rem)` to `clamp(18rem, 82vw, 27rem)`.
- Reduce the gap above the visual from `1.7rem` to `1rem`.
- Position the phone from the top of the scene instead of below its bottom edge.
- Position the BFP firefighter from the upper portion of the scene instead of below its bottom edge.
- Reduce the phone to `clamp(12rem, 50vw, 20rem)`.
- Reduce the firefighter to `clamp(13.5rem, 56vw, 22rem)`.
- Keep the smoky background, trust strip, and CTA order unchanged.
- Keep tablet and desktop unchanged.

## Acceptance criteria

- The large blank area above the artwork is removed.
- The phone begins near the upper-left of the scene.
- The firefighter begins slightly lower on the right.
- The trust strip remains attached to the lower edge of the artwork.
- The two CTA buttons remain directly below the trust strip.
- The layout remains usable from 320px through 640px.
- Tests, lint, and production build pass.
