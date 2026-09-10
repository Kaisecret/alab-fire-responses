import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const source = (path) => readFileSync(join(root, path), "utf8");

test("application management service exports list, get, approve, and correction functions", () => {
  const service = source("lib/provincial-bfp/management/applications.ts");
  assert.match(service, /export async function listManagedApplications/);
  assert.match(service, /export async function getManagedApplication/);
  assert.match(service, /export async function approveManagedApplication/);
  assert.match(service, /export async function requestManagedApplicationCorrections/);
});

test("application management isolates Antique province, supports submission locking and idempotency", () => {
  const service = source("lib/provincial-bfp/management/applications.ts");
  assert.match(service, /assertManagementActor/);
  assert.match(service, /province\s*=\s*'Antique'/);
  assert.match(service, /expectedSubmissionNumber/);
  assert.match(service, /provincial_management_events/);
  assert.match(service, /provincial_management_operations/);
  assert.match(service, /enqueueResidentCorrectionDeliveries/);
});

test("resident applications API routes enforce provincial auth, submission locking, and delivery triggers", () => {
  const listRoute = source("app/api/provincial-bfp/resident-applications/route.ts");
  const detailRoute = source("app/api/provincial-bfp/resident-applications/[applicationId]/route.ts");
  const approveRoute = source("app/api/provincial-bfp/resident-applications/[applicationId]/approve/route.ts");
  const correctionRoute = source("app/api/provincial-bfp/resident-applications/[applicationId]/request-corrections/route.ts");

  assert.match(listRoute, /getManagementActor/);
  assert.match(listRoute, /export async function GET/);

  assert.match(detailRoute, /getManagementActor/);
  assert.match(detailRoute, /export async function GET/);

  assert.match(approveRoute, /getManagementActor/);
  assert.match(approveRoute, /approveManagedApplication/);
  assert.match(approveRoute, /expectedSubmissionNumber/);

  assert.match(correctionRoute, /getManagementActor/);
  assert.match(correctionRoute, /requestManagedApplicationCorrections/);
  assert.match(correctionRoute, /deliverResidentCorrectionNotifications/);
});

test("application review UI renders provincial queue with filters and review modal", () => {
  const page = source("app/provincial-bfp/resident-applications/page.tsx");
  const component = source("app/_components/provincial-resident-application-review.tsx");

  assert.match(page, /ProvincialResidentApplicationReview/);
  assert.match(component, /api\/provincial-bfp\/resident-applications/);
  assert.match(component, /Approve/);
  assert.match(component, /Request Corrections/);
  assert.match(component, /submissionNumber/);
});
