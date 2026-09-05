import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const appRoot = process.cwd();

test("next.config.ts configures immutable long-lived Cache-Control headers for static images", async () => {
  const configSource = readFileSync(join(appRoot, "next.config.ts"), "utf8");
  assert.match(configSource, /source:\s*["']\/images\/:path\*["']/);
  assert.match(configSource, /public,\s*max-age=31536000,\s*immutable/);
});

test("resident-sw.js precaches municipal, provincial, resident login and signup assets", () => {
  const workerSource = readFileSync(join(appRoot, "public", "resident-sw.js"), "utf8");
  assert.match(workerSource, /\/images\/formunicipallogin\.webp/);
  assert.match(workerSource, /\/images\/FOR PROVOCIAL SIDE\.webp/);
  assert.match(workerSource, /\/images\/side pic for login\.webp/);
  assert.match(workerSource, /\/images\/for sign up\.webp/);
  assert.match(workerSource, /\/images\/WHITE LOGO\.webp/);
  assert.match(workerSource, /\/images\/bg images\.webp/);
  assert.match(workerSource, /\/images\/phone\.webp/);
  assert.match(workerSource, /\/images\/BFPBACK\.webp/);
});

test("app/layout.tsx mounts AssetCacheWarmer for browser-level cache preheating", () => {
  const warmerPath = join(appRoot, "app", "_components", "asset-cache-warmer.tsx");
  const layoutSource = readFileSync(join(appRoot, "app", "layout.tsx"), "utf8");

  assert.ok(existsSync(warmerPath), "asset-cache-warmer.tsx must exist");
  const warmerSource = readFileSync(warmerPath, "utf8");
  assert.match(warmerSource, /window\.caches[\s\S]*?\.open/);
  assert.match(warmerSource, /img\.decode/);
  assert.match(layoutSource, /AssetCacheWarmer/);
});

test("municipal, provincial, resident login, and signup pages include image preloads", () => {
  const muniLogin = readFileSync(join(appRoot, "app", "municipal-bfp", "login", "page.tsx"), "utf8");
  const provLogin = readFileSync(join(appRoot, "app", "provincial-bfp", "login", "page.tsx"), "utf8");
  const resLogin = readFileSync(join(appRoot, "app", "resident", "login", "page.tsx"), "utf8");
  const resSignup = readFileSync(join(appRoot, "app", "resident", "signup", "page.tsx"), "utf8");
  const landing = readFileSync(join(appRoot, "app", "page.tsx"), "utf8");

  assert.match(muniLogin, /rel="preload"[^>]*\/images\/formunicipallogin\.webp/);
  assert.match(provLogin, /rel="preload"[^>]*\/images\/FOR%20PROVOCIAL%20SIDE\.webp/);
  assert.match(resLogin, /rel="preload"[^>]*\/images\/side%20pic%20for%20login\.webp/);
  assert.match(resSignup, /rel="preload"[^>]*\/images\/for%20sign%20up\.webp/);
  assert.match(landing, /rel="preload"[^>]*\/images\/phone\.webp/);
});
