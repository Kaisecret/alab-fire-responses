import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const source = (path) => readFileSync(join(root, path), "utf8");

test("municipal assistance routes require administrators and derive municipality from session", () => {
  const acknowledgmentPath = "app/api/municipal-bfp/incidents/[id]/observer-acknowledgment/route.ts";
  const createPath = "app/api/municipal-bfp/incidents/[id]/assistance-requests/route.ts";
  const updatePath = "app/api/municipal-bfp/assistance-requests/[requestId]/route.ts";
  assert.equal(existsSync(join(root, acknowledgmentPath)), true);
  assert.equal(existsSync(join(root, createPath)), true);
  assert.equal(existsSync(join(root, updatePath)), true);
  const combined = source(acknowledgmentPath) + source(createPath) + source(updatePath);
  assert.match(combined, /requireMunicipalAdmin/);
  assert.match(combined, /acknowledgeNearbyIncident/);
  assert.match(combined, /createAssistanceRequests/);
  assert.match(combined, /transitionAssistanceRequest/);
  assert.doesNotMatch(combined, /body\.(actorUserId|requesterMunicipalityId|actorMunicipalityId)/);
});

test("municipal UI distinguishes owned and nearby incidents", () => {
  const feed = source("app/_components/use-municipal-incident-feed.ts");
  const page = source("app/municipal-bfp/active-incidents/page.tsx");
  const detail = source("app/_components/municipal-incident-detail.tsx");
  const panel = source("app/_components/intermunicipality-coordination-panel.tsx");
  assert.match(feed, /accessScope: "ORIGIN" \| "OBSERVER"/);
  assert.match(page, /Nearby incident/);
  assert.match(page, /searchParams\.get\("incident"\)/);
  assert.match(detail, /IntermunicipalityCoordinationPanel/);
  assert.match(detail, /incident\.accessScope === "ORIGIN"/);
  assert.match(panel, /Request Backup/);
  assert.match(panel, /Acknowledge Alert/);
  assert.match(panel, /Waiting/);
  assert.match(panel, /Seen/);
  assert.match(panel, /Backup requested/);
  assert.match(panel, /Monitoring only/);
  assert.match(panel, /PARTIAL_ACCEPT/);
});
