# Resident PWA Standalone and Splash Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep every Resident route inside the installed standalone ALAB PWA and launch it with the supplied ALAB icon on a white native splash before the login page.

**Architecture:** Expand the manifest and service-worker scopes to include both the exact `/resident` route and all nested Resident routes, while migrating away from the legacy trailing-slash worker scope. Generate standards-sized PNG icons from the supplied square source image and let Android build its native splash from the manifest icon and white background.

**Tech Stack:** Next.js 16 App Router, React 19, static Web App Manifest, Service Worker API, Node test runner, Sharp, Vercel.

## Global Constraints

- Apply the change only to the Resident PWA.
- Use `public/images/iconfor pwa.png` as the source artwork.
- Use the native PWA splash; do not add a timed React loading screen.
- Keep `/resident/login` as the installed app start URL.
- Keep standalone display mode and the phone's normal operating-system status bar.
- Preserve unrelated tracked and untracked user files.

## File Structure

- `tests/resident-pwa.test.mjs`: regression contracts for PWA scope, worker navigation coverage, splash metadata, and generated icon dimensions.
- `public/resident-manifest.webmanifest`: installed Resident app identity, start URL, display behavior, splash colors, and icon declarations.
- `public/resident-sw.js`: Resident navigation/offline fallback, including the exact Home path.
- `app/_components/resident-pwa.tsx`: native install prompt, new-scope worker registration, legacy worker cleanup, and install-banner icon.
- `public/images/iconfor pwa.png`: supplied source artwork.
- `public/images/resident-pwa-192.png`: generated 192×192 install icon.
- `public/images/resident-pwa-512.png`: generated 512×512 install/splash icon.

---

### Task 1: Keep every Resident route inside the PWA scope

**Files:**
- Modify: `tests/resident-pwa.test.mjs`
- Modify: `public/resident-manifest.webmanifest`
- Modify: `public/resident-sw.js`
- Modify: `app/_components/resident-pwa.tsx`

**Interfaces:**
- Consumes: `/resident` and `/resident/*` route paths.
- Produces: manifest scope `/resident`, worker registration scope `/resident`, and an `isResidentNavigation` guard that accepts the exact Home path and nested Resident paths.

- [ ] **Step 1: Write the failing scope regression assertions**

Update `tests/resident-pwa.test.mjs` so the manifest and worker expectations include:

```js
assert.equal(manifestJson.start_url, "/resident/login");
assert.equal(manifestJson.scope, "/resident");
assert.equal(manifestJson.display, "standalone");
assert.equal(manifestJson.background_color, "#ffffff");

assert.match(pwa, /navigator\.serviceWorker\.register\("\/resident-sw\.js", \{ scope: "\/resident" \}\)/);
assert.match(pwa, /registrationScope\.pathname === "\/resident\/"/);

const workerSource = readFileSync(worker, "utf8");
assert.match(workerSource, /requestUrl\.pathname === "\/resident"/);
assert.match(workerSource, /requestUrl\.pathname\.startsWith\("\/resident\/"\)/);
```

- [ ] **Step 2: Run the focused test and verify the expected failure**

Run:

```powershell
node --test tests/resident-pwa.test.mjs
```

Expected: FAIL because the manifest and worker registration still use `/resident/`, and the fetch handler excludes the exact `/resident` path.

- [ ] **Step 3: Implement the scope correction and legacy registration cleanup**

In `public/resident-manifest.webmanifest`, set:

```json
"scope": "/resident"
```

Replace `registerResidentWorker` in `app/_components/resident-pwa.tsx` with:

```ts
async function registerResidentWorker() {
  if (!("serviceWorker" in navigator)) return undefined;

  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.all(
    registrations
      .filter((registration) => {
        const registrationScope = new URL(registration.scope);
        return registrationScope.origin === window.location.origin
          && registrationScope.pathname === "/resident/";
      })
      .map((registration) => registration.unregister()),
  );

  return navigator.serviceWorker.register("/resident-sw.js", { scope: "/resident" });
}
```

In `public/resident-sw.js`, bump the cache version and accept both Resident path forms:

```js
const RESIDENT_CACHE = "alab-resident-shell-v2";
const RESIDENT_LOGIN = "/resident/login";
```

```js
const isResidentNavigation = requestUrl.pathname === "/resident"
  || requestUrl.pathname.startsWith("/resident/");
if (requestUrl.origin !== self.location.origin || !isResidentNavigation) return;
```

- [ ] **Step 4: Run the focused test and verify it passes**

Run:

```powershell
node --test tests/resident-pwa.test.mjs
```

Expected: 2 tests pass, 0 fail.

- [ ] **Step 5: Commit the standalone scope fix**

```powershell
git add -- tests/resident-pwa.test.mjs public/resident-manifest.webmanifest public/resident-sw.js app/_components/resident-pwa.tsx
git commit -m "fix: keep resident routes inside installed PWA"
```

---

### Task 2: Use the supplied icon for install and native splash

**Files:**
- Modify: `tests/resident-pwa.test.mjs`
- Modify: `public/resident-manifest.webmanifest`
- Modify: `app/_components/resident-pwa.tsx`
- Add: `public/images/iconfor pwa.png`
- Add: `public/images/resident-pwa-192.png`
- Add: `public/images/resident-pwa-512.png`

**Interfaces:**
- Consumes: the supplied 1254×1254 PNG source at `public/images/iconfor pwa.png`.
- Produces: exact 192×192 and 512×512 PNG manifest icons and a login install banner using the same artwork.

- [ ] **Step 1: Write the failing icon and splash regression assertions**

Add `sharp` to the test imports and make the first test asynchronous:

```js
import sharp from "sharp";

test("resident login exposes an installable, icon-branded PWA only for the resident portal", async () => {
```

Replace the manifest icon expectations with:

```js
assert.deepEqual(manifestJson.icons, [
  {
    src: "/images/resident-pwa-192.png",
    sizes: "192x192",
    type: "image/png",
    purpose: "any",
  },
  {
    src: "/images/resident-pwa-512.png",
    sizes: "512x512",
    type: "image/png",
    purpose: "any",
  },
]);

const icon192 = join(appRoot, "public", "images", "resident-pwa-192.png");
const icon512 = join(appRoot, "public", "images", "resident-pwa-512.png");
assert.ok(existsSync(icon192));
assert.ok(existsSync(icon512));
assert.deepEqual(
  { width: (await sharp(icon192).metadata()).width, height: (await sharp(icon192).metadata()).height },
  { width: 192, height: 192 },
);
assert.deepEqual(
  { width: (await sharp(icon512).metadata()).width, height: (await sharp(icon512).metadata()).height },
  { width: 512, height: 512 },
);
assert.match(readFileSync(pwa, "utf8"), /src="\/images\/resident-pwa-192\.png"/);
```

- [ ] **Step 2: Run the focused test and verify the expected failure**

Run:

```powershell
node --test tests/resident-pwa.test.mjs
```

Expected: FAIL because the PNG derivatives do not exist and the manifest/banner still reference the old WebP assets.

- [ ] **Step 3: Generate standards-sized PNG icons from the supplied artwork**

Run:

```powershell
node --input-type=module -e "import sharp from 'sharp'; const source='public/images/iconfor pwa.png'; await Promise.all([sharp(source).resize(192,192).png().toFile('public/images/resident-pwa-192.png'),sharp(source).resize(512,512).png().toFile('public/images/resident-pwa-512.png')]);"
```

Expected: both PNG files are created without resizing errors.

- [ ] **Step 4: Point the manifest and install banner at the new artwork**

Set `icons` in `public/resident-manifest.webmanifest` to:

```json
"icons": [
  {
    "src": "/images/resident-pwa-192.png",
    "sizes": "192x192",
    "type": "image/png",
    "purpose": "any"
  },
  {
    "src": "/images/resident-pwa-512.png",
    "sizes": "512x512",
    "type": "image/png",
    "purpose": "any"
  }
]
```

In `app/_components/resident-pwa.tsx`, set the install-banner image to:

```tsx
<img src="/images/resident-pwa-192.png" alt="ALAB" />
```

- [ ] **Step 5: Run the focused test and verify it passes**

Run:

```powershell
node --test tests/resident-pwa.test.mjs
```

Expected: 2 tests pass, 0 fail.

- [ ] **Step 6: Commit the icon and splash metadata**

```powershell
git add -- tests/resident-pwa.test.mjs public/resident-manifest.webmanifest app/_components/resident-pwa.tsx "public/images/iconfor pwa.png" public/images/resident-pwa-192.png public/images/resident-pwa-512.png
git commit -m "feat: brand resident PWA native splash"
```

---

### Task 3: Verify, push, and confirm the Vercel production deployment

**Files:**
- Verify only: all files committed in Tasks 1 and 2.

**Interfaces:**
- Consumes: the completed local Resident PWA commits.
- Produces: a pushed `main` branch and live production manifest, worker, and icons on `alab-fire-responses-bynr.vercel.app`.

- [ ] **Step 1: Run the focused and full automated tests**

```powershell
node --test tests/resident-pwa.test.mjs
npm test
```

Expected: all tests pass with 0 failures.

- [ ] **Step 2: Run lint and the production build**

```powershell
npm run lint
npm run build
```

Expected: both commands exit 0. If lint reports unrelated pre-existing failures, record them exactly and do not hide them; the production build must still exit 0 before deployment.

- [ ] **Step 3: Confirm only intended tracked files changed**

```powershell
git status --short
git log -3 --oneline
```

Expected: no uncommitted tracked PWA changes; unrelated pre-existing untracked user files remain untouched.

- [ ] **Step 4: Push the completed commits to production**

```powershell
git push origin main
```

Expected: `origin/main` advances through the scope and splash commits.

- [ ] **Step 5: Verify the live Vercel PWA resources**

After Vercel finishes building, run:

```powershell
$manifest = Invoke-RestMethod 'https://alab-fire-responses-bynr.vercel.app/resident-manifest.webmanifest'
$manifest.scope
$manifest.start_url
$manifest.display
$manifest.background_color
$manifest.icons | ConvertTo-Json -Compress
(Invoke-WebRequest -UseBasicParsing 'https://alab-fire-responses-bynr.vercel.app/resident-sw.js').StatusCode
(Invoke-WebRequest -UseBasicParsing 'https://alab-fire-responses-bynr.vercel.app/images/resident-pwa-192.png').StatusCode
(Invoke-WebRequest -UseBasicParsing 'https://alab-fire-responses-bynr.vercel.app/images/resident-pwa-512.png').StatusCode
```

Expected: scope `/resident`, start URL `/resident/login`, display `standalone`, white background `#ffffff`, new PNG icons in the manifest, and HTTP 200 for the worker and both icons.

- [ ] **Step 6: Perform the Android acceptance check**

Remove the old ALAB installation, open the Resident login page in Google Chrome, install ALAB from the native install prompt, and launch it from the home screen.

Expected: Android shows the supplied icon on a white native splash, opens `/resident/login`, and Home, Reports, Report Fire, Guide, and Profile remain in the same standalone window without the red browser toolbar.
