import { randomUUID } from "node:crypto";
import type { PoolClient } from "pg";

import { getDatabase, withTransaction } from "../db";
import {
  resolveDetectedBarangay,
  normalizeDetectedBarangay,
  normalizeDetectedMunicipality,
  type FireReportInput,
} from "./validation";
import type { FireReportSubmissionAudit } from "./submission-audit";
import type { FireReportStatus } from "./types";
import {
  createAccountNotifications,
  listMunicipalNotificationRecipients,
  listProvincialNotificationRecipients,
} from "../notifications/service";
import { fetchLiveWeather } from "../weather/service";
import { assessBuildingDensity } from "./building-density";
import { assessMultiTypeDanger } from "./danger-assessment";
import { addFireTypesToIncident, findOpenIncidentNear, findOwnOpenReportNear } from "./duplicates";
import { rescoreStoredReport, STORED_DANGER_COLUMNS, storedFireTypes, type StoredDangerRow } from "./stored-danger";
import { checkResidentSosRateLimit, SosRateLimitError } from "./rate-limiter";
import { followSameDeviceIncident, recordResidentIncidentFollow } from "./device-sharing";
import { locateAntiqueBarangay } from "../locations/barangay-locator";

export type PhotoMetadata = { storageKey: string; originalFileName: string; mimeType: string; fileSizeBytes: number };

function referenceNumber() {
  return `ALAB-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${randomUUID().slice(0, 6).toUpperCase()}`;
}

async function residentProfile(client: PoolClient, userId: string) {
  const result = await client.query<{ id: string; name: string; phone: string }>(
    `select rp.id, concat(rp.first_name, ' ', rp.last_name) as name, u.phone
       from resident_profiles rp join users u on u.id = rp.user_id where rp.user_id = $1 limit 1`, [userId],
  );
  return result.rows[0] ?? null;
}

