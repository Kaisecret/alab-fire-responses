# ALAB Mobile Hero Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Recompose the ALAB landing-page hero into a polished reference-inspired phone layout while preserving the current tablet and desktop presentation.

**Architecture:** Keep the existing HTML and desktop stylesheet intact. Add a focused `landing-mobile-styles.ts` stylesheet that overrides only `max-width: 640px`, then append it after the existing landing CSS in `LandingPage` so the mobile rules win without disturbing larger breakpoints.

**Tech Stack:** Next.js 16, React 19, TypeScript, CSS media queries, Node test runner

## Global Constraints

- Apply the redesigned composition only at viewport widths of `640px` and below.
- Reuse the existing project imagery and copy.
- Do not change tablet or desktop layout rules.
- Preserve existing navigation, destinations, accessibility semantics, focus behavior, and reduced-motion behavior.
- Support phone widths from `320px` through `640px` without horizontal scrolling.

---

### Task 1: Add the mobile hero composition

**Files:**
- Create: `mainfile/alab-system/app/_content/landing-mobile-styles.ts`
- Modify: `mainfile/alab-system/app/_components/landing-page.tsx`
- Modify: `mainfile/alab-system/tests/migration.test.mjs`

**Interfaces:**
- Consumes: Existing `.site-header`, `.hero`, `.hero__content`, `.hero__visual`, `.phone`, `.firefighter`, `.hero__trust`, and `.hero__actions` markup from `landingMarkup`.
- Produces: `landingMobileStyles: string`, appended after `landingStyles` in the rendered `<style>` element.

- [ ] **Step 1: Write the failing mobile-layout regression test**

Add a test that verifies the separate stylesheet exists, is imported by `LandingPage`, is restricted to `max-width: 640px`, makes the hero content-driven, uses `display: contents` to reorder the existing markup, moves the scene before the trust strip and actions with explicit `order` rules, scopes the smoky image to `.hero__visual`, and includes the `max-width: 370px` narrow-phone adjustment.

