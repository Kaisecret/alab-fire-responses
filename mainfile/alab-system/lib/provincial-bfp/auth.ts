import { NextRequest, NextResponse } from "next/server";

import { getBfpIdentity, type BfpIdentity } from "../auth/bfp-accounts";
import { bfpSessionCookieName, verifyBfpSession } from "../auth/session";

export type ProvincialBfpIdentity = BfpIdentity & {
  role: "PROVINCIAL_BFP";
};

export async function requireProvincialBfp(
  request: NextRequest,
): Promise<ProvincialBfpIdentity | NextResponse> {
  const session = verifyBfpSession(
    request.cookies.get(bfpSessionCookieName("PROVINCIAL_BFP"))?.value,
  );
  if (!session || session.role !== "PROVINCIAL_BFP") {
    return NextResponse.json(
      { error: "Provincial BFP sign-in is required." },
      { status: 401 },
    );
  }
  const identity = await getBfpIdentity(session.userId);
  if (!identity || identity.role !== "PROVINCIAL_BFP") {
    return NextResponse.json(
      { error: "Your provincial access is no longer active." },
      { status: 403 },
    );
  }
  return identity as ProvincialBfpIdentity;
}

export function isProvincialAuthorizationResponse(
  value: ProvincialBfpIdentity | NextResponse,
): value is NextResponse {
  return value instanceof NextResponse;
}
