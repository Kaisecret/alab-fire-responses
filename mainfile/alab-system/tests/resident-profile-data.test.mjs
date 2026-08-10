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