```js
test("landing hero has a mobile-only reference composition", () => {
  const mobileStylesPath = join(
    root,
    "app",
    "_content",
    "landing-mobile-styles.ts",
  );
  const component = readFileSync(
    join(root, "app", "_components", "landing-page.tsx"),
    "utf8",
  );

  assert.equal(existsSync(mobileStylesPath), true);

  const mobileStyles = readFileSync(mobileStylesPath, "utf8");
  assert.match(mobileStyles, /@media \(max-width: 640px\)/);
  assert.match(mobileStyles, /\.hero__content\s*\{[\s\S]*?display:\s*contents/);
  assert.match(mobileStyles, /\.hero__visual\s*\{[\s\S]*?order:\s*5/);
  assert.match(mobileStyles, /\.hero__trust\s*\{[\s\S]*?order:\s*6/);
  assert.match(mobileStyles, /\.hero__actions\s*\{[\s\S]*?order:\s*7/);
  assert.match(mobileStyles, /url\("\/images\/bg images\.png"\)/);
  assert.match(mobileStyles, /@media \(max-width: 370px\)/);
  assert.match(component, /landingMobileStyles/);
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```powershell
npm test -- tests/migration.test.mjs
```

Expected: FAIL because `landing-mobile-styles.ts` does not exist.

- [ ] **Step 3: Implement the mobile-only stylesheet**

Create `landing-mobile-styles.ts` with:

```ts
export const landingMobileStyles = String.raw`
  @media (max-width: 640px) {
    .landing-page-root {
      background: #eeeae6;
    }
    .site-header {
      height: var(--header-h);
      padding-inline: var(--page-pad);
      gap: 0.45rem;
      background: rgb(255 250 245 / 96%);
    }
    .brand {
      width: clamp(6.5rem, 28vw, 7.75rem);
      height: 3.7rem;
    }
    .header-actions { gap: 0.35rem; }
    .login-button {
      min-width: 5.4rem;
      min-height: 2.75rem;
      padding: 0.62rem 0.85rem;
      border-radius: 0.75rem;
      font-size: 0.82rem;
    }
    .menu-toggle {
      width: 2.75rem;
      height: 2.75rem;
      background: transparent;
    }
    .menu-toggle span {
      width: 1.55rem;
      height: 0.14rem;
      background: var(--ink);
    }
    .hero {
      display: grid;
      min-height: auto;
      padding: var(--header-h) var(--page-pad) 1.5rem;
      grid-template-columns: minmax(0, 1fr);
      row-gap: 0;
      background: var(--cream);
    }
    .hero__content { display: contents; }
    .eyebrow {
      order: 1;
      margin: clamp(2.3rem, 9vw, 3.5rem) 0 1rem;
      font-size: clamp(0.72rem, 3.25vw, 0.88rem);
      letter-spacing: 0.025em;
    }
    .hero h1 {
      order: 2;
      max-width: 36rem;
      font-size: clamp(1.95rem, 8.2vw, 3.25rem);
      letter-spacing: -0.035em;
      line-height: 1.08;
      text-wrap: balance;
    }
    .hero h1 span,
    .hero h1 strong { white-space: normal; }
    .hero h1 strong { margin-top: 0.4rem; }
    .hero__rule {
      order: 3;
      width: 8.4rem;
      margin: 1.5rem 0 1.25rem;
    }
    .hero__copy {
      order: 4;
      max-width: 35rem;
      font-size: clamp(0.98rem, 4.15vw, 1.15rem);
      line-height: 1.58;
    }
    .hero__visual {
      order: 5;
      position: relative;
      min-height: clamp(25rem, 118vw, 39rem);
      margin: 1.7rem calc(var(--page-pad) * -1) 0;
      overflow: hidden;
      background-image:
        linear-gradient(
          180deg,
          rgb(255 248 241 / 72%) 0%,
          rgb(255 248 241 / 8%) 22%,
          rgb(92 29 13 / 8%) 100%
        ),
        url("/images/bg images.png");
      background-position: center, 73% center;
      background-size: cover, cover;
      isolation: isolate;
    }
    .hero__visual::after {
      position: absolute;
      z-index: 4;
      right: 0;
      bottom: 0;
      left: 0;
      height: 22%;
      background: linear-gradient(transparent, rgb(74 26 14 / 14%));
      content: "";
      pointer-events: none;
    }
    .phone {
      z-index: 3;
      top: auto;
      bottom: -1.9rem;
      left: clamp(-3.7rem, -9vw, -2rem);
      width: clamp(18rem, 68vw, 27rem);
      filter: drop-shadow(0 1.4rem 1.8rem rgb(46 19 12 / 26%));
    }
    .firefighter {
      z-index: 2;
      right: clamp(-6.4rem, -14vw, -3.8rem);
      bottom: -1rem;
      width: clamp(20rem, 75vw, 29rem);
      filter: drop-shadow(-0.7rem 1rem 1.6rem rgb(46 19 12 / 22%));
    }
    .hero__trust {
      order: 6;
      position: relative;
      z-index: 8;
      width: auto;
      margin: -3.8rem 0 0;
      padding: 0.9rem 0.55rem;
      border: 1px solid rgb(217 27 16 / 8%);
      border-radius: 1rem;
      background: rgb(255 253 250 / 94%);
      box-shadow: 0 1rem 2.5rem rgb(79 34 20 / 15%);
      backdrop-filter: blur(0.8rem);
    }
    .hero__trust-item {
      padding-inline: clamp(0.3rem, 1.7vw, 0.65rem);
      justify-content: center;
      gap: clamp(0.3rem, 1.4vw, 0.55rem);
    }
    .hero__trust-icon {
      width: clamp(2rem, 9vw, 2.75rem);
      height: clamp(2rem, 9vw, 2.75rem);
    }
    .hero__trust-icon svg {
      width: clamp(0.95rem, 4vw, 1.25rem);
      height: clamp(0.95rem, 4vw, 1.25rem);
    }
    .hero__trust-value {
      font-size: clamp(0.66rem, 2.8vw, 0.86rem);
    }
    .hero__trust-label {
      font-size: clamp(0.58rem, 2.55vw, 0.78rem);
    }
    .hero__actions {
      order: 7;
      width: 100%;
      max-width: none;
      margin-top: 1.25rem;
      align-items: stretch;
      flex-direction: column;
      gap: 0.75rem;
    }
    .hero__actions .button {
      width: 100%;
      min-width: 0;
      min-height: 3.65rem;
      border-radius: 0.8rem;
      font-size: clamp(0.76rem, 3.3vw, 0.92rem);
    }
    .hero__actions .button--secondary {
      background: rgb(255 250 245 / 78%);
    }
  }
  @media (max-width: 370px) {
    :root { --page-pad: 0.9rem; }
    .brand {
      width: 6.15rem;
      height: 3.35rem;
    }
    .login-button {
      width: auto;
      min-width: 4.85rem;
      padding-inline: 0.65rem;
    }
    .login-button__label { display: inline; }
    .menu-toggle {
      width: 2.55rem;
      height: 2.55rem;
      padding: 0.55rem;
    }
    .hero h1 { font-size: clamp(1.72rem, 8.5vw, 2rem); }
    .hero__visual { min-height: 24rem; }
    .phone {
      bottom: -1.5rem;
      left: -3.2rem;
      width: 17.5rem;
    }
    .firefighter {
      right: -5.4rem;
      width: 19.5rem;
    }
    .hero__trust {
      margin-top: -3.3rem;
      padding-inline: 0.35rem;
    }
    .hero__trust-item { padding-inline: 0.22rem; }
    .hero__trust-text { gap: 0.05rem; }
    .hero__trust-value,
    .hero__trust-label {
      white-space: normal;
      line-height: 1.12;
    }
  }
`;
```

Modify `landing-page.tsx`:

```tsx
import { landingMobileStyles } from "../_content/landing-mobile-styles";

// ...
<style>{`${landingStyles}\n${landingMobileStyles}`}</style>
```

- [ ] **Step 4: Run the focused test and verify GREEN**

Run:

```powershell
npm test -- tests/migration.test.mjs
```

Expected: PASS.

- [ ] **Step 5: Run static quality checks**

Run:

```powershell
npm test
npm run lint
npm run build
```

Expected: all tests pass, ESLint exits successfully, and the Next.js production build completes.

- [ ] **Step 6: Visually verify mobile and desktop**

Start the local app with `npm run dev`, then inspect:

- `320x700`: no horizontal scrolling; header controls remain accessible.
- `375x812`: reference hierarchy, layered scene, floating trust strip, stacked CTAs.
- `390x844`: balanced crop and spacing.
- `640x900`: mobile composition remains coherent.
- `1440x900`: desktop hero is unchanged.

Also open and close the mobile navigation, activate Login, and confirm both hero CTA destinations still work.

- [ ] **Step 7: Commit the implementation**

```powershell
git add -- mainfile/alab-system/app/_content/landing-mobile-styles.ts mainfile/alab-system/app/_components/landing-page.tsx mainfile/alab-system/tests/migration.test.mjs
git commit -m "feat: refresh mobile landing hero"
```
