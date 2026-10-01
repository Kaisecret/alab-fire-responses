import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { matchRegisteredName } from "../lib/resident-applications/id-name-match.mjs";
import { signIdVerification, readIdVerification } from "../lib/resident-applications/id-verification-token.mjs";
import { interpretIdCheck } from "../lib/resident-applications/id-check-result.mjs";

const SECRET = "id-verification-test-secret-with-more-than-32-characters";

test("names match despite case, spacing, accents, punctuation and middle names or initials", () => {
  const id = { fullName: "DELA CRUZ, JUAN SANTOS", firstName: "JUAN SANTOS", middleName: "", lastName: "DELA CRUZ" };
  assert.equal(matchRegisteredName({ firstName: "juan", lastName: "dela  cruz" }, id).match, true);
  assert.equal(matchRegisteredName({ firstName: "Juan S.", lastName: "Dela Cruz" }, id).match, true);
  assert.equal(matchRegisteredName({ firstName: "Juan Santos", lastName: "Dela-Cruz" }, id).match, true);
  assert.equal(matchRegisteredName(
    { firstName: "Jose", lastName: "Peña" },
    { fullName: "JOSE M. PENA", firstName: "JOSE", middleName: "MARTIN", lastName: "PENA" },
  ).match, true);
  assert.equal(matchRegisteredName(
    { firstName: "Maria Clara", lastName: "Santos" },
    { fullName: "MA. CLARA SANTOS", firstName: "MA. CLARA", middleName: "", lastName: "SANTOS" },
  ).match, true);
});

test("a different person, surname or first name is rejected", () => {
  const id = { fullName: "JUAN SANTOS DELA CRUZ", firstName: "JUAN", middleName: "SANTOS", lastName: "DELA CRUZ" };
  assert.equal(matchRegisteredName({ firstName: "Pedro", lastName: "Dela Cruz" }, id).match, false);
  assert.equal(matchRegisteredName({ firstName: "Juan", lastName: "Reyes" }, id).match, false);
  // A shortened surname is not the same surname.
  assert.equal(matchRegisteredName({ firstName: "Juan", lastName: "Cruz" }, id).match, false);
  // A middle initial that does not fit the ID is a mismatch.
  assert.equal(matchRegisteredName({ firstName: "Juan R.", lastName: "Dela Cruz" }, id).match, false);
  assert.equal(matchRegisteredName({ firstName: "Juan", lastName: "Dela Cruz" }, { fullName: "", firstName: "", middleName: "", lastName: "" }).match, false);
});

test("the verification token is bound to the exact ID image and the registered name", () => {
  const now = Date.UTC(2026, 9, 2, 1, 0, 0);
  const token = signIdVerification({ sha256: "a".repeat(64), backSha256: "b".repeat(64), firstName: "Juan", lastName: "Dela Cruz", documentType: "PhilSys ID" }, SECRET, now);
  const payload = readIdVerification(token, SECRET, now + 5 * 60_000);
  assert.equal(payload?.sha256, "a".repeat(64));
  assert.equal(payload?.backSha256, "b".repeat(64));
  assert.equal(payload?.name, "juan|dela cruz");
  assert.equal(readIdVerification(token, SECRET, now + 61 * 60_000), null, "expires after an hour");
  assert.equal(readIdVerification(token.replace(/.$/, (c) => (c === "A" ? "B" : "A")), SECRET, now), null, "tampering breaks it");
  assert.equal(readIdVerification(token, "another-secret-that-is-also-long-enough-to-use", now), null);
  assert.equal(readIdVerification("not-a-token", SECRET, now), null);
});

