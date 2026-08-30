import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
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
  assert.match(service, /canMunicipalResolveReport/);
  assert.doesNotMatch(service, /row\.status !== "RESPONDING"/);
  assert.match(detail, /RESOLVE INCIDENT/);
  assert.match(detail, /canMunicipalResolveReport/);
  assert.match(detail, /\/resolve/);
  assert.match(detail, /const isTerminal/);
});

test("municipal resolution can complete responders who have not reached the scene", () => {
  const migration = "supabase/migrations/20260831090000_allow_municipal_resolution_for_active_dispatches.sql";
  assert.equal(existsSync(join(process.cwd(), migration)), true, "resolution completion migration is missing");
  const sql = source(migration);
  assert.match(sql, /drop constraint/);
  assert.match(sql, /status = 'COMPLETED'/);
  assert.match(sql, /completed_at is not null/);
  assert.doesNotMatch(sql, /completed_at is null or on_scene_at is not null/);
});
