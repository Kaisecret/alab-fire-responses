import { NextResponse } from "next/server";

import { isMobileBfpAuthorization, requireMobileMunicipalBfp } from "../../../../lib/auth/mobile-bfp";
import { listMobileDispatchAssignments } from "../../../../lib/municipal-bfp/dispatch";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const session = requireMobileMunicipalBfp(request);
  if (isMobileBfpAuthorization(session)) return session;
  try {
    return NextResponse.json({ assignments: await listMobileDispatchAssignments(session.userId) });
  } catch (error) {
    console.error("Mobile dispatch list failed", error);
    return NextResponse.json({ error: "Unable to load assigned incidents." }, { status: 500 });
  }
}
