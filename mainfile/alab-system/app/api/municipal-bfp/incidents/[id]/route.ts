import { NextRequest, NextResponse } from "next/server";

import { getBfpIdentity } from "../../../../../lib/auth/bfp-accounts";
import { bfpSessionCookieName, verifyBfpSession } from "../../../../../lib/auth/session";
import { getDatabase } from "../../../../../lib/db";
import { getFireReportPhotoUrl } from "../../../../../lib/supabase/server-storage";

export const runtime = "nodejs";

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const session = verifyBfpSession(request.cookies.get(bfpSessionCookieName("MUNICIPAL_BFP"))?.value);
  if (!session || session.role !== "MUNICIPAL_BFP") return NextResponse.json({ error: "Municipal BFP sign-in is required." }, { status: 401 });
  const { id } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Invalid incident." }, { status: 400 });
  try {
    const identity = await getBfpIdentity(session.userId);
    if (!identity?.municipalityId) return NextResponse.json({ error: "Your Municipal BFP assignment is not active." }, { status: 403 });
    const database = getDatabase();
    const incidentResult = await database.query(
      `select fr.id, fr.reference_number as "referenceNumber", fr.status, fr.fire_type as "fireType", fr.description, fr.nearest_landmark as landmark,
              fr.latitude::float as latitude, fr.longitude::float as longitude, fr.submitted_at as "submittedAt", fr.response_started_at as "responseStartedAt",
              fr.responding_station_name as "respondingStationName", fr.reporter_name_snapshot as "residentName", fr.reporter_phone_snapshot as "phone",
              fr.reporter_ip_address::text as "reporterIpAddress", fr.reporter_device_summary as "reporterDeviceSummary",
              rp.id as "residentProfileId", rp.first_name as "firstName", rp.last_name as "lastName", u.email,
              ra.complete_address as address, b.name as barangay, m.name as municipality,
              s.station_name as "stationName", s.latitude::float as "stationLatitude", s.longitude::float as "stationLongitude"
         from fire_reports fr
         join resident_profiles rp on rp.id = fr.resident_profile_id join users u on u.id = rp.user_id
         left join resident_addresses ra on ra.resident_profile_id = rp.id and ra.is_primary = true
         left join barangays b on b.id = fr.barangay_id left join municipalities m on m.id = fr.municipality_id
         left join lateral (
           select station_name, latitude, longitude
             from municipal_bfp_stations
            where municipality_id = fr.municipality_id and status = 'ACTIVE'
            order by created_at asc
            limit 1
         ) s on true
        where fr.id = $1 and fr.municipality_id = $2 limit 1`, [id, identity.municipalityId],
    );
    const incident = incidentResult.rows[0];
    if (!incident) return NextResponse.json({ error: "Incident not found in your municipality." }, { status: 404 });
    const [photoResult, historyResult, previousResult] = await Promise.all([
      database.query<{ storage_key: string }>("select storage_key from fire_report_photos where fire_report_id = $1 order by uploaded_at asc", [id]),
      database.query("select next_status as status, resident_message as message, created_at as \"createdAt\" from fire_report_status_history where fire_report_id = $1 order by created_at asc", [id]),
      database.query("select id, reference_number as \"referenceNumber\", status, submitted_at as \"submittedAt\" from fire_reports where resident_profile_id = $1 order by submitted_at desc limit 10", [incident.residentProfileId]),
    ]);
    const photos = await Promise.all(photoResult.rows.map(async (photo) => ({ url: await getFireReportPhotoUrl(photo.storage_key) })));
    return NextResponse.json({ incident: { ...incident, photos, history: historyResult.rows, previousReports: previousResult.rows } });
  } catch (error) {
    console.error("Municipal incident detail failed", error);
    return NextResponse.json({ error: "Unable to load incident details." }, { status: 500 });
  }
}
