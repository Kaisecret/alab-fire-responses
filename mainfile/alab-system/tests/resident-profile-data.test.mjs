import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const appRoot = process.cwd();

test("resident profile reads only the signed-in resident's database record", () => {
  const routePath = join(appRoot, "app", "api", "resident", "profile", "route.ts");
  assert.ok(existsSync(routePath));
  const route = readFileSync(routePath, "utf8");
  const page = readFileSync(join(appRoot, "app", "resident", "profile", "page.tsx"), "utf8");

  assert.match(route, /verifyResidentSession/);
  assert.match(route, /WHERE u\.id = \$1/);
  assert.match(route, /resident_profiles/);
  assert.match(page, /fetch\("\/api\/resident\/profile"\)/);
  assert.match(page, /data-profile-field/);
});

test("resident mobile settings use the same vertical rhythm as personal information", () => {
  const content = readFileSync(join(appRoot, "app", "_content", "resident-profile-content.ts"), "utf8");

  assert.match(content, /\.settings-menu-card\s*\{[\s\S]*?padding:\s*1\.5rem\s*!important/);
  assert.match(content, /\.settings-item\s*\{\s*padding:\s*1rem 0\s*!important/);
  assert.match(content, /\.settings-menu-card \.profile-card-header\s*\{[\s\S]*?margin-bottom:\s*1\.2rem/);
});
