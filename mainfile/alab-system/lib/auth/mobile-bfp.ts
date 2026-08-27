import { NextResponse } from "next/server";

import { type BfpSession, verifyBfpSession } from "./session";

export type MobileBfpIdentity = {
  userId: string;
  displayName: string;
  municipalityId: string | null;
  municipalityName: string | null;
  assignmentRole: "MUNICIPAL_ADMIN" | "MUNICIPAL_STAFF" | null;
};

function unauthorized(message = "Sign in again to continue.") {
  return NextResponse.json({ error: message }, { status: 401 });
}

export function requireMobileMunicipalBfp(request: Request): BfpSession | NextResponse {
  const authorization = request.headers.get("authorization") ?? "";
  const match = /^Bearer\s+([A-Za-z0-9._-]+)$/.exec(authorization);
  if (!match) return unauthorized();

  const session = verifyBfpSession(match[1]);
  if (!session || session.role !== "MUNICIPAL_BFP") return unauthorized();
  return session;
}

export function isMobileBfpAuthorization(response: BfpSession | NextResponse): response is NextResponse {
  return response instanceof NextResponse;
}

export function mobileBfpIdentity(input: MobileBfpIdentity) {
  return {
    userId: input.userId,
    displayName: input.displayName,
    municipalityId: input.municipalityId,
    municipalityName: input.municipalityName,
    assignmentRole: input.assignmentRole,
  };
}
