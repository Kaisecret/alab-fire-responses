# ALAB Next.js Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the existing ALAB landing page the root Next.js route and migrate the existing login page to `/login` without changing either page's UI.

**Architecture:** Keep the existing Next.js 16 App Router project. Route files remain server components for metadata, while focused client components render trusted, static source markup and reproduce the original DOM interactions with lifecycle-safe event listeners. Original CSS is preserved in route-mounted style elements, with only the original `body` rules redirected to route root elements so landing and login styles cannot conflict during client navigation.

**Tech Stack:** Next.js 16.2.12 App Router, React 19.2.4, TypeScript 5, CSS, Node.js built-in test runner

## Global Constraints

- The landing page must render at `/` and be the first route shown.
- The login page must render at `/login`.
- Do not change layout, copy, colors, typography, spacing, images, responsive breakpoints, hover states, or animations.
- Copy every file from `BFP/images` without editing the binary.
- Replace only navigation paths required by Next.js: `../login.html` becomes `/login`, and `BFP/index.html` becomes `/`.
- Preserve all original landing and login behaviors; the demonstration login form continues to navigate to `/`.
- Do not add an authentication backend, database, registration flow, redesign, or new UI.

---

### Task 1: Migration Contract and Static Assets

**Files:**
- Modify: `package.json`
- Create: `tests/migration.test.mjs`
- Create: `public/images/BFPBACK.webp`
- Create: `public/images/bg images.webp`
- Create: `public/images/ChatGPT Image Jul 28, 2026, 02_33_55 AM.webp`
- Create: `public/images/FAVICON.webp`
- Create: `public/images/Hero section.webp`
- Create: `public/images/LOGO FIRE.webp`
- Create: `public/images/logo white tint.webp`
- Create: `public/images/Logo.webp`
- Create: `public/images/panay.webp`
- Create: `public/images/phone.webp`
- Create: `public/images/side pic for login.webp`

**Interfaces:**
- Consumes: source assets from `../../BFP/images`
- Produces: `npm test`, plus stable public URLs under `/images/<original filename>`

- [ ] **Step 1: Add the failing migration contract**

Add `"test": "node --test tests/*.test.mjs"` to `scripts` in `package.json`. Create `tests/migration.test.mjs` with Node tests that assert:

```js
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const images = [
  "BFPBACK.webp",
  "bg images.webp",
  "ChatGPT Image Jul 28, 2026, 02_33_55 AM.webp",
  "FAVICON.webp",
  "Hero section.webp",
  "LOGO FIRE.webp",
  "logo white tint.webp",
  "Logo.webp",
  "panay.webp",
  "phone.webp",
  "side pic for login.webp",
];

test("all original images are exposed by the Next.js public directory", () => {
  for (const image of images) {
    assert.equal(existsSync(join(root, "public", "images", image)), true, image);
  }
});
```

- [ ] **Step 2: Run the contract and verify it fails**

Run: `npm test`

Expected: FAIL because the eleven files under `public/images` do not exist.

- [ ] **Step 3: Copy source assets without modification**

Create `public/images`, copy the eleven files from `../../BFP/images`, then compare each source and destination SHA-256 hash with:

```powershell
Get-ChildItem '..\..\BFP\images' -File | ForEach-Object {
  $destination = Join-Path '.\public\images' $_.Name
  [PSCustomObject]@{
    Name = $_.Name
    Source = (Get-FileHash -Algorithm SHA256 -LiteralPath $_.FullName).Hash
    Destination = (Get-FileHash -Algorithm SHA256 -LiteralPath $destination).Hash
  }
}
```

Expected: `Source` equals `Destination` for every row.

- [ ] **Step 4: Commit the contract and assets**

```bash
git add package.json tests/migration.test.mjs public/images
git commit -m "test: define ALAB migration contract"
```

### Task 2: Landing Route

**Files:**
- Create: `scripts/extract-static-pages.mjs`
- Create: `app/_content/landing-content.ts`
- Create: `app/_components/landing-page.tsx`
- Modify: `app/page.tsx`
- Test: `tests/migration.test.mjs`

**Interfaces:**
- Consumes: the `<style>` and pre-script `<body>` content from `../../BFP/index.html`
- Produces: `landingStyles`, `landingMarkup`, `LandingPage`, and route `/`

- [ ] **Step 1: Extend the failing test for landing fidelity**

Add assertions that the generated landing content contains the source sections, asset URLs, and unchanged visible copy:

```js
test("landing content preserves the complete source structure", () => {
  const content = readFileSync(join(root, "app", "_content", "landing-content.ts"), "utf8");
  for (const id of ["home", "incidents", "map", "resources", "about", "report", "contact"]) {
    assert.match(content, new RegExp(`id="${id}"`));
  }
  assert.match(content, /Provincial Fire Response/);
  assert.match(content, /\\/images\\/phone\\.webp/);
  assert.match(content, /\\/images\\/BFPBACK\\.webp/);
  assert.match(content, /href=\\"\\/login\\"/);
  assert.doesNotMatch(content, /\\.\\.\\/login\\.html/);
});
```

- [ ] **Step 2: Run the landing test and verify it fails**

Run: `npm test`

Expected: FAIL because `app/_content/landing-content.ts` is missing.

- [ ] **Step 3: Add deterministic source extraction**

Create `scripts/extract-static-pages.mjs` using `readFileSync`/`writeFileSync`. For the landing source:

```js
const style = source.match(/<style>([\\s\\S]*?)<\\/style>/)?.[1];
const body = source.match(/<body>([\\s\\S]*?)<script>/)?.[1];
if (!style || !body) throw new Error("Unable to extract landing source");

const landingStyles = style
  .replace(/(^|})\\s*body\\s*{/g, "$1\\n.landing-page-root {")
  .replace(/body,\\s*button,\\s*a\\s*{/g, ".landing-page-root, .landing-page-root button, .landing-page-root a {");

const landingMarkup = body
  .replaceAll('src="images/', 'src="/images/')
  .replaceAll('href="../login.html"', 'href="/login"');
```

Serialize the two strings with `JSON.stringify` into `app/_content/landing-content.ts`, ensuring trusted local markup is the only input.

- [ ] **Step 4: Implement lifecycle-safe landing interactions**

Create `app/_components/landing-page.tsx` as a client component that:

```tsx
"use client";

import { useEffect, useRef } from "react";
import { landingMarkup, landingStyles } from "../_content/landing-content";

export function LandingPage() {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const menu = root.querySelector<HTMLButtonElement>(".menu-toggle");
    const nav = root.querySelector<HTMLElement>(".site-nav");
    const header = root.querySelector<HTMLElement>(".site-header");
    const scrollTop = root.querySelector<HTMLButtonElement>("#scrollToTop");
    if (!menu || !nav || !header) return;

    document.documentElement.classList.add("js");

    const setMenu = (open: boolean) => {
      nav.classList.toggle("is-open", open);
      menu.classList.toggle("is-open", open);
      menu.setAttribute("aria-expanded", String(open));
      menu.setAttribute(
        "aria-label",
        open ? "Close navigation menu" : "Open navigation menu",
      );
    };
    const handleMenu = () =>
      setMenu(menu.getAttribute("aria-expanded") !== "true");
    const handleNav = (event: Event) => {
      if ((event.target as Element).closest?.("a")) setMenu(false);
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenu(false);
        menu.focus();
      }
    };
    const handleResize = () => {
      if (window.innerWidth > 900) setMenu(false);
    };
    const syncScroll = () => {
      header.classList.toggle("is-scrolled", window.scrollY > 24);
      scrollTop?.classList.toggle("is-visible", window.scrollY > 400);
    };
    const handleScrollTop = () =>
      window.scrollTo({ top: 0, behavior: "smooth" });

    menu.addEventListener("click", handleMenu);
    nav.addEventListener("click", handleNav);
    document.addEventListener("keydown", handleKey);
    window.addEventListener("resize", handleResize);
    window.addEventListener("scroll", syncScroll, { passive: true });
    scrollTop?.addEventListener("click", handleScrollTop);
    syncScroll();

    const targets = root.querySelectorAll(".reveal, .journey-route");
    let observer: IntersectionObserver | undefined;
    if ("IntersectionObserver" in window) {
      observer = new IntersectionObserver(
        (entries, activeObserver) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add("is-visible");
            activeObserver.unobserve(entry.target);
          });
        },
        { threshold: 0.14, rootMargin: "0px 0px -6% 0px" },
      );
      targets.forEach((target) => observer?.observe(target));
    } else {
      targets.forEach((target) => target.classList.add("is-visible"));
    }

    return () => {
      menu.removeEventListener("click", handleMenu);
      nav.removeEventListener("click", handleNav);
      document.removeEventListener("keydown", handleKey);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("scroll", syncScroll);
      scrollTop?.removeEventListener("click", handleScrollTop);
      observer?.disconnect();
      document.documentElement.classList.remove("js");
    };
  }, []);

  return (
    <>
      <style>{landingStyles}</style>
      <div
        ref={rootRef}
        className="landing-page-root"
        dangerouslySetInnerHTML={{ __html: landingMarkup }}
      />
    </>
  );
}
```

