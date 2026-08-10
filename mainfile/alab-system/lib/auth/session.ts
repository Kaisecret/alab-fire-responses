import { createHmac, timingSafeEqual } from "node:crypto";

export const RESIDENT_SESSION_COOKIE = "alab_resident_session";
const SESSION_DURATION_MS = 1000 * 60 * 60 * 8;

export type ResidentSession = {
  userId: string;
  username: string;
  role: "RESIDENT";
  expiresAt: number;
};

function sessionSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("AUTH_SECRET must contain at least 32 characters.");
  }
  return secret;
}

function signature(payload: string) {
  return createHmac("sha256", sessionSecret()).update(payload).digest("base64url");
}

export function createResidentSession(userId: string, username: string) {
  const session: ResidentSession = {
    userId,
    username,
    role: "RESIDENT",
    expiresAt: Date.now() + SESSION_DURATION_MS,
  };
  const payload = Buffer.from(JSON.stringify(session)).toString("base64url");
  return `${payload}.${signature(payload)}`;
}

export function verifyResidentSession(token: string | undefined): ResidentSession | null {
  if (!token) return null;
  const [payload, receivedSignature] = token.split(".");
  if (!payload || !receivedSignature) return null;

  const expectedSignature = signature(payload);
  const received = Buffer.from(receivedSignature);
  const expected = Buffer.from(expectedSignature);
  if (received.length !== expected.length || !timingSafeEqual(received, expected)) return null;

  try {
    const session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as ResidentSession;
    return session.role === "RESIDENT" && session.expiresAt > Date.now() ? session : null;
  } catch {
    return null;
  }
}

export const residentSessionCookie = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: SESSION_DURATION_MS / 1000,
};
