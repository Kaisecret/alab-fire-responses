# Resident Mobile Browser Theme Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Color supported resident phone and tablet browser chrome with exactly `#DD2213`.

**Architecture:** Extend the existing resident-only Next.js `Viewport` export so the browser receives a media-qualified theme color. Keep the change isolated to the `/resident` route tree and verify the generated metadata without modifying page UI styles.

**Tech Stack:** Next.js 16 App Router, TypeScript, Node test runner

## Global Constraints

- Use exactly `#DD2213`.
- Apply only to `/resident` routes on viewports up to `1024px` wide.
- Do not change desktop browser chrome or in-page resident UI.
- Preserve the existing viewport zoom lock.

---

### Task 1: Add Resident Mobile Browser Theme Metadata

**Files:**
- Modify: `app/resident/layout.tsx`
- Test: `tests/resident-placeholder-pages.test.mjs`

**Interfaces:**
- Consumes: Next.js `Viewport` type and the existing resident nested layout.
- Produces: a media-qualified `themeColor` entry emitted as resident route metadata.

- [ ] **Step 1: Write the failing test**

Add these assertions to the resident viewport test:

```js
assert.match(layout, /themeColor:\s*\[/);
assert.match(layout, /media:\s*"\(max-width: 1024px\)"/);
assert.match(layout, /color:\s*"#DD2213"/);
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run:

```powershell
npx tsx --test --test-name-pattern "resident routes disable" tests/resident-placeholder-pages.test.mjs
```

Expected: FAIL because `themeColor` is absent from `app/resident/layout.tsx`.

- [ ] **Step 3: Add the media-qualified theme color**

Add this property to the resident `viewport` object:

```tsx
themeColor: [
  { media: "(max-width: 1024px)", color: "#DD2213" },
],
```

- [ ] **Step 4: Verify tests and production output**

Run:

```powershell
npm test
npm run build
```

Expected: all tests pass and Next.js completes the production build. Generated resident HTML contains a `theme-color` meta tag with `media="(max-width: 1024px)"` and `content="#DD2213"`.

- [ ] **Step 5: Commit, push, and deploy**

```powershell
git add app/resident/layout.tsx tests/resident-placeholder-pages.test.mjs docs/superpowers/plans/2026-08-03-resident-mobile-browser-theme.md
git commit -m "feat: theme resident mobile browser chrome"
git push origin HEAD:main
```

Expected: Railway automatically deploys the exact pushed commit successfully, and the live resident HTML contains the requested theme-color metadata.
