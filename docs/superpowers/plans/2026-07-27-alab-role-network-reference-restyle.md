# ALAB Role Network Reference Restyle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Match the supplied role-network reference with larger rounded cards, prominent icons, a glowing logo core, compact connectors, and static endpoint nodes.

**Architecture:** Keep the current semantic markup and grid placement, then adjust the scoped access-system CSS and connector SVG. Add source-level tests before implementation and use the existing orbit-specific screenshot capture for visual verification.

**Tech Stack:** HTML5, CSS Grid, CSS keyframes, inline SVG, Node.js built-in tests, headless Chrome

## Global Constraints

- Preserve all role names and descriptions.
- Continue using `images/Logo.png`.
- Animate only `.access-link`.
- Keep mobile connectors hidden.

---

### Task 1: Reference Styling Contract

**Files:**
- Modify: `BFP/tests/landing.test.mjs`

- [ ] Add failing assertions for the `47rem` orbit, `25rem` cards, `1.25rem` corners, `4.6rem` icons, `17.5rem` core, card dividers, glow, and ten `.access-node` circles.
- [ ] Run `node --test BFP/tests/landing.test.mjs` and confirm failure against the smaller existing styles.

### Task 2: Restyle the Network

**Files:**
- Modify: `BFP/index.html`

- [ ] Update the base orbit grid, core, card, typography, icon, and divider styling.
- [ ] Replace the connector path geometry and add ten static endpoint circles.
- [ ] Add 1100px and 640px overrides to preserve the tablet and mobile layouts.
- [ ] Run `node --test BFP/tests/*.test.mjs` and confirm zero failures.

### Task 3: Verify the Render

**Files:**
- Verify: `BFP/.artifacts/verified/desktop-access-orbit.png`
- Verify: `BFP/.artifacts/verified/tablet-access-orbit.png`
- Verify: `BFP/.artifacts/verified/mobile-access-orbit.png`

- [ ] Run the existing local-server and capture workflow.
- [ ] Inspect all three orbit screenshots for reference fidelity and spacing.
- [ ] Run the full test suite once more before completion.

