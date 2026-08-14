import { NextRequest, NextResponse } from "next/server";

import { getBfpIdentity } from "../../../../lib/auth/bfp-accounts";
import { BFP_SESSION_COOKIE, verifyBfpSession } from "../../../../lib/auth/session";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const session = verifyBfpSession(request.cookies.get(BFP_SESSION_COOKIE)?.value);
  if (!session || session.role !== "MUNICIPAL_BFP") return NextResponse.json({ error: "Municipal BFP sign-in is required." }, { status: 401 });
  try {
    const identity = await getBfpIdentity(session.userId);
    if (!identity || identity.role !== "MUNICIPAL_BFP" || !identity.municipalityId) return NextResponse.json({ error: "Your municipal access is no longer active." }, { status: 403 });
    return NextResponse.json({
      user: {
        displayName: identity.displayName,
        rankOrPosition: identity.rankOrPosition,
        municipalityId: identity.municipalityId,
        municipalityName: identity.municipalityName,
        assignmentRole: identity.assignmentRole,
        mustChangePassword: identity.mustChangePassword,
      },
    });
  } catch (error) {
    console.error("Municipal BFP identity lookup failed", error);
    return NextResponse.json({ error: "Unable to load your municipal profile." }, { status: 500 });
  }
}
