import { createHmac, randomInt, timingSafeEqual } from "node:crypto";

const OTP_SECRET = process.env.OTP_SECRET ?? process.env.AUTH_SECRET ?? "";

export function normalizePhilippinePhone(value: string) {
  const digits = value.replace(/\D/g, "");
  if (/^09\d{9}$/.test(digits)) return `63${digits.slice(1)}`;
  if (/^639\d{9}$/.test(digits)) return digits;
  throw new Error("INVALID_PHONE");
}

export function createOtpCode() {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

export function hashOtp(phone: string, code: string) {
  if (!OTP_SECRET) throw new Error("OTP_SECRET_MISSING");
  return createHmac("sha256", OTP_SECRET).update(`${phone}:${code}`).digest("base64url");
}

export function verifyOtpHash(phone: string, code: string, storedHash: string) {
  const actual = Buffer.from(hashOtp(phone, code));
  const expected = Buffer.from(storedHash);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
