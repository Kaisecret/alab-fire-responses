import { NextResponse } from "next/server";

import { checkLoginRateLimit, recordLoginFailure } from "../../../../../lib/auth/login-rate-limit";
import { RESET_CODE_MINUTES, startPasswordReset } from "../../../../../lib/auth/password-reset";
import { withTransaction } from "../../../../../lib/db";
import { sendGmailEmail } from "../../../../../lib/email/gmail";
import { sendIprogSmsMessage } from "../../../../../lib/sms/iprogsms";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { identifier?: unknown } | null;
  const identifier = typeof body?.identifier === "string" ? body.identifier.trim().slice(0, 100) : "";
  if (!identifier) return NextResponse.json({ error: "Enter your username, email, or mobile number." }, { status: 400 });

  // Bound recovery messages from each network, regardless of delivery channel.
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
    const result = await withTransaction((client) => startPasswordReset(client, identifier, (destination, code, channel) => {
      const text = `Your ALAB password reset code is ${code}. It expires in ${RESET_CODE_MINUTES} minutes. Never share this code.`;
      return channel === "EMAIL"
        ? sendGmailEmail({
          to: destination,
          subject: "Your ALAB password reset code",
          text,
          html: `<p>Your ALAB password reset code is:</p><p style="font-size:28px;font-weight:bold;letter-spacing:4px">${code}</p><p>It expires in ${RESET_CODE_MINUTES} minutes. Never share this code.</p><p>If you did not request this, you can ignore this email.</p>`,
        })
        : sendIprogSmsMessage({ phone: destination, message: text });
    }));
    if (result.sent) console.info("Password reset code accepted for delivery");
    return NextResponse.json({ resetId: result.resetId, expiresAt: result.expiresAt });
  } catch (error) {
    if (error instanceof Error && error.message === "GMAIL_NOT_CONFIGURED") return NextResponse.json({ error: "Email recovery is not set up yet. Please contact your Municipal BFP." }, { status: 503 });
    if (error instanceof Error && error.message.startsWith("GMAIL_")) {
      console.error("Password reset email delivery failed", { reason: error.message });
      return NextResponse.json({ error: "We could not send the reset email. Please try again in a minute." }, { status: 502 });
    }
    if (error instanceof Error && error.message === "IPROGSMS_NOT_CONFIGURED") return NextResponse.json({ error: "Text messages are not set up yet. Please contact your Municipal BFP." }, { status: 503 });
    if (error instanceof Error && error.message.startsWith("IPROGSMS_")) return NextResponse.json({ error: "We could not send the text message. Please try again in a minute." }, { status: 502 });
    console.error("Password reset start failed", error);
    return NextResponse.json({ error: "Unable to send the reset code. Please try again." }, { status: 500 });
  }
}
