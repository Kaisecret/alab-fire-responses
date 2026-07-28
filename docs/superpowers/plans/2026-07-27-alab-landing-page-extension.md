# ALAB Landing Page Extension Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the existing ALAB hero with a polished, responsive public emergency-service landing page that explains Antique’s fire context, the report-to-response workflow, system capabilities, user access, offline field support, and future report/portal connections.

**Architecture:** Preserve the existing header and hero as the immutable first viewport. Append semantic sections to the existing `main`, add lower-page styles under a new `landing-*` class namespace, and enhance them with a dependency-free `IntersectionObserver` script. Add a separate Node contract test so the current hero tests remain focused and unchanged.

**Tech Stack:** HTML5, CSS3, vanilla JavaScript, inline SVG, Node.js built-in test runner, headless Chrome.

## Global Constraints

- Do not change the existing header or hero markup, visual styling, imagery, copy, breakpoints, or behavior.
- Keep all implementation self-contained in `BFP/index.html`.
- Add only `BFP/tests/landing.test.mjs` as a new source file.
- Use no network-hosted fonts, icon libraries, frameworks, or third-party scripts.
- Present supplied incident figures as historical BFP-Antique data, not live information.
- State that severity, route, dispatch, and coordination features provide recommendations while final decisions remain with authorized BFP personnel.
- Do not add a functional report form, authentication, live GIS map, API call, or invented contact information.
- Keep content usable without JavaScript and under `prefers-reduced-motion: reduce`.
- Prevent horizontal overflow at 390px, 768px, 1280px, and 1680px.
- The workspace is not a Git repository, so commit steps are omitted.

---

### Task 1: Landing Content and Navigation Contract

**Files:**
- Create: `BFP/tests/landing.test.mjs`
- Modify: `BFP/index.html:916`

**Interfaces:**
- Consumes: the existing `main#home` and fragment links in `.site-nav`, `.hero__actions`, and `.login-button`.
- Produces: unique destinations `#incidents`, `#resources`, `#map`, `#about`, `#report`, `#login`, and `#contact`.

- [ ] **Step 1: Write the failing semantic and content tests**

Create `BFP/tests/landing.test.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const html = readFileSync(join(here, '..', 'index.html'), 'utf8');

test('adds every lower-page navigation destination exactly once', () => {
  for (const id of ['incidents', 'resources', 'map', 'about', 'report', 'login', 'contact']) {
    assert.equal((html.match(new RegExp(`id=["']${id}["']`, 'g')) || []).length, 1, `${id} destination`);
  }
});

test('presents the supplied Antique incident figures as historical data', () => {
  for (const copy of ['243', '20', '28', '92', '4', '23', '0', 'BFP-Antique']) {
    assert.match(html, new RegExp(`>${copy}<|${copy}\\s`, 'i'));
  }
  assert.match(html, /historical|recorded|2025/i);
});

test('explains the complete report-to-response journey', () => {
  for (const step of ['Report', 'Verify', 'Assess', 'Dispatch', 'Respond', 'Document']) {
    assert.match(html, new RegExp(`>${step}<`, 'i'));
  }
});

test('states the decision-support limitation', () => {
  assert.match(html, /recommendations? and decision support/i);
  assert.match(html, /final decisions remain with authorized BFP personnel/i);
});