test("the ID check needs a readable, unedited front whose name matches and a matching back", () => {
  const front = { is_identification_document: true, document_type: "Driver's License", image_quality: "GOOD", name_readable: true, full_name: "JUAN DELA CRUZ", first_name: "JUAN", middle_name: "", last_name: "DELA CRUZ", edit_suspected: false };
  const back = { is_back_of_identification_document: true, image_quality: "GOOD", edit_suspected: false };
  const reading = (overrides = {}) => ({ front: { ...front, ...overrides.front }, back: { ...back, ...overrides.back }, back_matches_front: overrides.match ?? true });
  const registered = { firstName: "Juan", lastName: "Dela Cruz" };
  const withBack = { hasBack: true };
  assert.equal(interpretIdCheck(reading(), registered, withBack).ok, true);
  assert.equal(interpretIdCheck(reading({ front: { is_identification_document: false } }), registered, withBack).code, "NOT_AN_ID");
  assert.equal(interpretIdCheck(reading({ front: { image_quality: "BLURRY" } }), registered, withBack).code, "UNREADABLE");
  assert.equal(interpretIdCheck(reading({ front: { image_quality: "TOO_DARK" } }), registered, withBack).code, "UNREADABLE");
  assert.equal(interpretIdCheck(reading({ front: { name_readable: false } }), registered, withBack).code, "UNREADABLE");
  assert.equal(interpretIdCheck(reading({ front: { full_name: "", first_name: "", last_name: "" } }), registered, withBack).code, "NAME_NOT_FOUND");
  assert.equal(interpretIdCheck(reading({ front: { full_name: "PEDRO REYES", first_name: "PEDRO", last_name: "REYES" } }), registered, withBack).code, "NAME_MISMATCH");
  // Edited text, mismatched fonts or pasted-over details on either side block it.
  assert.equal(interpretIdCheck(reading({ front: { edit_suspected: true } }), registered, withBack).code, "TAMPERED");
  assert.equal(interpretIdCheck(reading({ back: { edit_suspected: true } }), registered, withBack).code, "TAMPERED");
  // The back is required, must be the back of an ID, readable, and the same card.
  const frontOnly = interpretIdCheck(reading(), registered, { hasBack: false });
  assert.equal(frontOnly.code, "BACK_REQUIRED");
  assert.equal(frontOnly.frontVerified, true);
  assert.equal(interpretIdCheck(reading({ back: { is_back_of_identification_document: false } }), registered, withBack).code, "BACK_NOT_ID");
  assert.equal(interpretIdCheck(reading({ back: { image_quality: "GLARE" } }), registered, withBack).code, "UNREADABLE");
  assert.equal(interpretIdCheck(reading({ match: false }), registered, withBack).code, "BACK_MISMATCH");
  assert.equal(interpretIdCheck(null, registered, withBack).code, "SERVICE_UNAVAILABLE");
});

test("registration refuses to save anything until the ID verification token checks out", () => {
  const route = readFileSync(new URL("../app/api/auth/register/route.ts", import.meta.url), "utf8");
  const verifyAt = route.indexOf("readIdVerification(");
  assert.ok(verifyAt > 0, "the register route reads the ID verification token");
  assert.ok(verifyAt < route.indexOf("uploadIdentityEvidence("), "before any evidence is uploaded");
  assert.ok(verifyAt < route.indexOf("insert into users"), "before any account row is written");
  assert.match(route, /sha256/);
  assert.match(route, /backSha256/, "the back photo is bound to the token too");
  const check = readFileSync(new URL("../app/api/auth/register/id-check/route.ts", import.meta.url), "utf8");
  assert.match(check, /checkIdWithGemini\(/);
  assert.doesNotMatch(check, /AQ\.|AIza/, "the API key is never written in code");
});

test("the address is built from the dropdowns instead of typed", async () => {
  const { composeResidentAddress } = await import("../lib/resident-applications/compose-address.mjs");
  assert.equal(composeResidentAddress({ sitio: "Purok 3", barangay: "Poblacion", municipality: "Hamtic", landmark: "" }), "Purok 3, Brgy. Poblacion, Hamtic, Antique");
  assert.equal(composeResidentAddress({ sitio: "", barangay: "Mapatag", municipality: "Hamtic", landmark: "chapel" }), "Brgy. Mapatag, Hamtic, Antique (near chapel)");
  assert.equal(composeResidentAddress({ sitio: "Purok 1", barangay: "", municipality: "Hamtic" }), "");
});

test("email is optional at sign-up and still validated when given", () => {
  const start = readFileSync(new URL("../app/api/auth/register/start/route.ts", import.meta.url), "utf8");
  const register = readFileSync(new URL("../app/api/auth/register/route.ts", import.meta.url), "utf8");
  assert.match(start, /suppliedEmail && !/);
  assert.match(register, /\(email && !/);
  assert.match(register, /email \|\| null/);
  const markup = readFileSync(new URL("../app/_content/signup-content.ts", import.meta.url), "utf8");
  assert.match(markup, /placeholder="Email Address \(Optional\)" id="email"/);
  assert.doesNotMatch(markup, /id="address"/, "no typed complete address");
});
