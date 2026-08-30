import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const source = (path) => readFileSync(join(root, path), "utf8");

test("approval migration preserves review history and adds correction and audit states", () => {
  const name = readdirSync(join(root, "supabase", "migrations"))
    .find((file) => file.endsWith("_add_resident_municipal_approval.sql"));
  assert.ok(name, "resident municipal approval migration is missing");
  const migration = source(join("supabase", "migrations", name));

  assert.match(migration, /PENDING_REVIEW/);
  assert.match(migration, /CHANGES_REQUESTED/);
  assert.match(migration, /application_reference/);
  assert.match(migration, /front_review_document_key/);
  assert.match(migration, /create table public\.resident_verification_events/i);
  assert.match(migration, /resident_addresses_municipality_primary_idx/i);
  assert.match(migration, /resident_verifications_review_queue_idx/i);
  assert.doesNotMatch(migration, /delete from public\.resident_verifications/i);
});

test("identity evidence creates protected watermarked review derivatives", () => {
  const path = "lib/resident-applications/evidence.ts";
  assert.equal(existsSync(join(root, path)), true, `${path} is missing`);
  const evidence = source(path);

  assert.match(evidence, /ALAB MUNICIPAL BFP REVIEW ONLY/);
  assert.match(evidence, /sha256/);
  assert.match(evidence, /sharp/);
  assert.match(evidence, /review\/\$\{kind\}-review/);
  assert.match(evidence, /createSignedUrl/);
  assert.match(evidence, /6 \* 1024 \* 1024/);
  assert.doesNotMatch(evidence, /getPublicUrl/);
});

test("selfies use a watermarked review derivative instead of exposing the private original", () => {
  const evidence = source("lib/resident-applications/evidence.ts");
  const service = source("lib/resident-applications/service.ts");
  const migrations = readdirSync(join(root, "supabase", "migrations"))
    .map((file) => source(join("supabase", "migrations", file)))
    .join("\n");

  assert.match(migrations, /selfie_review_document_key/i);
  assert.doesNotMatch(evidence, /if \(kind !== "selfie"\)/);
  assert.match(service, /selfie_review_document_key as "selfieReviewKey"/i);
  assert.match(service, /createIdentityEvidenceSignedUrl\(application\.selfieReviewKey\)/);
  assert.doesNotMatch(service, /createIdentityEvidenceSignedUrl\(application\.selfieKey\)/);
});

test("queue listing does not eagerly load image processing", () => {
  const service = source("lib/resident-applications/service.ts");

  assert.doesNotMatch(service, /import \{ createIdentityEvidenceSignedUrl \} from "\.\/evidence"/);
  assert.match(service, /await import\("\.\/evidence"\)/);
});

test("registration creates a pending applicant and never creates a resident session", () => {
  const registration = source("app/api/auth/register/route.ts");
  assert.match(registration, /request\.formData\(\)/);
  assert.match(registration, /PENDING_REVIEW/);
  assert.match(registration, /createResidentApplicantSession/);
  assert.match(registration, /resident_verification_events/);
  assert.doesNotMatch(registration, /createResidentSession/);
  assert.doesNotMatch(registration, /simulated\//);
});

test("pending resident login receives only applicant access", () => {
  const login = source("app/api/auth/login/route.ts");
  const session = source("lib/auth/session.ts");
  assert.match(session, /RESIDENT_APPLICANT_COOKIE/);
  assert.match(session, /createResidentApplicantSession/);
  assert.match(session, /verifyResidentApplicantSession/);
  assert.match(login, /ACCOUNT_UNDER_REVIEW/);
  assert.match(login, /APPLICATION_CHANGES_REQUESTED/);
  assert.match(login, /createResidentApplicantSession/);
  assert.match(login, /account_status\s*!==\s*"ACTIVE"/);
});

test("municipal resident application APIs are assignment and municipality scoped", () => {
  const paths = [
    "app/api/municipal-bfp/resident-applications/route.ts",
    "app/api/municipal-bfp/resident-applications/[applicationId]/route.ts",
    "app/api/municipal-bfp/resident-applications/[applicationId]/approve/route.ts",
    "app/api/municipal-bfp/resident-applications/[applicationId]/request-corrections/route.ts",
    "lib/resident-applications/service.ts",
  ];
  for (const path of paths) assert.equal(existsSync(join(root, path)), true, `${path} is missing`);

  const combined = paths.map(source).join("\n");
  assert.match(combined, /getBfpIdentity/);
  assert.match(combined, /municipalityId/);
  assert.match(combined, /resident_addresses/);
  assert.match(combined, /resident_verification_events/);
  assert.match(combined, /CHANGES_REQUESTED/);
  assert.match(combined, /PENDING_REVIEW/);
  assert.match(combined, /ACTIVE/);
  assert.doesNotMatch(combined, /front_document_key[^\n]+signed/i);
});

test("resident and municipal approval screens use real APIs and correct review language", () => {
  const municipal = source("app/municipal-bfp/verification-queue/page.tsx");
  const applicant = source("app/resident/application/page.tsx");
  const statusApi = source("app/api/resident/application-status/route.ts");

  assert.match(municipal, /Resident Applications/);
  assert.match(municipal, /api\/municipal-bfp\/resident-applications/);
  assert.match(municipal, /Request corrections/);
  assert.doesNotMatch(municipal, /VR-2025-0152/);
  assert.match(applicant, /Under review/);
  assert.match(applicant, /Changes requested/);
  assert.match(statusApi, /verifyResidentApplicantSession/);
});
