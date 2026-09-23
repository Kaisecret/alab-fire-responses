import { NextRequest, NextResponse } from "next/server";

import { getBfpIdentity, type BfpIdentity } from "../auth/bfp-accounts";
import { isLocalUiPreviewEnabled } from "../auth/local-ui-preview";
import { bfpSessionCookieName, resolveMunicipalSession, verifyBfpSession } from "../auth/session";

export type MunicipalAdminIdentity = BfpIdentity & {
  municipalityId: string;
  role: "MUNICIPAL_BFP";
  assignmentRole: "MUNICIPAL_ADMIN";
};

export type MunicipalBfpIdentity = BfpIdentity & {
  municipalityId: string;
  role: "MUNICIPAL_BFP";
};

const previewIdentity: MunicipalAdminIdentity = {
  userId: "afbc9f03-312c-4208-a15c-05f87a3ad6fe",
  email: "preview@municipal-bfp.local",
  displayName: "Municipal BFP Preview",
  rankOrPosition: "Municipal Fire Marshal",
  stationName: "San Jose Main Fire Station",
  role: "MUNICIPAL_BFP",
  accountStatus: "ACTIVE",
  mustChangePassword: false,
  municipalityId: "a4ba607b-8863-4f0f-bcaf-a86beb0acb29",
  municipalityName: "San Jose de Buenavista",
  assignmentRole: "MUNICIPAL_ADMIN",
};

export async function requireMunicipalBfp(
  request: NextRequest,
): Promise<MunicipalBfpIdentity | NextResponse> {
  if (isLocalUiPreviewEnabled()) {
    const session = resolveMunicipalSession(request.cookies, request.headers);
    if (session && session.role === "MUNICIPAL_BFP") {
      const identity = await getBfpIdentity(session.userId);
      if (identity?.municipalityId && identity.role === "MUNICIPAL_BFP") {
        return identity as MunicipalBfpIdentity;
      }
    }
    return previewIdentity;
  }
  const session = resolveMunicipalSession(request.cookies, request.headers);
  if (!session || session.role !== "MUNICIPAL_BFP") {
    return NextResponse.json({ error: "Municipal BFP sign-in is required." }, { status: 401 });
  }
  const identity = await getBfpIdentity(session.userId);
  if (!identity?.municipalityId || identity.role !== "MUNICIPAL_BFP") {
    return NextResponse.json({ error: "Your municipal access is no longer active." }, { status: 403 });
  }
  return identity as MunicipalBfpIdentity;
}

export async function requireMunicipalAdmin(request: NextRequest): Promise<MunicipalAdminIdentity | NextResponse> {
  const identity = await requireMunicipalBfp(request);
  if (isAuthorizationResponse(identity)) return identity;
  if (identity.assignmentRole !== "MUNICIPAL_ADMIN") {
    return NextResponse.json({ error: "Municipal Administrator access is required." }, { status: 403 });
  }
  return identity as MunicipalAdminIdentity;
}

export function isAuthorizationResponse(value: unknown): value is NextResponse {
  return value instanceof NextResponse;
}
