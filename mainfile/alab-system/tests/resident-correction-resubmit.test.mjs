import assert from "node:assert/strict";
import test from "node:test";
import { loadServerModule } from "./helpers/load-server-module.mjs";

/*
 * The resident correction resubmit route must always answer with JSON the
 * resident's client can render. When a failure escaped the handler, the
 * runtime replied with a bare 500 carrying no JSON error field, and the
 * client fell back to generic "unexpected response" wording that named
 * neither the cause nor a next step.
 *
 * Each case below injects a failure at one boundary and asserts a safe JSON
 * response, and that no internal database or storage text reaches the
 * resident.
 */

const SENTINEL = "INTERNAL-SENTINEL-do-not-show-a-resident";

// The route gates on `instanceof File`, so these must be real File objects.
const imageFile = (name) => new File([new Uint8Array(2048)], name, { type: "image/jpeg" });

function formWith(overrides = {}) {
  const fields = {
    firstName: "Juan", lastName: "Dela Cruz", address: "Mapatag", barangay: "Nato",
    frontId: imageFile("front.jpg"), selfie: imageFile("selfie.jpg"), backId: null,
    ...overrides,
  };
  return { get: (key) => fields[key] ?? null };
}

function loadRoute({ query, upload, transaction, remove }) {
  return loadServerModule("app/api/resident/application-status/resubmit/route.ts", {
    "next/server": {
      NextResponse: {
        json: (body, init) => ({ body, status: init?.status ?? 200 }),
      },
    },
    "../../../../../lib/auth/session": {
      RESIDENT_APPLICANT_COOKIE: "c",
      verifyResidentApplicantSession: () => ({ userId: "11111111-1111-4111-8111-111111111111" }),
    },
    "../../../../../lib/db": {
      getDatabase: () => ({ query: query ?? (async () => ({ rows: [], rowCount: 0 })) }),
      withTransaction: transaction ?? (async (work) => work({ query: async () => ({ rowCount: 1 }) })),
    },
    "../../../../../lib/resident-applications/evidence": {
      uploadIdentityEvidence: upload ?? (async () => ({
        front: { originalKey: "f", reviewKey: "fr", sha256: "a", mimeType: "image/jpeg", sizeBytes: 1 },
        back: null,
        selfie: { originalKey: "s", reviewKey: "sr", sha256: "b", mimeType: "image/jpeg", sizeBytes: 1 },
        uploadedKeys: ["f", "fr", "s", "sr"],
      })),
      removeIdentityEvidence: remove ?? (async () => {}),
    },
    "../../../../../lib/notifications/service": {
      createAccountNotifications: async () => 0,
      listMunicipalNotificationRecipients: async () => [],
    },
  });
}

const changesRequestedRow = {
  rows: [{
    profile_id: "p1", verification_id: "v1", municipality_id: "m1",
    status: "CHANGES_REQUESTED", submission_number: 1,
  }],
  rowCount: 1,
};

const call = async (route) => route.POST({ cookies: { get: () => ({ value: "session" }) }, formData: async () => formWith() });

test("application lookup failure answers with JSON instead of escaping as a bare 500", async () => {
  const route = loadRoute({ query: async () => { throw new Error(SENTINEL); } });
  const response = await call(route);

  assert.equal(response.status, 500);
  assert.equal(typeof response.body.error, "string");
  assert.doesNotMatch(response.body.error, new RegExp(SENTINEL));
});

test("barangay lookup failure answers with JSON instead of escaping as a bare 500", async () => {
  let call_ = 0;
  const route = loadRoute({
    query: async () => {
      call_ += 1;
      if (call_ === 1) return changesRequestedRow;
      throw new Error(SENTINEL);
    },
  });
  const response = await call(route);

  assert.equal(response.status, 500);
  assert.doesNotMatch(response.body.error, new RegExp(SENTINEL));
});

test("evidence upload failure answers with JSON and does not leak storage detail", async () => {
  let call_ = 0;
  const route = loadRoute({
    query: async () => (++call_ === 1 ? changesRequestedRow : { rows: [{ barangay_id: "b1" }], rowCount: 1 }),
    upload: async () => { throw new Error(SENTINEL); },
  });
  const response = await call(route);

  assert.equal(response.status, 500);
  assert.doesNotMatch(response.body.error, new RegExp(SENTINEL));
});

test("transaction failure answers with JSON and never reports a persisted submission", async () => {
  let call_ = 0;
  const route = loadRoute({
    query: async () => (++call_ === 1 ? changesRequestedRow : { rows: [{ barangay_id: "b1" }], rowCount: 1 }),
    transaction: async () => { throw new Error(SENTINEL); },
  });
  const response = await call(route);

  assert.equal(response.status, 500);
  assert.equal(response.body.application, undefined);
  assert.doesNotMatch(response.body.error, new RegExp(SENTINEL));
});

test("cleanup failure does not replace the original error response", async () => {
  // removeIdentityEvidence builds a storage client that throws when the
  // storage key is unusable. Running it before the response was built meant
  // that throw escaped the catch and became a bare 500.
  let call_ = 0;
  const route = loadRoute({
    query: async () => (++call_ === 1 ? changesRequestedRow : { rows: [{ barangay_id: "b1" }], rowCount: 1 }),
    transaction: async () => { throw new Error("transaction failed"); },
    remove: async () => { throw new Error("SUPABASE_SECRET_KEY is required"); },
  });
  const response = await call(route);

  assert.equal(response.status, 500);
  assert.equal(typeof response.body.error, "string");
  assert.doesNotMatch(response.body.error, /SUPABASE/i);
});

test("a successful resubmission returns the reference, PENDING status, and a timestamp", async () => {
  let call_ = 0;
  let removed = false;
  const route = loadRoute({
    query: async () => (++call_ === 1 ? changesRequestedRow : { rows: [{ barangay_id: "b1" }], rowCount: 1 }),
    remove: async () => { removed = true; },
  });
  const response = await call(route);

  assert.equal(response.status, 200);
  assert.equal(response.body.application.status, "PENDING");
  assert.match(response.body.application.reference, /^ALAB-APP-/);
  assert.equal(typeof response.body.application.submittedAt, "string");
  assert.equal(removed, false, "committed evidence must never be deleted");
});

test("a resident whose application is not awaiting corrections gets 409, not a 500", async () => {
  const route = loadRoute({
    query: async () => ({ rows: [{ ...changesRequestedRow.rows[0], status: "PENDING" }], rowCount: 1 }),
  });
  const response = await call(route);

  assert.equal(response.status, 409);
});