export async function createResidentFireReport(userId: string, input: FireReportInput, audit: FireReportSubmissionAudit) {
  return withTransaction(async (client) => {
    const resident = await residentProfile(client, userId);
    if (!resident) throw new Error("RESIDENT_PROFILE_NOT_FOUND");
    await client.query("select pg_advisory_xact_lock(hashtext($1))", [`fire-report-account:${userId}`]);
    if (audit.deviceId) {
      await client.query("select pg_advisory_xact_lock(hashtext($1))", [`fire-report-device:${audit.deviceId}`]);
    }
    const ownReport = await findOwnOpenReportNear(client, userId, input.latitude, input.longitude, input.fireTypes);
    if (ownReport) return { id: ownReport.id, referenceNumber: ownReport.referenceNumber, existing: true as const };
    const sameDeviceIncident = await followSameDeviceIncident(client, userId, audit.deviceId, input.latitude, input.longitude, input.fireTypes);
    if (sameDeviceIncident) return sameDeviceIncident;
    const rateLimit = await checkResidentSosRateLimit(userId, null, client);
    if (!rateLimit.allowed) throw new SosRateLimitError(rateLimit.retryAfterSeconds);
    // The PSA boundary at the pin decides the barangay; the phone's reverse
    // geocode is only a fallback (OpenStreetMap often names the wrong one).
    const located = locateAntiqueBarangay(input.latitude, input.longitude);
    const detectedMunicipality = located?.municipality ?? normalizeDetectedMunicipality(input.municipality);
    const detectedBarangay = located?.barangay ?? normalizeDetectedBarangay(input.barangay);
    const localities = await client.query<{ municipality_id: string; barangay_id: string | null; barangay_name: string | null }>(
      `select m.id as municipality_id, b.id as barangay_id, b.name as barangay_name
       from municipalities m left join barangays b on b.municipality_id = m.id
       where lower(m.name) = lower($1)`, [detectedMunicipality],
    );
    const municipalityId = localities.rows[0]?.municipality_id;
    if (!municipalityId) throw new Error("DETECTED_MUNICIPALITY_NOT_FOUND");
    const barangay = resolveDetectedBarangay(
      localities.rows.flatMap((locality) => locality.barangay_id && locality.barangay_name
        ? [{ id: locality.barangay_id, name: locality.barangay_name }]
        : []),
      detectedBarangay,
    );

    // Environmental Telemetry & AHP Severity Assessment
    let weatherWindSpeed = input.weatherWindSpeed;
    let weatherWindDirection = input.weatherWindDirection;
    let weatherTemperature = input.weatherTemperature;
    let weatherHumidity = input.weatherHumidity;
    let weatherWindCondition = input.weatherWindCondition;

    if (weatherWindSpeed == null || weatherTemperature == null) {
      try {
        const liveWeather = await fetchLiveWeather(input.latitude, input.longitude);
        weatherWindSpeed = liveWeather.windSpeedKph;
        weatherWindDirection = liveWeather.windDirectionDeg;
        weatherTemperature = liveWeather.temperatureC;
        weatherHumidity = liveWeather.relativeHumidity;
        weatherWindCondition = liveWeather.windCondition;
      } catch {
        // Fallback gracefully without breaking report creation
      }
    }

    const densityAssessment = await assessBuildingDensity(client, input.latitude, input.longitude);
    // Each selected kind of fire is scored with its own model; the highest
    // score is the Level of Danger and its type becomes the main fire type.
    const { primaryFireType, densityContext, assessment: severityAssessment } = await assessMultiTypeDanger(client, {
      structureMaterial: input.structureMaterial,
      houseDensity: input.houseDensity,
      routeAccessibility: input.routeAccessibility,
      windSpeedKph: weatherWindSpeed ?? undefined,
      windDirectionDeg: weatherWindDirection ?? undefined,
      temperatureC: weatherTemperature ?? undefined,
      relativeHumidity: weatherHumidity ?? undefined,
    }, input.fireTypes, densityAssessment, input.latitude, input.longitude);

    const reportId = randomUUID();
    const reference = referenceNumber();
    const now = new Date();

    // A second report within 100 m that shares a fire type joins that incident
    // instead of raising another alarm. The lock makes simultaneous reports in one
    // municipality take turns, so they cannot both become the first report.
    await client.query("select pg_advisory_xact_lock(hashtext($1))", [`fire-report-area:${municipalityId}`]);
    const linkedIncident = await findOpenIncidentNear(client, input.latitude, input.longitude, input.fireTypes);
    const initialStatus = linkedIncident ? "DUPLICATE" : "PENDING_VERIFICATION";

    await client.query(
      `insert into fire_reports (
        id, reference_number, resident_profile_id, reporter_name_snapshot, reporter_phone_snapshot, fire_type, description,
        status, latitude, longitude, location_accuracy_meters, location_method, location_quality, is_within_antique,
        municipality_id, barangay_id, address_label, nearest_landmark, reporter_ip_address, reporter_device_summary,
        structure_material, reported_house_density, house_density, route_accessibility, weather_temperature, weather_humidity,
        weather_wind_speed, weather_wind_direction, weather_wind_condition, calculated_severity, severity_score, severity_factors,
        detected_building_density, building_density_confidence, building_density_building_count,
        building_density_minimum_gap_meters, building_density_source, building_density_assessed_at,
        submitted_at, updated_at, duplicate_of_report_id, fire_types
      ) values ($1,$2,$3,$4,$5,$6,$7,$37,$8,$9,$10,'GPS',$11,true,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33,$34,$35,$36,$36,$38,$39::text[])`,
      [
        reportId, reference, resident.id, resident.name, resident.phone, primaryFireType, input.description || "No description provided.",
        input.latitude, input.longitude, input.locationAccuracy,
        barangay.needsVerification ? "BARANGAY_NEEDS_VERIFICATION" : "DETECTED", municipalityId, barangay.barangayId,
        `${barangay.barangayName}, ${detectedMunicipality}, Antique`, input.landmark || null, audit.ipAddress, audit.deviceSummary,
        input.structureMaterial || null, densityContext.reportedHouseDensity, densityContext.effectiveHouseDensity, input.routeAccessibility || null,
        weatherTemperature ?? null, weatherHumidity ?? null, weatherWindSpeed ?? null, weatherWindDirection ?? null,
        weatherWindCondition || null, severityAssessment.level, severityAssessment.score, JSON.stringify(severityAssessment.factors),
        densityAssessment.status, densityAssessment.confidence, densityAssessment.buildingCount,
        densityAssessment.minimumGapMeters, densityAssessment.source, densityAssessment.assessedAt,
        now, initialStatus, linkedIncident?.id ?? null, input.fireTypes,
      ],
    );
    if (audit.deviceId) await recordResidentIncidentFollow(client, userId, reportId, audit.deviceId);
    for (const evidence of densityAssessment.evidence) {
      await client.query(
        `insert into gis.fire_report_density_evidence (
          fire_report_id, source_feature_id, geometry, source_confidence, distance_to_incident_meters
        ) values ($1, $2, extensions.ST_Multi(extensions.ST_SetSRID(extensions.ST_GeomFromGeoJSON($3), 4326)), $4, $5)`,
        [
          reportId,
          evidence.sourceFeatureId,
          JSON.stringify(evidence.geometry),
          evidence.sourceConfidence,
          evidence.distanceToIncidentMeters,
        ],
      );
    }
    await client.query(
      `insert into fire_report_status_history (fire_report_id, previous_status, next_status, actor_user_id, resident_message, created_at)
       values ($1, null, $4, $2, $5, $3)`,
      [
        reportId, userId, now, initialStatus,
        linkedIncident
          ? `This fire was already reported (${linkedIncident.referenceNumber}). Your report and photos were added to it.`
          : "Your fire report was submitted and is pending verification.",
      ],
    );
    if (linkedIncident) {
      // BFP already has this fire open; the extra report shows on that
      // incident without sounding a second alarm.
      await addFireTypesToIncident(client, linkedIncident.id, input.fireTypes);
      return {
        id: reportId,
        referenceNumber: reference,
        status: "DUPLICATE" as const,
        calculatedSeverity: severityAssessment.level,
        severityScore: severityAssessment.score,
        severityFactors: severityAssessment.factors,
        detectedBuildingDensity: densityAssessment.status,
        buildingDensityConfidence: densityAssessment.confidence,
        buildingDensityBuildingCount: densityAssessment.buildingCount,
        linkedTo: { id: linkedIncident.id, referenceNumber: linkedIncident.referenceNumber },
        existing: false as const,
      };
    }
    const [municipalRecipients, provincialRecipients] = await Promise.all([
      listMunicipalNotificationRecipients(client, municipalityId),
      listProvincialNotificationRecipients(client),
    ]);
    const summary = `${reference} · ${barangay.barangayName} · ${severityAssessment.level} DANGER LEVEL`;
    await createAccountNotifications(client, {
      recipientUserIds: municipalRecipients,
      actorUserId: userId,
      eventType: "FIRE_REPORT_CREATED",
      category: "INCIDENT",
      title: "New fire report",
      summary,
      actionHref: "/municipal-bfp/active-incidents",
      entityType: "fire_report",
      entityId: reportId,
      context: { reference, municipality: detectedMunicipality, barangay: barangay.barangayName, severity: severityAssessment.level },
      dedupeKey: `fire-report:${reportId}:created`,
      createdAt: now,
    });
    await createAccountNotifications(client, {
      recipientUserIds: provincialRecipients,
      actorUserId: userId,
      eventType: "FIRE_REPORT_CREATED",
      category: "INCIDENT",
      title: "New municipal incident",
      summary: `${reference} · ${detectedMunicipality} · ${severityAssessment.level}`,
      actionHref: "/provincial-bfp/incidents",
      entityType: "fire_report",
      entityId: reportId,
      context: { reference, municipality: detectedMunicipality, barangay: barangay.barangayName, severity: severityAssessment.level },
      dedupeKey: `fire-report:${reportId}:created`,
      createdAt: now,
    });
    return {
      id: reportId,
      referenceNumber: reference,
      status: "PENDING_VERIFICATION" as const,
      calculatedSeverity: severityAssessment.level,
      severityScore: severityAssessment.score,
      severityFactors: severityAssessment.factors,
      detectedBuildingDensity: densityAssessment.status,
      buildingDensityConfidence: densityAssessment.confidence,
      buildingDensityBuildingCount: densityAssessment.buildingCount,
      linkedTo: null,
      existing: false as const,
    };
  });
}

