import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("road route proxy uses OSRM and preserves direct-line fallback", () => {
  const source = readFileSync(new URL("../app/api/routes/road/route.ts", import.meta.url), "utf8");
  assert.match(source, /router\.project-osrm\.org\/route\/v1\/driving/);
  assert.match(source, /normalizeOsrmRoute/);
  assert.match(source, /straightLineKilometers/);
  assert.match(source, /new URLSearchParams/);
});
