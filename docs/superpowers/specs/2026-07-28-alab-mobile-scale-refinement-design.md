# ALAB Mobile Scale Refinement Design

## Goal

Refine the approved phone hero so the fixed header uses less vertical space, the opening copy sits slightly lower beneath it, and the phone/BFP artwork feels less oversized.

## Approved changes

- Apply changes only at `640px` and below.
- Reduce the mobile header height from `4.9rem` to `4.4rem`.
- Reduce the logo, Login button, and menu control proportionally.
- Offset the shorter header by increasing the eyebrow’s top spacing so the copy begins slightly lower and never feels crowded.
- Reduce the phone artwork by approximately 12–15%.
- Reduce the BFP firefighter by approximately 12–15%.
- Position both artwork layers slightly lower in the response scene.
- Preserve the existing content order, links, imagery, mobile scene height, trust strip, and CTA styling.
- Keep tablet and desktop unchanged.

## Acceptance criteria

- The mobile header is visibly more compact.
- The eyebrow and headline retain comfortable clearance below the fixed header.
- The phone and firefighter no longer dominate or crop as aggressively.
- The three artwork/order rules remain: scene before statistics, statistics before actions.
- The page remains usable at 320px through 640px.
- Tests, lint, and production build pass.
