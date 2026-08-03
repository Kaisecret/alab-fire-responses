import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
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

test("resident routes disable mobile browser zoom without changing other modules", () => {
  const layoutPath = join(root, "app", "resident", "layout.tsx");
  assert.equal(existsSync(layoutPath), true, "resident viewport layout is missing");

  const layout = readFileSync(layoutPath, "utf8");
  const styles = readFileSync(
    join(root, "app", "_content", "resident-home-content.ts"),
    "utf8",
  );

  assert.match(layout, /export const viewport:\s*Viewport/);
  assert.match(layout, /width:\s*"device-width"/);
  assert.match(layout, /initialScale:\s*1/);
  assert.match(layout, /minimumScale:\s*1/);
  assert.match(layout, /maximumScale:\s*1/);
  assert.match(layout, /userScalable:\s*false/);
  assert.match(layout, /viewportFit:\s*"cover"/);
  assert.match(layout, /themeColor:\s*\[/);
  assert.match(layout, /media:\s*"\(max-width: 1024px\)"/);
  assert.match(layout, /color:\s*"#DD2213"/);
  assert.match(styles, /\.dashboard-page-root\s*\{[\s\S]*?touch-action:\s*pan-x pan-y/);
});
