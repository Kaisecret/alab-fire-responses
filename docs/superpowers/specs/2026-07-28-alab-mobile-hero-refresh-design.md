# ALAB Mobile Hero Refresh Design

## Goal

Make the landing-page hero feel polished and intentional on phones, closely following the supplied mobile reference, while leaving the existing tablet and desktop presentation unchanged.

## Scope

- Apply the redesigned composition only at viewport widths of `640px` and below.
- Reuse the existing ALAB logo, phone mockup, firefighter cutout, smoky firetruck background, copy, trust indicators, and links.
- Do not redesign the sections below the hero.
- Do not change tablet or desktop layout rules.

## Mobile visual thesis

The first screen should read like a compact emergency-response poster: calm cream space for the message, a cinematic layered response scene, and decisive red actions.

## Composition

### Header

- Keep the logo on the left.
- Keep the red Login button visible and readable.
- Keep the hamburger menu on the far right.
- Use compact spacing without crowding the three controls.
- Preserve the existing fixed-header and menu behavior.

### Message

- Place the eyebrow, two-line headline, decorative rule, and supporting paragraph before the imagery.
- Keep “Stronger Communities,” dark and “Faster Fire Response.” red.
- Scale typography fluidly so lines remain strong at widths from 320px through 640px.

### Response scene

- Use the existing smoky firetruck background as a full-width scene.
- Layer the existing phone mockup toward the lower left.
- Layer the existing BFP firefighter toward the lower right.
- Crop and overlap the assets deliberately so the scene feels integrated rather than like separate images.
- Maintain readable alt text and ensure decorative background treatment does not affect accessibility.

### Trust strip

- Present the three existing indicators in one elevated white strip near the bottom of the response scene:
  - 24/7 Monitoring
  - 18 Municipalities
  - Real-time GIS Alerts
- Keep the strip readable at narrow widths using compact icons, dividers, and fluid type.

### Actions

- Place the existing “REPORT A FIRE” and “VIEW ACTIVE INCIDENTS” controls below the scene and trust strip.
- Use full-width stacked buttons, with the primary action filled red and the secondary action outlined red.
- Preserve the existing destinations.

## Responsive behavior

- The primary mobile layout applies at `max-width: 640px`.
- A narrower adjustment at `max-width: 370px` reduces logo, type, icon, and spacing pressure without hiding the Login label unless absolutely necessary.
- The hero height should be content-driven rather than relying on a fragile fixed height.
- No horizontal scrolling or clipped interactive controls may occur at 320px.
- Tablet and desktop CSS outside the mobile media queries must remain functionally and visually unchanged.

## Interaction

- Retain the current header scroll treatment and hamburger opening animation.
- Retain the subtle hero entrance animation.
- Avoid extra motion in the layered scene so emergency actions remain visually stable.
- Continue honoring `prefers-reduced-motion`.

## Accessibility and quality

- Maintain semantic heading order and existing landmark structure.
- Preserve visible keyboard focus.
- Keep tap targets comfortably sized.
- Maintain sufficient red/white and dark/cream contrast.
- Verify the layout at 320px, 375px, 390px, and 640px, plus one desktop viewport to confirm no regression.

## Acceptance criteria

- The phone layout matches the supplied reference’s overall hierarchy and composition.
- The logo, Login button, hamburger, hero message, response scene, trust strip, and stacked CTAs are all visible and well spaced.
- The design uses existing project assets.
- Tablet and desktop layouts are unchanged.
- Navigation and links continue to work.
- Tests, lint, and production build pass.
