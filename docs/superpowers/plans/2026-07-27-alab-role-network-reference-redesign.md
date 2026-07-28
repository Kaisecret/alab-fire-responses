# ALAB Role Network Reference Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild only the five-role access network so it matches the supplied rounded, glowing hub-and-spoke reference and includes polished moving red signal nodes.

**Architecture:** Keep the existing semantic role articles and inline SVG icon system in `BFP/index.html`. Expand the existing decorative connector SVG with stable path IDs, endpoint nodes, and SVG motion elements, then scope all composition, glow, motion, tablet, mobile, and reduced-motion behavior to `.access-system` and `.access-orbit`.

**Tech Stack:** Semantic HTML5, CSS Grid, CSS keyframes, inline SVG/SMIL, Node.js built-in test runner, headless Chrome capture workflow

## Global Constraints

- Change only the `.access-orbit` network, its directly related responsive CSS, and its tests.
- Preserve the section heading, five role names, five descriptions, navigation, and every surrounding page section.
- Keep `images/Logo.png`; add no dependencies, JavaScript animation, or new image assets.
- Desktop and tablet retain a hub-and-spoke layout; widths of 640 pixels and below use a vertical stack.
- Disable continuous decorative motion under `prefers-reduced-motion: reduce`.

---

### Task 1: Animated Network Contract

**Files:**
- Modify: `BFP/tests/landing.test.mjs`
- Test: `BFP/tests/landing.test.mjs`

**Interfaces:**
- Consumes: the existing static `BFP/index.html` document.
- Produces: a test contract requiring five `.access-signal` nodes, five `<animateMotion>` elements, five stable connector path IDs, a center pulse keyframe, a mobile guide, and reduced-motion suppression.

- [ ] **Step 1: Add the failing animation test**

```js
test('animates five accessible network signals with mobile and reduced-motion fallbacks', () => {
  assert.equal((html.match(/class=["']access-signal["']/g) ?? []).length, 5);
  assert.equal((html.match(/<animateMotion\b/g) ?? []).length, 5);
  assert.equal((html.match(/id=["']access-path-[^"']+["']/g) ?? []).length, 5);
  assert.match(html, /@keyframes\s+access-core-pulse/);
  assert.match(html, /class=["']access-mobile-guide["']/);
  assert.match(
    html,
    /@media\s*\(prefers-reduced-motion:\s*reduce\)[\s\S]*?\.access-signal\s*\{[^}]*display:\s*none/,
  );
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --test BFP/tests/landing.test.mjs`

Expected: FAIL in `animates five accessible network signals with mobile and reduced-motion fallbacks` because `.access-signal` is absent.

- [ ] **Step 3: Preserve the existing rounded-composition contract**

Confirm the earlier `matches the enlarged rounded role-network reference composition` test remains unchanged and failing until the production CSS is updated.

### Task 2: Reference-Matched Markup and Motion

**Files:**
- Modify: `BFP/index.html`
- Test: `BFP/tests/landing.test.mjs`

**Interfaces:**
- Consumes: the contract from Task 1 and the existing five `.access-role` articles.
- Produces: five named connector paths, ten endpoint `.access-node` circles, five `.access-signal` circles with route motion, and one `.access-mobile-guide`.

- [ ] **Step 1: Add stable routes, endpoints, and signals**

Give each existing path an `id` from `access-path-residents` through `access-path-firefighters`. Add endpoint circles at the card and core ends, plus one signal circle per route:

```html
<circle class="access-signal" r="6">
  <animateMotion dur="4.4s" begin="-0.8s" repeatCount="indefinite"
    keyPoints="1;0" keyTimes="0;1" calcMode="linear">
    <mpath href="#access-path-residents"></mpath>
  </animateMotion>
</circle>
```

Use distinct durations and negative begin offsets across the five signals so arrivals are staggered.

- [ ] **Step 2: Add the mobile network guide**

Insert `<span class="access-mobile-guide" aria-hidden="true"></span>` after the center core and before the role articles.

- [ ] **Step 3: Rebuild the desktop composition**

Set `.access-orbit` to `min-height: 47rem`; set `.access-core` to `width: clamp(15rem, 20vw, 17.5rem)`; and set `.access-role` to `width: min(100%, 25rem)` with `border-radius: 1.25rem`. Increase panel padding, icon circles, type, dividers, and shadows to match the approved reference.

- [ ] **Step 4: Add polished motion**

Add `@keyframes access-core-pulse` for a restrained red glow. Style `.access-signal` as a bright red dot with a soft SVG drop shadow, keep the dashed connector animation subtle, and make `.access-node` crisp endpoints.

- [ ] **Step 5: Add tablet, mobile, and reduced-motion behavior**

At 900 pixels, scale cards and core down without changing role relationships. At 640 pixels, hide `.access-links`, stack the core and cards, and show `.access-mobile-guide` as a thin vertical red line with a moving pseudo-element. Under reduced motion, disable the core/dash/mobile animation and hide `.access-signal`.

- [ ] **Step 6: Run tests and verify GREEN**

Run: `node --test BFP/tests/*.test.mjs`

Expected: all tests pass with zero failures.

### Task 3: Browser Verification

**Files:**
- Verify: `BFP/.artifacts/verified/desktop-access-orbit.png`
- Verify: `BFP/.artifacts/verified/tablet-access-orbit.png`
- Verify: `BFP/.artifacts/verified/mobile-access-orbit.png`

**Interfaces:**
- Consumes: the completed static page and existing capture script.
- Produces: verified screenshots and console evidence for responsive layout, overflow, duplicate IDs, and browser errors.

- [ ] **Step 1: Serve the page and start headless Chrome**

Run the existing local server and Chrome debugging workflow used by `BFP/.artifacts/capture-sections.mjs`.

- [ ] **Step 2: Capture desktop, tablet, and mobile**

Run: `node BFP/.artifacts/capture-sections.mjs`

Expected: desktop, tablet, and mobile captures are written with no overflow, duplicate IDs, or browser errors.

- [ ] **Step 3: Inspect the three role-network captures**

Confirm the desktop and tablet cards align with their correct routes, red signals move toward the core, the core glow is restrained, and the mobile stack is readable with the vertical guide.

- [ ] **Step 4: Run final verification**

Run: `node --test BFP/tests/*.test.mjs`

Expected: all tests pass with zero failures.
