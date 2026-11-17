import { NextResponse } from "next/server";
import { withTransaction } from "../../../../../lib/db";
import { verifyOtpHash } from "../../../../../lib/auth/registration-otp";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { verificationId?: string; code?: string } | null;
  if (!body?.verificationId || !/^\d{6}$/.test(body.code ?? "")) return NextResponse.json({ error: "Enter the six-digit code." }, { status: 400 });
  try {
    // Returns instead of throwing on a wrong code, so the attempt count is committed.
    const verified = await withTransaction(async (client) => {
      const result = await client.query<{ phone: string; code_hash: string; expires_at: Date; attempt_count: number; consumed_at: Date | null }>("select phone, code_hash, expires_at, attempt_count, consumed_at from registration_otps where id = $1 and coalesce(payload->>'purpose', '') <> 'PASSWORD_RESET' for update", [body.verificationId]);
      const otp = result.rows[0];
      if (!otp || otp.consumed_at || otp.expires_at <= new Date() || otp.attempt_count >= 5) return false;
      if (!verifyOtpHash(otp.phone, body.code!, otp.code_hash)) { await client.query("update registration_otps set attempt_count = attempt_count + 1, updated_at = now() where id = $1", [body.verificationId]); return false; }
      await client.query("update registration_otps set consumed_at = now(), updated_at = now() where id = $1", [body.verificationId]);
      return true;
    });
    if (!verified) return NextResponse.json({ error: "That code is invalid, expired, or has been used." }, { status: 400 });
    return NextResponse.json({ verified: true });
  } catch {
    return NextResponse.json({ error: "Unable to verify the code." }, { status: 500 });
  }
}
