import { NextRequest, NextResponse } from "next/server";

import { RESIDENT_SESSION_COOKIE, verifyResidentSession } from "../../../../lib/auth/session";
import { isLocalUiPreviewEnabled } from "../../../../lib/auth/local-ui-preview";
import { getDatabase } from "../../../../lib/db";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    if (isLocalUiPreviewEnabled()) {
      return NextResponse.json({
        profile: {
          name: "Resident Preview", username: "resident.preview", email: "resident.preview@local.test", phone: "0917 000 0000",
          municipality: "San Jose de Buenavista", barangay: "Funda-Dalipe", address: "Preview address only",
          verificationStatus: "VERIFIED",
          notifications: { push: true, incidents: true, emergency: true, guide: true },
        },
      });
    }
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

export async function PUT(request: NextRequest) {
  try {
    if (isLocalUiPreviewEnabled()) {
      const body = await request.json();
      return NextResponse.json({ profile: { email: String(body.email ?? ""), phone: String(body.phone ?? "") } });
    }
    const session = verifyResidentSession(request.cookies.get(RESIDENT_SESSION_COOKIE)?.value);
    if (!session) return NextResponse.json({ error: "Sign in to update your profile." }, { status: 401 });
    const body = await request.json() as { email?: unknown; phone?: unknown };
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const phone = typeof body.phone === "string" ? body.phone.replace(/[\s-]/g, "") : "";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    if (!/^\+?[0-9]{10,15}$/.test(phone)) return NextResponse.json({ error: "Enter a valid mobile number." }, { status: 400 });
    try {
      const updated = await getDatabase().query<{ email: string; phone: string }>(
        "update users set email = $1, phone = $2, updated_at = now() where id = $3 and role = 'RESIDENT' returning email, phone",
        [email, phone, session.userId],
      );
      if (!updated.rowCount) return NextResponse.json({ error: "Resident profile not found." }, { status: 404 });
      return NextResponse.json({ profile: updated.rows[0] });
    } catch (error) {
      if ((error as { code?: string }).code === "23505") return NextResponse.json({ error: "That email or mobile number is already in use." }, { status: 409 });
      throw error;
    }
  } catch (error) {
    console.error("Resident profile update failed", error);
    return NextResponse.json({ error: "Unable to update your profile right now." }, { status: 500 });
  }
}
