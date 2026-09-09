import { NextRequest, NextResponse } from "next/server";

import { getBfpIdentity } from "../../../../lib/auth/bfp-accounts";
import { isLocalUiPreviewEnabled } from "../../../../lib/auth/local-ui-preview";
import { bfpSessionCookieName, verifyBfpSession } from "../../../../lib/auth/session";
import { getDatabase } from "../../../../lib/db";
import {
  listScopedMunicipalIncidents,
  type ScopedMunicipalIncident,
} from "../../../../lib/intermunicipality/incident-access";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const session = verifyBfpSession(request.cookies.get(bfpSessionCookieName("MUNICIPAL_BFP", request.headers))?.value);
  let municipalityId: string | null = null;
  let municipalityName = "San Jose de Buenavista";

  if (isLocalUiPreviewEnabled()) {
    if (session && session.role === "MUNICIPAL_BFP") {
      try {
        const identity = await getBfpIdentity(session.userId);
        if (identity?.municipalityId) {
          municipalityId = identity.municipalityId;
          municipalityName = identity.municipalityName ?? municipalityName;
        }
      } catch {}
    }
    if (!municipalityId) {
      municipalityId = "a4ba607b-8863-4f0f-bcaf-a86beb0acb29";
    }
  } else {
    if (!session || session.role !== "MUNICIPAL_BFP") return NextResponse.json({ error: "Municipal BFP sign-in is required." }, { status: 401 });
    const identity = await getBfpIdentity(session.userId);
    if (!identity?.municipalityId) return NextResponse.json({ error: "Your Municipal BFP assignment is not active." }, { status: 403 });
    municipalityId = identity.municipalityId;
    municipalityName = identity.municipalityName ?? municipalityName;
  }

  try {
    const includeHistory = request.nextUrl.searchParams.get("scope") === "all";

    let incidents: ScopedMunicipalIncident[] = [];
    try {
      incidents = await listScopedMunicipalIncidents(
        municipalityId,
        includeHistory,
      );
    } catch (scopedErr) {
      console.warn("Scoped municipal incident retrieval failed, attempting origin fallback", scopedErr);
      try {
        const fallbackResult = await getDatabase().query<ScopedMunicipalIncident>(
          `select fr.id,
                  fr.reference_number as "referenceNumber",
                  fr.report_source as "reportSource",
                  coalesce(fr.caller_name, fr.reporter_name_snapshot) as "residentName",
                  fr.fire_type as "fireType",
                  fr.status,
                  b.name as barangay,
                  fr.nearest_landmark as landmark,
                  fr.submitted_at as "submittedAt",
                  fr.latitude::float as latitude,
                  fr.longitude::float as longitude,
                  fr.calculated_severity as "calculatedSeverity",
                  fr.detected_building_density as "detectedBuildingDensity",
                  fr.building_density_confidence as "buildingDensityConfidence",
                  fr.building_density_building_count as "buildingDensityBuildingCount",
                  fr.building_density_minimum_gap_meters::float as "buildingDensityMinimumGapMeters",
                  'ORIGIN'::text as "accessScope",
                  origin.name as "originMunicipality"
             from fire_reports fr
             join municipalities origin on origin.id = fr.municipality_id
             left join barangays b on b.id = fr.barangay_id
            where fr.municipality_id = $1
              ${includeHistory ? "" : "and fr.status not in ('RESOLVED','REJECTED','FALSE_REPORT','DUPLICATE','CLOSED')"}
            order by fr.submitted_at desc`,
          [municipalityId],
        );
        incidents = fallbackResult.rows;
      } catch (originErr: any) {
        if (
          originErr?.code === "42703" ||
          originErr?.message?.includes("report_source") ||
          originErr?.message?.includes("caller_name")
        ) {
          const legacyResult = await getDatabase().query<ScopedMunicipalIncident>(
            `select fr.id,
                    fr.reference_number as "referenceNumber",
                    'ALAB_APP'::text as "reportSource",
                    fr.reporter_name_snapshot as "residentName",
                    fr.fire_type as "fireType",
                    fr.status,
                    b.name as barangay,
                    fr.nearest_landmark as landmark,
                    fr.submitted_at as "submittedAt",
                    fr.latitude::float as latitude,
                    fr.longitude::float as longitude,
                    fr.calculated_severity as "calculatedSeverity",
                    null::text as "detectedBuildingDensity",
                    null::text as "buildingDensityConfidence",
                    null::integer as "buildingDensityBuildingCount",
                    null::float as "buildingDensityMinimumGapMeters",
                    'ORIGIN'::text as "accessScope",
                    origin.name as "originMunicipality"
               from fire_reports fr
               join municipalities origin on origin.id = fr.municipality_id
               left join barangays b on b.id = fr.barangay_id
              where fr.municipality_id = $1
                ${includeHistory ? "" : "and fr.status not in ('RESOLVED','REJECTED','FALSE_REPORT','DUPLICATE','CLOSED')"}
              order by fr.submitted_at desc`,
            [municipalityId],
          );
          incidents = legacyResult.rows;
        } else {
          throw originErr;
        }
      }
    }

    return NextResponse.json({
      municipality: municipalityName,
      incidents,
    });
  } catch (error) {
    console.error("Municipal incident queue failed", error);
    return NextResponse.json({ error: "Unable to load municipal incidents." }, { status: 500 });
  }
}
