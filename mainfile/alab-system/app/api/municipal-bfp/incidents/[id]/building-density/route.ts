import { NextRequest, NextResponse } from "next/server";

import { getBfpIdentity } from "../../../../../../lib/auth/bfp-accounts";
import { bfpSessionCookieName, verifyBfpSession } from "../../../../../../lib/auth/session";
import { getDatabase } from "../../../../../../lib/db";

export const runtime = "nodejs";

const attribution = {
  label: "Building footprints: Google Research Open Buildings V3",
  license: "CC BY 4.0",
  url: "https://sites.research.google/gr/open-buildings/",
};

function unavailable(latitude: number, longitude: number) {
  return {
    incident: { latitude, longitude },
    assessment: {
      status: "INSUFFICIENT_DATA",
      confidence: "UNAVAILABLE",
      buildingCount: 0,
      minimumGapMeters: null,
      source: null,
      assessedAt: null,
      radiusMeters: 30,
    },
    evidence: { type: "FeatureCollection", features: [] },
    attribution,
  };
}

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const session = verifyBfpSession(request.cookies.get(bfpSessionCookieName("MUNICIPAL_BFP"))?.value);
  if (!session || session.role !== "MUNICIPAL_BFP") {
    return NextResponse.json({ error: "Municipal BFP sign-in is required." }, { status: 401 });
  }
  const { id } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Invalid incident." }, { status: 400 });

  try {
    const identity = await getBfpIdentity(session.userId);
    if (!identity?.municipalityId) {
      return NextResponse.json({ error: "Your Municipal BFP assignment is not active." }, { status: 403 });
    }
    const database = getDatabase();
    const scopedReport = await database.query<{ latitude: number; longitude: number }>(
      `select fr.latitude::float as latitude, fr.longitude::float as longitude
         from fire_reports fr
        where fr.id = $1 and fr.municipality_id = $2 limit 1`,
      [id, identity.municipalityId],
    );
    const report = scopedReport.rows[0];
    if (!report) return NextResponse.json({ error: "Incident not found in your municipality." }, { status: 404 });

    try {
      const [summaryResult, evidenceResult] = await Promise.all([
        database.query(
          `select detected_building_density as status, building_density_confidence as confidence,
                  building_density_building_count as "buildingCount",
                  building_density_minimum_gap_meters::float as "minimumGapMeters",
                  building_density_source as source, building_density_assessed_at as "assessedAt"
             from fire_reports where id = $1`,
          [id],
        ),
        database.query(
          `select source_feature_id as "sourceFeatureId", extensions.ST_AsGeoJSON(geometry)::json as geometry,
                  source_confidence::float as "sourceConfidence",
                  distance_to_incident_meters::float as "distanceToIncidentMeters"
             from gis.fire_report_density_evidence where fire_report_id = $1
            order by distance_to_incident_meters asc`,
          [id],
        ),
      ]);
      const summary = summaryResult.rows[0];
      const features = evidenceResult.rows.map((row: any) => ({
        type: "Feature",
        geometry: row.geometry,
        properties: {
          sourceFeatureId: row.sourceFeatureId,
          sourceConfidence: row.sourceConfidence,
          distanceToIncidentMeters: row.distanceToIncidentMeters,
        },
      }));
      return NextResponse.json({
        incident: report,
        assessment: {
          status: summary?.status ?? "INSUFFICIENT_DATA",
          confidence: summary?.confidence ?? "UNAVAILABLE",
          buildingCount: summary?.buildingCount ?? 0,
          minimumGapMeters: summary?.minimumGapMeters ?? null,
          source: summary?.source ?? null,
          assessedAt: summary?.assessedAt ?? null,
          radiusMeters: 30,
        },
        evidence: { type: "FeatureCollection", features },
        attribution,
      });
    } catch (queryError: any) {
      if (queryError?.code === "42703" || queryError?.code === "42P01") {
        return NextResponse.json(unavailable(report.latitude, report.longitude));
      }
      throw queryError;
    }
  } catch (error) {
    console.error("Municipal building-density evidence failed", error);
    return NextResponse.json({ error: "Unable to load mapped building-density evidence." }, { status: 500 });
  }
}
