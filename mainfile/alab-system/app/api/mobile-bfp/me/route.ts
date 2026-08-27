import { NextResponse } from "next/server";

import { getBfpIdentity } from "../../../../lib/auth/bfp-accounts";
import { isMobileBfpAuthorization, mobileBfpIdentityWithPhoto, requireMobileMunicipalBfp } from "../../../../lib/auth/mobile-bfp";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const session = requireMobileMunicipalBfp(request);
  if (isMobileBfpAuthorization(session)) return session;

  try {
    const identity = await getBfpIdentity(session.userId);
    if (!identity || identity.role !== "MUNICIPAL_BFP") {
      return NextResponse.json({ error: "Your account is no longer active." }, { status: 403 });
    }
    return NextResponse.json({
      identity: await mobileBfpIdentityWithPhoto(identity),
      mustChangePassword: identity.mustChangePassword,
    });
  } catch (error) {
    console.error("Mobile BFP session check failed", error);
    return NextResponse.json({ error: "Unable to verify your session right now." }, { status: 500 });
  }
}
