import { NextResponse } from "next/server";

import { getBfpIdentity, updateBfpDisplayName } from "../../../../lib/auth/bfp-accounts";
import { isMobileBfpAuthorization, mobileBfpIdentityWithPhoto, requireMobileMunicipalBfp } from "../../../../lib/auth/mobile-bfp";

export const runtime = "nodejs";

export async function PATCH(request: Request) {
  const session = requireMobileMunicipalBfp(request);
  if (isMobileBfpAuthorization(session)) return session;

  let body: { displayName?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid profile data." }, { status: 400 });
  }

  try {
    await updateBfpDisplayName(session.userId, body.displayName);
    const identity = await getBfpIdentity(session.userId);
    if (!identity || identity.role !== "MUNICIPAL_BFP") {
      return NextResponse.json({ error: "Your account is no longer active." }, { status: 403 });
    }
    return NextResponse.json({ identity: await mobileBfpIdentityWithPhoto(identity) });
  } catch (error) {
    const message = error instanceof Error && error.message === "INVALID_DISPLAY_NAME"
      ? "Enter a name with at least 2 characters."
      : "Unable to update your profile right now.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
