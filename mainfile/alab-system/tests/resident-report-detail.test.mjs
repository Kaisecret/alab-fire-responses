import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();

test("report details relies on the shared resident navigation instead of rendering a second mobile nav", () => {
  const detail = readFileSync(join(root, "app", "_content", "resident-report-detail-content.ts"), "utf8");
  const layout = readFileSync(join(root, "app", "resident", "layout.tsx"), "utf8");
  const mobileNavigation = readFileSync(join(root, "app", "_components", "resident-mobile-navigation.tsx"), "utf8");

  assert.doesNotMatch(detail, /detail-bottom-nav/);
  assert.match(layout, /<ResidentMobileNavigation activeKey=\{activeKey\} isProfileActive=\{isProfileActive\} \/>/);
  assert.match(mobileNavigation, /<nav className="rl-mobile-nav"/);
});
