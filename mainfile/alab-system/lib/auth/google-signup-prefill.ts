import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const GOOGLE_SIGNUP_PREFILL_COOKIE = "alab_google_signup";
const PREFILL_MAX_AGE_SECONDS = 10 * 60;

export type GoogleSignupPrefill = {
  subject: string;
  email: string;
  firstName: string;
  lastName: string;
  expiresAt: number;
};

function secret() {
  const value = process.env.AUTH_SECRET;
  if (!value || value.length < 32) throw new Error("AUTH_SECRET must contain at least 32 characters.");
  return value;
}

function sign(payload: string) {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function createGoogleSignupPrefill(input: Omit<GoogleSignupPrefill, "expiresAt">) {
  const payload = Buffer.from(JSON.stringify({ ...input, expiresAt: Date.now() + PREFILL_MAX_AGE_SECONDS * 1000 })).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export async function getGoogleSignupPrefill(): Promise<GoogleSignupPrefill | null> {
  const token = (await cookies()).get(GOOGLE_SIGNUP_PREFILL_COOKIE)?.value;
  if (!token) return null;
  const [payload, receivedSignature] = token.split(".");
  if (!payload || !receivedSignature) return null;
  const expected = Buffer.from(sign(payload));
  const received = Buffer.from(receivedSignature);
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) return null;
  try {
    const prefill = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as GoogleSignupPrefill;
    return prefill.expiresAt > Date.now() && prefill.subject && prefill.email ? prefill : null;
  } catch {
    return null;
  }
}

export const googleSignupPrefillCookie = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: PREFILL_MAX_AGE_SECONDS,
};