export async function attachFireReportPhoto(reportId: string, photo: PhotoMetadata) {
  await getDatabase().query(
    `insert into fire_report_photos (fire_report_id, storage_key, original_file_name, mime_type, file_size_bytes, uploaded_at)
     values ($1,$2,$3,$4,$5,$6)`,
    [reportId, photo.storageKey, photo.originalFileName, photo.mimeType, photo.fileSizeBytes, new Date()],
  );
}

export async function updateResidentReportTacticalDetails(
  userId: string,
  reportId: string,
  updates: { structureMaterial?: string | null; houseDensity?: string | null; routeAccessibility?: string | null }
) {
  return withTransaction(async (client) => {
    const current = await client.query<StoredDangerRow & { id: string }>(
      `select fr.id, ${STORED_DANGER_COLUMNS}
         from fire_reports fr
         join resident_profiles rp on rp.id = fr.resident_profile_id
        where fr.id = $1 and rp.user_id = $2 limit 1`,
      [reportId, userId]
    );

    if (!current.rows[0]) throw new Error("REPORT_NOT_FOUND");
    const row = current.rows[0];

    const newMaterial = updates.structureMaterial !== undefined ? updates.structureMaterial : row.structure_material;
    const reportedDensity = updates.houseDensity !== undefined
      ? updates.houseDensity
      : (row.reported_house_density ?? row.house_density);
    const newRoute = updates.routeAccessibility !== undefined ? updates.routeAccessibility : row.route_accessibility;

    const { primaryFireType, densityContext, assessment: reassessment } = await rescoreStoredReport(client, row, {
      structureMaterial: newMaterial,
      houseDensity: reportedDensity,
      routeAccessibility: newRoute,
      fireTypes: storedFireTypes(row),
    });

    await client.query(
      `update fire_reports
          set fire_type = $9,
              structure_material = $1,
              reported_house_density = $2,
              house_density = $3,
              route_accessibility = $4,
              calculated_severity = $5,
              severity_score = $6,
              severity_factors = $7,
              updated_at = now()
        where id = $8`,
      [newMaterial, reportedDensity, densityContext.effectiveHouseDensity, newRoute,
        reassessment.level, reassessment.score, JSON.stringify(reassessment.factors), reportId, primaryFireType]
    );

    return {
      id: reportId,
      fireType: primaryFireType,
      fire_type: primaryFireType,
      calculatedSeverity: reassessment.level,
      severityScore: reassessment.score,
      severityFactors: reassessment.factors,
      structureMaterial: newMaterial,
      reportedHouseDensity: reportedDensity,
      houseDensity: densityContext.effectiveHouseDensity,
      routeAccessibility: newRoute,
      structure_material: newMaterial,
      reported_house_density: reportedDensity,
      house_density: densityContext.effectiveHouseDensity,
      route_accessibility: newRoute,
      calculated_severity: reassessment.level,
      severity_score: reassessment.score,
      severity_factors: reassessment.factors,
    };
  });
}

