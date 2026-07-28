# ALAB Mobile Scale Refinement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the phone hero header more compact, lower the opening copy slightly, and reduce/lower the phone and BFP artwork.

**Architecture:** Modify only the existing `max-width: 640px` and `max-width: 370px` rules in the isolated mobile stylesheet. Extend the existing static regression test with exact measurement contracts before changing production CSS.

**Tech Stack:** Next.js 16, TypeScript, CSS media queries, Node test runner

## Global Constraints

- Apply changes only at `640px` and below.
- Preserve the existing content order, links, imagery, scene height, trust strip, and CTA styling.
- Keep tablet and desktop unchanged.
- Support widths from `320px` through `640px`.

---

### Task 1: Refine mobile header and artwork scale

**Files:**
- Modify: `mainfile/alab-system/tests/migration.test.mjs`
- Modify: `mainfile/alab-system/app/_content/landing-mobile-styles.ts`

**Interfaces:**
- Consumes: Existing `landingMobileStyles` CSS string.
- Produces: Updated phone-only header, content-offset, phone, and firefighter measurements.

- [ ] **Step 1: Write the failing regression assertions**

Add these assertions to `landing hero has a mobile-only reference composition`:

```js
assert.match(mobileStyles, /--header-h:\s*4\.4rem/);
assert.match(
  mobileStyles,
  /\.eyebrow\s*\{[\s\S]*?margin:\s*clamp\(3rem,\s*11vw,\s*4rem\)/,
);
assert.match(
  mobileStyles,
  /\.phone\s*\{[\s\S]*?bottom:\s*-2\.6rem[\s\S]*?width:\s*clamp\(16rem,\s*60vw,\s*24rem\)/,
);
assert.match(
  mobileStyles,
  /\.firefighter\s*\{[\s\S]*?bottom:\s*-1\.8rem[\s\S]*?width:\s*clamp\(17\.5rem,\s*66vw,\s*25rem\)/,
);
```

- [ ] **Step 2: Verify RED**

Run:

```powershell
npm test -- tests/migration.test.mjs
```

Expected: FAIL because the current header is `4.9rem` and the current artwork is larger.

- [ ] **Step 3: Apply the approved CSS values**

Inside `@media (max-width: 640px)`, add or update:

```css
:root { --header-h: 4.4rem; }
.brand { width: clamp(5.9rem, 25vw, 6.8rem); height: 3.2rem; }
.login-button {
  min-width: 5.1rem;
  min-height: 2.5rem;
  padding: 0.5rem 0.7rem;
}
.menu-toggle { width: 2.5rem; height: 2.5rem; }
.eyebrow { margin: clamp(3rem, 11vw, 4rem) 0 1rem; }
.phone {
  bottom: -2.6rem;
  left: clamp(-3.2rem, -8vw, -1.8rem);
  width: clamp(16rem, 60vw, 24rem);
}
.firefighter {
  right: clamp(-5.8rem, -13vw, -3.4rem);
  bottom: -1.8rem;
  width: clamp(17.5rem, 66vw, 25rem);
}
```

Inside `@media (max-width: 370px)`, update:

```css
.brand { width: 5.65rem; height: 3rem; }
.login-button { min-width: 4.6rem; }
.menu-toggle { width: 2.35rem; height: 2.35rem; }
.phone { bottom: -2.2rem; left: -2.7rem; width: 15.75rem; }
.firefighter { right: -4.8rem; bottom: -1.6rem; width: 17.25rem; }
```

- [ ] **Step 4: Verify GREEN and quality**

Run:

```powershell
npm test
npm run lint
npm run build
```

Expected: tests, lint, and production build all exit successfully.

- [ ] **Step 5: Commit**

```powershell
git add -- mainfile/alab-system/tests/migration.test.mjs mainfile/alab-system/app/_content/landing-mobile-styles.ts
git commit -m "fix: refine mobile hero scale"
```
