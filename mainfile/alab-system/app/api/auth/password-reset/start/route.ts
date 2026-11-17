import { NextResponse } from "next/server";

import { checkLoginRateLimit, recordLoginFailure } from "../../../../../lib/auth/login-rate-limit";
import { RESET_CODE_MINUTES, startPasswordReset } from "../../../../../lib/auth/password-reset";
import { withTransaction } from "../../../../../lib/db";
import { sendPhilSmsMessage } from "../../../../../lib/sms/philsms";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { identifier?: unknown } | null;
  const identifier = typeof body?.identifier === "string" ? body.identifier.trim().slice(0, 100) : "";
  if (!identifier) return NextResponse.json({ error: "Enter your username, email, or mobile number." }, { status: 400 });

  // Each request may cost a text message, so one network gets a few per two minutes.
  const ip = request.headers.get("cf-connecting-ip")?.trim()
    || request.headers.get("x-real-ip")?.trim()
    || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || "local";
  const key = `password-reset:ip:${ip}`;
  const limit = checkLoginRateLimit(key);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: `Too many requests. Please wait ${Math.ceil(limit.retryAfterSeconds / 60)} minute(s) and try again.` },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }
  recordLoginFailure(key);

  try {
    const result = await withTransaction((client) => startPasswordReset(client, identifier, (phone, code) => sendPhilSmsMessage({
      phone,
      message: `Your ALAB password reset code is ${code}. It expires in ${RESET_CODE_MINUTES} minutes. Never share this code.`,
    })));
    return NextResponse.json({ resetId: result.resetId, expiresAt: result.expiresAt });
  } catch (error) {
    if (error instanceof Error && error.message === "PHILSMS_NOT_CONFIGURED") return NextResponse.json({ error: "Text messages are not set up yet. Please contact your Municipal BFP." }, { status: 503 });
    if (error instanceof Error && error.message.startsWith("PHILSMS_")) return NextResponse.json({ error: "We could not send the text message. Please try again in a minute." }, { status: 502 });
    console.error("Password reset start failed", error);
    return NextResponse.json({ error: "Unable to send the reset code. Please try again." }, { status: 500 });
  }
}
