import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const contentPath = join(root, "app", "_content", "user-modules.ts");

test("web role content model defines exactly the three web users", () => {
  assert.equal(existsSync(contentPath), true, "user module content is missing");

  const content = readFileSync(contentPath, "utf8");

  assert.match(
    content,
    /export type WebRoleKey = "resident" \| "municipal-bfp" \| "provincial-bfp"/,
  );
  assert.match(content, /resident:\s*\{/);
  assert.match(content, /"municipal-bfp":\s*\{/);
  assert.match(content, /"provincial-bfp":\s*\{/);
  assert.doesNotMatch(content, /firefighter/i);
});

test("each web role module includes actions, highlights, and sections", () => {
  const content = readFileSync(contentPath, "utf8");

  for (const key of ["resident", "municipal-bfp", "provincial-bfp"]) {
    const start = content.indexOf(`${JSON.stringify(key)}:`);
    const fallbackStart = content.indexOf(`${key}:`);
    const index = start >= 0 ? start : fallbackStart;

    assert.notEqual(index, -1, `${key} content is missing`);

    const nextRoleIndexes = ["resident", "municipal-bfp", "provincial-bfp"]
      .map((otherKey) => {
        if (otherKey === key) return -1;
        const quoted = content.indexOf(
          `${JSON.stringify(otherKey)}:`,
          index + 1,
        );
        const plain = content.indexOf(`${otherKey}:`, index + 1);
        return quoted >= 0 ? quoted : plain;
      })
      .filter((value) => value > index);
    const end =
      nextRoleIndexes.length > 0 ? Math.min(...nextRoleIndexes) : content.length;
    const block = content.slice(index, end);

    assert.match(block, /primaryActions:\s*\[/, `${key} actions missing`);
    assert.match(block, /highlights:\s*\[/, `${key} highlights missing`);
    assert.match(block, /sections:\s*\[/, `${key} sections missing`);
  }
});
