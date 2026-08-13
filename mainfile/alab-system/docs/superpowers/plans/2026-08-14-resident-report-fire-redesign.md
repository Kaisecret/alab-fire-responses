# Resident Report Fire Form Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a focused, polished desktop and mobile report-fire form without changing its live location and reporting behavior.

**Architecture:** Keep `ResidentReportFirePage` and its location controller unchanged. Replace the presentation exported from `resident-report-fire-content.ts` while preserving every existing location and landmark data attribute consumed by `initializeLocationLogic`. Add only optional, presentational form controls in the markup.

**Tech Stack:** Next.js App Router, React client component, TypeScript, inline SVG, CSS template strings, Leaflet, Node test runner.

## Global Constraints

- Preserve `data-location-*`, `data-nearest-landmark`, and `data-landmark-*` hooks used by `app/resident/report-fire/page.tsx`.
- Do not add sidebar, navigation, account, assistance, safety, or incident side panels to this page.
- Use ALAB red `#DB1B0D`, warm white, deep navy, and soft pink accents.
- Keep Reason optional with exactly: Electrical malfunction, Cooking accident, Open flame or cigarette, Unknown / Other.
- Do not alter database, API, auth, or geolocation behavior.

---

### Task 1: Lock down focused form and responsive design hooks

**Files:**
- Modify: `tests/resident-report-location.test.mjs`
- Modify: `app/_content/resident-report-fire-content.ts`

**Interfaces:**
- Consumes: Current markup hooks queried by `initializeLocationLogic` in `app/resident/report-fire/page.tsx`.
- Produces: Regression coverage for the focused report-only UI, optional reason control, and mobile layout classes.

- [ ] **Step 1: Write the failing test**

Add this test after the existing report-fire tests:

```js
test("resident fire report renders a focused responsive emergency form", () => {
  const content = readFileSync(join(root, "app", "_content", "resident-report-fire-content.ts"), "utf8");

  assert.match(content, /report-form-shell/);
  assert.match(content, /data-report-reason/);
  assert.match(content, /Electrical malfunction/);
  assert.match(content, /Cooking accident/);
  assert.match(content, /Open flame or cigarette/);
  assert.match(content, /Unknown \/ Other/);
  assert.match(content, /@media \(max-width: 950px\)[\s\S]*\.report-form-shell/);
  assert.doesNotMatch(content, /class="left-col"/);
  assert.doesNotMatch(content, /class="right-col"/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/resident-report-location.test.mjs`

Expected: FAIL because `report-form-shell` and `data-report-reason` do not exist.

- [ ] **Step 3: Implement the report-only visual structure**

In `reportFireMarkup`, replace the outer three-column layout with this form shell while retaining the existing location/landmark internals and selectors:

```html
<main class="report-form-shell">
  <header class="report-form-heading">
    <span class="report-eyebrow">ALAB EMERGENCY RESPONSE</span>
    <h1>Report a Fire Incident</h1>
    <p>Share the clearest details you can so responders can act faster.</p>
  </header>
  <section class="warning-banner">…existing fire safety content…</section>
  <section class="two-col-grid">…existing location and landmark controls…</section>
  <section class="report-detail-grid">
    <label class="reason-field">…<select data-report-reason>…four optional reasons…</select></label>
    …existing description and photo controls…
  </section>
  <footer class="form-footer">…existing send and cancel controls…</footer>
</main>
```

In `reportFireStyles`, define the `report-form-shell`, `report-form-heading`, `report-detail-grid`, `reason-field`, and focused mobile rules. Retain `.location-box[data-location-card]`, `.map-preview[data-location-map-surface]`, landmark state selectors, and the mobile map-height rules already protected by the location tests.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/resident-report-location.test.mjs`

Expected: PASS with all report-location subtests green.

- [ ] **Step 5: Commit**

```bash
git add tests/resident-report-location.test.mjs app/_content/resident-report-fire-content.ts
git commit -m "feat: redesign resident fire report form"
```

### Task 2: Verify behavior-preserving responsive presentation

**Files:**
- Modify: `app/_content/resident-report-fire-content.ts` only if verification reveals a presentation issue.
- Test: `tests/resident-report-location.test.mjs`

**Interfaces:**
- Consumes: Existing Leaflet target and location/landmark selectors.
- Produces: A desktop two-column form and single-column mobile form whose controls remain usable.

- [ ] **Step 1: Start the app and inspect the desktop form**

Run: `npm run dev`

Open: `http://localhost:3000/resident/report-fire`

Expected: A centered form-only card with emergency banner, side-by-side location and landmark cards, icon-led fire type cards, optional reason/select/description/photo controls, and send/cancel actions.

- [ ] **Step 2: Inspect the mobile form at 390px width**

Use browser responsive emulation at 390px wide on the same route.

Expected: A single column, full-width map, readable state banner, touch-friendly buttons, and no horizontal page overflow.

- [ ] **Step 3: Verify preserved location hooks**

Run: `node --test tests/resident-report-location.test.mjs`

Expected: PASS, including the checks for GPS watch, map surface, overlay sibling, map height, landmark hooks, and mobile navigation space.

- [ ] **Step 4: Run project verification**

Run: `npm test && npm run build`

Expected: All tests pass and the Next.js production build completes.

- [ ] **Step 5: Commit verification-only fixes if needed**

```bash
git add app/_content/resident-report-fire-content.ts tests/resident-report-location.test.mjs
git commit -m "fix: polish responsive fire report form"
```
