import { NextRequest, NextResponse } from "next/server";

import { RESIDENT_SESSION_COOKIE, verifyResidentSession } from "../../../../lib/auth/session";
import { getDatabase } from "../../../../lib/db";

export const runtime = "nodejs";

const reportStatus = {
  SUBMITTED: { label: "Submitted", tone: "submitted" },
  UNDER_VERIFICATION: { label: "Verifying", tone: "verifying" },
  CONFIRMED: { label: "Confirmed", tone: "confirmed" },
  REJECTED: { label: "Rejected", tone: "closed" },
  FALSE_REPORT: { label: "False report", tone: "closed" },
  DUPLICATE: { label: "Duplicate", tone: "closed" },
  NEEDS_MORE_INFO: { label: "Needs info", tone: "verifying" },
  CLOSED: { label: "Closed", tone: "closed" },
} as const;

type ReportStatus = keyof typeof reportStatus;

export async function GET(request: NextRequest) {
  try {
    const session = verifyResidentSession(request.cookies.get(RESIDENT_SESSION_COOKIE)?.value);
    if (!session) return NextResponse.json({ error: "Sign in to view your dashboard." }, { status: 401 });

    const database = getDatabase();
    const profileResult = await database.query<{
      id: string; first_name: string; municipality: string | null; barangay: string | null;
    }>(`
      SELECT rp.id, rp.first_name, m.name AS municipality, b.name AS barangay
      FROM resident_profiles rp
      LEFT JOIN resident_addresses ra ON ra.resident_profile_id = rp.id AND ra.is_primary = true
      LEFT JOIN municipalities m ON m.id = ra.municipality_id
      LEFT JOIN barangays b ON b.id = ra.barangay_id
      WHERE rp.user_id = $1
      LIMIT 1`, [session.userId]);

    const resident = profileResult.rows[0];
    if (!resident) return NextResponse.json({ error: "Resident profile not found." }, { status: 404 });

    const [statusResult, recentResult] = await Promise.all([
      database.query<{ status: ReportStatus; total: number }>(`
        SELECT fr.status::text AS status, COUNT(*)::int AS total
        FROM fire_reports fr
        WHERE fr.resident_profile_id = $1
        GROUP BY fr.status`, [resident.id]),
      database.query<{ id: string; reference_number: string; status: ReportStatus }>(`
        SELECT fr.id, fr.reference_number, fr.status::text AS status
        FROM fire_reports fr
        WHERE fr.resident_profile_id = $1
        ORDER BY fr.submitted_at DESC NULLS LAST
        LIMIT 3`, [resident.id]),
    ]);

    const counts = { submitted: 0, verifying: 0, confirmed: 0, closed: 0 };
    for (const row of statusResult.rows) {
      if (row.status === "SUBMITTED") counts.submitted += row.total;
      else if (row.status === "UNDER_VERIFICATION" || row.status === "NEEDS_MORE_INFO") counts.verifying += row.total;
      else if (row.status === "CONFIRMED") counts.confirmed += row.total;
      else counts.closed += row.total;
    }

    return NextResponse.json({
      resident: {
        name: resident.first_name,
        municipality: resident.municipality ?? "Not provided",
        barangay: resident.barangay ?? "Not provided",
      },
      counts,
      reports: recentResult.rows.map((report) => ({
        id: report.id,
        referenceNumber: report.reference_number,
        ...(reportStatus[report.status] ?? { label: "Submitted", tone: "submitted" }),
      })),
    });
  } catch (error) {
    console.error("Resident dashboard lookup failed", error);
    return NextResponse.json({ error: "Unable to load your dashboard right now." }, { status: 500 });
  }
}
