import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const source = (path) => readFileSync(join(process.cwd(), path), "utf8");

test("dispatch registers protected BFP devices and sends Firebase alerts to assigned users", () => {
  const deviceRoute = "app/api/mobile-bfp/devices/route.ts";
  const sender = "lib/notifications/fcm.ts";
  assert.equal(existsSync(join(process.cwd(), deviceRoute)), true, "mobile device route is missing");
  assert.equal(existsSync(join(process.cwd(), sender)), true, "Firebase sender is missing");
  assert.match(source(deviceRoute), /requireMobileMunicipalBfp/);
  assert.match(source(deviceRoute), /registerMobileDevice/);
  assert.match(source(sender), /FIREBASE_SERVICE_ACCOUNT_JSON/);
  assert.match(source(sender), /sendDispatchPush/);
  assert.match(source(sender), /input\.barangay/);
  assert.match(source(sender), /input\.municipalityName/);
  const dispatch = source("lib/municipal-bfp/dispatch.ts");
  assert.match(dispatch, /await sendDispatchPush\(dispatch\)/);
  assert.match(dispatch, /barangay: report\.barangay/);
  assert.match(dispatch, /municipalityName: input\.municipalityName/);
  assert.doesNotMatch(dispatch, /void sendDispatchPush\(dispatch\)/);
});
