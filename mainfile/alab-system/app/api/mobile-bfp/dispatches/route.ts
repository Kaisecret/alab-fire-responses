import { NextResponse } from "next/server";

import { isMobileBfpAuthorization, requireMobileMunicipalBfp } from "../../../../lib/auth/mobile-bfp";
import { getMobileResolvedCount, listMobileDispatchAssignments } from "../../../../lib/municipal-bfp/dispatch";
import { addMobileDecisionSupport } from "../../../../lib/municipal-bfp/mobile-decision-support";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const session = requireMobileMunicipalBfp(request);
  if (isMobileBfpAuthorization(session)) return session;
  try {
    const [assignments, resolvedCount] = await Promise.all([
      listMobileDispatchAssignments(session.userId).then(addMobileDecisionSupport),
      getMobileResolvedCount(session.userId),
    ]);
    return NextResponse.json({ assignments, resolvedCount });
  } catch (error) {
    console.error("Mobile dispatch list failed", error);
    return NextResponse.json({ error: "Unable to load assigned incidents." }, { status: 500 });
  }
}
