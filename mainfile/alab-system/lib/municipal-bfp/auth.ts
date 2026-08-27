import { NextRequest, NextResponse } from "next/server";

import { getBfpIdentity, type BfpIdentity } from "../auth/bfp-accounts";
import { bfpSessionCookieName, verifyBfpSession } from "../auth/session";

export type MunicipalAdminIdentity = BfpIdentity & {
  municipalityId: string;
  assignmentRole: "MUNICIPAL_ADMIN";
};

export async function requireMunicipalAdmin(request: NextRequest): Promise<MunicipalAdminIdentity | NextResponse> {
  const session = verifyBfpSession(request.cookies.get(bfpSessionCookieName("MUNICIPAL_BFP"))?.value);
  if (!session || session.role !== "MUNICIPAL_BFP") {
    return NextResponse.json({ error: "Municipal BFP sign-in is required." }, { status: 401 });
  }
  const identity = await getBfpIdentity(session.userId);
  if (!identity?.municipalityId || identity.assignmentRole !== "MUNICIPAL_ADMIN") {
    return NextResponse.json({ error: "Municipal Administrator access is required." }, { status: 403 });
  }
  return identity as MunicipalAdminIdentity;
}

export function isAuthorizationResponse(value: MunicipalAdminIdentity | NextResponse): value is NextResponse {
  return value instanceof NextResponse;
}
