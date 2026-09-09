import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const source = (path) => readFileSync(join(root, path), "utf8");

test("provincial routes require the signed provincial identity", () => {
  const paths = [
    "app/api/provincial-bfp/incidents/route.ts",
    "app/api/provincial-bfp/incidents/[id]/route.ts",
    "app/api/provincial-bfp/assistance-requests/route.ts",
  ];
  for (const path of paths) {
    assert.equal(existsSync(join(root, path)), true, path + " is missing");
    assert.match(source(path), /requireProvincialBfp/);
  }
});

test("provincial read model joins observer and assistance lifecycle data", () => {
  const service = source("lib/intermunicipality/provincial.ts");
  assert.match(service, /incident_municipal_observers/);
  assert.match(service, /intermunicipal_assistance_requests/);
  assert.match(service, /listProvincialCoordinationIncidents/);
  assert.match(service, /getProvincialCoordinationIncident/);
  assert.match(service, /listProvincialAssistanceRequests/);
});

test("provincial coordination APIs are read-only", () => {
  const combined = [
    "app/api/provincial-bfp/incidents/route.ts",
    "app/api/provincial-bfp/incidents/[id]/route.ts",
    "app/api/provincial-bfp/assistance-requests/route.ts",
  ].map(source).join("\n");
  assert.match(combined, /export async function GET/);
  assert.doesNotMatch(combined, /export async function (POST|PATCH|DELETE)/);
});
