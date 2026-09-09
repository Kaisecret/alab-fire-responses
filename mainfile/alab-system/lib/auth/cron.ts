import { timingSafeEqual } from "node:crypto";

export function isCronAuthorized(authorization: string | null, secret = process.env.CRON_SECRET): boolean {
  if (!secret || !authorization) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const received = Buffer.from(authorization);
  return received.length === expected.length && timingSafeEqual(received, expected);
}
