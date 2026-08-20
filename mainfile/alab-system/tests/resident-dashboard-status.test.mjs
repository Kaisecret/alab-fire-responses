import assert from "node:assert/strict";
import test from "node:test";

import { residentDashboardBucket } from "../lib/fire-reports/resident-dashboard-status.ts";

test("resident dashboard groups every operational fire-report status into the visible cards", () => {
  const expectedBuckets = {
    SUBMITTED: "submitted",
    PENDING_VERIFICATION: "submitted",
    UNDER_VERIFICATION: "verifying",
    NEEDS_MORE_INFO: "verifying",
    VERIFIED: "verifying",
    CONFIRMED: "verifying",
    RESPONDING: "responding",
    FIRETRUCK_DISPATCHED: "responding",
    RESPONDER_ARRIVED: "responding",
    UNDER_CONTROL: "responding",
    RESOLVED: "closed",
    CLOSED: "closed",
    REJECTED: "closed",
    FALSE_REPORT: "closed",
    DUPLICATE: "closed",
  };

  for (const [status, expected] of Object.entries(expectedBuckets)) {
    assert.equal(residentDashboardBucket(status), expected, `${status} must count as ${expected}`);
  }
});
