import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
test("resident report APIs own their reports and accept controlled FormData uploads", () => {
  const createRoute = readFileSync(join(root, "app", "api", "resident", "fire-reports", "route.ts"), "utf8");
  const detailRoute = readFileSync(join(root, "app", "api", "resident", "fire-reports", "[id]", "route.ts"), "utf8");
  const service = readFileSync(join(root, "lib", "fire-reports", "service.ts"), "utf8");
  assert.match(createRoute, /verifyResidentSession/);
  assert.match(createRoute, /request\.formData\(\)/);
  assert.match(createRoute, /validateFireReportInput/);
  assert.match(createRoute, /uploadFireReportPhoto/);
  assert.match(service, /rp\.user_id = \$2/);
  assert.match(detailRoute, /getFireReportPhotoUrl/);
});

test("a photo storage failure cannot prevent an emergency report from being saved", () => {
  const createRoute = readFileSync(join(root, "app", "api", "resident", "fire-reports", "route.ts"), "utf8");

  assert.match(createRoute, /createResidentFireReport\(session\.userId, input\)/);
  assert.match(createRoute, /attachFireReportPhoto\(report\.id, uploadedPhoto\)/);
  assert.match(createRoute, /photoWarning/);
});
