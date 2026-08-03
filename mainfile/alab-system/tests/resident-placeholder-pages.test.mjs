import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const residentPages = ["reports", "guide", "profile"];

test("resident placeholder pages close their HTML template literals", () => {
  for (const page of residentPages) {
    const source = readFileSync(
      join(root, "app", "resident", page, "page.tsx"),
      "utf8",
    );

    assert.match(source, /^`;$/m, `${page} page has an unterminated template`);
    assert.doesNotMatch(source, /^\\`;$/m, `${page} page escapes its closing backtick`);
  }
});

test("resident mobile navigation remains inside narrow zoomed viewports", () => {
  const source = readFileSync(
    join(root, "app", "_content", "resident-home-content.ts"),
    "utf8",
  );

  assert.match(source, /\.dashboard-page-root\s*\{[\s\S]*?overflow-x:\s*clip/);
  assert.match(
    source,
    /\.mobile-bottom-nav\s*\{[\s\S]*?left:\s*0;[\s\S]*?right:\s*0;[\s\S]*?width:\s*auto;[\s\S]*?max-width:\s*100vw/,
  );
  assert.match(
    source,
    /\.mobile-nav-item\s*\{[\s\S]*?flex:\s*1 1 0;[\s\S]*?min-width:\s*0/,
  );
  assert.match(
    source,
    /\.mobile-nav-fab-wrapper\s*\{[\s\S]*?flex:\s*1 1 0;[\s\S]*?min-width:\s*0/,
  );
});
