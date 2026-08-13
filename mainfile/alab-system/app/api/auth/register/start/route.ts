import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { hashPassword } from "../../../../../lib/auth/password";
import { createOtpCode, hashOtp, normalizePhilippinePhone } from "../../../../../lib/auth/registration-otp";
import { withTransaction } from "../../../../../lib/db";
import { sendPhilSmsOtp } from "../../../../../lib/sms/philsms";
import { getGoogleSignupPrefill } from "../../../../../lib/auth/google-signup-prefill";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const input = await request.json().catch(() => null) as Record<string, unknown> | null;
  const phoneInput = typeof input?.phone === "string" ? input.phone : "";
  const password = typeof input?.password === "string" ? input.password : "";
  if (!input || password.length < 8) return NextResponse.json({ error: "Please complete your registration details." }, { status: 400 });
  const googlePrefill = await getGoogleSignupPrefill();
  const suppliedEmail = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
  if (googlePrefill && suppliedEmail !== googlePrefill.email) return NextResponse.json({ error: "Use the verified email address from your Google account." }, { status: 400 });
  let phone: string;
  try { phone = normalizePhilippinePhone(phoneInput); } catch { return NextResponse.json({ error: "Enter a valid Philippine mobile number." }, { status: 400 }); }
  const code = createOtpCode();
  const id = randomUUID();
  const expiresAt = new Date(Date.now() + 5 * 60_000);
  let otpStored = false;
  try {
    const passwordHash = await hashPassword(password);
    await withTransaction(async (client) => {
      const duplicate = await client.query("select 1 from users where email = $1 or username = $2 or phone in ($3, $4) limit 1", [input.email, input.username, phoneInput, phone]);
      if (duplicate.rowCount) throw new Error("DUPLICATE");
      const recentOtp = await client.query("select 1 from registration_otps where phone = $1 and last_sent_at > now() - interval '60 seconds' order by last_sent_at desc limit 1", [phone]);
      if (recentOtp.rowCount) throw new Error("OTP_RESEND_COOLDOWN");
      await client.query("update registration_otps set consumed_at = now(), updated_at = now() where phone = $1 and consumed_at is null", [phone]);
      const payload = { ...input, phone: phoneInput, password: undefined, passwordHash };
      await client.query("insert into registration_otps (id, phone, payload, code_hash, expires_at, last_sent_at) values ($1,$2,$3,$4,$5,now())", [id, phone, payload, hashOtp(phone, code), expiresAt]);
    });
    otpStored = true;
    await sendPhilSmsOtp({ phone, code });
    return NextResponse.json({ verificationId: id, expiresAt: expiresAt.toISOString() });
  } catch (error) {
    if (otpStored) {
      await withTransaction(async (client) => {
        await client.query("delete from registration_otps where id = $1 and consumed_at is null", [id]);
      }).catch(() => undefined);
    }
    if (error instanceof Error && error.message === "DUPLICATE") return NextResponse.json({ error: "That email, username, or phone is already registered." }, { status: 409 });
    if (error instanceof Error && error.message === "OTP_RESEND_COOLDOWN") return NextResponse.json({ error: "Please wait one minute before requesting another code." }, { status: 429 });
    if (error instanceof Error && error.message === "PHILSMS_NOT_CONFIGURED") return NextResponse.json({ error: "SMS verification is not configured yet." }, { status: 503 });
    if (error instanceof Error && error.message.startsWith("PHILSMS_DELIVERY_FAILED")) return NextResponse.json({ error: "PhilSMS could not accept this OTP. Check the Vercel runtime log for the provider reason." }, { status: 502 });
    console.error("OTP start failed", error);
    return NextResponse.json({ error: "Unable to send the verification code." }, { status: 500 });
  }
}
