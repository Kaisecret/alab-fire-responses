import { NextRequest, NextResponse } from "next/server";
import { isCronAuthorized } from "../../../../lib/auth/cron";
import { forwardExpiredBackupRequests } from "../../../../lib/incidents/backup-escalation";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

/**
 * Forwards backup requests the municipality did not act on in time. This runs
 * on a schedule so an escalation never depends on a municipal browser being
 * open; the municipal and provincial views sweep as well, which closes the gap
 * between scheduled runs for anyone actively watching.
 */
export async function GET(request: NextRequest) {
  if (!isCronAuthorized(request.headers.get("authorization"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const forwarded = await forwardExpiredBackupRequests();
    return NextResponse.json(
      { forwarded: forwarded.length, requests: forwarded.map((item) => item.referenceNumber) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Backup escalation sweep failed", error);
    return NextResponse.json({ error: "Escalation sweep is temporarily unavailable." }, { status: 503 });
  }
}
