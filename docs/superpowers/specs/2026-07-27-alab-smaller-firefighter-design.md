# ALAB Smaller Firefighter Design

## Goal

Reduce only the hero firefighter artwork so it supports the phone and copy instead of dominating the right side.

## Approved Direction

- Preserve the existing header, hero copy, buttons, trust strip, phone size, background, and lower sections.
- Reduce the firefighter by approximately 14–15% at every existing responsive breakpoint.
- Keep the firefighter anchored to the lower-right edge so the crop remains natural.
- Use these responsive widths:
  - Desktop: `clamp(30rem, 37vw, 42rem)`
  - Up to 1180px: `clamp(27rem, 39vw, 35rem)`
  - Up to 900px: `clamp(27rem, 53vw, 33rem)`
  - Up to 640px: `clamp(20rem, 80vw, 25rem)`

## Validation

Automated tests will lock the four sizes. Desktop, tablet, and mobile browser captures must show no overlap, horizontal overflow, duplicate IDs, or browser errors.

