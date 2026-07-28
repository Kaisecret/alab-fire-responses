# ALAB Larger Two-Phone Hero Visual Design

**Date:** July 27, 2026  
**Status:** Approved design, pending written-spec review

## Goal

Bring the existing two-phone mockup closer to the supplied reference by making it more prominent and ensuring the rear map phone is visible.

## Design

- Continue using the existing `BFP/images/phone.png`, which already contains the front emergency screen and rear map screen.
- Increase the desktop phone-image width from `clamp(19rem, 22vw, 26rem)` to approximately `clamp(23rem, 26vw, 31rem)`.
- Lower the phone slightly from the compact fixed header so it does not feel attached to the navigation.
- Keep the phone behind the firefighter and prevent it from covering the hero headline, supporting copy, or actions.
- Adjust horizontal placement only enough to expose the rear map phone.

## Responsive Behavior

- Desktop: use the full larger two-phone composition.
- Tablet: reduce the width enough to preserve the split visual without covering text.
- Mobile: keep the phone below both hero actions and scale it within the viewport.
- Preserve the existing firefighter scale and the current fixed header.
- Prevent horizontal scrolling at all supported breakpoints.

## Verification

- The two-phone asset is visibly larger on desktop.
- The rear map phone can be seen beside the front phone.
- The mockup does not overlap hero copy or calls to action.
- Mobile and tablet layouts remain readable and overflow-free.
- Existing header, landing-page, navigation, and accessibility tests continue to pass.

