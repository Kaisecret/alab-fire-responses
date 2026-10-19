import { createHash, createHmac, timingSafeEqual } from "node:crypto";

import { readIdVerification } from "./id-verification-token.mjs";

const LIFETIME_MS = 30 * 60 * 1000;
const SHA256 = /^[a-f0-9]{64}$/;
const NAME = /^[a-z]+(?: [a-z]+)*\|[a-z]+(?: [a-z]+)*$/;
const TOKEN = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]{43}$/;

function validSecret(secret) {
  return typeof secret === "string" && secret.length >= 32;
}

function validToken(token) {
  return typeof token === "string" && token.length <= 4000 && TOKEN.test(token);
}

function validBindings(data) {
  return data && SHA256.test(data.sha256) && SHA256.test(data.backSha256)
    && typeof data.name === "string" && data.name.length <= 220 && NAME.test(data.name);
}

function validComparison(data) {
  return Number.isFinite(data.score) && Number.isFinite(data.threshold)
    && data.score >= -1 && data.score <= 1 && data.threshold > 0 && data.threshold <= 1
    && data.score >= data.threshold;
}

function signature(payload, secret) {
  return createHmac("sha256", secret).update(`resident-face-verification:v1:${payload}`).digest("base64url");
}

/** Hash the original uploaded bytes, before decoding or resizing. */
export function evidenceSha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

/** Current ID proofs require both ID sides and an exact two-segment token. */
export function readBoundIdVerification(token, secret, now = Date.now()) {
  if (!validSecret(secret) || !validToken(token)) return null;
  const data = readIdVerification(token, secret, now);
  if (!validBindings(data) || !Number.isSafeInteger(data.exp) || data.exp > now + 60 * 60 * 1000) return null;
  return data;
}

/** Only a successful server comparison may be signed. Never pass browser scores here. */
export function signFaceVerification({ sha256, backSha256, selfieSha256, name, score, threshold }, secret, now = Date.now()) {
  const data = { v: 1, sha256, backSha256, selfieSha256, name, score, threshold, iat: now, exp: now + LIFETIME_MS };
  if (!validSecret(secret) || !validBindings(data) || !SHA256.test(selfieSha256)
      || !validComparison(data) || !Number.isSafeInteger(now)) throw new Error("INVALID_FACE_PROOF");
  const payload = Buffer.from(JSON.stringify(data)).toString("base64url");
  return `${payload}.${signature(payload, secret)}`;
}

/** Genuine unexpired proof, or null for any malformed or altered token. */
export function readFaceVerification(token, secret, now = Date.now()) {
  if (!validSecret(secret) || !validToken(token)) return null;
  const [payload, received] = token.split(".");
  const expected = Buffer.from(signature(payload, secret));
  const actual = Buffer.from(received);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;
  try {
    const decoded = Buffer.from(payload, "base64url");
    if (decoded.toString("base64url") !== payload) return null;
    const data = JSON.parse(decoded.toString("utf8"));
    if (data?.v !== 1 || !validBindings(data) || !SHA256.test(data.selfieSha256) || !validComparison(data)) return null;
    if (!Number.isSafeInteger(data.iat) || !Number.isSafeInteger(data.exp) || data.iat > now
        || data.exp <= now || data.exp - data.iat !== LIFETIME_MS) return null;
    return data;
  } catch {
    return null;
  }
}