The completed effect must use the exact thresholds from the HTML: close the menu above `900px`, mark the header scrolled above `24px`, show the scroll button above `400px`, and reveal elements with threshold `0.14` and root margin `0px 0px -6% 0px`.

- [ ] **Step 5: Replace the starter root route**

Make `app/page.tsx` a server route with the original title/description metadata and `<LandingPage />`:

```tsx
import type { Metadata } from "next";
import { LandingPage } from "./_components/landing-page";

export const metadata: Metadata = {
  title: "ALAB | Provincial Fire Response",
  description:
    "ALAB connects communities and the Bureau of Fire Protection through fast, coordinated emergency response across Antique.",
};

export default function Home() {
  return <LandingPage />;
}
```

- [ ] **Step 6: Generate content and run tests**

Run: `node scripts/extract-static-pages.mjs`

Run: `npm test`

Expected: the landing fidelity test passes; the route test still fails only if login work is not yet present.

- [ ] **Step 7: Commit the landing route**

```bash
git add scripts/extract-static-pages.mjs app/_content/landing-content.ts app/_components/landing-page.tsx app/page.tsx tests/migration.test.mjs
git commit -m "feat: migrate ALAB landing page to Next.js"
```

### Task 3: Login Route

**Files:**
- Modify: `scripts/extract-static-pages.mjs`
- Create: `app/_content/login-content.ts`
- Create: `app/_components/login-page.tsx`
- Create: `app/login/page.tsx`
- Test: `tests/migration.test.mjs`

**Interfaces:**
- Consumes: the `<style>` and pre-script `<body>` content from `../../login.html`
- Produces: `loginStyles`, `loginMarkup`, `LoginPage`, and route `/login`

- [ ] **Step 1: Extend the failing test for login fidelity**

```js
test("login content preserves the source form and imagery", () => {
  const content = readFileSync(join(root, "app", "_content", "login-content.ts"), "utf8");
  assert.match(content, /Welcome Back/);
  assert.match(content, /id="email"/);
  assert.match(content, /id="password"/);
  assert.match(content, /\\/images\\/side pic for login\\.webp/);
  assert.match(content, /\\/images\\/Logo\\.webp/);
  assert.match(content, /href=\\"\\/\\"/);
  assert.doesNotMatch(content, /BFP\\/index\\.html/);
  assert.equal(existsSync(join(root, "app", "login", "page.tsx")), true);
});
```

- [ ] **Step 2: Run the login test and verify it fails**

Run: `npm test`

Expected: FAIL because `app/_content/login-content.ts` is missing.

- [ ] **Step 3: Extend deterministic extraction for login**

Extract the login style and pre-script body with the same validated regex boundaries. Redirect the body selector and paths:

```js
const loginStyles = style.replace(
  /(^|})\\s*body\\s*{/g,
  "$1\\n.login-page-root {",
);

const loginMarkup = body
  .replaceAll('src="BFP/images/', 'src="/images/')
  .replaceAll('href="BFP/index.html"', 'href="/"')
  .replaceAll('action="BFP/index.html"', 'action="/"')
  .replace(/\\s+onsubmit="[^"]*"/g, "")
  .replace(/\\s+onclick="[^"]*"/g, "");
```

Serialize the output to `app/_content/login-content.ts`.

- [ ] **Step 4: Implement login behavior**

Create a client `LoginPage` that renders the trusted static markup and style exactly like `LandingPage`. Use this complete effect:

