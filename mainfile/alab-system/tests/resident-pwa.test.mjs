import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const appRoot = process.cwd();

test("resident login exposes an installable, icon-branded PWA only for the resident portal", () => {
  const manifest = join(appRoot, "app", "resident", "manifest.ts");
  const login = readFileSync(join(appRoot, "app", "resident", "login", "page.tsx"), "utf8");
  const pwa = join(appRoot, "app", "_components", "resident-pwa.tsx");
  const proxy = readFileSync(join(appRoot, "proxy.ts"), "utf8");

  assert.ok(existsSync(manifest));
  assert.ok(existsSync(pwa));
  const manifestSource = readFileSync(manifest, "utf8");
  assert.match(manifestSource, /start_url:\s*"\/resident\/login"/);
  assert.match(manifestSource, /scope:\s*"\/resident\/"/);
  assert.match(manifestSource, /\/images\/FAVICON\.webp/);
  assert.match(manifestSource, /\/images\/resident-pwa-192\.webp/);
  assert.match(manifestSource, /\/images\/resident-pwa-512\.webp/);
  assert.ok(existsSync(join(appRoot, "public", "images", "resident-pwa-192.webp")));
  assert.ok(existsSync(join(appRoot, "public", "images", "resident-pwa-512.webp")));
  assert.match(manifestSource, /purpose:\s*"maskable"/);
  assert.doesNotMatch(manifestSource, /purpose:\s*"any maskable"/);
  assert.match(login, /manifest:\s*"\/resident\/manifest\.webmanifest"/);
  assert.match(login, /ResidentInstallPrompt/);
  assert.match(proxy, /path === "\/resident\/manifest\.webmanifest"/);
});

test("resident login uses the native browser PWA dialog without alert permissions", () => {
  const pwa = readFileSync(join(appRoot, "app", "_components", "resident-pwa.tsx"), "utf8");
  const layout = readFileSync(join(appRoot, "app", "resident", "layout.tsx"), "utf8");
  const worker = join(appRoot, "public", "resident-sw.js");

  assert.ok(existsSync(worker));
  assert.match(pwa, /navigator\.serviceWorker\.register\("\/resident-sw\.js", \{ scope: "\/resident\/" \}\)/);
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
  assert.doesNotMatch(workerSource, /notificationclick/);
  assert.doesNotMatch(layout, /ResidentBrowserNotifications/);
});
