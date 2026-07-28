import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

test("development HMR accepts the LAN origin from the standalone app root", () => {
  const config = readFileSync(join(process.cwd(), "next.config.ts"), "utf8");

  assert.match(config, /allowedDevOrigins:\s*\[[^\]]*"169\.254\.6\.6"/);
  assert.match(
    config,
    /turbopack:\s*\{[\s\S]*?root:\s*__dirname/,
  );
});