test('does not add a functioning emergency form or invented contact values', () => {
  assert.doesNotMatch(html, /<form\b/i);
  assert.doesNotMatch(html, /href=["'](?:tel:|mailto:)/i);
});
```

- [ ] **Step 2: Run the contract and verify it fails**

Run: `node --test BFP/tests/landing.test.mjs`

Expected: failures for missing destinations, statistics, workflow, and decision-support copy.

- [ ] **Step 3: Append the semantic lower-page structure**

Insert before the existing `</main>`:

```html
<div class="landing-content">
  <section class="landing-section incident-overview" id="incidents" aria-labelledby="incidents-title">
    <div class="section-shell">
      <header class="section-intro reveal">
        <p class="section-kicker">Antique at a glance</p>
        <h2 id="incidents-title">Preparedness begins with a clearer picture.</h2>
        <p>Historical figures supplied by BFP-Antique show why coordinated, province-wide response still matters.</p>
      </header>
      <div class="incident-ledger" aria-label="Historical fire incident figures for Antique">
        <!-- Four statistic groups: 243, 20 vs 28, 92 to 4, and 23 to 0. -->
      </div>
    </div>
  </section>

  <section class="landing-section response-journey" id="map" aria-labelledby="journey-title">
    <div class="section-shell">
      <header class="section-intro reveal">
        <p class="section-kicker">From report to response</p>
        <h2 id="journey-title">One connected path when every second matters.</h2>
      </header>
      <ol class="journey-route">
        <!-- Report, Verify, Assess, Dispatch, Respond, Document items. -->
      </ol>
    </div>
  </section>

  <section class="landing-section capabilities" id="resources" aria-labelledby="resources-title">
    <div class="section-shell">
      <header class="section-intro reveal">
        <p class="section-kicker">Connected response capabilities</p>
        <h2 id="resources-title">The right information, ready for action.</h2>
      </header>
      <!-- Four capability rows. -->
    </div>
  </section>

  <section class="landing-section access-system" id="about" aria-labelledby="about-title">
    <!-- Shared ALAB system diagram and five controlled-access roles. -->
  </section>

  <section class="landing-section field-ready" aria-labelledby="field-title">
    <!-- Offline mobile application highlight. -->
  </section>

  <section class="landing-section response-connect" id="report" aria-labelledby="report-title">
    <!-- Future report-application call to action and #login portal destination. -->
  </section>
</div>
```

Replace the comments with the exact approved content from the design specification. Use semantic `article`, `ol`, `ul`, and heading elements, concise public-facing copy, inline SVG icons with `aria-hidden="true"`, and no form controls.

- [ ] **Step 4: Add the project footer**

Append after `</main>` and before the existing script:

```html
<footer class="site-footer" id="contact">
  <div class="footer-main">
    <a class="footer-brand" href="#home" aria-label="ALAB home">ALAB</a>
    <p>GIS-based provincial fire response and decision support for BFP in Antique.</p>
    <nav aria-label="Footer navigation">
      <a href="#incidents">Incidents</a>
      <a href="#resources">Resources</a>
      <a href="#map">Response path</a>
      <a href="#about">Access</a>
      <a href="#report">Report a fire</a>
    </nav>
  </div>
  <div class="footer-base">
    <p>Bureau of Fire Protection · Province of Antique</p>
    <p>Recommendations and decision support only. Final decisions remain with authorized BFP personnel.</p>
  </div>
</footer>
```

- [ ] **Step 5: Run the content contracts**

Run: `node --test BFP/tests/hero.test.mjs BFP/tests/landing.test.mjs`

Expected: all hero and landing content tests pass.

---

### Task 2: Editorial Visual System and Responsive Layout

**Files:**
- Modify: `BFP/tests/landing.test.mjs`
- Modify: `BFP/index.html:837`

**Interfaces:**
- Consumes: `.landing-content`, `.landing-section`, `.incident-ledger`, `.journey-route`, `.capability-row`, `.access-orbit`, `.field-ready`, `.response-connect`, and `.site-footer`.
- Produces: scoped responsive styling without altering `.site-header` or `.hero`.

- [ ] **Step 1: Add failing style-contract tests**

Append:

```js
test('uses a scoped lower-page visual system and responsive layouts', () => {
  assert.match(html, /\.landing-content\s*\{/);
  assert.match(html, /\.incident-ledger\s*\{/);
  assert.match(html, /\.journey-route\s*\{/);
  assert.match(html, /\.capability-row\s*\{/);
  assert.match(html, /\.access-orbit\s*\{/);
  assert.match(html, /\.field-ready\s*\{/);
  assert.match(html, /\.site-footer\s*\{/);
  assert.match(html, /@media\s*\(max-width:\s*900px\)/);
  assert.match(html, /@media\s*\(max-width:\s*640px\)/);
});

test('provides progressive reveal and route-enhancement states', () => {
  assert.match(html, /\.reveal\.is-visible/);
  assert.match(html, /\.journey-route\.is-visible/);
  assert.match(html, /prefers-reduced-motion\s*:\s*reduce/);
});
```

- [ ] **Step 2: Run tests and verify the new assertions fail**

Run: `node --test BFP/tests/landing.test.mjs`

Expected: the content tests pass and the style tests fail.

- [ ] **Step 3: Add scoped design tokens and section foundations**

Add before the existing `</style>`:

```css
.landing-content {
  --landing-red: #d91b10;
  --landing-ink: #10222c;
  --landing-muted: #647078;
  --landing-cream: #fff8f1;
  --landing-line: rgb(16 34 44 / 12%);
  overflow: clip;
  background: var(--landing-cream);
}

.landing-section { position: relative; padding: clamp(5.5rem, 10vw, 10rem) var(--page-pad); }
.section-shell { width: min(100%, 82rem); margin-inline: auto; }
.section-intro { max-width: 44rem; }
.section-kicker {
  margin: 0 0 1rem;
  color: var(--landing-red);
  font-size: .78rem;
  font-weight: 850;
  letter-spacing: .14em;
  text-transform: uppercase;
}
.section-intro h2 {
  margin: 0;
  color: var(--landing-ink);
  font-size: clamp(2.55rem, 5vw, 5.25rem);
  letter-spacing: -.055em;
  line-height: .98;
}
.section-intro > p:last-child {
  max-width: 38rem;
  margin: 1.4rem 0 0;
  color: var(--landing-muted);
  font-size: clamp(1rem, 1.4vw, 1.18rem);
  line-height: 1.7;
}
```

- [ ] **Step 4: Style each approved composition**

Add complete rules for:

- `.incident-overview`, `.incident-ledger`, `.incident-stat`, `.trend-arrow`
- `.response-journey`, `.journey-route`, `.journey-step`, `.journey-marker`
- `.capabilities`, `.capability-row`, `.capability-icon`, `.capability-list`
- `.access-system`, `.access-orbit`, `.access-core`, `.access-role`
- `.field-ready`, `.field-layout`, `.field-phone`, `.offline-list`
- `.response-connect`, `.connect-layout`, `.connect-action`, `.portal-action`
- `.site-footer`, `.footer-main`, `.footer-nav`, `.footer-base`

Use broad section planes, dividers, typography, and whitespace instead of a repeated dashboard-card grid. Keep red as the only accent color. Use a dark navy field-ready section and a deep red response-connect section for two deliberate changes of atmosphere.

- [ ] **Step 5: Add responsive rules**

At `max-width: 900px`, collapse split compositions to one column, simplify the orbit into a grid, and keep the statistics in two columns. At `max-width: 640px`, make statistics and capability rows single-column, reduce decorative geometry, set call-to-action links to full width, and keep all padding within `var(--page-pad)`.

- [ ] **Step 6: Run all automated tests**

Run: `node --test BFP/tests/hero.test.mjs BFP/tests/landing.test.mjs`

Expected: zero failures.

---

### Task 3: Progressive Enhancement and Anchor Behavior

**Files:**
- Modify: `BFP/tests/landing.test.mjs`
- Modify: `BFP/index.html:918-954`

**Interfaces:**
- Consumes: `.reveal` elements and `.journey-route`.
- Produces: `is-visible` classes added when content enters the viewport; navigation active state synchronized to lower sections.

- [ ] **Step 1: Add failing interaction tests**

Append:

```js
test('enhances lower sections with IntersectionObserver without hiding no-JS content', () => {
  assert.match(html, /IntersectionObserver/);
  assert.match(html, /document\.documentElement\.classList\.add\(["']js["']\)/);
  assert.match(html, /classList\.add\(["']is-visible["']\)/);
  assert.match(html, /\.js\s+\.reveal/);
});
```

- [ ] **Step 2: Run the test and verify it fails**

Run: `node --test BFP/tests/landing.test.mjs`

Expected: one failure because the lower-page observer does not exist.

- [ ] **Step 3: Add the enhancement script**

At the start of the existing script, add:

```js
document.documentElement.classList.add('js');
```

Before the closing `</script>`, add:

```js
const revealTargets = document.querySelectorAll('.reveal, .journey-route');
if ('IntersectionObserver' in window) {
  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.16 });
  revealTargets.forEach((target) => revealObserver.observe(target));
} else {
  revealTargets.forEach((target) => target.classList.add('is-visible'));
}
```

Add `.js .reveal` as the enhanced hidden state and `.reveal.is-visible` as the visible state. Do not hide content without the `.js` root class.

- [ ] **Step 4: Run all tests**

Run: `node --test BFP/tests/hero.test.mjs BFP/tests/landing.test.mjs`

Expected: zero failures.

---

### Task 4: Render Verification and Final Polish

**Files:**
- Modify if needed: `BFP/index.html`
- Modify if needed: `BFP/tests/landing.test.mjs`
- Create during verification only: `BFP/.artifacts/landing-desktop.png`
- Create during verification only: `BFP/.artifacts/landing-tablet.png`
- Create during verification only: `BFP/.artifacts/landing-mobile.png`

**Interfaces:**
- Consumes: the complete static landing page.
- Produces: verified responsive screenshots and a zero-error automated contract.

- [ ] **Step 1: Run the full contract**

Run: `node --test BFP/tests/*.test.mjs`

Expected: all tests pass with zero failures.

- [ ] **Step 2: Start a local static server**

Run: `python -m http.server 4173 --directory BFP`

Expected: server listens on `http://127.0.0.1:4173`.

- [ ] **Step 3: Capture desktop, tablet, and mobile full-page screenshots**

Use a local browser automation script or headless Chrome to capture widths 1680, 768, and 390 after the reveal transitions complete. Save screenshots under `BFP/.artifacts/`.

Expected: the top remains unchanged, every lower section is visible, navigation targets resolve, and there is no horizontal clipping or overlap.

- [ ] **Step 4: Inspect the screenshots and DOM**

Check:

- Existing header and hero composition match the pre-change rendering.
- Statistics read as historical figures.
- Journey order is visually obvious.
- Capability rows do not resemble a generic card grid.
- Role-based access remains understandable on mobile.
- The offline section and final report panel have strong contrast.
- Footer copy is readable and contains no invented contact data.
- No console errors occur.

- [ ] **Step 5: Correct visual defects and rerun verification**

Make only focused lower-page CSS or markup corrections. Repeat:

`node --test BFP/tests/*.test.mjs`

Expected: all tests pass after final polish.

