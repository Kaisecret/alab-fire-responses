# Municipal BFP Mobile Drawer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Municipal BFP phone icon rail with an accessible off-canvas navigation drawer and make the dashboard content fit narrow screens without changing desktop behavior.

**Architecture:** Keep the behavior in the existing shared `MunicipalBfpLayout` client component. Add one mobile drawer state, an overlay, and mobile-only CSS rules; keep the current desktop sidebar and header declarations as the base styles. Add narrow-screen dashboard rules in `MunicipalBfpDashboard` and verify the contract with a static source test matching the repository's existing test style.

**Tech Stack:** Next.js App Router, React client state/effects, inline component CSS, Node.js built-in test runner.

## Global Constraints

- Mobile breakpoint is `max-width: 768px`.
- Desktop layout and styling must remain unchanged.
- No new npm dependencies.
- Use the existing ALAB red, neutral surfaces, Font Awesome icons, and municipal BFP class naming.
- Keep the incident table readable through contained horizontal scrolling rather than page-level overflow.

---

### Task 1: Add the failing mobile drawer contract test

**Files:**
- Create: `mainfile/alab-system/tests/municipal-bfp-mobile.test.mjs`
- Read: `mainfile/alab-system/app/_components/municipal-bfp-layout.tsx`

**Interfaces:**
- Consumes: the shared layout source as text.
- Produces: assertions for the drawer trigger, close paths, and mobile layout rules.

- [ ] **Step 1: Write the failing test**

Create two tests that assert the layout source contains the mobile menu state, an `aria-expanded` trigger with `aria-controls`, a close button, an overlay, link close handlers, and mobile rules for off-canvas transform plus full-width content.

- [ ] **Step 2: Run the test to verify it fails**

Run from `mainfile/alab-system`:

```powershell
node --test tests/municipal-bfp-mobile.test.mjs
```

Expected result: FAIL because the current layout still uses a permanent 60px icon rail and has no drawer trigger or backdrop.

### Task 2: Implement shared mobile drawer behavior

**Files:**
- Modify: `mainfile/alab-system/app/_components/municipal-bfp-layout.tsx`

**Interfaces:**
- Consumes: `usePathname`, `useState`, existing `sidebarNav`, and existing profile dropdown state.
- Produces: mobile-only drawer trigger, drawer close button, backdrop, and responsive CSS.

- [ ] **Step 1: Add the minimal React state and effects**

Import `useEffect`, add `isMobileNavOpen`, and close the drawer on Escape while open. Navigation links close it through the shared `closeMobileNav` handler.

- [ ] **Step 2: Add the drawer controls**

Add the menu button to the header, add a close button inside the sidebar, give the sidebar an `id`, add the backdrop after the sidebar, and close the drawer from each navigation link.

- [ ] **Step 3: Add mobile-only CSS**

At `max-width: 768px`, translate the sidebar off canvas by default, reveal `.mobile-open`, show the backdrop only when `.visible`, set the main area to `margin-left: 0` and `width: 100%`, and keep touch targets at least 44px. Hide only the desktop-only location, search, and long title elements on mobile.

- [ ] **Step 4: Run the focused test to verify it passes**

Run:

```powershell
node --test tests/municipal-bfp-mobile.test.mjs tests/municipal-gis-map.test.mjs
```

Expected result: all tests pass.

### Task 3: Make the dashboard content fit narrow screens

**Files:**
- Modify: `mainfile/alab-system/app/_components/municipal-bfp-dashboard.tsx`

**Interfaces:**
- Consumes: the existing dashboard cards, incident table, quick actions, verification list, resource list, and emergency contact markup.
- Produces: mobile-only rules for compact stats, stacked actions, wrapped content, and contained table scrolling.

- [ ] **Step 1: Add the mobile rules**

Inside the existing `max-width: 768px` block, use two stat columns, one-column quick actions, `min-width: 0` for grid/card content, `overflow-x: auto` on the table body wrapper, and stacked emergency rows with full-width action buttons.

- [ ] **Step 2: Run the focused tests and production build**

Run:

```powershell
node --test tests/municipal-bfp-mobile.test.mjs tests/municipal-gis-map.test.mjs
npm run build
```

Expected result: all focused tests pass and Next.js exits with code 0.

### Task 4: Review and commit the responsive change

**Files:**
- Modify: `docs/superpowers/specs/2026-08-09-municipal-bfp-mobile-drawer-design.md`
- Modify: `docs/superpowers/plans/2026-08-09-municipal-bfp-mobile-drawer.md`
- Modify: `mainfile/alab-system/app/_components/municipal-bfp-layout.tsx`
- Modify: `mainfile/alab-system/app/_components/municipal-bfp-dashboard.tsx`
- Create: `mainfile/alab-system/tests/municipal-bfp-mobile.test.mjs`

- [ ] **Step 1: Check the diff and whitespace**

Run:

```powershell
git diff --check
git diff --stat
git status --short
```

- [ ] **Step 2: Commit the verified change**

```powershell
git add docs/superpowers/specs/2026-08-09-municipal-bfp-mobile-drawer-design.md docs/superpowers/plans/2026-08-09-municipal-bfp-mobile-drawer.md mainfile/alab-system/app/_components/municipal-bfp-layout.tsx mainfile/alab-system/app/_components/municipal-bfp-dashboard.tsx mainfile/alab-system/tests/municipal-bfp-mobile.test.mjs
git commit -m "feat: add mobile municipal BFP navigation drawer"
```
