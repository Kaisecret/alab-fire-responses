import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

test("the mobile browser chrome uses the ALAB emergency red theme", () => {
  const layout = readFileSync(join(process.cwd(), "app", "layout.tsx"), "utf8");
  assert.match(layout, /export const viewport: Viewport/);
  assert.match(layout, /themeColor:\s*"#D4140B"/);
});
