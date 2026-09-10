import assert from "node:assert/strict";
import test from "node:test";

import {
  parseManagementFilters,
  parseReportFilters,
} from "../lib/provincial-bfp/management/filters.ts";
import {
  assertManagementActor,
  computeRecordVersion,
  assertVersionMatch,
} from "../lib/provincial-bfp/management/scope.ts";

test("parseManagementFilters accepts valid filters and enforces defaults", () => {
  const defaults = parseManagementFilters(new URLSearchParams());
  assert.equal(defaults.page, 1);
  assert.equal(defaults.pageSize, 25);

  const custom = parseManagementFilters(new URLSearchParams({
    municipalityId: "a4ba607b-8863-4f0f-bcaf-a86beb0acb29",
    page: "3",
    pageSize: "50",
    search: "San Jose",
    status: "ACTIVE",
    from: "2026-01-01",
    to: "2026-01-31",
  }));
  assert.equal(custom.page, 3);
  assert.equal(custom.pageSize, 50);
  assert.equal(custom.municipalityId, "a4ba607b-8863-4f0f-bcaf-a86beb0acb29");
  assert.equal(custom.search, "San Jose");
  assert.equal(custom.status, "ACTIVE");
  assert.equal(custom.from, "2026-01-01");
  assert.equal(custom.to, "2026-01-31");
});

test("parseManagementFilters rejects invalid page size, negative page, and malformed UUIDs", () => {
  assert.throws(
    () => parseManagementFilters(new URLSearchParams("pageSize=101")),
    /INVALID_PAGE_SIZE/,
  );
  assert.throws(
    () => parseManagementFilters(new URLSearchParams("pageSize=10")),
    /INVALID_PAGE_SIZE/,
  );
  assert.throws(
    () => parseManagementFilters(new URLSearchParams("page=0")),
    /INVALID_PAGE/,
  );
  assert.throws(
    () => parseManagementFilters(new URLSearchParams("page=-5")),
    /INVALID_PAGE/,
  );
  assert.throws(
    () => parseManagementFilters(new URLSearchParams("municipalityId=not-a-uuid")),
    /INVALID_UUID/,
  );
  assert.throws(
    () => parseManagementFilters(new URLSearchParams("stationId=bad-uuid-here")),
    /INVALID_UUID/,
  );
  assert.throws(
    () => parseManagementFilters(new URLSearchParams("barangayId=123-malformed")),
    /INVALID_UUID/,
  );
});

test("parseReportFilters extracts report-specific parameters safely", () => {
  const filters = parseReportFilters(new URLSearchParams({
    reportSource: "ALAB_APP",
    fireType: "HOUSE_BUILDING",
    severity: "CRITICAL",
    page: "2",
    pageSize: "100",
  }));
  assert.equal(filters.reportSource, "ALAB_APP");
  assert.equal(filters.fireType, "HOUSE_BUILDING");
  assert.equal(filters.severity, "CRITICAL");
  assert.equal(filters.page, 2);
  assert.equal(filters.pageSize, 100);

  const phoneCall = parseReportFilters(new URLSearchParams("reportSource=PHONE_CALL"));
  assert.equal(phoneCall.reportSource, "PHONE_CALL");

  assert.throws(
    () => parseReportFilters(new URLSearchParams("reportSource=INVALID_SOURCE")),
    /INVALID_REPORT_SOURCE/,
  );
});

test("assertManagementActor validates role, province, and identity integrity", () => {
  const validActor = {
    userId: "afbc9f03-312c-4208-a15c-05f87a3ad6fe",
    role: "PROVINCIAL_BFP",
    province: "Antique",
  };
  assert.doesNotThrow(() => assertManagementActor(validActor));

  assert.throws(
    () => assertManagementActor(null),
    /UNAUTHORIZED_ACTOR/,
  );
  assert.throws(
    () => assertManagementActor({ ...validActor, role: "MUNICIPAL_BFP" }),
    /FORBIDDEN_ROLE/,
  );
  assert.throws(
    () => assertManagementActor({ ...validActor, province: "Iloilo" }),
    /FORBIDDEN_PROVINCE/,
  );
  assert.throws(
    () => assertManagementActor({ ...validActor, userId: "bad-id" }),
    /INVALID_ACTOR_ID/,
  );
});

test("computeRecordVersion and assertVersionMatch handle optimistic concurrency", () => {
  const id = "a4ba607b-8863-4f0f-bcaf-a86beb0acb29";
  const date = new Date("2026-09-10T12:00:00Z");
  const version1 = computeRecordVersion({ id, updatedAt: date });
  const version2 = computeRecordVersion({ id, updatedAt: date });
  assert.equal(version1, version2);

  const laterDate = new Date("2026-09-10T12:05:00Z");
  const version3 = computeRecordVersion({ id, updatedAt: laterDate });
  assert.notEqual(version1, version3);

  assert.doesNotThrow(() => assertVersionMatch(version1, version1));
  assert.throws(
    () => assertVersionMatch(version1, version3),
    /STALE_REVISION_CONFLICT/,
  );
});
