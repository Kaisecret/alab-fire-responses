import { NextRequest, NextResponse } from "next/server";

import { RESIDENT_SESSION_COOKIE, verifyResidentSession } from "../../../../../lib/auth/session";
import { getDatabase } from "../../../../../lib/db";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const session = verifyResidentSession(request.cookies.get(RESIDENT_SESSION_COOKIE)?.value);
    if (!session) return NextResponse.json({ error: "Sign in to view your login activity." }, { status: 401 });

    const result = await getDatabase().query<{ device_label: string; occurred_at: Date }>(`
      SELECT rla.device_label, rla.occurred_at
      FROM resident_login_activity rla
      JOIN resident_profiles rp ON rp.id = rla.resident_profile_id
      WHERE rp.user_id = $1
      ORDER BY rla.occurred_at DESC
      LIMIT 10`, [session.userId]);

    return NextResponse.json({
      activity: result.rows.map(({ device_label, occurred_at }) => ({ deviceLabel: device_label, occurredAt: occurred_at })),
    });
  } catch (error) {
    console.error("Resident login activity lookup failed", error);
    return NextResponse.json({ error: "Unable to load your login activity right now." }, { status: 500 });
  }
}
