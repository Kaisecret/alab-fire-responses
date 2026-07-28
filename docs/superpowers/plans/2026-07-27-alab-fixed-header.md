# ALAB Compact Fixed Header Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce the ALAB logo and header footprint while keeping navigation fixed, readable, and user-friendly during scrolling.

**Architecture:** Update the existing header tokens and responsive overrides in `BFP/index.html`, add a scoped `is-scrolled` presentation state, and extend the existing enhancement script to synchronize that state with `window.scrollY`. Update the hero contract tests before implementation.

**Tech Stack:** HTML5, CSS3, vanilla JavaScript, Node.js built-in test runner, headless Chrome.

## Global Constraints

- Preserve all navigation labels, destinations, Login styling, hero content, and lower-page sections.
- Use `--header-h: 5.5rem` and `--brand-width: clamp(7.75rem, 9vw, 9.5rem)` on desktop.
- Use `--header-h: 4.9rem` and a maximum 7rem logo width at 640px and below.
- Keep the complete ALAB logo visible.
- Keep the mobile navigation behavior and accessibility contract intact.
- Add fixed-header anchor clearance and reduced-motion-compatible transitions.
- The workspace is not a Git repository, so commit steps are omitted.

---

### Task 1: Compact Header Contract

**Files:**
- Modify: `BFP/tests/hero.test.mjs`
- Modify: `BFP/index.html`

- [ ] Update the existing size assertions and add a test for fixed positioning, `is-scrolled`, scroll padding, and the passive scroll listener.
- [ ] Run `node --test BFP/tests/hero.test.mjs` and confirm failure against the current large absolute header.
- [ ] Change the desktop, tablet, and mobile header/logo tokens and brand heights.
- [ ] Add the fixed warm surface and scrolled shadow/blur state.
- [ ] Run the hero tests and confirm all pass.

### Task 2: Scroll-State Enhancement

**Files:**
- Modify: `BFP/index.html`
- Test: `BFP/tests/hero.test.mjs`

- [ ] Add `syncHeaderState()` to toggle `is-scrolled` when `window.scrollY > 24`.
- [ ] Call it once on page load and on a passive scroll listener.
- [ ] Preserve the existing menu script and lower-page observer.
- [ ] Run `node --test BFP/tests/*.test.mjs` and confirm zero failures.

### Task 3: Responsive Browser Verification

**Files:**
- Verify: `BFP/index.html`

- [ ] Render the page at 1680px, 768px, and 390px.
- [ ] Confirm the smaller logo, fixed header, scrolled state, anchor clearance, mobile menu placement, and absence of horizontal overflow.
- [ ] Confirm no console or missing-resource errors.
- [ ] Run the complete test suite one final time.

