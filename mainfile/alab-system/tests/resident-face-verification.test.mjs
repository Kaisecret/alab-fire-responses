import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";

import { signIdVerification } from "../lib/resident-applications/id-verification-token.mjs";

const SECRET = "resident-face-test-secret-with-at-least-32-characters";
const now = Date.UTC(2026, 9, 19);
const evidence = { sha256: "a".repeat(64), backSha256: "b".repeat(64), selfieSha256: "c".repeat(64), name: "juan|dela cruz", score: 0.75, threshold: 0.363 };
const modulePath = "../lib/resident-applications/face-verification-token.mjs";

test("face proofs bind every image, name and server comparison and expire after 30 minutes", async () => {
  const { signFaceVerification, readFaceVerification } = await import(modulePath);
  const token = signFaceVerification(evidence, SECRET, now);
  const proof = readFaceVerification(token, SECRET, now + 29 * 60_000);
  for (const [key, value] of Object.entries(evidence)) assert.equal(proof[key], value);
  assert.equal(readFaceVerification(token, SECRET, now + 30 * 60_000), null);
  assert.equal(readFaceVerification(token, "a-different-secret-of-at-least-32-characters", now), null);
  assert.equal(readFaceVerification(`${token}.ignored`, SECRET, now), null);
  assert.equal(readFaceVerification(` ${token}`, SECRET, now), null);
  assert.equal(readFaceVerification(token, "short", now), null);
  const [encoded, signature] = token.split(".");
  for (const field of ["sha256", "backSha256", "selfieSha256", "name", "score", "threshold"]) {
    const data = JSON.parse(Buffer.from(encoded, "base64url").toString());
    data[field] = typeof data[field] === "number" ? 0 : "changed";
    assert.equal(readFaceVerification(`${Buffer.from(JSON.stringify(data)).toString("base64url")}.${signature}`, SECRET, now), null, field);
  }
});

test("invalid payloads and cross-purpose signatures cannot create a face pass", async () => {
  const { signFaceVerification, readFaceVerification } = await import(modulePath);
  for (const change of [{ score: NaN }, { score: 0.2 }, { threshold: Infinity }, { selfieSha256: "bad" }, { name: "|" }, { backSha256: null }]) {
    assert.throws(() => signFaceVerification({ ...evidence, ...change }, SECRET, now));
  }
  assert.throws(() => signFaceVerification(evidence, "short", now));
  const token = signFaceVerification(evidence, SECRET, now);
  const [payload] = token.split(".");
  const idSignature = createHmac("sha256", SECRET).update(`resident-id-verification:${payload}`).digest("base64url");
  assert.equal(readFaceVerification(`${payload}.${idSignature}`, SECRET, now), null);
  const idToken = signIdVerification({ ...evidence, firstName: "Juan", lastName: "Dela Cruz" }, SECRET, now);
  assert.equal(readFaceVerification(idToken, SECRET, now), null);
});

test("only a current complete strictly parsed ID proof can authorize comparison", async () => {
  const { readBoundIdVerification } = await import(modulePath);
  const token = signIdVerification({ ...evidence, firstName: "Juan", lastName: "Dela Cruz" }, SECRET, now);
  assert.equal(readBoundIdVerification(token, SECRET, now)?.name, evidence.name);
  assert.equal(readBoundIdVerification(`${token}.extra`, SECRET, now), null);
  assert.equal(readBoundIdVerification(token, SECRET, now + 60 * 60_000), null);
  assert.equal(readBoundIdVerification(token, "short", now), null);
  const incomplete = signIdVerification({ sha256: evidence.sha256, firstName: "Juan", lastName: "Dela Cruz" }, SECRET, now);
  assert.equal(readBoundIdVerification(incomplete, SECRET, now), null);
});
