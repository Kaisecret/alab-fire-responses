import { NextResponse } from "next/server";

import { changeBfpPassword, getBfpIdentity } from "../../../../lib/auth/bfp-accounts";
import { createBfpSession } from "../../../../lib/auth/session";
import { isMobileBfpAuthorization, mobileBfpIdentity, requireMobileMunicipalBfp } from "../../../../lib/auth/mobile-bfp";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const session = requireMobileMunicipalBfp(request);
  if (isMobileBfpAuthorization(session)) return session;

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
    if (!identity || identity.role !== "MUNICIPAL_BFP") {
      return NextResponse.json({ error: "Your account is no longer active." }, { status: 403 });
    }

    const token = createBfpSession({
      userId: identity.userId,
      displayName: identity.displayName,
      role: "MUNICIPAL_BFP",
      municipalityId: identity.municipalityId,
      mustChangePassword: false,
    });
    return NextResponse.json({
      token,
      identity: mobileBfpIdentity(identity),
      mustChangePassword: false,
    });
  } catch (error) {
    const message = error instanceof Error && error.message === "CURRENT_PASSWORD_INCORRECT"
      ? "Your temporary password is incorrect."
      : error instanceof Error && error.message === "PASSWORD_TOO_SHORT"
        ? "Use a password with at least 12 characters."
        : "Unable to change your password right now.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
