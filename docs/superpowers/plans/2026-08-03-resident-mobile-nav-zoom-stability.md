# Resident Mobile Navigation Zoom Stability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep the existing resident mobile bottom navigation inside the visible phone width during browser zoom without changing its visual design.

**Architecture:** Strengthen the existing CSS media-query rules instead of adding JavaScript or disabling zoom. The fixed bar will use horizontal insets and flexible one-fifth tracks so its current icons, labels, and center action can shrink within narrow visual widths.

**Tech Stack:** Next.js 16, TypeScript, CSS stored in a content module, Node test runner

## Global Constraints

- Apply the fix only to the resident mobile bottom navigation styles.
- Preserve browser zoom and pinch-to-zoom support.
- Preserve the current colors, spacing, icons, labels, center report-fire button, and desktop layout.
- Avoid JavaScript viewport listeners and avoid changing page content.

---

### Task 1: Contain The Resident Mobile Navigation

**Files:**
- Modify: `mainfile/alab-system/app/_content/resident-home-content.ts:652`
- Modify: `mainfile/alab-system/tests/resident-placeholder-pages.test.mjs`

**Interfaces:**
- Consumes: Existing `.dashboard-page-root`, `.mobile-bottom-nav`, `.mobile-nav-item`, and `.mobile-nav-fab-wrapper` CSS selectors.
- Produces: A mobile navigation bar constrained to the viewport with five shrinkable layout tracks.

- [ ] **Step 1: Write the failing regression test**

Add this test to `mainfile/alab-system/tests/resident-placeholder-pages.test.mjs`:

```js
test("resident mobile navigation remains inside narrow zoomed viewports", () => {
  const source = readFileSync(
    join(root, "app", "_content", "resident-home-content.ts"),
    "utf8",
  );

  assert.match(source, /\.dashboard-page-root\s*\{[\s\S]*?overflow-x:\s*clip/);
  assert.match(
    source,
    /\.mobile-bottom-nav\s*\{[\s\S]*?left:\s*0;[\s\S]*?right:\s*0;[\s\S]*?width:\s*auto;[\s\S]*?max-width:\s*100vw/,
  );
  assert.match(
    source,
    /\.mobile-nav-item\s*\{[\s\S]*?flex:\s*1 1 0;[\s\S]*?min-width:\s*0/,
  );
  assert.match(
    source,
    /\.mobile-nav-fab-wrapper\s*\{[\s\S]*?flex:\s*1 1 0;[\s\S]*?min-width:\s*0/,
  );
});
```

- [ ] **Step 2: Run the regression test and verify it fails**

Run:

```powershell
node --test tests/resident-placeholder-pages.test.mjs
```

Expected: FAIL because the current bar uses `width: 100%`, fixed 20 percent tracks, and has no horizontal overflow containment.

- [ ] **Step 3: Apply the minimal CSS containment fix**

In the existing mobile media query in `resident-home-content.ts`, preserve all visual declarations and make these sizing changes:

```css
.dashboard-page-root {
    background-color: var(--card-bg);
    padding-bottom: 5rem;
    overflow-x: clip;
}

.mobile-bottom-nav {
    display: flex;
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    width: auto;
    max-width: 100vw;
    background: white;
    border-top: 1px solid var(--border-color);
    padding: 0.8rem 1rem calc(1.4rem + env(safe-area-inset-bottom, 0px));
    justify-content: space-between;
    align-items: flex-end;
    overflow: visible;
    z-index: 100;
}

.mobile-nav-item {
    flex: 1 1 0;
    min-width: 0;
    width: auto;
}

.mobile-nav-fab-wrapper {
    flex: 1 1 0;
    min-width: 0;
    width: auto;
}
```

- [ ] **Step 4: Run focused and complete verification**

Run:

```powershell
node --test tests/resident-placeholder-pages.test.mjs
npm test
$env:DATABASE_URL='postgresql://user:pass@localhost:5432/alab'; npm run build
```

Expected: The focused tests pass, all project tests pass, and Next.js generates `/resident` plus all resident child routes.

- [ ] **Step 5: Commit, push, and deploy**

Run from the repository worktree root:

```powershell
git add mainfile/alab-system/app/_content/resident-home-content.ts mainfile/alab-system/tests/resident-placeholder-pages.test.mjs
git commit -m "fix: contain resident mobile navigation"
git push origin HEAD:main
npx -y @railway/cli@latest up --detach --json --yes --service alab-fire-responses --environment production --message "fix resident mobile navigation zoom"
```

Poll the returned deployment ID until Railway reports `SUCCESS`, then request `/resident` and all resident child routes from the public Railway domain and require HTTP 200 responses.

