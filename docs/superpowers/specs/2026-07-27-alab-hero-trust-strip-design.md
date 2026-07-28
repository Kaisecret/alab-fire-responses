# ALAB Hero Trust Strip Design

## Goal

Add the three proof points shown in the supplied reference directly beneath the hero action buttons without changing the existing header, headline, imagery, or lower landing-page sections.

## Visual Thesis

A quiet, civic-service proof row that uses thin red linework, strong dark labels, and generous spacing to reinforce trust without competing with the emergency actions or the phone/firefighter composition.

## Content Plan

- Keep the existing hero content and actions unchanged.
- Add one semantic list after `.hero__actions`.
- Present exactly three items:
  - `24/7` with `Monitoring`
  - `18` with `Municipalities`
  - `Real-time` with `GIS Alerts`
- Use inline SVG icons for shield, people, and map pin imagery so the visuals are reliable and inherit the ALAB red.

## Layout

- Desktop: one horizontal row below the buttons, aligned to the hero copy column. Each item contains a circular outlined icon and a two-line text block. Thin vertical dividers separate the items.
- Medium screens: allow the row to remain horizontal when space permits and reduce gaps and icon scale.
- Mobile: use a compact three-column grid so all proof points remain visible without creating an overly tall hero. Dividers stay vertical and the text scales down slightly.
- The strip must not overlap the phone, firefighter, action buttons, or fixed header.

## Interaction Thesis

- The strip joins the existing staggered hero entrance sequence.
- Hover-capable devices receive a restrained icon lift and warmer outline.
- Reduced-motion preferences continue to disable the animation through the page’s existing accessibility rule.

## Accessibility

- Use a semantic `<ul>` and `<li>` structure.
- Mark decorative SVGs `aria-hidden="true"` and `focusable="false"`.
- Keep text as real HTML rather than embedded imagery.
- Maintain readable contrast and avoid relying on icon meaning alone.

## Validation

- Automated tests verify the three exact proof-point values and labels.
- Automated tests verify semantic list markup, three inline SVGs, divider styling, and the mobile grid.
- Browser captures at 1680px, 768px, and 390px confirm no overlap or horizontal overflow.

