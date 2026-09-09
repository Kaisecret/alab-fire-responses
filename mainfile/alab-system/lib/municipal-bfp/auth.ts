import { NextRequest, NextResponse } from "next/server";

import { getBfpIdentity, type BfpIdentity } from "../auth/bfp-accounts";
import { isLocalUiPreviewEnabled } from "../auth/local-ui-preview";
import { bfpSessionCookieName, verifyBfpSession } from "../auth/session";

export type MunicipalAdminIdentity = BfpIdentity & {
  municipalityId: string;
  assignmentRole: "MUNICIPAL_ADMIN";
};

export async function requireMunicipalAdmin(request: NextRequest): Promise<MunicipalAdminIdentity | NextResponse> {
  if (isLocalUiPreviewEnabled()) {
    const session = verifyBfpSession(request.cookies.get(bfpSessionCookieName("MUNICIPAL_BFP"))?.value);
    if (session && session.role === "MUNICIPAL_BFP") {
      const identity = await getBfpIdentity(session.userId);
      if (identity?.municipalityId && identity.assignmentRole === "MUNICIPAL_ADMIN") {
        return identity as MunicipalAdminIdentity;
      }
    }
    return {
      userId: "afbc9f03-312c-4208-a15c-05f87a3ad6fe",
      email: "preview@municipal-bfp.local",
      displayName: "Municipal BFP Preview",
      rankOrPosition: "Municipal Fire Marshal",
      stationName: "San Jose Main Fire Station",
      role: "MUNICIPAL_BFP" as const,
      accountStatus: "ACTIVE" as const,
      mustChangePassword: false,
      municipalityId: "a4ba607b-8863-4f0f-bcaf-a86beb0acb29",
      municipalityName: "San Jose de Buenavista",
      assignmentRole: "MUNICIPAL_ADMIN" as const,
    } as MunicipalAdminIdentity;
  }
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
