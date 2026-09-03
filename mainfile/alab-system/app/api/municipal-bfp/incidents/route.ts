import { NextRequest, NextResponse } from "next/server";

import { getBfpIdentity } from "../../../../lib/auth/bfp-accounts";
import { bfpSessionCookieName, verifyBfpSession } from "../../../../lib/auth/session";
import { getDatabase } from "../../../../lib/db";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const session = verifyBfpSession(request.cookies.get(bfpSessionCookieName("MUNICIPAL_BFP"))?.value);
  if (!session || session.role !== "MUNICIPAL_BFP") return NextResponse.json({ error: "Municipal BFP sign-in is required." }, { status: 401 });
  try {
    const identity = await getBfpIdentity(session.userId);
    if (!identity?.municipalityId) return NextResponse.json({ error: "Your Municipal BFP assignment is not active." }, { status: 403 });
    const includeHistory = request.nextUrl.searchParams.get("scope") === "all";
    let rows: any[] = [];
    try {
      const result = await getDatabase().query(
        `select fr.id, fr.reference_number as "referenceNumber", fr.fire_type as "fireType", fr.status, fr.submitted_at as "submittedAt",
                fr.latitude::float as latitude, fr.longitude::float as longitude, b.name as barangay, fr.nearest_landmark as landmark,
                fr.report_source as "reportSource", coalesce(fr.caller_name, fr.reporter_name_snapshot) as "residentName",
                fr.calculated_severity as "calculatedSeverity",
                fr.detected_building_density as "detectedBuildingDensity",
                fr.building_density_confidence as "buildingDensityConfidence",
                fr.building_density_building_count as "buildingDensityBuildingCount",
                fr.building_density_minimum_gap_meters::float as "buildingDensityMinimumGapMeters"
           from fire_reports fr left join barangays b on b.id = fr.barangay_id
          where fr.municipality_id = $1 ${includeHistory ? "" : "and fr.status not in ('RESOLVED','REJECTED','FALSE_REPORT','DUPLICATE','CLOSED')"}
          order by fr.submitted_at desc`, [identity.municipalityId],
      );
      rows = result.rows;
    } catch (queryErr: any) {
      if (queryErr?.code === "42703" || queryErr?.message?.includes("report_source") || queryErr?.message?.includes("caller_name")) {
        const fallbackResult = await getDatabase().query(
          `select fr.id, fr.reference_number as "referenceNumber", fr.fire_type as "fireType", fr.status, fr.submitted_at as "submittedAt",
                  fr.latitude::float as latitude, fr.longitude::float as longitude, b.name as barangay, fr.nearest_landmark as landmark,
                  'ALAB_APP' as "reportSource", fr.reporter_name_snapshot as "residentName",
                  fr.calculated_severity as "calculatedSeverity",
                  null::text as "detectedBuildingDensity", null::text as "buildingDensityConfidence",
                  null::integer as "buildingDensityBuildingCount", null::float as "buildingDensityMinimumGapMeters"
             from fire_reports fr left join barangays b on b.id = fr.barangay_id
            where fr.municipality_id = $1 ${includeHistory ? "" : "and fr.status not in ('RESOLVED','REJECTED','FALSE_REPORT','DUPLICATE','CLOSED')"}
            order by fr.submitted_at desc`, [identity.municipalityId],
        );
        rows = fallbackResult.rows;
      } else {
        throw queryErr;
      }
    }
    return NextResponse.json({ municipality: identity.municipalityName, incidents: rows });
  } catch (error) {
    console.error("Municipal incident queue failed", error);
    return NextResponse.json({ error: "Unable to load municipal incidents." }, { status: 500 });
  }
}
