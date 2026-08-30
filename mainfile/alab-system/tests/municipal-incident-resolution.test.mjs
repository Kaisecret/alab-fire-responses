import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const source = (path) => readFileSync(join(process.cwd(), path), "utf8");

test("only a municipal administrator can resolve a responding incident", () => {
  const mobileRoute = source("app/api/mobile-bfp/dispatches/[dispatchId]/route.ts");
  const municipalRoute = source("app/api/municipal-bfp/incidents/[id]/resolve/route.ts");
  const service = source("lib/municipal-bfp/dispatch.ts");
  const detail = source("app/_components/municipal-incident-detail.tsx");

  assert.doesNotMatch(mobileRoute, /RESOLVE_INCIDENT/);
  assert.match(municipalRoute, /requireMunicipalAdmin/);
  assert.match(municipalRoute, /resolveMunicipalIncident/);
  assert.match(service, /export async function resolveMunicipalIncident/);
  assert.match(service, /municipality_id = \$2/);
  assert.match(detail, /RESOLVE INCIDENT/);
  assert.match(detail, /\/resolve/);
  assert.match(detail, /const isTerminal/);
});
