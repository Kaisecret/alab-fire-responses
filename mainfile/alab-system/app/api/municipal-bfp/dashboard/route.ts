import { NextRequest, NextResponse } from "next/server";

import { getBfpIdentity } from "../../../../lib/auth/bfp-accounts";
import { isLocalUiPreviewEnabled } from "../../../../lib/auth/local-ui-preview";
import { bfpSessionCookieName, verifyBfpSession } from "../../../../lib/auth/session";
import { getDatabase } from "../../../../lib/db";

export const runtime = "nodejs";

/** Reports that still need the station to verify them. */
const AWAITING_VERIFICATION = ["SUBMITTED", "PENDING_VERIFICATION", "UNDER_VERIFICATION"];
const CLOSED_STATUSES = "('RESOLVED','REJECTED','FALSE_REPORT','DUPLICATE','CLOSED')";

export async function GET(request: NextRequest) {
  if (isLocalUiPreviewEnabled()) {
    return NextResponse.json({
      municipality: "San Jose de Buenavista",
      stats: {
        activeIncidents: 0,
        pendingVerifications: 0,
        availableFiretrucks: 2,
        totalFiretrucks: 2,
        respondersOnDuty: 4,
        assistanceRequests: 0,
      },
      recentIncidents: [],
      pendingVerifications: {
        reports: [],
        residentApplications: [],
        totalPending: 0,
      },
      stations: [
        {
          id: "preview-station-1",
          stationName: "San Jose Main Fire Station",
          latitude: 10.7432,
          longitude: 121.9421,
          status: "ACTIVE",
          assignedPersonnelCount: 4,
        },
      ],
      nearbyStations: [
        { id: "preview-hamtic", municipalityName: "Hamtic", stationName: "Hamtic Fire Station", distanceKm: 6.2, activeIncidents: 1 },
        { id: "preview-belison", municipalityName: "Belison", stationName: "Belison Fire Station", distanceKm: 18.4, activeIncidents: 0 },
      ],
    });
  }

  const session = verifyBfpSession(request.cookies.get(bfpSessionCookieName("MUNICIPAL_BFP", request.headers))?.value);
  if (!session || session.role !== "MUNICIPAL_BFP") {
    return NextResponse.json({ error: "Municipal BFP sign-in is required." }, { status: 401 });
  }

  try {
    const identity = await getBfpIdentity(session.userId);
    if (!identity?.municipalityId) {
      return NextResponse.json({ error: "Your Municipal BFP assignment is not active." }, { status: 403 });
    }

    const db = getDatabase();
    const municipalityId = identity.municipalityId;

    // Execute aggregated queries in parallel
    const [
      incidentsResult,
      residentAppsResult,
      stationsResult,
      personnelResult,
      dispatchesResult,
      nearbyResult,
      trucksResult,
    ] = await Promise.all([
      // 1. Active incidents
      (async () => {
        try {
          return await db.query<{
            id: string;
            referenceNumber: string;
            fireType: string;
            status: string;
            submittedAt: string;
            latitude: number;
            longitude: number;
            barangay: string | null;
            landmark: string | null;
            residentName: string | null;
            calculatedSeverity: string | null;
            reportSource: string;
          }>(
            `select fr.id, fr.reference_number as "referenceNumber", fr.fire_type as "fireType",
                    fr.status, fr.submitted_at as "submittedAt",
                    fr.latitude::float as latitude, fr.longitude::float as longitude,
                    b.name as barangay, fr.nearest_landmark as landmark,
                    coalesce(fr.caller_name, fr.reporter_name_snapshot) as "residentName",
                    fr.calculated_severity as "calculatedSeverity",
                    fr.report_source as "reportSource"
               from fire_reports fr
               left join barangays b on b.id = fr.barangay_id
              where fr.municipality_id = $1
                and fr.status not in ${CLOSED_STATUSES}
              order by fr.submitted_at desc
              limit 10`,
            [municipalityId],
          );
        } catch {
          // Fallback if caller_name/report_source aren't in schema
          return await db.query<{
            id: string;
            referenceNumber: string;
            fireType: string;
            status: string;
            submittedAt: string;
            latitude: number;
            longitude: number;
            barangay: string | null;
            landmark: string | null;
            residentName: string | null;
            calculatedSeverity: string | null;
            reportSource: string;
          }>(
            `select fr.id, fr.reference_number as "referenceNumber", fr.fire_type as "fireType",
                    fr.status, fr.submitted_at as "submittedAt",
                    fr.latitude::float as latitude, fr.longitude::float as longitude,
                    b.name as barangay, fr.nearest_landmark as landmark,
                    fr.reporter_name_snapshot as "residentName",
                    fr.calculated_severity as "calculatedSeverity",
                    'ALAB_APP' as "reportSource"
               from fire_reports fr
               left join barangays b on b.id = fr.barangay_id
              where fr.municipality_id = $1
                and fr.status not in ${CLOSED_STATUSES}
              order by fr.submitted_at desc
              limit 10`,
            [municipalityId],
          );
        }
      })(),

      // 2. Pending resident applications
      (async () => {
        try {
          return await db.query<{
            id: string;
            reference: string;
            status: string;
            submittedAt: string;
            firstName: string;
            lastName: string;
            barangay: string;
          }>(
            `select distinct on (rv.resident_profile_id)
                    rv.id, rv.application_reference as "reference", rv.status, rv.submitted_at as "submittedAt",
                    rp.first_name as "firstName", rp.last_name as "lastName",
                    b.name as barangay
               from resident_verifications rv
               join resident_profiles rp on rp.id = rv.resident_profile_id
               join users u on u.id = rp.user_id
               join resident_addresses ra on ra.resident_profile_id = rp.id and ra.is_primary
               join barangays b on b.id = ra.barangay_id
              where ra.municipality_id = $1 and u.role = 'RESIDENT' and rv.status = 'PENDING'
              order by rv.resident_profile_id, rv.submitted_at desc
              limit 5`,
            [municipalityId],
          );
        } catch {
          return { rows: [] };
        }
      })(),

      // 3. Municipal Stations with active responder count
      (async () => {
        try {
          return await db.query<{
            id: string;
            stationName: string;
            latitude: number;
            longitude: number;
            status: string;
            assignedPersonnelCount: number;
          }>(
            `select s.id, s.station_name as "stationName", s.latitude::float as latitude, s.longitude::float as longitude,
                    s.status, count(sa.id)::int as "assignedPersonnelCount"
               from municipal_bfp_stations s
               left join bfp_station_assignments sa on sa.station_id = s.id and sa.status = 'ACTIVE'
              where s.municipality_id = $1 and s.status = 'ACTIVE'
              group by s.id, s.station_name, s.latitude, s.longitude, s.status
              order by s.station_name asc`,
            [municipalityId],
          );
        } catch {
          return { rows: [] };
        }
      })(),

      // 4. Responders on duty
      (async () => {
        try {
          return await db.query<{ count: number }>(
            `select count(distinct p.id)::int as count
               from bfp_municipality_assignments ma
               join bfp_personnel_profiles p on p.id = ma.personnel_profile_id
               join users u on u.id = p.user_id
              where ma.municipality_id = $1 and ma.status = 'ACTIVE' and u.account_status = 'ACTIVE'`,
            [municipalityId],
          );
        } catch {
          return { rows: [{ count: 0 }] };
        }
      })(),

      // 5. Active dispatches count
      (async () => {
        try {
          return await db.query<{ count: number }>(
            `select count(*)::int as count
               from incident_dispatches
              where municipality_id = $1 and status = 'ACTIVE'`,
            [municipalityId],
          );
        } catch {
          return { rows: [{ count: 0 }] };
        }
      })(),

      // 6. Nearest other stations, measured from this municipality's first station
      (async () => {
        try {
          return await db.query<{
            id: string;
            municipalityName: string;
            stationName: string;
            distanceKm: number;
            activeIncidents: number;
          }>(
            `with home as (
               select latitude::float8 as lat, longitude::float8 as lng
                 from municipal_bfp_stations
                where municipality_id = $1
                order by created_at asc
                limit 1
             )
             select s.id, m.name as "municipalityName", s.station_name as "stationName",
                    round((6371 * 2 * asin(sqrt(
                      power(sin(radians(s.latitude::float8 - home.lat) / 2), 2)
                      + cos(radians(home.lat)) * cos(radians(s.latitude::float8))
                      * power(sin(radians(s.longitude::float8 - home.lng) / 2), 2)
                    )))::numeric, 1)::float8 as "distanceKm",
                    (select count(*)::int from fire_reports fr
                      where fr.municipality_id = m.id
                        and fr.status not in ${CLOSED_STATUSES}) as "activeIncidents"
               from municipal_bfp_stations s
               join municipalities m on m.id = s.municipality_id
              cross join home
              where s.municipality_id <> $1
                and coalesce(s.status, 'ACTIVE') = 'ACTIVE'
              order by "distanceKm" asc
              limit 4`,
            [municipalityId],
          );
        } catch {
          return { rows: [] };
        }
      })(),

      // 7. Fire trucks on record for this municipality
      (async () => {
        try {
          return await db.query<{ ready: number; total: number }>(
            `select count(*) filter (where operational_status = 'SERVICEABLE')::int as ready,
                    count(*)::int as total
               from fire_trucks
              where municipality_id = $1`,
            [municipalityId],
          );
        } catch {
          return { rows: [{ ready: 0, total: 0 }] };
        }
      })(),
    ]);

    const incidents = incidentsResult.rows;
    const pendingFireReports = incidents.filter((i) => AWAITING_VERIFICATION.includes(i.status));
    const pendingResidentApps = residentAppsResult.rows;
    const stations = stationsResult.rows;
    const respondersCount = personnelResult.rows[0]?.count ?? 0;
    const dispatchesCount = dispatchesResult.rows[0]?.count ?? 0;

    const totalPending = pendingFireReports.length + pendingResidentApps.length;
    const trucks = trucksResult.rows[0] ?? { ready: 0, total: 0 };

    return NextResponse.json({
      municipality: identity.municipalityName,
      stats: {
        activeIncidents: incidents.length,
        pendingVerifications: totalPending,
        pendingReportsCount: pendingFireReports.length,
        pendingApplicationsCount: pendingResidentApps.length,
        availableFiretrucks: trucks.ready,
        totalFiretrucks: trucks.total,
        respondersOnDuty: respondersCount,
        assistanceRequests: dispatchesCount,
      },
      recentIncidents: incidents.slice(0, 5),
      pendingVerifications: {
        reports: pendingFireReports.slice(0, 3),
        residentApplications: pendingResidentApps.slice(0, 3),
        totalPending,
      },
      stations,
      nearbyStations: nearbyResult.rows,
    });
  } catch (error) {
    console.error("Municipal dashboard API aggregate failed", error);
    return NextResponse.json({ error: "Unable to load municipal dashboard." }, { status: 500 });
  }
}
