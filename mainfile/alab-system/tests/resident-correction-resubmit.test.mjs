import assert from "node:assert/strict";
import test from "node:test";
import { loadServerModule } from "./helpers/load-server-module.mjs";

const sentinel = "PRIVATE_DATABASE_OR_STORAGE_DETAIL";
function harness(failure) {
  const calls = { cleanup: [], writes: [], logs: [], uploads: 0 };
  const asset = { originalKey: "test/original", reviewKey: "test/review", sha256: "sha", mimeType: "image/jpeg", sizeBytes: 3 };
  const database = {
    async query(sql) {
      if (sql.includes("from resident_profiles")) {
        if (failure === "lookup") throw new Error(sentinel);
        return { rows: [{ profile_id: "profile", verification_id: "previous", municipality_id: "municipality", status: "CHANGES_REQUESTED", submission_number: 1 }], rowCount: 1 };
      }
      if (failure === "locality") throw new Error(sentinel);
      return { rows: [{ barangay_id: "barangay" }], rowCount: 1 };
    },
  };
  const { POST } = loadServerModule("app/api/resident/application-status/resubmit/route.ts", {
    "next/server": { NextResponse: { json: (body, init) => Response.json(body, init) } },
    "../../../../../lib/auth/session": {
      RESIDENT_APPLICANT_COOKIE: "applicant",
      verifyResidentApplicantSession: () => {
        if (failure === "session") throw new Error(sentinel);
        return failure === "unauthorized" ? null : { userId: "resident" };
      },
    },
    "../../../../../lib/db": {
      getDatabase: () => database,
      async withTransaction(work) {
        const result = await work({ async query(sql, params) {
          if (failure === "transaction" || failure === "cleanup") throw new Error(sentinel);
          if (sql.includes("select id, status from resident_verifications")) {
            return { rows: [{ id: failure === "stale" ? "newer-verification" : "previous", status: failure === "stale" ? "PENDING" : "CHANGES_REQUESTED" }], rowCount: 1 };
          }
          calls.writes.push({ sql, params });
          return { rows: [], rowCount: 1 };
        } });
        if (failure === "commit") throw new Error(sentinel);
        return result;
      },
    },
    "../../../../../lib/resident-applications/evidence": {
      async uploadIdentityEvidence() {
        calls.uploads++;
        if (failure === "upload") throw new Error(sentinel);
        return { front: asset, back: null, selfie: asset, uploadedKeys: ["test/original", "test/review"] };
      },
      async removeIdentityEvidence(keys) {
        calls.cleanup.push(keys);
        if (failure === "cleanup") throw new Error(sentinel);
      },
    },
    "../../../../../lib/notifications/service": {
      async listMunicipalNotificationRecipients() { return ["municipal-user"]; },
      async createAccountNotifications() {
        if (failure === "notification") throw new Error(sentinel);
      },
    },
  });
  const form = new FormData();
  for (const [key, value] of Object.entries({ firstName: "Test", lastName: "Resident", address: "Test address", barangay: "Test barangay" })) form.set(key, value);
  form.set("frontId", new File(["jpg"], "front.jpg", { type: "image/jpeg" }));
  form.set("selfie", new File(["jpg"], "selfie.jpg", { type: "image/jpeg" }));
  return {
    calls, form,
    async submit() {
      const oldError = console.error;
      console.error = (...args) => calls.logs.push(args);
      try { return await POST({ cookies: { get: () => ({ value: "test-session" }) }, formData: async () => form }); }
      finally { console.error = oldError; }
    },
  };
}

for (const failure of ["session", "lookup", "locality", "upload", "transaction", "notification", "cleanup", "commit"]) {
  test(`resubmit returns safe JSON after ${failure} failure`, async () => {
    const h = harness(failure);
    const response = await h.submit();
    assert.equal(response.status, 500);
    const body = await response.json();
    assert.equal(typeof body.error, "string");
    assert.match(body.requestId, /^[a-f0-9-]{36}$/);
    assert.doesNotMatch(JSON.stringify(body), new RegExp(sentinel));
    assert.doesNotMatch(JSON.stringify(h.calls.logs), new RegExp(sentinel));
    if (["session", "lookup", "locality"].includes(failure)) assert.equal(h.calls.uploads, 0);
    if (failure === "transaction" || failure === "cleanup" || failure === "notification") assert.deepEqual(h.calls.cleanup, [["test/original", "test/review"]]);
    if (failure === "commit") assert.deepEqual(h.calls.cleanup, [], "uncertain commit must retain potentially referenced evidence");
  });
}

test("resubmit success returns the persisted reference/timestamp and keeps evidence", async () => {
  const h = harness();
  const response = await h.submit();
  assert.equal(response.status, 200);
  const { application } = await response.json();
  assert.equal(application.status, "PENDING");
  const inserts = h.calls.writes.filter(({sql}) => sql.includes("insert into resident_verifications"));
  assert.equal(inserts.length, 1);
  assert.equal(inserts[0].params[2], application.reference);
  assert.equal(inserts[0].params.at(-1).toISOString(), application.submittedAt);
  assert.deepEqual(h.calls.cleanup, []);
});

test("unauthorized resubmission does not upload or persist anything", async () => {
  const h = harness("unauthorized");
  assert.equal((await h.submit()).status, 401);
  assert.equal(h.calls.uploads, 0);
  assert.deepEqual(h.calls.writes, []);
});

test("unsupported evidence is rejected before uploads", async () => {
  const h = harness();
  h.form.set("frontId", new File(["not an image"], "front.txt", { type: "text/plain" }));
  assert.equal((await h.submit()).status, 400);
  assert.equal(h.calls.uploads, 0);
});


test("a newer verification appearing during upload prevents a duplicate submission", async () => {
  const h = harness("stale");
  const response = await h.submit();
  assert.equal(response.status, 409);
  assert.equal(h.calls.writes.filter(({ sql }) => sql.includes("insert into resident_verifications")).length, 0);
  assert.deepEqual(h.calls.cleanup, [["test/original", "test/review"]]);
});

test("oversized evidence is rejected before upload", async () => {
  const h = harness();
  h.form.set("selfie", new File([new Uint8Array(6 * 1024 * 1024 + 1)], "selfie.jpg", { type: "image/jpeg" }));
  assert.equal((await h.submit()).status, 400);
  assert.equal(h.calls.uploads, 0);
});
