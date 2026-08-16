import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

test("private incident photo storage is documented as server-only", () => {
  const config = readFileSync(join(process.cwd(), ".env.example"), "utf8");
  assert.match(config, /SUPABASE_SECRET_KEY/);
  assert.match(config, /private[\s\S]*fire-report/i);
  assert.match(config, /8 MB/);
});
