import { createHmac, timingSafeEqual } from "node:crypto";

import { registeredNameKey } from "./id-name-match.mjs";

// Proof that an ID passed the check. Signed on the server and bound to the
// exact image (SHA-256) and the registered name, so the browser cannot forge
// it, reuse it for another ID, or keep it after the name changes.

const LIFETIME_MS = 60 * 60 * 1000;

function signature(payload, secret) {
  return createHmac("sha256", secret).update(`resident-id-verification:${payload}`).digest("base64url");
}

export function signIdVerification({ sha256, firstName, lastName, documentType }, secret, now = Date.now()) {
  const payload = Buffer.from(JSON.stringify({
    v: 1,
    sha256,
    name: registeredNameKey(firstName, lastName),
    documentType: String(documentType ?? "").slice(0, 80),
    exp: now + LIFETIME_MS,
  })).toString("base64url");
  return `${payload}.${signature(payload, secret)}`;
}

/** The token's payload when it is genuine and unexpired, otherwise null. */
export function readIdVerification(token, secret, now = Date.now()) {
  if (typeof token !== "string" || !secret) return null;
  const [payload, received] = token.split(".");
  if (!payload || !received) return null;
  const expected = Buffer.from(signature(payload, secret));
  const actual = Buffer.from(received);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (data?.v !== 1 || typeof data.sha256 !== "string" || typeof data.name !== "string") return null;
    if (typeof data.exp !== "number" || data.exp <= now) return null;
    return data;
  } catch {
    return null;
  }
}
