# ALAB Role Network Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the role-network center text with the real ALAB logo, connect all five roles with animated dashed paths, and add a distinct icon to each role card.

**Architecture:** Extend the existing `.access-orbit` markup in `BFP/index.html` with one decorative SVG layer and five inline role icons. Scope all visual behavior to the existing access-system CSS and reuse the site’s reduced-motion fallback.

**Tech Stack:** Semantic HTML5, CSS keyframes, inline SVG, Node.js built-in test runner, headless Chrome

## Global Constraints

- Preserve the current light section, headings, role copy, card positions, and responsive stacking.
- Use `images/Logo.png` without editing the source asset.
- Animate only `.access-link` paths.
- Hide connectors at 640px and below.

---

### Task 1: Role Network Contract

**Files:**
- Modify: `BFP/tests/landing.test.mjs`

- [ ] Add a failing test for the actual logo, five `.access-link` paths, five `.access-role__icon` elements, `access-link-flow`, mobile connector hiding, and removal of the old center text.
- [ ] Run `node --test BFP/tests/landing.test.mjs` and confirm the test fails because the new network markup is absent.

### Task 2: Network Markup and Styling

**Files:**
- Modify: `BFP/index.html`

- [ ] Replace the center text with an accessible `images/Logo.png` image.
- [ ] Insert `.access-links` with five dashed paths behind all orbit content.
- [ ] Add a unique inline SVG icon to each role card.
- [ ] Style the dark logo core, icon circles, connector paths, and dash-flow animation.
- [ ] Hide `.access-links` at 640px and below and remove the orbit reveal class so cards do not animate with the lines.
- [ ] Run `node --test BFP/tests/*.test.mjs` and confirm zero failures.

### Task 3: Browser Verification

**Files:**
- Verify: `BFP/.artifacts/verified/desktop-about.png`
- Verify: `BFP/.artifacts/verified/tablet-about.png`
- Verify: `BFP/.artifacts/verified/mobile-about.png`

- [ ] Run the existing server and capture workflow.
- [ ] Inspect desktop, tablet, and mobile role-section images.
- [ ] Confirm connector alignment, readable logo and icons, mobile stacking, and no overflow.
- [ ] Run the full test suite once more before completion.

