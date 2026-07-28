# ALAB Role Network Reference Restyle Design

## Goal

Restyle the existing logo-centered role network to closely match the supplied reference while preserving its content, real logo, five user icons, and line-only animation.

## Desktop Composition

- Increase the orbit height to `47rem`.
- Use three explicit columns sized for two `25rem` side cards and a `17.5rem` center core.
- Give every role card a soft `1.25rem` radius, generous padding, subtle warm shadow, and consistent width.
- Scale role icon circles to `4.6rem`.
- Separate the card description from the identity with a thin warm-red rule.
- Scale the center core to `clamp(15rem, 20vw, 17.5rem)` and add a bright red rim with a restrained glow.
- Use compact connector paths that run from the edge of the core to the edge of each card.
- Add ten static red endpoint nodes: one at each end of the five connector lines.
- Keep dash flow as the only animation.

## Responsive Composition

- At 1100px and below, reduce card, icon, and core sizes so the existing orbit remains within the viewport.
- At 900px and below, retain the compact three-column network.
- At 640px and below, preserve the existing vertical card stack, hide connector lines and nodes, and reduce card/icon spacing.

## Accessibility and Validation

- Keep the real logo alternative text and existing semantic article headings.
- Connector lines and nodes remain in an `aria-hidden` SVG.
- Automated tests lock the major reference dimensions, card rule, glow, and ten endpoint nodes.
- Browser captures verify desktop, tablet, and mobile rendering without overflow or duplicate IDs.

