import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
test("Municipal incident APIs require the assigned BFP identity and dispatch station teams", () => {
  const queue = readFileSync(join(root, "app", "api", "municipal-bfp", "incidents", "route.ts"), "utf8");
  const detail = readFileSync(join(root, "app", "api", "municipal-bfp", "incidents", "[id]", "route.ts"), "utf8");
  const respond = readFileSync(join(root, "app", "api", "municipal-bfp", "incidents", "[id]", "respond", "route.ts"), "utf8");
  assert.match(queue, /bfpSessionCookieName\("MUNICIPAL_BFP"\)/);
  assert.match(queue, /session\.role !== "MUNICIPAL_BFP"/);
  assert.match(detail, /resident_profiles/);
  assert.match(detail, /resident_addresses/);
  assert.match(detail, /reporter_ip_address::text as "reporterIpAddress"/);
  assert.match(detail, /reporter_device_summary as "reporterDeviceSummary"/);
  assert.match(detail, /where fr\.id = \$1 and fr\.municipality_id = \$2/);
  assert.match(respond, /requireMunicipalAdmin/);
  assert.match(respond, /listDispatchableStations/);
  assert.match(respond, /dispatchIncidentToStations/);
  assert.match(respond, /stationIds/);
  assert.match(respond, /selectAllStations/);
});
