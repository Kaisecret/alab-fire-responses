import { NextRequest, NextResponse } from "next/server";

import { getBfpIdentity } from "../../../../../lib/auth/bfp-accounts";
import { isLocalUiPreviewEnabled } from "../../../../../lib/auth/local-ui-preview";
import { bfpSessionCookieName, verifyBfpSession } from "../../../../../lib/auth/session";
import { getDatabase } from "../../../../../lib/db";
import {
  getIncidentCoordinationContext,
  getObserverIncidentDetail,
  resolveMunicipalIncidentAccess,
} from "../../../../../lib/intermunicipality/incident-access";
import { getFireReportPhotoUrl } from "../../../../../lib/supabase/server-storage";

export const runtime = "nodejs";

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const session = verifyBfpSession(request.cookies.get(bfpSessionCookieName("MUNICIPAL_BFP", request.headers))?.value);
  let municipalityId: string | null = null;
  const isPreview = isLocalUiPreviewEnabled();

  if (isPreview) {
    if (session && session.role === "MUNICIPAL_BFP") {
      try {
        const identity = await getBfpIdentity(session.userId);
        if (identity?.municipalityId) municipalityId = identity.municipalityId;
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
  }

  const { id } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Invalid incident." }, { status: 400 });

  try {
    const database = getDatabase();

    let accessScope = await resolveMunicipalIncidentAccess(id, municipalityId);
    if (!accessScope && isPreview) {
      const previewCheck = await database.query<{ id: string }>("select id from fire_reports where id = $1 limit 1", [id]);
      if (previewCheck.rows.length > 0) {
        accessScope = "ORIGIN";
      }
    }
    if (!accessScope) {
      return NextResponse.json({ error: "Incident not found in your municipality." }, { status: 404 });
    }

    if (accessScope === "OBSERVER") {
      const [observerIncident, historyResult, coordination] = await Promise.all([
        getObserverIncidentDetail(id, municipalityId).catch(() => null),
        database.query(
          "select next_status as status, null::text as message, created_at as \"createdAt\" from fire_report_status_history where fire_report_id = $1 order by created_at asc",
          [id],
        ).catch(() => ({ rows: [] })),
        getIncidentCoordinationContext(id, municipalityId, "OBSERVER").catch(() => ({ observers: [], assistanceRequests: [] })),
      ]);

      if (!observerIncident) {
        return NextResponse.json({ error: "Incident not found in your municipality." }, { status: 404 });
      }

      return NextResponse.json(
        {
          incident: {
            ...observerIncident,
            accessScope: "OBSERVER",
            nearbyObservers: coordination.observers,
            assistanceRequests: coordination.assistanceRequests,
            history: historyResult.rows,
            photos: [],
            previousReports: [],
          },
        },
        {
          headers: {
            "Cache-Control": "private, no-store",
          },
        },
      );
    }

    // ORIGIN Access Scope
    let incident: any = null;
    try {
      const incidentResult = await database.query(
        `select fr.id, fr.reference_number as "referenceNumber", fr.status, fr.fire_type as "fireType", fr.description, fr.nearest_landmark as landmark,
                fr.latitude::float as latitude, fr.longitude::float as longitude, fr.submitted_at as "submittedAt", fr.response_started_at as "responseStartedAt",
                fr.responding_station_name as "respondingStationName", fr.report_source as "reportSource",
                coalesce(fr.caller_name, fr.reporter_name_snapshot) as "residentName", coalesce(fr.caller_phone, fr.reporter_phone_snapshot) as "phone",
                fr.reporter_ip_address::text as "reporterIpAddress", fr.reporter_device_summary as "reporterDeviceSummary",
                fr.structure_material as "structureMaterial", fr.house_density as "houseDensity", fr.route_accessibility as "routeAccessibility",
                fr.weather_temperature as "weatherTemperature", fr.weather_humidity as "weatherHumidity",
                fr.weather_wind_speed as "weatherWindSpeed", fr.weather_wind_direction as "weatherWindDirection", fr.weather_wind_condition as "weatherWindCondition",
                fr.calculated_severity as "calculatedSeverity", fr.severity_score as "severityScore", fr.severity_factors as "severityFactors",
                fr.reported_house_density as "reportedHouseDensity", fr.detected_building_density as "detectedBuildingDensity",
                fr.building_density_confidence as "buildingDensityConfidence", fr.building_density_building_count as "buildingDensityBuildingCount",
                fr.building_density_minimum_gap_meters::float as "buildingDensityMinimumGapMeters",
                fr.building_density_source as "buildingDensitySource", fr.building_density_assessed_at as "buildingDensityAssessedAt",
                rp.id as "residentProfileId", rp.first_name as "firstName", rp.last_name as "lastName", u.email,
                ra.complete_address as address, b.name as barangay, m.name as municipality,
                s.station_name as "stationName", s.latitude::float as "stationLatitude", s.longitude::float as "stationLongitude"
           from fire_reports fr
           left join resident_profiles rp on rp.id = fr.resident_profile_id left join users u on u.id = rp.user_id
           left join resident_addresses ra on ra.resident_profile_id = rp.id and ra.is_primary = true
           left join barangays b on b.id = fr.barangay_id left join municipalities m on m.id = fr.municipality_id
           left join lateral (
             select station_name, latitude, longitude
               from municipal_bfp_stations
              where municipality_id = fr.municipality_id and status = 'ACTIVE'
              order by created_at asc
              limit 1
           ) s on true
          where fr.id = $1 and fr.municipality_id = $2 limit 1`, [id, municipalityId],
      );
      incident = incidentResult.rows[0];
      if (!incident && isPreview) {
        const previewResult = await database.query(
          `select fr.id, fr.reference_number as "referenceNumber", fr.status, fr.fire_type as "fireType", fr.description, fr.nearest_landmark as landmark,
                  fr.latitude::float as latitude, fr.longitude::float as longitude, fr.submitted_at as "submittedAt", fr.response_started_at as "responseStartedAt",
                  fr.responding_station_name as "respondingStationName", fr.report_source as "reportSource",
                  coalesce(fr.caller_name, fr.reporter_name_snapshot) as "residentName", coalesce(fr.caller_phone, fr.reporter_phone_snapshot) as "phone",
                  fr.reporter_ip_address::text as "reporterIpAddress", fr.reporter_device_summary as "reporterDeviceSummary",
                  fr.structure_material as "structureMaterial", fr.house_density as "houseDensity", fr.route_accessibility as "routeAccessibility",
                  fr.weather_temperature as "weatherTemperature", fr.weather_humidity as "weatherHumidity",
                  fr.weather_wind_speed as "weatherWindSpeed", fr.weather_wind_direction as "weatherWindDirection", fr.weather_wind_condition as "weatherWindCondition",
                  fr.calculated_severity as "calculatedSeverity", fr.severity_score as "severityScore", fr.severity_factors as "severityFactors",
                  fr.reported_house_density as "reportedHouseDensity", fr.detected_building_density as "detectedBuildingDensity",
                  fr.building_density_confidence as "buildingDensityConfidence", fr.building_density_building_count as "buildingDensityBuildingCount",
                  fr.building_density_minimum_gap_meters::float as "buildingDensityMinimumGapMeters",
                  fr.building_density_source as "buildingDensitySource", fr.building_density_assessed_at as "buildingDensityAssessedAt",
                  rp.id as "residentProfileId", rp.first_name as "firstName", rp.last_name as "lastName", u.email,
                  ra.complete_address as address, b.name as barangay, m.name as municipality,
                  s.station_name as "stationName", s.latitude::float as "stationLatitude", s.longitude::float as "stationLongitude"
             from fire_reports fr
             left join resident_profiles rp on rp.id = fr.resident_profile_id left join users u on u.id = rp.user_id
             left join resident_addresses ra on ra.resident_profile_id = rp.id and ra.is_primary = true
             left join barangays b on b.id = fr.barangay_id left join municipalities m on m.id = fr.municipality_id
             left join lateral (
               select station_name, latitude, longitude
                 from municipal_bfp_stations
                where municipality_id = fr.municipality_id and status = 'ACTIVE'
                order by created_at asc
                limit 1
             ) s on true
            where fr.id = $1 limit 1`, [id],
        );
        incident = previewResult.rows[0];
      }
    } catch (queryErr: any) {
      console.warn("Primary municipal incident detail query failed, falling back to resilient query:", queryErr?.message);
      const fallbackResult = await database.query(
        `select fr.id, fr.reference_number as "referenceNumber", fr.status, fr.fire_type as "fireType", fr.description, fr.nearest_landmark as landmark,
                fr.latitude::float as latitude, fr.longitude::float as longitude, fr.submitted_at as "submittedAt", fr.response_started_at as "responseStartedAt",
                fr.responding_station_name as "respondingStationName", 'ALAB_APP' as "reportSource",
                fr.reporter_name_snapshot as "residentName", fr.reporter_phone_snapshot as "phone",
                fr.reporter_ip_address::text as "reporterIpAddress", fr.reporter_device_summary as "reporterDeviceSummary",
                fr.structure_material as "structureMaterial", fr.house_density as "houseDensity", fr.route_accessibility as "routeAccessibility",
                fr.weather_temperature as "weatherTemperature", fr.weather_humidity as "weatherHumidity",
                fr.weather_wind_speed as "weatherWindSpeed", fr.weather_wind_direction as "weatherWindDirection", fr.weather_wind_condition as "weatherWindCondition",
                fr.calculated_severity as "calculatedSeverity", fr.severity_score as "severityScore", fr.severity_factors as "severityFactors",
                null::text as "reportedHouseDensity", null::text as "detectedBuildingDensity",
                null::text as "buildingDensityConfidence", null::integer as "buildingDensityBuildingCount",
                null::float as "buildingDensityMinimumGapMeters", null::text as "buildingDensitySource",
                null::timestamptz as "buildingDensityAssessedAt",
                rp.id as "residentProfileId", rp.first_name as "firstName", rp.last_name as "lastName", u.email,
                ra.complete_address as address, b.name as barangay, m.name as municipality,
                s.station_name as "stationName", s.latitude::float as "stationLatitude", s.longitude::float as "stationLongitude"
           from fire_reports fr
           left join resident_profiles rp on rp.id = fr.resident_profile_id left join users u on u.id = rp.user_id
           left join resident_addresses ra on ra.resident_profile_id = rp.id and ra.is_primary = true
           left join barangays b on b.id = fr.barangay_id left join municipalities m on m.id = fr.municipality_id
           left join lateral (
             select station_name, latitude, longitude
               from municipal_bfp_stations
              where municipality_id = fr.municipality_id and status = 'ACTIVE'
              order by created_at asc
              limit 1
           ) s on true
          where fr.id = $1 and fr.municipality_id = $2 limit 1`, [id, municipalityId],
      );
      incident = fallbackResult.rows[0];
    }
    if (!incident) return NextResponse.json({ error: "Incident not found in your municipality." }, { status: 404 });

    const previousReports = incident.residentProfileId
      ? database.query("select id, reference_number as \"referenceNumber\", status, submitted_at as \"submittedAt\" from fire_reports where resident_profile_id = $1 order by submitted_at desc limit 10", [incident.residentProfileId]).catch(() => ({ rows: [] }))
      : Promise.resolve({ rows: [] });

    const [photoResult, historyResult, previousResult, coordination] = await Promise.all([
      database.query<{ storage_key: string }>("select storage_key from fire_report_photos where fire_report_id = $1 order by uploaded_at asc", [id]).catch(() => ({ rows: [] })),
      database.query("select next_status as status, resident_message as message, created_at as \"createdAt\" from fire_report_status_history where fire_report_id = $1 order by created_at asc", [id]).catch(() => ({ rows: [] })),
      previousReports,
      getIncidentCoordinationContext(id, municipalityId, "ORIGIN").catch(() => ({ observers: [], assistanceRequests: [] })),
    ]);

    const photos = await Promise.all(
      (photoResult.rows || []).map(async (photo) => {
        try {
          return { url: await getFireReportPhotoUrl(photo.storage_key) };
        } catch {
          return { url: null };
        }
      }),
    );

    return NextResponse.json(
      {
        incident: {
          ...incident,
          accessScope: "ORIGIN",
          nearbyObservers: coordination.observers,
          assistanceRequests: coordination.assistanceRequests,
          photos,
          history: historyResult.rows,
          previousReports: previousResult.rows,
        },
      },
      {
        headers: {
          "Cache-Control": "private, no-store",
        },
      },
    );
  } catch (error) {
    if (error instanceof Error && error.message === "OBSERVER_ACCESS_ENDED") {
      return NextResponse.json({ error: "This nearby incident is no longer active." }, { status: 410 });
    }
    console.error("Municipal incident detail failed", error);
    return NextResponse.json({ error: "Unable to load incident detail." }, { status: 500 });
  }
}
