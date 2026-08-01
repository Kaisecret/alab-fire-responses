# ALAB Mobile First-Viewport Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring the mobile hero actions into the initial viewport by further compressing copy, artwork, trust, and action spacing.

**Architecture:** Adjust the main `max-width: 640px` rules and add a `max-height: 750px` adaptive breakpoint. Preserve all larger breakpoints and existing markup.

**Tech Stack:** Next.js 16, TypeScript, CSS media queries, Node test runner

## Global Constraints

- Mobile-only changes.
- Keep CTA labels and usable tap targets.
- Preserve desktop and tablet.
- Keep visual order: copy, artwork, trust, actions.

---

### Task 1: Fit mobile actions into the first viewport

**Files:**
- Modify: `mainfile/alab-system/tests/migration.test.mjs`
- Modify: `mainfile/alab-system/app/_content/landing-mobile-styles.ts`

**Interfaces:**
- Consumes: Existing mobile hero CSS.
- Produces: Standard compact and short-height compact phone layouts.

- [ ] **Step 1: Add failing assertions**

```js
assert.match(mobileStyles, /@media \(max-width: 640px\) and \(max-height: 750px\)/);
assert.match(
  mobileStyles,
  /\.hero__visual\s*\{[\s\S]*?min-height:\s*clamp\(12\.5rem,\s*52vw,\s*18rem\)/,
);
assert.match(
  mobileStyles,
  /\.hero__actions \.button\s*\{[\s\S]*?min-height:\s*3\.1rem/,
);
```

- [ ] **Step 2: Verify RED**

Run `npm test -- tests/migration.test.mjs`.

Expected: FAIL because the short-height breakpoint and compact measurements do not exist.

- [ ] **Step 3: Apply standard mobile compaction**

Update the `max-width: 640px` rules:

```css
.eyebrow { margin: clamp(2rem, 7vw, 2.75rem) 0 0.75rem; }
.hero h1 { font-size: clamp(1.75rem, 7.3vw, 2.8rem); }
.hero__rule { margin: 1rem 0 0.8rem; }
.hero__copy { font-size: clamp(0.88rem, 3.7vw, 1.02rem); line-height: 1.42; }
.hero__visual {
  min-height: clamp(12.5rem, 52vw, 18rem);
  margin-top: 0.45rem;
}
.phone { top: 0; width: clamp(9.5rem, 42vw, 16rem); }
.firefighter { top: 1.4rem; width: clamp(11rem, 48vw, 18rem); }
.hero__trust { margin-top: -2.2rem; padding-block: 0.7rem; }
.hero__actions { margin-top: 0.8rem; gap: 0.55rem; }
.hero__actions .button { min-height: 3.1rem; }
```

- [ ] **Step 4: Add short-height compaction**

```css
@media (max-width: 640px) and (max-height: 750px) {
  .eyebrow { margin-top: 1.35rem; }
  .hero h1 { font-size: clamp(1.58rem, 6.8vw, 2.15rem); }
  .hero__rule { margin-block: 0.75rem 0.65rem; }
  .hero__copy { font-size: 0.84rem; line-height: 1.35; }
  .hero__visual { min-height: 11.25rem; }
  .phone { width: 8.75rem; }
  .firefighter { top: 1rem; width: 10.25rem; }
  .hero__trust { margin-top: -1.75rem; padding-block: 0.5rem; }
  .hero__actions { margin-top: 0.6rem; }
  .hero__actions .button { min-height: 2.85rem; }
}
```

- [ ] **Step 5: Verify and commit**

Run:

```powershell
npm test
npm run lint
npm run build
```

Then commit:

```powershell
git add -- mainfile/alab-system/tests/migration.test.mjs mainfile/alab-system/app/_content/landing-mobile-styles.ts
git commit -m "fix: fit mobile actions in first viewport"
```
