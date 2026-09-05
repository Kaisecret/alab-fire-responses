import { createHmac, timingSafeEqual } from "node:crypto";

export const RESIDENT_SESSION_COOKIE = "alab_resident_session";
export const RESIDENT_APPLICANT_COOKIE = "alab_resident_application";
const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 30; // 30 days persistent session for emergency PWA
const APPLICANT_SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 7;

export type ResidentSession = {
  userId: string;
  username: string;
  role: "RESIDENT";
  expiresAt: number;
};

export type ResidentApplicantSession = {
  userId: string;
  username: string;
  purpose: "RESIDENT_APPLICATION";
  expiresAt: number;
};

export type BfpRole = "PROVINCIAL_BFP" | "MUNICIPAL_BFP";

export const PROVINCIAL_BFP_SESSION_COOKIE = "alab_provincial_bfp_session";
export const MUNICIPAL_BFP_SESSION_COOKIE = "alab_municipal_bfp_session";

export function bfpSessionCookieName(role: BfpRole) {
  return role === "PROVINCIAL_BFP"
    ? PROVINCIAL_BFP_SESSION_COOKIE
    : MUNICIPAL_BFP_SESSION_COOKIE;
}

export type BfpSession = {
  userId: string;
  displayName: string;
  role: BfpRole;
  municipalityId: string | null;
  assignmentRole?: "MUNICIPAL_ADMIN" | "MUNICIPAL_STAFF" | null;
  mustChangePassword: boolean;
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

export function createResidentApplicantSession(userId: string, username: string) {
  const session: ResidentApplicantSession = {
    userId,
    username,
    purpose: "RESIDENT_APPLICATION",
    expiresAt: Date.now() + APPLICANT_SESSION_DURATION_MS,
  };
  const payload = Buffer.from(JSON.stringify(session)).toString("base64url");
  return `${payload}.${signature(payload)}`;
}

export function verifyResidentApplicantSession(token: string | undefined): ResidentApplicantSession | null {
  if (!token) return null;
  const [payload, receivedSignature] = token.split(".");
  if (!payload || !receivedSignature) return null;

  const expectedSignature = signature(payload);
  const received = Buffer.from(receivedSignature);
  const expected = Buffer.from(expectedSignature);
  if (received.length !== expected.length || !timingSafeEqual(received, expected)) return null;

  try {
    const session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as ResidentApplicantSession;
    return session.purpose === "RESIDENT_APPLICATION" && typeof session.userId === "string" &&
      typeof session.username === "string" && session.expiresAt > Date.now() ? session : null;
  } catch {
    return null;
  }
}

export function createBfpSession(input: Omit<BfpSession, "expiresAt">) {
  const session: BfpSession = { ...input, expiresAt: Date.now() + SESSION_DURATION_MS };
  const payload = Buffer.from(JSON.stringify(session)).toString("base64url");
  return `${payload}.${signature(payload)}`;
}

export function verifyBfpSession(token: string | undefined): BfpSession | null {
  if (!token) return null;
  const [payload, receivedSignature] = token.split(".");
  if (!payload || !receivedSignature) return null;

  const expectedSignature = signature(payload);
  const received = Buffer.from(receivedSignature);
  const expected = Buffer.from(expectedSignature);
  if (received.length !== expected.length || !timingSafeEqual(received, expected)) return null;

  try {
    const session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as BfpSession;
    const isRoleValid = session.role === "PROVINCIAL_BFP" || session.role === "MUNICIPAL_BFP";
    return isRoleValid && typeof session.userId === "string" && typeof session.displayName === "string" &&
      typeof session.mustChangePassword === "boolean" && typeof session.expiresAt === "number" && session.expiresAt > Date.now()
      ? session
      : null;
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

export const residentApplicantCookie = {
  ...residentSessionCookie,
  maxAge: APPLICANT_SESSION_DURATION_MS / 1000,
};

export const bfpSessionCookie = {
  ...residentSessionCookie,
};
