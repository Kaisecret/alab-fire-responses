# Resident Reports Desktop Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Center the resident reports workspace on desktop without changing the mobile reports experience.

**Architecture:** Keep the existing report data and JSX structure. Add a source-level regression assertion and desktop-only CSS in `app/resident/reports/page.tsx`; it overrides the legacy two-column container with one responsive centered column above the existing 950px mobile breakpoint.

**Tech Stack:** Next.js 16, React 19, inline CSS, Node.js built-in test runner.

## Global Constraints

- Apply the new layout only at `min-width: 951px`.
- Do not alter markup, data fetching, filters, report links, or status summaries.
- Do not alter any rule inside the existing `max-width: 950px` mobile media query.

---

### Task 1: Protect the desktop-only layout contract

**Files:**

- Modify: `tests/resident-report-ui-integration.test.mjs`
- Test: `tests/resident-report-ui-integration.test.mjs`

**Interfaces:**

- Consumes: `app/resident/reports/page.tsx` inline `liveReportsStyles` string.
- Produces: regression coverage requiring the desktop media query and a one-column centered reports container.

- [ ] **Step 1: Write the failing test**

Add this test after the existing resident reports integration test:

```js
test("resident reports center the full workspace on desktop without changing mobile rules", () => {
  const reportsPage = read("app/resident/reports/page.tsx");

  assert.match(reportsPage, /@media \(min-width: 951px\)/);
  assert.match(reportsPage, /\.reports-main-layout \{ max-width: 1200px; margin: 0 auto; grid-template-columns: minmax\(0, 1fr\); \}/);
  assert.match(reportsPage, /@media \(max-width: 950px\)/);
});
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `node --test tests/resident-report-ui-integration.test.mjs`

Expected: FAIL because `page.tsx` lacks `@media (min-width: 951px)` and the centered one-column layout rule.

### Task 2: Center the desktop reports workspace

**Files:**

- Modify: `app/resident/reports/page.tsx:12-33`
- Test: `tests/resident-report-ui-integration.test.mjs`

**Interfaces:**

- Consumes: `.reports-main-layout` from `reportsStyles` and existing `max-width: 950px` mobile overrides.
- Produces: a desktop-only 1200px maximum-width single-column workspace.

- [ ] **Step 1: Add the minimal desktop-only CSS override**

Insert this block in `liveReportsStyles` before the existing `@media (max-width: 950px)` block:

```css
  @media (min-width: 951px) {
    .reports-main-layout { max-width: 1200px; margin: 0 auto; grid-template-columns: minmax(0, 1fr); }
  }
```

- [ ] **Step 2: Run the focused test to verify it passes**

Run: `node --test tests/resident-report-ui-integration.test.mjs`

Expected: PASS with the desktop layout regression test included.

- [ ] **Step 3: Run the full project test suite**

Run: `npm test`

Expected: PASS with no failed Node test files.

- [ ] **Step 4: Run lint**

Run: `npm run lint`

Expected: exit code 0.
