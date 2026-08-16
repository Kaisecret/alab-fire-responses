import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();

test("Municipal BFP incident map renders a protected road route and direct line", () => {
  const map = readFileSync(join(root, "app", "_components", "municipal-incident-map.tsx"), "utf8");
  const detail = readFileSync(join(root, "app", "_components", "municipal-incident-detail.tsx"), "utf8");
  assert.match(map, /leaflet/);
  assert.match(map, /\/api\/routes\/road/);
  assert.match(map, /polyline/);
  assert.match(map, /Direct line/);
  assert.match(map, /Road route/);
  assert.match(detail, /\/api\/municipal-bfp\/incidents/);
  assert.match(detail, /RESPOND/);
  assert.match(detail, /Resident emergency profile/);
});
