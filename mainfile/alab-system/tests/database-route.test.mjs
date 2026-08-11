import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("database health route probes PostgreSQL without exposing errors", async () => {
  const route = await readFile(
    "app/api/health/database/route.ts",
    "utf8",
  );

  assert.match(route, /runtime\s*=\s*"nodejs"/);
  assert.match(route, /dynamic\s*=\s*"force-dynamic"/);
  assert.match(route, /checkDatabaseConnection/);
  assert.match(route, /\$queryRaw`SELECT 1`/);
  assert.match(route, /result\.status === "ok" \? 200 : 503/);
  assert.doesNotMatch(route, /error\.(?:message|stack)/);
});
