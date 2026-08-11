# Resident Mobile Navigation Zoom Stability

## Goal

Keep the existing resident mobile bottom navigation visually unchanged while preventing it from extending beyond the visible phone width when the browser is zoomed or the viewport becomes unusually narrow.

## Scope

- Apply the fix only to the resident mobile bottom navigation styles.
- Preserve browser zoom and pinch-to-zoom support.
- Preserve the current colors, spacing, icons, labels, center report-fire button, and desktop layout.
- Avoid JavaScript viewport listeners and avoid changing page content.

## Approaches Considered

1. **CSS containment and flexible tracks (selected).** Anchor the fixed bar with both horizontal insets, cap it to the viewport, and allow each navigation track to shrink without overflow. This is small, stable, and preserves the existing UI.
2. **Disable browser zoom.** A resident-only viewport rule could block zoom, but this would reduce accessibility and some browsers may ignore it.
3. **Track the visual viewport with JavaScript.** This could compensate for pinch zoom precisely, but it adds resize listeners, transforms, and possible motion jitter for a layout that CSS can contain.

## Design

Within the existing mobile media query:

- Replace the fixed bar's explicit `width: 100%` sizing with `left: 0`, `right: 0`, `width: auto`, and a viewport maximum width.
- Clip accidental horizontal overflow at the resident page root without affecting vertical scrolling.
- Make each regular navigation item and the center button wrapper a flexible one-fifth track with `min-width: 0`, so labels and icons cannot force the bar wider.
- Keep the center report-fire button absolutely positioned above its existing track with its current dimensions and styling.
- Preserve the current bottom padding and add safe-area support only as an additive device inset.

## Verification

- Add a static regression test for the containment and flexible-track declarations.
- Run the focused regression test, the complete test suite, TypeScript/build verification, and production build.
- Check the resident page at narrow mobile widths and confirm the five navigation targets remain inside the viewport with the center action aligned.

