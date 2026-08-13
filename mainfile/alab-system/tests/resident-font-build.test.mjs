import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();

test("resident authentication pages do not require Google Fonts during a Vercel build", () => {
  for (const page of ["login", "signup"]) {
    const source = readFileSync(join(root, "app", "resident", page, "page.tsx"), "utf8");

    assert.doesNotMatch(source, /next\/font\/google/);
    assert.doesNotMatch(source, /Plus_Jakarta_Sans/);
    assert.match(source, /fontVariableClassName=""/);
  }
});
