import { NextRequest, NextResponse } from "next/server";

import { changeBfpPassword, getBfpIdentity } from "../../../../../lib/auth/bfp-accounts";
import { BFP_SESSION_COOKIE, bfpSessionCookie, createBfpSession, verifyBfpSession } from "../../../../../lib/auth/session";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const session = verifyBfpSession(request.cookies.get(BFP_SESSION_COOKIE)?.value);
  if (!session) return NextResponse.json({ error: "Sign in again to change your password." }, { status: 401 });
  let body: { currentPassword?: string; nextPassword?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid password data." }, { status: 400 });
  }
  const currentPassword = typeof body.currentPassword === "string" ? body.currentPassword : "";
  const nextPassword = typeof body.nextPassword === "string" ? body.nextPassword : "";

  try {
    await changeBfpPassword(session.userId, currentPassword, nextPassword);
    const identity = await getBfpIdentity(session.userId);
    if (!identity) return NextResponse.json({ error: "Your account is no longer active." }, { status: 403 });
    const response = NextResponse.json({ redirectTo: identity.role === "PROVINCIAL_BFP" ? "/provincial-bfp" : "/municipal-bfp" });
    response.cookies.set(BFP_SESSION_COOKIE, createBfpSession({
      userId: identity.userId,
      displayName: identity.displayName,
      role: identity.role,
      municipalityId: identity.municipalityId,
      mustChangePassword: false,
    }), bfpSessionCookie);
    return response;
  } catch (error) {
    const message = error instanceof Error && error.message === "CURRENT_PASSWORD_INCORRECT"
      ? "Your current password is incorrect."
      : error instanceof Error && error.message === "PASSWORD_TOO_SHORT"
        ? "Use a password with at least 12 characters."
        : "Unable to change your password right now.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
