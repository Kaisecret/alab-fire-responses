import { NextResponse } from "next/server";

import { isMobileBfpAuthorization, requireMobileMunicipalBfp } from "../../../../../lib/auth/mobile-bfp";
import { listMobileResolvedAssignments } from "../../../../../lib/municipal-bfp/dispatch";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const session = requireMobileMunicipalBfp(request);
  if (isMobileBfpAuthorization(session)) return session;
  try {
    const resolvedAssignments = await listMobileResolvedAssignments(session.userId);
    return NextResponse.json({ resolvedAssignments });
  } catch (error) {
    console.error("Mobile resolved dispatches list failed", error);
    return NextResponse.json({ error: "Unable to load resolved incidents." }, { status: 500 });
  }
}
