# ALAB Mobile Scene Compression Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the empty mobile hero gap by shortening the artwork scene and top-aligning smaller phone and firefighter layers.

**Architecture:** Change only the existing mobile stylesheet. Extend the current landing regression test with exact scene geometry before changing CSS.

**Tech Stack:** Next.js 16, TypeScript, CSS media queries, Node test runner

## Global Constraints

- Apply only at `640px` and below.
- Preserve the smoky background, trust strip, CTA order, links, and copy.
- Keep tablet and desktop unchanged.
- Support widths from `320px` through `640px`.

---

### Task 1: Compress and top-align the mobile response scene

**Files:**
- Modify: `mainfile/alab-system/tests/migration.test.mjs`
- Modify: `mainfile/alab-system/app/_content/landing-mobile-styles.ts`

**Interfaces:**
- Consumes: Existing `.hero__visual`, `.phone`, and `.firefighter` mobile rules.
- Produces: A compact top-aligned mobile response scene.

- [ ] **Step 1: Add failing assertions**

```js
assert.match(
  mobileStyles,
  /\.hero__visual\s*\{[\s\S]*?min-height:\s*clamp\(18rem,\s*82vw,\s*27rem\)[\s\S]*?margin:\s*1rem/,
);
assert.match(
  mobileStyles,
  /\.phone\s*\{[\s\S]*?top:\s*0\.5rem[\s\S]*?bottom:\s*auto[\s\S]*?width:\s*clamp\(12rem,\s*50vw,\s*20rem\)/,
);
assert.match(
  mobileStyles,
  /\.firefighter\s*\{[\s\S]*?top:\s*3rem[\s\S]*?bottom:\s*auto[\s\S]*?width:\s*clamp\(13\.5rem,\s*56vw,\s*22rem\)/,
);
```

- [ ] **Step 2: Verify RED**

Run `npm test -- tests/migration.test.mjs`.

Expected: FAIL because the scene still uses bottom-aligned artwork and the taller `118vw` geometry.

- [ ] **Step 3: Apply the mobile geometry**

Inside `@media (max-width: 640px)`:

```css
.hero__visual {
  min-height: clamp(18rem, 82vw, 27rem);
  margin: 1rem calc(var(--page-pad) * -1) 0;
}
.phone {
  top: 0.5rem;
  bottom: auto;
  left: clamp(-2.2rem, -5vw, -1rem);
  width: clamp(12rem, 50vw, 20rem);
}
.firefighter {
  top: 3rem;
  right: clamp(-4rem, -9vw, -2rem);
  bottom: auto;
  width: clamp(13.5rem, 56vw, 22rem);
}
```

Inside `@media (max-width: 370px)`:

```css
.hero__visual { min-height: 17.5rem; }
.phone { top: 0.5rem; bottom: auto; left: -1.5rem; width: 11.5rem; }
.firefighter { top: 3.2rem; right: -2.8rem; bottom: auto; width: 13rem; }
.hero__trust { margin-top: -2.8rem; }
```

- [ ] **Step 4: Verify GREEN and quality**

Run:

```powershell
npm test
npm run lint
npm run build
```

Expected: all commands exit successfully.

- [ ] **Step 5: Commit**

```powershell
git add -- mainfile/alab-system/tests/migration.test.mjs mainfile/alab-system/app/_content/landing-mobile-styles.ts
git commit -m "fix: compact mobile hero artwork"
```
