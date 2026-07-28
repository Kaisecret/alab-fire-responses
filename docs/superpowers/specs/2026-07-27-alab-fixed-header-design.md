# ALAB Compact Fixed Header Design

**Date:** July 27, 2026  
**Status:** Approved design, pending written-spec review

## Goal

Make ALAB navigation easier to use on long pages by keeping the header visible while scrolling and reducing the oversized logo and header footprint.

## Scope

- Change the header from absolute to fixed positioning.
- Reduce the desktop header height from `7.5rem` to approximately `5.5rem`.
- Reduce the desktop logo width from `clamp(11rem, 14vw, 15rem)` to approximately `clamp(7.75rem, 9vw, 9.5rem)`.
- Keep the logo fully visible without aggressive cropping.
- Preserve the existing navigation labels, active-link styling, Login button, hamburger behavior, and hero content.
- Maintain enough hero top spacing so the fixed header does not cover the hero copy.

## Scroll Behavior

At the top of the page, the header will retain a light warm surface that blends with the hero. After the user scrolls a short distance, JavaScript will add an `is-scrolled` class that applies:

- A more opaque warm background
- Subtle backdrop blur
- A fine lower border
- A restrained shadow

The class will be removed when the page returns to the top. The header remains usable when JavaScript is unavailable through its default fixed background.

## Responsive Behavior

- Desktop: compact 5.5rem header and approximately 9rem-wide logo.
- Tablet: retain the existing navigation-to-hamburger breakpoint while reducing the logo footprint.
- Mobile: use an approximately 5rem header and a 6.5–7rem logo so Login and hamburger controls remain comfortable.
- Anchor destinations will use appropriate scroll padding so headings are not hidden beneath the fixed header.

## Accessibility and Motion

- Preserve visible keyboard focus styles and existing tap-target sizes.
- Keep `aria-expanded`, Escape-key closing, and mobile-menu behavior unchanged.
- The shadow/background transition will be short and disabled by the existing reduced-motion rules.
- The fixed header must maintain readable contrast over every section.

## Verification

- Existing and new automated tests pass.
- Header stays fixed at desktop, tablet, and mobile widths.
- Logo is visibly smaller and remains uncropped.
- Hero copy begins below the fixed header.
- Fragment navigation does not hide section headings.
- Mobile menu opens below the compact header without overflow.
- Scrolling adds and removes the `is-scrolled` state.
- No horizontal overflow or browser errors occur.

## Out of Scope

- Changing navigation labels or destinations
- Redesigning the Login button
- Altering the landing-page sections below the header
- Replacing the ALAB logo asset

