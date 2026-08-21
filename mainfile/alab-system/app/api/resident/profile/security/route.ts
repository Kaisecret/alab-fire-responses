import { NextRequest, NextResponse } from "next/server";

import { hashPassword, verifyPassword } from "../../../../../lib/auth/password";
import { RESIDENT_SESSION_COOKIE, verifyResidentSession } from "../../../../../lib/auth/session";
import { getDatabase } from "../../../../../lib/db";

export const runtime = "nodejs";

type ResidentSecurityRow = {
  resident_profile_id: string;
  password_hash: string;
  pin_hash: string | null;
  bfp_contact_allowed: boolean | null;
};

async function ownedSecurity(sessionUserId: string) {
  return getDatabase().query<ResidentSecurityRow>(`
    SELECT rp.id AS resident_profile_id, u.password_hash, rss.pin_hash, rss.bfp_contact_allowed
    FROM users u
    JOIN resident_profiles rp ON rp.user_id = u.id
    LEFT JOIN resident_security_settings rss ON rss.resident_profile_id = rp.id
    WHERE rp.user_id = $1 AND u.role = 'RESIDENT'
    LIMIT 1`, [sessionUserId]);
}

export async function GET(request: NextRequest) {
  try {
    const session = verifyResidentSession(request.cookies.get(RESIDENT_SESSION_COOKIE)?.value);
    if (!session) return NextResponse.json({ error: "Sign in to view your security settings." }, { status: 401 });

    const result = await ownedSecurity(session.userId);
    const security = result.rows[0];
    if (!security) return NextResponse.json({ error: "Resident profile not found." }, { status: 404 });

    return NextResponse.json({
      security: { pinConfigured: Boolean(security.pin_hash), bfpContactAllowed: security.bfp_contact_allowed ?? false },
    });
  } catch (error) {
    console.error("Resident security settings lookup failed", error);
    return NextResponse.json({ error: "Unable to load your security settings right now." }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = verifyResidentSession(request.cookies.get(RESIDENT_SESSION_COOKIE)?.value);
    if (!session) return NextResponse.json({ error: "Sign in to update your security settings." }, { status: 401 });

    const body = await request.json() as {
      currentPassword?: unknown;
      pin?: unknown;
      bfpContactAllowed?: unknown;
    };
    const pin = typeof body.pin === "string" ? body.pin : "";
    const changingPin = body.pin !== undefined;
    const changingBfpContact = body.bfpContactAllowed !== undefined;
    if (!changingPin && !changingBfpContact) {
      return NextResponse.json({ error: "Provide a PIN or BFP contact preference to update." }, { status: 400 });
    }
    if (changingPin && !/^\d{4}$/.test(pin)) {
      return NextResponse.json({ error: "PIN must contain exactly four digits." }, { status: 400 });
    }
    if (changingBfpContact && typeof body.bfpContactAllowed !== "boolean") {
      return NextResponse.json({ error: "BFP contact preference must be true or false." }, { status: 400 });
    }

    const result = await ownedSecurity(session.userId);
    const user = result.rows[0];
    if (!user) return NextResponse.json({ error: "Resident profile not found." }, { status: 404 });

    let pinHash = user.pin_hash;
    if (changingPin) {
      const currentPassword = typeof body.currentPassword === "string" ? body.currentPassword : "";
      if (!currentPassword || !(await verifyPassword(currentPassword, user.password_hash))) {
        return NextResponse.json({ error: "Current password is incorrect." }, { status: 400 });
      }
      pinHash = await hashPassword(pin);
    }
    const bfpContactAllowed = changingBfpContact ? body.bfpContactAllowed as boolean : user.bfp_contact_allowed ?? false;
    const saved = await getDatabase().query<{ bfp_contact_allowed: boolean }>(`
      INSERT INTO resident_security_settings (resident_profile_id, pin_hash, bfp_contact_allowed, updated_at)
      VALUES ($1, $2, $3, now())
      ON CONFLICT (resident_profile_id) DO UPDATE
      SET pin_hash = EXCLUDED.pin_hash,
          bfp_contact_allowed = EXCLUDED.bfp_contact_allowed,
          updated_at = now()
      RETURNING bfp_contact_allowed`, [user.resident_profile_id, pinHash, bfpContactAllowed]);

    return NextResponse.json({
      security: { pinConfigured: true, bfpContactAllowed: saved.rows[0].bfp_contact_allowed },
    });
  } catch (error) {
    console.error("Resident security settings update failed", error);
    return NextResponse.json({ error: "Unable to update your security settings right now." }, { status: 500 });
  }
}
