import "server-only";

import type { NextRequest } from "next/server";

import { getBfpIdentity } from "../auth/bfp-accounts";
import {
  RESIDENT_APPLICANT_COOKIE,
  RESIDENT_SESSION_COOKIE,
  bfpSessionCookieName,
  verifyBfpSession,
  verifyResidentApplicantSession,
  verifyResidentSession,
  type BfpRole,
} from "../auth/session";

export function residentNotificationUser(request: NextRequest) {
  const resident = verifyResidentSession(request.cookies.get(RESIDENT_SESSION_COOKIE)?.value);
  if (resident) return { userId: resident.userId };
  const applicant = verifyResidentApplicantSession(request.cookies.get(RESIDENT_APPLICANT_COOKIE)?.value);
  return applicant ? { userId: applicant.userId } : null;
}

export async function bfpNotificationUser(request: NextRequest, role: BfpRole) {
  const session = verifyBfpSession(request.cookies.get(bfpSessionCookieName(role))?.value);
  if (!session || session.role !== role) return null;
  const identity = await getBfpIdentity(session.userId);
  if (!identity || identity.role !== role) return null;
  if (role === "MUNICIPAL_BFP" && !identity.municipalityId) return null;
  return { userId: identity.userId };
}
