import { NextRequest, NextResponse } from "next/server";

import { getDatabase } from "../../../../lib/db";
import { RESIDENT_APPLICANT_COOKIE, verifyResidentApplicantSession } from "../../../../lib/auth/session";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const session = verifyResidentApplicantSession(request.cookies.get(RESIDENT_APPLICANT_COOKIE)?.value);
  if (!session) return NextResponse.json({ error: "Sign in to view your resident application." }, { status: 401 });
  try {
    const result = await getDatabase().query(
      `select u.account_status as "accountStatus", rv.id, rv.application_reference as reference, rv.status,
              rv.rejection_reason as "correctionReason", rv.submitted_at as "submittedAt",
              rp.first_name as "firstName", rp.last_name as "lastName", u.email, u.phone, u.username,
              m.name as municipality, b.name as barangay, ra.complete_address as address
         from users u join resident_profiles rp on rp.user_id = u.id
         join resident_addresses ra on ra.resident_profile_id = rp.id and ra.is_primary
         join municipalities m on m.id = ra.municipality_id join barangays b on b.id = ra.barangay_id
         join lateral (select * from resident_verifications where resident_profile_id = rp.id
                       order by submitted_at desc, created_at desc limit 1) rv on true
        where u.id = $1 and u.role = 'RESIDENT' limit 1`,
      [session.userId],
    );
    const application = result.rows[0];
    if (!application) return NextResponse.json({ error: "Resident application not found." }, { status: 404 });
    return NextResponse.json({ application });
  } catch (error) {
    console.error("Resident application status lookup failed", error);
    return NextResponse.json({ error: "Unable to load your application status." }, { status: 500 });
  }
}
