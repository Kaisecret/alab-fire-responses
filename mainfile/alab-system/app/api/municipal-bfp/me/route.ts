import { NextRequest, NextResponse } from "next/server";

import { getBfpIdentity } from "../../../../lib/auth/bfp-accounts";
import { isLocalUiPreviewEnabled } from "../../../../lib/auth/local-ui-preview";
import { bfpSessionCookieName, verifyBfpSession } from "../../../../lib/auth/session";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  if (isLocalUiPreviewEnabled()) {
    return NextResponse.json({
      user: {
        displayName: "Municipal BFP Preview",
        email: "preview@municipal-bfp.local",
        rankOrPosition: "Municipal Fire Marshal",
        municipalityId: "local-preview-municipality",
        municipalityName: "San Jose de Buenavista",
        assignmentRole: "MUNICIPAL_ADMIN",
        mustChangePassword: false,
      },
    });
  }
  const session = verifyBfpSession(request.cookies.get(bfpSessionCookieName("MUNICIPAL_BFP"))?.value);
  if (!session || session.role !== "MUNICIPAL_BFP") return NextResponse.json({ error: "Municipal BFP sign-in is required." }, { status: 401 });
  try {
    const identity = await getBfpIdentity(session.userId);
    if (!identity || identity.role !== "MUNICIPAL_BFP" || !identity.municipalityId) return NextResponse.json({ error: "Your municipal access is no longer active." }, { status: 403 });
    return NextResponse.json({
      user: {
        displayName: identity.displayName,
        email: identity.email,
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
