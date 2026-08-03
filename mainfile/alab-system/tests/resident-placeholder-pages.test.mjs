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
