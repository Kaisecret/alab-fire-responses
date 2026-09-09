import { NextRequest, NextResponse } from "next/server";
import { isCronAuthorized } from "../../../../lib/auth/cron";
import { retryResidentCorrectionNotifications } from "../../../../lib/resident-applications/delivery-service";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!isCronAuthorized(request.headers.get("authorization"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    return NextResponse.json(await retryResidentCorrectionNotifications(), { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Delivery queue is temporarily unavailable." }, { status: 503 });
  }
}