export async function findResidentReport(userId: string, reportId: string) {
  const result = await getDatabase().query<{
    id: string; reference_number: string; status: FireReportStatus; fire_type: string; description: string; nearest_landmark: string | null;
    latitude: string; longitude: string; submitted_at: string; municipality: string; barangay: string; resident_profile_id: string | null;
    structure_material: string | null; reported_house_density: string | null; house_density: string | null; route_accessibility: string | null;
    weather_temperature: string | null; weather_humidity: string | null; weather_wind_speed: string | null;
    weather_wind_direction: string | null; weather_wind_condition: string | null;
    calculated_severity: string | null; severity_score: number | null; severity_factors: string[] | null;
    duplicate_of_report_id: string | null; fire_types: string[] | null; can_edit: boolean;
  }>(`select fr.id, fr.reference_number, fr.status, fr.duplicate_of_report_id, fr.fire_type, coalesce(fr.fire_types, array[fr.fire_type]) as fire_types, fr.description, fr.nearest_landmark, fr.latitude, fr.longitude, fr.submitted_at,
             m.name as municipality, b.name as barangay, fr.resident_profile_id,
             fr.structure_material, fr.reported_house_density, fr.house_density, fr.route_accessibility,
             fr.weather_temperature, fr.weather_humidity, fr.weather_wind_speed, fr.weather_wind_direction, fr.weather_wind_condition,
             fr.calculated_severity, fr.severity_score, fr.severity_factors, coalesce(rp.user_id = $2, false) as can_edit
        from fire_reports fr left join resident_profiles rp on rp.id = fr.resident_profile_id
        left join municipalities m on m.id = fr.municipality_id left join barangays b on b.id = fr.barangay_id
       where fr.id = $1 and (rp.user_id = $2 or exists (
         select 1 from resident_fire_report_follows follow
         join resident_profiles viewer on viewer.id = follow.resident_profile_id
         where follow.fire_report_id = fr.id and viewer.user_id = $2
       )) limit 1`, [reportId, userId]);
  const report = result.rows[0];
  if (!report) return null;
  const [photos, history] = await Promise.all([
    getDatabase().query<{ storage_key: string }>("select storage_key from fire_report_photos where fire_report_id = $1 order by uploaded_at asc", [reportId]),
    getDatabase().query<{ next_status: FireReportStatus; resident_message: string | null; created_at: string }>("select next_status, resident_message, created_at from fire_report_status_history where fire_report_id = $1 order by created_at asc", [reportId]),
  ]);
  return { ...report, resident_profile_id: report.can_edit ? report.resident_profile_id : null, photos: photos.rows, history: history.rows };
}

export async function listResidentReports(userId: string) {
  const result = await getDatabase().query<{
    id: string; reference_number: string; status: FireReportStatus; fire_type: string; submitted_at: string;
    municipality: string | null; barangay: string | null; calculated_severity: string | null; severity_score: number | null;
  }>(
    `select fr.id, fr.reference_number, fr.status, fr.fire_type, fr.submitted_at, m.name as municipality, b.name as barangay,
            fr.calculated_severity, fr.severity_score
       from fire_reports fr left join resident_profiles rp on rp.id = fr.resident_profile_id
       left join municipalities m on m.id = fr.municipality_id left join barangays b on b.id = fr.barangay_id
      where rp.user_id = $1 or exists (
        select 1 from resident_fire_report_follows follow
        join resident_profiles viewer on viewer.id = follow.resident_profile_id
        where follow.fire_report_id = fr.id and viewer.user_id = $1
      ) order by fr.submitted_at desc`, [userId]);
  return result.rows;
}
