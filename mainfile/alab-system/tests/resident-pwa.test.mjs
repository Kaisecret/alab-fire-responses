import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const appRoot = process.cwd();

test("resident login exposes an installable, icon-branded PWA only for the resident portal", () => {
  const manifest = join(appRoot, "app", "resident", "manifest.ts");
  const login = readFileSync(join(appRoot, "app", "resident", "login", "page.tsx"), "utf8");
  const pwa = join(appRoot, "app", "_components", "resident-pwa.tsx");

  assert.ok(existsSync(manifest));
  assert.ok(existsSync(pwa));
  const manifestSource = readFileSync(manifest, "utf8");
  assert.match(manifestSource, /start_url:\s*"\/resident\/login"/);
  assert.match(manifestSource, /scope:\s*"\/resident\/"/);
  assert.match(manifestSource, /\/images\/FAVICON\.webp/);
  assert.match(manifestSource, /purpose:\s*"maskable"/);
  assert.doesNotMatch(manifestSource, /purpose:\s*"any maskable"/);
  assert.match(login, /manifest:\s*"\/resident\/manifest\.webmanifest"/);
  assert.match(login, /ResidentInstallPrompt/);
});

test("resident notifications register a scoped worker and request browser permission from a user action", () => {
  const pwa = readFileSync(join(appRoot, "app", "_components", "resident-pwa.tsx"), "utf8");
  const layout = readFileSync(join(appRoot, "app", "resident", "layout.tsx"), "utf8");
  const worker = join(appRoot, "public", "resident-sw.js");

  assert.ok(existsSync(worker));
  assert.match(pwa, /navigator\.serviceWorker\.register\("\/resident-sw\.js", \{ scope: "\/resident\/" \}\)/);
  assert.match(pwa, /beforeinstallprompt/);
  assert.match(pwa, /Notification\.requestPermission\(\)/);
  assert.match(pwa, /showNotification/);
  assert.match(pwa, /actionHref\?\.startsWith\("\/resident\/"\)/);
  assert.match(readFileSync(worker, "utf8"), /notificationclick/);
  assert.match(readFileSync(worker, "utf8"), /requestedUrl\.startsWith\("\/resident\/"\)/);
  assert.match(layout, /ResidentBrowserNotifications/);
});
