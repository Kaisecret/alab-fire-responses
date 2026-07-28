# ALAB Hero Trust Strip Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the reference-matched `24/7 Monitoring`, `18 Municipalities`, and `Real-time GIS Alerts` proof row beneath the ALAB hero actions.

**Architecture:** Extend the existing static hero with one semantic list and scoped CSS in `BFP/index.html`. Reuse the existing design tokens, inline-SVG convention, responsive breakpoints, and hero entrance animation rather than adding dependencies or JavaScript.

**Tech Stack:** Semantic HTML5, CSS, inline SVG, Node.js built-in test runner

## Global Constraints

- Do not change the existing header, headline, hero buttons, phone/firefighter artwork, or lower landing-page sections.
- Use exactly `24/7 Monitoring`, `18 Municipalities`, and `Real-time GIS Alerts`.
- Keep the row horizontal on desktop and compact on mobile.
- Preserve accessible text, decorative SVG treatment, reduced-motion behavior, and overflow protection.

---

### Task 1: Trust Strip Contract

**Files:**
- Modify: `BFP/tests/hero.test.mjs`
- Test: `BFP/tests/hero.test.mjs`

**Interfaces:**
- Consumes: the current `BFP/index.html` source string.
- Produces: a regression contract for `.hero__trust`, its three items, icons, dividers, and responsive layout.

- [ ] **Step 1: Write the failing test**

```js
test('adds the three reference proof points beneath the hero actions', () => {
  for (const copy of ['24/7', 'Monitoring', '18', 'Municipalities', 'Real-time', 'GIS Alerts']) {
    assert.match(html, new RegExp(`>${copy.replace('/', '\\/')}<`));
  }
  assert.match(html, /class=["']hero__trust["']/);
  assert.equal((html.match(/class=["']hero__trust-icon["']/g) ?? []).length, 3);
  assert.match(html, /\.hero__trust-item\s*\+\s*\.hero__trust-item::before/);
  assert.match(html, /@media\s*\(max-width:\s*640px\)[\s\S]*?\.hero__trust\s*\{[^}]*grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\)/);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test BFP/tests/hero.test.mjs`

Expected: FAIL because `.hero__trust` is not present.

### Task 2: Semantic Proof Row and Responsive Styling

**Files:**
- Modify: `BFP/index.html`
- Test: `BFP/tests/hero.test.mjs`

**Interfaces:**
- Consumes: existing `.hero__actions`, `--red`, `--ink`, `--muted`, and existing media breakpoints.
- Produces: `.hero__trust`, `.hero__trust-item`, `.hero__trust-icon`, `.hero__trust-text`, `.hero__trust-value`, and `.hero__trust-label`.

- [ ] **Step 1: Add the semantic markup after `.hero__actions`**

Add a `<ul class="hero__trust" aria-label="Service coverage highlights">` containing three `<li class="hero__trust-item">` elements. Each item contains one decorative inline SVG and a two-line text group with the exact approved copy.

- [ ] **Step 2: Add the desktop styling**

Create a horizontal, unboxed row with circular red icon outlines, dark values, muted labels, and thin vertical separators. Use `margin-top: clamp(2.5rem, 5vh, 3.5rem)` and keep the strip within the content column.

- [ ] **Step 3: Add responsive styling**

At 1180px, reduce spacing and type sizes. At 640px, use `grid-template-columns: repeat(3, minmax(0, 1fr))`, smaller circular icons, and compact two-line labels.

- [ ] **Step 4: Include the strip in the entrance sequence**

Add a sixth `.hero__content` child delay so the strip appears after the action buttons while inheriting the existing reduced-motion behavior.

- [ ] **Step 5: Run the focused and full test suites**

Run:

```powershell
node --test BFP/tests/hero.test.mjs
node --test BFP/tests/*.test.mjs
```

Expected: all tests pass with zero failures.

### Task 3: Visual Verification

**Files:**
- Verify: `BFP/index.html`
- Use: `BFP/.artifacts/capture-sections.mjs`

**Interfaces:**
- Consumes: the completed static landing page.
- Produces: desktop, tablet, and mobile screenshots plus overflow/browser-error checks.

- [ ] **Step 1: Serve the page and capture all target viewports**

Run the local HTTP server, headless browser, and `node BFP/.artifacts/capture-sections.mjs`.

- [ ] **Step 2: Inspect hero captures**

Inspect `desktop-home.png`, `tablet-home.png`, and `mobile-home.png`. Confirm the strip matches the reference hierarchy, stays below the buttons, and does not overlap the main imagery.

- [ ] **Step 3: Run final verification**

Run: `node --test BFP/tests/*.test.mjs`

Expected: all tests pass with zero failures and browser capture reports no horizontal overflow or duplicate IDs.

