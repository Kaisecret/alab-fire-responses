import { NextRequest, NextResponse } from "next/server";

import { RESIDENT_SESSION_COOKIE, verifyResidentSession } from "../../../../lib/auth/session";
import { isLocalUiPreviewEnabled } from "../../../../lib/auth/local-ui-preview";
import { getDatabase } from "../../../../lib/db";
import { residentDashboardBucket } from "../../../../lib/fire-reports/resident-dashboard-status";
import { fireReportStatusLabels, type FireReportStatus } from "../../../../lib/fire-reports/types";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    if (isLocalUiPreviewEnabled()) {
      return NextResponse.json({
        resident: { name: "Resident Preview", municipality: "San Jose de Buenavista", barangay: "Funda-Dalipe" },
        counts: { submitted: 0, verifying: 0, responding: 0, closed: 0 },
        reports: [],
      });
    }
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
      database.query<{ status: FireReportStatus; total: number }>(`
        SELECT fr.status::text AS status, COUNT(*)::int AS total
        FROM fire_reports fr
        WHERE fr.resident_profile_id = $1
        GROUP BY fr.status`, [resident.id]),
      database.query<{ id: string; reference_number: string; status: FireReportStatus }>(`
        SELECT fr.id, fr.reference_number, fr.status::text AS status
        FROM fire_reports fr
        WHERE fr.resident_profile_id = $1
        ORDER BY fr.submitted_at DESC NULLS LAST
        LIMIT 3`, [resident.id]),
    ]);

    const counts = { submitted: 0, verifying: 0, responding: 0, closed: 0 };
    for (const row of statusResult.rows) {
      counts[residentDashboardBucket(row.status)] += row.total;
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
        label: fireReportStatusLabels[report.status] ?? "Report submitted",
        tone: residentDashboardBucket(report.status),
      })),
    });
  } catch (error) {
    console.error("Resident dashboard lookup failed", error);
    return NextResponse.json({ error: "Unable to load your dashboard right now." }, { status: 500 });
  }
}
