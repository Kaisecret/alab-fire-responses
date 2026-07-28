# BFP Responsive Hero Design

## Goal

Create a polished, responsive hero section in `BFP/index.html` that closely follows the supplied `BFP/images/Hero section.png` reference. The result must use the supplied image assets, keep the reference's branding, navigation, copy, and actions, and replace the reference's serif headline with modern sans-serif typography.

## Visual Thesis

Urgent and dependable: a warm, cinematic emergency-response scene paired with crisp sans-serif typography, strong red actions, and a clear three-part composition of message, mobile product, and firefighter.

## Page Scope

This task covers one full-width hero section only. It includes:

- A responsive site header.
- The ALAB brand image.
- Desktop navigation links.
- A Login action.
- Hero eyebrow, headline, supporting copy, and two call-to-action links.
- The supplied phone mockup and firefighter cutout layered over the supplied scene background.
- A mobile hamburger navigation.

No additional page sections, authentication flow, incident pages, maps, or backend behavior are included.

## Assets

Use the existing files without modifying them:

- `BFP/images/bg images.png` as the full-bleed scene background.
- `BFP/images/Logo.png` as the ALAB brand image.
- `BFP/images/phone.png` as the product mockup.
- `BFP/images/BFPBACK.png` as the firefighter cutout.
- `BFP/images/Hero section.png` only as the visual reference, not as the rendered hero.

## Composition

### Desktop

The hero fills at least the first viewport. The header overlays the upper portion of the hero. Below it, the content is arranged as one layered composition:

- The text column occupies the left side and remains the primary reading path.
- The phone stands around the center-right.
- The firefighter anchors the far-right edge and may overlap the phone slightly.
- The fire-scene background covers the full hero and keeps its pale area behind the text for contrast.

The headline is the largest text element and uses a bold sans-serif face. “Faster Fire Response.” is red while “Stronger Communities,” uses a near-black navy tone.

### Tablet

Navigation spacing, headline size, and imagery scale down fluidly. The text remains on the left while the phone and firefighter share the right side without covering the copy. Decorative overlap is reduced when the available width becomes constrained.

### Mobile

The header shows the logo, Login action, and hamburger control. Opening the hamburger reveals a full-width navigation panel below the header. The hero becomes a vertical flow:

1. Eyebrow, headline, supporting copy, and actions.
2. Phone mockup as the dominant product image.
3. Firefighter positioned as a supporting visual behind or beside the phone.

Buttons become full-width when necessary, text remains left-aligned, and the visual composition stays within the viewport without horizontal scrolling.

The phone must never extend upward into either call-to-action. At tablet and
mobile breakpoints, its vertical position is measured from the top of the
visual row instead of from the bottom of that row. This creates a deliberate
gap after the actions and keeps the device crop stable when copy wraps onto
additional lines.

### Phone Positioning

- Above 900px, keep the phone absolutely anchored to the bottom of the hero
  and lower it slightly so the device reads as emerging from the lower edge.
- At 900px and below, switch the phone to `top` positioning with
  `bottom: auto`.
- At 640px and below, preserve at least a small visual gap between the final
  action and the top of the phone.
- Keep the firefighter behind or beside the phone and prevent either image
  from covering the hero copy or actions.

## Content

Use the reference copy:

- Eyebrow: “READY TO PROTECT. READY TO RESPOND.”
- Headline: “Stronger Communities, Faster Fire Response.”
- Supporting copy: “A GIS-based Provincial Fire Response and Decision Support System with Smart Dispatch and Inter-Municipality Coordination for BFP in Antique.”
- Primary action: “REPORT A FIRE”
- Secondary action: “VIEW ACTIVE INCIDENTS”
- Navigation: “Home”, “Incidents”, “Resources”, “Map”, “About Us”, “Contact”
- Header action: “Login”

Links can use page-fragment placeholders because destination pages are outside this task. They must still provide visible hover and keyboard-focus states.

## Typography and Color

- Use a modern system sans-serif stack so the page works without a network dependency.
- Do not use any serif font.
- Use a deep near-black/navy for body and primary headline text.
- Use fire-engine red for active navigation, emphasis, and primary actions.
- Use warm off-white surfaces and subtle red/orange accents that match the supplied images.
- Maintain readable contrast over the background at every breakpoint.

## Interaction

- The mobile hamburger toggles an accessible navigation panel and updates its expanded state.
- The hero content enters with a short staggered fade-and-rise sequence.
- Phone and firefighter imagery use restrained depth motion on capable desktop devices.
- Buttons lift slightly and their arrow/icon treatment shifts on hover.
- Navigation links show a clear underline or color transition.
- All nonessential motion is removed when `prefers-reduced-motion: reduce` is active.

## Accessibility

- Use semantic `header`, `nav`, `main`, and `section` elements.
- Provide descriptive alternative text for meaningful images.
- Label the hamburger button and expose its expanded state.
- Ensure every interactive element is keyboard reachable.
- Use visible focus styles.
- Keep tap targets at least approximately 44 pixels high.
- Prevent the open mobile menu from obscuring navigation content or causing horizontal overflow.

## Implementation Structure

Keep the deliverable self-contained in `BFP/index.html`:

- Semantic HTML for the header and hero.
- An internal `<style>` block for tokens, layout, breakpoints, and animation.
- A small internal `<script>` for the mobile menu and optional pointer-based depth effect.
- Inline SVG icons or CSS-drawn details for interface icons so no icon library or network connection is required.

## Verification

Verify:

- All supplied asset paths load correctly.
- No serif font is applied.
- The hero has no horizontal overflow.
- Header, copy, actions, phone, and firefighter remain legible and well composed at common desktop, tablet, and mobile widths.
- The phone begins below both actions at 900px and 640px breakpoints.
- The hamburger opens, closes, updates `aria-expanded`, and closes after a navigation link is selected.
- Keyboard focus is visible.
- Reduced-motion mode removes decorative animation.
- The browser console has no errors.
