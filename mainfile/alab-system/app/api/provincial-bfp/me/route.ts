import { NextRequest, NextResponse } from "next/server";

import { getBfpIdentity } from "../../../../lib/auth/bfp-accounts";
import { BFP_SESSION_COOKIE, verifyBfpSession } from "../../../../lib/auth/session";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const session = verifyBfpSession(request.cookies.get(BFP_SESSION_COOKIE)?.value);
  if (!session || session.role !== "PROVINCIAL_BFP") {
    return NextResponse.json({ error: "Provincial BFP sign-in is required." }, { status: 401 });
  }

  try {
    const identity = await getBfpIdentity(session.userId);
    if (!identity || identity.role !== "PROVINCIAL_BFP") {
      return NextResponse.json({ error: "Your provincial access is no longer active." }, { status: 403 });
    }

    return NextResponse.json({
      user: {
        userId: identity.userId,
        displayName: identity.displayName || "Provincial Administrator",
        rankOrPosition: identity.rankOrPosition || "CINSP - Provincial Fire Marshal",
        role: "PROVINCIAL_BFP",
        email: identity.email,
        province: "Antique",
        mustChangePassword: identity.mustChangePassword,
      },
    });
  } catch (error) {
    console.error("Provincial BFP identity lookup failed", error);
    return NextResponse.json({ error: "Unable to load provincial profile." }, { status: 500 });
  }
}
