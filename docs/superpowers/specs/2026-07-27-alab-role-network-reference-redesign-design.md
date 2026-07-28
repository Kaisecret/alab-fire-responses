# ALAB Role Network Reference Redesign

## Goal

Restyle only the existing five-role access network in `BFP/index.html` so it closely matches the supplied reference while preserving the current heading, role names, explanatory copy, page navigation, and every surrounding section.

## Visual Thesis

A polished emergency-coordination hub: warm white glass-like role panels orbit a glowing black ALAB core, while restrained red routes and moving signal nodes communicate active coordination.

## Scope

- Change only the `.access-orbit` network and its directly related responsive styles and tests.
- Keep the `Access with purpose` kicker, `One shared system. The right view for every role.` heading, and supporting paragraph unchanged.
- Keep all five roles and their current descriptions unchanged.
- Keep `images/Logo.png` as the center artwork.
- Do not change the header, hero, other landing-page sections, footer, or navigation.
- Do not add dependencies or new image assets.

## Desktop Composition

- Increase the network's usable width and height so the composition has the same generous scale as the reference.
- Place Residents at the upper left, Barangay officials at the upper right, Municipal BFP at the middle left, Provincial BFP at the middle right, and Firefighters centered below the core.
- Use large warm-white role panels with rounded corners, subtle translucent borders, soft shadows, and comfortable internal spacing.
- Keep the role icon, uppercase red label, bold role name, divider, and description visually distinct.
- Enlarge the icon circles and use the existing red line icons.
- Enlarge the center core and render it as a dark circle with a crisp red rim, warm red glow, and the real ALAB logo centered inside.
- Add two or three faint dotted elliptical orbit rings behind the network.
- Connect every role to the core using thin red dashed paths with small endpoint dots.

## Motion

- Add a subtle breathing glow to the center core using only opacity and shadow intensity; the logo and core position remain fixed.
- Add one small glowing red signal node to each connector.
- Move each node from its role card toward the center core at an even, smooth speed.
- Stagger the five nodes so they do not arrive simultaneously.
- Keep connector lines themselves mostly still; only a very subtle dash drift may be used if it does not compete with the moving nodes.
- Use restrained animation timing of approximately 3.8 to 5.5 seconds per route with gentle easing and short staggered delays.
- Pause decorative movement when the browser or operating system requests reduced motion.

## Responsive Behavior

- Desktop widths retain the full reference-like hub-and-spoke composition.
- Tablet widths keep the same five-position relationship while reducing card, core, and gap sizes enough to avoid overflow.
- At 640 pixels and below, use a vertical stack: logo core first, then the five full-width role panels.
- Hide the desktop orbit rings and routed connector SVG on mobile because the radial geometry no longer matches the stacked layout.
- Add a restrained vertical red guide with a small moving signal accent on mobile so the active-network idea remains without creating crossed or misleading lines.

## Accessibility

- Preserve semantic `article`, heading, and paragraph content for each role.
- Keep the ALAB center image's descriptive alternative text.
- Treat orbit rings, connector lines, endpoints, and moving signal nodes as decorative with `aria-hidden="true"` and `focusable="false"` where applicable.
- Ensure red text, dark headings, and body copy retain readable contrast against the warm-white panels.
- Respect `prefers-reduced-motion: reduce` by disabling continuous signal and glow animations.

## Implementation Boundaries

- Use the existing single-file HTML/CSS architecture in `BFP/index.html`.
- Reuse the existing inline SVG icon artwork and local logo asset.
- Update `BFP/tests/landing.test.mjs` before production markup or styling changes.
- Do not introduce JavaScript for the network animation; CSS and SVG are sufficient.

## Validation

- Add a failing test that requires five animated signal nodes, rounded reference-style role panels, a glowing center animation, desktop connector artwork, and the mobile guide fallback.
- Run the Node test suite and confirm the new test fails for the expected missing visual contract before implementation.
- After implementation, run all Node tests and confirm they pass.
- Capture and inspect the role section at desktop, tablet, and mobile widths.
- Confirm card text is unchanged, connectors meet the correct cards, signals travel toward the core, no element overflows, and the mobile stack remains readable.
- Verify the reduced-motion viewport has no continuous signal, glow, or dash animation.
