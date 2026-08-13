# Resident Accent Red Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the resident dashboard hover-red `#B8150C` with `#DB1B0D` without changing any behavior or layout.

**Architecture:** The resident home stylesheet owns the only resident-side instance of the requested legacy color. A source-level regression test protects the exact palette replacement; no components, routes, database queries, or markup need to change.

**Tech Stack:** Next.js, TypeScript, Node.js test runner.

## Global Constraints

- Change only `#b8150c` in resident-side source to `#DB1B0D`.
- Do not alter layout, content, interactions, or non-resident styles.

---

### Task 1: Replace the resident hover-red token

**Files:**
- Modify: `app/_content/resident-home-content.ts:4`
- Test: `tests/resident-home-mobile.test.mjs`

**Interfaces:**
- Consumes: resident home style token `--primary-red-hover`.
- Produces: the same CSS variable with the approved `#DB1B0D` value.

- [ ] **Step 1: Write the failing test**

```js
const home = source("app/_content/resident-home-content.ts");
assert.match(home, /--primary-red-hover:\s*#DB1B0D;/i);
assert.doesNotMatch(home, /#b8150c/i);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/resident-home-mobile.test.mjs`

Expected: FAIL because the legacy `#b8150c` token is still present.

- [ ] **Step 3: Write minimal implementation**

```css
--primary-red-hover: #DB1B0D;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/resident-home-mobile.test.mjs`

Expected: PASS.

- [ ] **Step 5: Verify and commit**

Run: `npm test && npm run build && git diff --check`

Commit:

```bash
git add app/_content/resident-home-content.ts tests/resident-home-mobile.test.mjs
git commit -m "style: update resident accent red"
```
