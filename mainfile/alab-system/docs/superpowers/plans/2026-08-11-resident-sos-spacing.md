# Resident SOS Spacing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Place the mobile resident SOS action below the welcome card with a consistent 1.5rem gap and no visual overlap.

**Architecture:** The mobile CSS in `resident-home-content.ts` controls the welcome card and SOS area. Preserve the shared resident header's higher stacking context in `app/resident/layout.tsx`, remove the card/SOS overlap through the wrapper margin, and update the mobile regression test.

**Tech Stack:** Next.js 16, React 19, CSS embedded in TypeScript content modules, Node.js test runner.

## Global Constraints

- Change mobile (`max-width: 950px`) styling only.
- Keep the SOS link target as `/resident/report-fire`.
- Keep the shared mobile header at `z-index: 200`.
- Do not push or deploy this work.

---

### Task 1: Separate the mobile SOS action from the welcome card

**Files:**

- Modify: `app/_content/resident-home-content.ts:526-580`
- Test: `tests/resident-home-mobile.test.mjs`

**Interfaces:**

- Consumes: `.welcome-card`, `.mobile-emergency-wrapper`, and `.mobile-emergency-btn` CSS selectors.
- Produces: A mobile SOS wrapper below the welcome card with `margin: 1.5rem 0 0.75rem`.

- [ ] **Step 1: Write the failing test**

Add this assertion to `tests/resident-home-mobile.test.mjs`:

```js
assert.match(source, /\.mobile-emergency-wrapper\s*\{[\s\S]*?margin:\s*1\.5rem 0 0\.75rem;/);
```

- [ ] **Step 2: Run test to verify it fails**

Run `node --test tests/resident-home-mobile.test.mjs`. Expected: the spacing assertion fails because the wrapper has a negative top margin.

- [ ] **Step 3: Write minimal implementation**

Set the mobile wrapper margin in `app/_content/resident-home-content.ts` to:

```css
.mobile-emergency-wrapper {
    margin: 1.5rem 0 0.75rem;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run `node --test tests/resident-home-mobile.test.mjs`. Expected: all resident mobile-home tests pass.

- [ ] **Step 5: Verify the application build**

Run `npm run build`. Expected: Next.js finishes with a successful production build.

- [ ] **Step 6: Commit local implementation changes only**

Run `git add -- app/_content/resident-home-content.ts tests/resident-home-mobile.test.mjs` then `git commit -m "fix: separate mobile SOS action from welcome card"`. Expected: only the SOS CSS and regression test are committed locally; no push follows.
