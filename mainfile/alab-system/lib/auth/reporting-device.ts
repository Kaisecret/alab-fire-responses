import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";

export const REPORTING_DEVICE_COOKIE = "alab_reporting_device";
export const reportingDeviceCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 365 * 24 * 60 * 60,
};

function signature(deviceId: string, secret: string) {
  return createHmac("sha256", secret).update(`reporting-device:${deviceId}`).digest("base64url");
}

export function createReportingDeviceToken(deviceId = randomUUID()): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) throw new Error("AUTH_SECRET is required for reporting device identification.");
  return `${deviceId}.${signature(deviceId, secret)}`;
}

/** A browser installation identifier, independent of account, IP and user agent. */
export function verifyReportingDeviceToken(token: string | null | undefined): string | null {
  const secret = process.env.AUTH_SECRET;
  if (!token || !secret || secret.length < 32) return null;
  const parts = token.split(".");
  if (parts.length !== 2 || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(parts[0])) return null;
  const expected = Buffer.from(signature(parts[0], secret));
  const received = Buffer.from(parts[1]);
  return expected.length === received.length && timingSafeEqual(expected, received) ? parts[0] : null;
}
