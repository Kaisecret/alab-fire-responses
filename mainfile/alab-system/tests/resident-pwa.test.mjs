import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import sharp from "sharp";

const appRoot = process.cwd();

test("resident login exposes an installable, icon-branded PWA only for the resident portal", async () => {
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
  assert.ok(existsSync(join(appRoot, "public", "images", "iconfor pwa.png")));
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
  assert.match(login, /manifest:\s*"\/resident-manifest\.webmanifest"/);
  assert.match(login, /ResidentInstallPrompt/);
  assert.match(readFileSync(pwa, "utf8"), /src="\/images\/resident-pwa-192\.png"/);
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
