import { NextRequest, NextResponse } from "next/server";

import { RESIDENT_SESSION_COOKIE, verifyResidentSession } from "../../../../lib/auth/session";
import { getDatabase } from "../../../../lib/db";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const session = verifyResidentSession(request.cookies.get(RESIDENT_SESSION_COOKIE)?.value);
    if (!session) return NextResponse.json({ error: "Sign in to view your profile." }, { status: 401 });

    const database = getDatabase();
    const result = await database.query<{
      first_name: string; last_name: string; username: string; email: string; phone: string;
      municipality: string | null; barangay: string | null; complete_address: string | null;
      verification_status: string | null; push_enabled: boolean | null; incident_updates_enabled: boolean | null;
      emergency_alerts_enabled: boolean | null; guide_updates_enabled: boolean | null;
    }>(`
      SELECT rp.first_name, rp.last_name, u.username, u.email, u.phone,
             m.name AS municipality, b.name AS barangay, ra.complete_address,
             rv.status AS verification_status, np.push_enabled, np.incident_updates_enabled,
             np.emergency_alerts_enabled, np.guide_updates_enabled
      FROM users u
      JOIN resident_profiles rp ON rp.user_id = u.id
      LEFT JOIN resident_addresses ra ON ra.resident_profile_id = rp.id AND ra.is_primary = true
      LEFT JOIN municipalities m ON m.id = ra.municipality_id
      LEFT JOIN barangays b ON b.id = ra.barangay_id
      LEFT JOIN resident_verifications rv ON rv.resident_profile_id = rp.id
      LEFT JOIN notification_preferences np ON np.resident_profile_id = rp.id
      WHERE u.id = $1
      ORDER BY rv.updated_at DESC NULLS LAST
      LIMIT 1`, [session.userId]);

    const resident = result.rows[0];
    if (!resident) return NextResponse.json({ error: "Resident profile not found." }, { status: 404 });

    return NextResponse.json({
      profile: {
        name: `${resident.first_name} ${resident.last_name}`,
        username: resident.username, email: resident.email, phone: resident.phone,
        municipality: resident.municipality ?? "Not provided", barangay: resident.barangay ?? "Not provided",
        address: resident.complete_address ?? "Not provided",
        verificationStatus: resident.verification_status ?? "PENDING",
        notifications: {
          push: resident.push_enabled ?? true, incidents: resident.incident_updates_enabled ?? true,
          emergency: resident.emergency_alerts_enabled ?? true, guide: resident.guide_updates_enabled ?? true,
        },
      },
    });
  } catch (error) {
    console.error("Resident profile lookup failed", error);
    return NextResponse.json({ error: "Unable to load your profile right now." }, { status: 500 });
  }
}
