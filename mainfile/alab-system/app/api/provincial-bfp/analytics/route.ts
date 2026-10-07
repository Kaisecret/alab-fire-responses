import { NextRequest, NextResponse } from "next/server";

import { isLocalUiPreviewEnabled } from "../../../../lib/auth/local-ui-preview";
import { getManagementActor, isProvincialAuthorizationResponse } from "../../../../lib/provincial-bfp/auth";
import { getProvincialAnalytics, parseAnalyticsFilters } from "../../../../lib/provincial-bfp/analytics";

export const runtime = "nodejs";

/** Response-time analytics and fire-incident trends for the Provincial BFP. */
export async function GET(request: NextRequest) {
  // Local development previews read the totals without a provincial sign-in.
  if (!isLocalUiPreviewEnabled()) {
    const actor = await getManagementActor(request);
    if (isProvincialAuthorizationResponse(actor)) return actor;
  }

  let filters: ReturnType<typeof parseAnalyticsFilters>;
  try {
    filters = parseAnalyticsFilters(request.nextUrl.searchParams);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "INVALID_FILTERS" }, { status: 400 });
  }

  try {
    const analytics = await getProvincialAnalytics(filters);
    return NextResponse.json({ analytics }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("Provincial analytics failed", error);
    return NextResponse.json({ error: "Unable to load provincial analytics." }, { status: 500 });
  }
}
