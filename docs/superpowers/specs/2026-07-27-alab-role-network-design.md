# ALAB Role Network Design

## Goal

Refine the existing role-access section using the real ALAB logo, animated connector lines inspired by the supplied network reference, and a meaningful icon for every user role.

## Visual Thesis

A calm provincial coordination map: the real ALAB identity anchors the center, thin animated red routes communicate connection, and crisp line icons make each user group immediately recognizable.

## Composition

- Keep the existing light ALAB section, heading, five role cards, wording, and card placement.
- Replace the center `ALAB / Connected provincial response` text with `images/Logo.png`.
- Place the full logo inside a dark circular core so its original dark artwork blends naturally without altering the source file.
- Add one full-size, non-interactive SVG connector layer behind the core and cards.
- Draw five dashed paths from the core toward Residents, Barangay officials, Municipal BFP, Provincial BFP, and Firefighters.
- Animate only the connector dashes. The core, cards, and role icons remain still.

## Role Icons

- Residents: person silhouette.
- Barangay officials: barangay/community building.
- Municipal BFP: fire station.
- Provincial BFP: province/map with location marker.
- Firefighters: firefighter helmet.

Each icon appears in a small circular red-outline container at the start of its card header.

## Responsive Behavior

- Desktop and tablet retain the orbit and animated connector layer.
- Mobile retains the logo and role cards in the existing vertical stack, but hides the connector layer because the radial relationship no longer matches the layout.
- The site-wide reduced-motion rule limits the dash animation to a single near-instant iteration.

## Accessibility

- The center logo has descriptive alternative text.
- The connector SVG and card icons are decorative and use `aria-hidden="true"` plus `focusable="false"`.
- Existing role headings and explanatory copy remain the accessible source of meaning.

## Validation

- Tests verify the real logo path, five connector paths, five role icons, line-only animation, mobile hiding, and removal of the old center text.
- Browser captures verify desktop, tablet, and mobile composition with no overflow, duplicate IDs, or browser errors.