```tsx
useEffect(() => {
  const root = rootRef.current;
  if (!root) return;
  const password = root.querySelector<HTMLInputElement>("#password");
  const toggle = root.querySelector<HTMLButtonElement>("#togglePasswordBtn");
  const eye = root.querySelector<SVGElement>("#eyeIcon");
  const form = root.querySelector<HTMLFormElement>("#loginForm");
  const forgot = root.querySelector<HTMLAnchorElement>(".forgot-password");
  const register = root.querySelector<HTMLAnchorElement>(".register-link a");
  if (!password || !toggle || !eye || !form) return;

  const visibleEye = `
    <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/>
    <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/>
    <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/>
    <line x1="2" y1="2" x2="22" y2="22"/>
  `;
  const hiddenEye = `
    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
    <circle cx="12" cy="12" r="3"/>
  `;
  const handleToggle = () => {
    const isPassword = password.type === "password";
    password.type = isPassword ? "text" : "password";
    eye.innerHTML = isPassword ? visibleEye : hiddenEye;
  };
  const handleSubmit = (event: SubmitEvent) => {
    event.preventDefault();
    window.location.assign("/");
  };
  const handleForgot = (event: Event) => {
    event.preventDefault();
    window.alert("Password recovery portal opening soon.");
  };
  const handleRegister = (event: Event) => {
    event.preventDefault();
    window.alert("Registration portal opening soon.");
  };

  toggle.addEventListener("click", handleToggle);
  form.addEventListener("submit", handleSubmit);
  forgot?.addEventListener("click", handleForgot);
  register?.addEventListener("click", handleRegister);

  return () => {
    toggle.removeEventListener("click", handleToggle);
    form.removeEventListener("submit", handleSubmit);
    forgot?.removeEventListener("click", handleForgot);
    register?.removeEventListener("click", handleRegister);
  };
}, []);
```

- [ ] **Step 5: Add login metadata route**

```tsx
import type { Metadata } from "next";
import { LoginPage } from "../_components/login-page";

export const metadata: Metadata = {
  title: "Login - ALAB Provincial Fire Response",
};

export default function LoginRoute() {
  return <LoginPage />;
}
```

- [ ] **Step 6: Generate login content and run the complete contract**

Run: `node scripts/extract-static-pages.mjs`

Run: `npm test`

Expected: all tests PASS.

- [ ] **Step 7: Commit the login route**

```bash
git add scripts/extract-static-pages.mjs app/_content/login-content.ts app/_components/login-page.tsx app/login/page.tsx tests/migration.test.mjs
git commit -m "feat: migrate ALAB login page to Next.js"
```

### Task 4: Shared Layout and Production Verification

**Files:**
- Modify: `app/layout.tsx`
- Modify: `app/globals.css`
- Create: `app/icon.png`
- Test: `tests/migration.test.mjs`

**Interfaces:**
- Consumes: both completed routes and `/images/FAVICON.webp`
- Produces: shared document metadata, favicon, clean baseline styles, and a production-valid Next.js app

- [ ] **Step 1: Add layout contract assertions**

```js
test("shared layout identifies the ALAB application", () => {
  const layout = readFileSync(join(root, "app", "layout.tsx"), "utf8");
  assert.match(layout, /ALAB/);
  assert.doesNotMatch(layout, /Create Next App/);
});
```

- [ ] **Step 2: Run the layout test and verify it fails**

Run: `npm test`

Expected: FAIL because the starter layout metadata still says `Create Next App`.

- [ ] **Step 3: Replace starter layout metadata and global theme**

Remove unused Geist imports and starter theme styles. Keep only a neutral baseline that does not override either migrated UI:

```css
@import "tailwindcss";

html,
body {
  min-width: 20rem;
  min-height: 100%;
  margin: 0;
}
```

Set default metadata in `app/layout.tsx` to ALAB and use `/images/FAVICON.webp` as the icon. Keep `lang="en"`.

- [ ] **Step 4: Run all automated verification**

Run: `npm test`

Expected: all migration tests PASS.

Run: `npm run lint`

Expected: exit code 0 with no ESLint errors.

Run: `npm run build`

Expected: exit code 0 and static routes listed for `/` and `/login`.

- [ ] **Step 5: Verify source assets and route output**

Compare all eleven SHA-256 source/destination asset pairs. Start `npm run dev`, open `/` and `/login`, and confirm:

- `/` is the landing page and visually matches `BFP/index.html`.
- `/login` visually matches `login.html`.
- Desktop and mobile layouts retain the source breakpoints.
- Landing menu, anchors, reveals, fixed header, and scroll-to-top work.
- Landing login buttons navigate to `/login`.
- Login password toggle, notices, submit navigation, logo link, and back button work.
- No image request returns 404.

- [ ] **Step 6: Commit production verification changes**

```bash
git add app/layout.tsx app/globals.css app/icon.png tests/migration.test.mjs
git commit -m "chore: finalize ALAB Next.js migration"
```
