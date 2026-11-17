import { NextResponse } from "next/server";

import { confirmPasswordReset } from "../../../../../lib/auth/password-reset";
import { withTransaction } from "../../../../../lib/db";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { resetId?: unknown; code?: unknown; password?: unknown } | null;
  const resetId = typeof body?.resetId === "string" ? body.resetId : "";
  const code = typeof body?.code === "string" ? body.code : "";
  const password = body?.password;
  if (!/^[0-9a-f-]{36}$/i.test(resetId) || !/^\d{6}$/.test(code)) return NextResponse.json({ error: "Enter the six-digit code." }, { status: 400 });
  if (password !== undefined && (typeof password !== "string" || password.length < 8 || password.length > 128)) {
    return NextResponse.json({ error: "Use at least 8 characters for your new password." }, { status: 400 });
  }

  try {
    const result = await withTransaction((client) => confirmPasswordReset(client, { resetId, code, password: password as string | undefined }));
    if (!result.ok) return NextResponse.json({ error: "That code is wrong or has expired. Check the text message or request a new code." }, { status: 400 });
    return NextResponse.json({ verified: true, reset: Boolean(result.reset) });
  } catch (error) {
    console.error("Password reset confirm failed", error);
    return NextResponse.json({ error: "Unable to reset your password. Please try again." }, { status: 500 });
  }
}
