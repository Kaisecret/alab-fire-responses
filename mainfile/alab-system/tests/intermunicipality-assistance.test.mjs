import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import {
  validateAssistanceTransition,
  validateRequestedResources,
} from "../lib/intermunicipality/assistance-state.ts";

const source = (path) => readFileSync(join(process.cwd(), path), "utf8");

test("request validation requires at least one resource", () => {
  assert.throws(
    () => validateRequestedResources(0, 0),
    /ASSISTANCE_RESOURCES_REQUIRED/,
  );
  assert.deepEqual(validateRequestedResources(1, 4), {
    requestedFiretrucks: 1,
    requestedPersonnel: 4,
  });
});

test("transition validation enforces accepted, partial, rejected, and cancel quantities", () => {
  assert.equal(
    validateAssistanceTransition("REQUESTED", "ACCEPT", 1, 4, 1, 4).nextStatus,
    "ACCEPTED",
  );
  assert.equal(
    validateAssistanceTransition("REQUESTED", "PARTIAL_ACCEPT", 1, 4, 0, 2).nextStatus,
    "PARTIALLY_ACCEPTED",
  );
  assert.equal(
    validateAssistanceTransition("REQUESTED", "REJECT", 1, 4, 0, 0).nextStatus,
    "REJECTED",
  );
  assert.equal(
    validateAssistanceTransition("REQUESTED", "CANCEL", 1, 4, 0, 0).nextStatus,
    "CANCELLED",
  );
  assert.throws(
    () => validateAssistanceTransition("ACCEPTED", "REJECT", 1, 4, 0, 0),
    /ASSISTANCE_STATE_CONFLICT/,
  );
});

test("assistance service locks rows, scopes actors, audits, and deduplicates notifications", () => {
  const service = source("lib/intermunicipality/assistance.ts");
  assert.match(service, /for update/i);
  assert.match(service, /observer_municipality_id = any\(\$[0-9]+::uuid\[\]\)/i);
  assert.match(service, /requester_municipality_id = \$[0-9]+/i);
  assert.match(service, /recipient_municipality_id = \$[0-9]+/i);
  assert.match(service, /recordCoordinationEvent/);
  assert.match(service, /ASSISTANCE_REQUESTED/);
  assert.match(service, /ASSISTANCE_PARTIALLY_ACCEPTED/);
  assert.match(service, /on conflict/i);
});
