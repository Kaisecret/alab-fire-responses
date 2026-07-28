import assert from "node:assert/strict";
import test from "node:test";

import { checkDatabaseConnection } from "../lib/database-health";

test("reports a connected database after a successful probe", async () => {
  const result = await checkDatabaseConnection(async () => 1);

  assert.deepEqual(result, {
    status: "ok",
    database: "connected",
  });
});

test("reports an unavailable database without exposing the driver error", async () => {
  const result = await checkDatabaseConnection(async () => {
    throw new Error(
      "postgresql://secret-user:secret-password@example/db",
    );
  });

  assert.deepEqual(result, {
    status: "error",
    database: "unavailable",
  });
  assert.doesNotMatch(JSON.stringify(result), /secret/i);
});
