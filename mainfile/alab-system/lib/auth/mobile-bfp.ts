import { NextResponse } from "next/server";

import { type BfpSession, verifyBfpSession } from "./session";

export type MobileBfpIdentity = {
  userId: string;
  email: string;
  displayName: string;
  rankOrPosition: string | null;
  municipalityId: string | null;
  municipalityName: string | null;
  stationName: string | null;
  assignmentRole: "MUNICIPAL_ADMIN" | "MUNICIPAL_STAFF" | null;
};

function unauthorized(message = "Sign in again to continue.") {
  return NextResponse.json({ error: message }, { status: 401 });
}

export async function mobileBfpIdentityWithPhoto(input: MobileBfpIdentity) {
  let profilePhotoUrl: string | null = null;
  try {
    const { createBfpProfilePhotoUrl } = await import("./bfp-profile-photos");
    profilePhotoUrl = await createBfpProfilePhotoUrl(input.userId);
  } catch {
    // A profile image must never prevent a signed-in BFP account from using
    // the operational app when Storage is temporarily unavailable.
  }
  return {
    ...mobileBfpIdentity(input),
    profilePhotoUrl,
  };
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
    email: input.email,
    displayName: input.displayName,
    rankOrPosition: input.rankOrPosition,
    municipalityId: input.municipalityId,
    municipalityName: input.municipalityName,
    stationName: input.stationName,
    assignmentRole: input.assignmentRole,
  };
}
