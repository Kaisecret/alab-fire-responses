import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const appRoot = process.cwd();

test("resident login exposes an installable, icon-branded PWA only for the resident portal", () => {
  const manifest = join(appRoot, "public", "resident-manifest.webmanifest");
  const login = readFileSync(join(appRoot, "app", "resident", "login", "page.tsx"), "utf8");
  const pwa = join(appRoot, "app", "_components", "resident-pwa.tsx");

  assert.ok(existsSync(manifest));
  assert.ok(existsSync(pwa));
  const manifestJson = JSON.parse(readFileSync(manifest, "utf8"));
  assert.equal(manifestJson.start_url, "/resident/login");
  assert.equal(manifestJson.scope, "/resident");
  assert.equal(manifestJson.display, "standalone");
  assert.equal(manifestJson.background_color, "#ffffff");
  assert.deepEqual(manifestJson.icons.map((icon) => icon.src), [
    "/images/FAVICON.webp",
    "/images/resident-pwa-192.webp",
    "/images/resident-pwa-512.webp",
  ]);
  assert.ok(existsSync(join(appRoot, "public", "images", "resident-pwa-192.webp")));
  assert.ok(existsSync(join(appRoot, "public", "images", "resident-pwa-512.webp")));
  assert.match(login, /manifest:\s*"\/resident-manifest\.webmanifest"/);
  assert.match(login, /ResidentInstallPrompt/);
});

test("resident login uses the native browser PWA dialog without alert permissions", () => {
  const pwa = readFileSync(join(appRoot, "app", "_components", "resident-pwa.tsx"), "utf8");
  const layout = readFileSync(join(appRoot, "app", "resident", "layout.tsx"), "utf8");
  const worker = join(appRoot, "public", "resident-sw.js");

  assert.ok(existsSync(worker));
  assert.match(pwa, /navigator\.serviceWorker\.register\("\/resident-sw\.js", \{ scope: "\/resident" \}\)/);
  assert.match(pwa, /registrationScope\.pathname === "\/resident\/"/);
  assert.match(pwa, /beforeinstallprompt/);
  assert.match(pwa, /if \(!installPrompt \|\| isInstalled\) return null/);
  assert.match(pwa, /await installPrompt\.prompt\(\)/);
  assert.doesNotMatch(pwa, /Add to Home Screen/);
  assert.doesNotMatch(pwa, /window\.setInterval/);
  assert.doesNotMatch(pwa, /Notification/);
  assert.doesNotMatch(pwa, /useNotifications/);
  const workerSource = readFileSync(worker, "utf8");
  assert.match(workerSource, /addEventListener\("fetch"/);
  assert.match(workerSource, /event\.respondWith\(/);
  assert.match(workerSource, /requestUrl\.pathname === "\/resident"/);
  assert.match(workerSource, /requestUrl\.pathname\.startsWith\("\/resident\/"\)/);
  assert.doesNotMatch(workerSource, /notificationclick/);
  assert.doesNotMatch(layout, /ResidentBrowserNotifications/);
});
