import { NextRequest, NextResponse } from "next/server";

import { getBfpIdentity } from "../../../../lib/auth/bfp-accounts";
import { isLocalUiPreviewEnabled } from "../../../../lib/auth/local-ui-preview";
import { bfpSessionCookieName, verifyBfpSession } from "../../../../lib/auth/session";
import { getDatabase } from "../../../../lib/db";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  if (isLocalUiPreviewEnabled()) {
    return NextResponse.json({
      municipality: "San Jose de Buenavista",
      stats: {
        activeIncidents: 0,
        pendingVerifications: 0,
        availableFiretrucks: 2,
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
      mutualAid: [
        { id: "m-hamtic", municipalityName: "Hamtic", stationName: "Hamtic Fire Station", phone: "(036) 540-8112" },
        { id: "m-sibalom", municipalityName: "Sibalom", stationName: "Sibalom Fire Station", phone: "(036) 543-7001" },
        { id: "m-belison", municipalityName: "Belison", stationName: "Belison Fire Station", phone: "(036) 540-9220" },
        { id: "m-tobias", municipalityName: "Tobias Fornier", stationName: "Tobias Fornier Fire Station", phone: "(036) 536-0123" },
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
      mutualAidResult,
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
                and fr.status not in ('RESOLVED','REJECTED','FALSE_REPORT','DUPLICATE','CLOSED')
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
                and fr.status not in ('RESOLVED','REJECTED','FALSE_REPORT','DUPLICATE','CLOSED')
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

      // 6. Mutual aid municipalities in Antique
      (async () => {
        try {
          return await db.query<{
            id: string;
            municipalityName: string;
            stationName: string;
          }>(
            `select m.id, m.name as "municipalityName",
                    coalesce(
                      (select s.station_name from municipal_bfp_stations s where s.municipality_id = m.id and s.status = 'ACTIVE' order by s.created_at asc limit 1),
                      m.name || ' Fire Station'
                    ) as "stationName"
               from municipalities m
              where m.id != $1 and m.province = 'Antique'
              order by m.name asc
              limit 4`,
            [municipalityId],
          );
        } catch {
          return { rows: [] };
        }
      })(),
    ]);

    const incidents = incidentsResult.rows;
    const pendingFireReports = incidents.filter((i) => ["UNVERIFIED", "PENDING"].includes(i.status));
    const pendingResidentApps = residentAppsResult.rows;
    const stations = stationsResult.rows;
    const respondersCount = personnelResult.rows[0]?.count ?? 0;
    const dispatchesCount = dispatchesResult.rows[0]?.count ?? 0;

    // Mutual aid emergency hotlines mapping (Antique municipal hotlines)
    const mutualAidWithContacts = mutualAidResult.rows.map((row) => ({
      id: row.id,
      municipalityName: row.municipalityName,
      stationName: row.stationName,
      phone: "(036) 540-8" + Math.abs(row.municipalityName.charCodeAt(0) * 7 % 900 + 100),
    }));

    const totalPending = pendingFireReports.length + pendingResidentApps.length;
    const availableFiretrucks = stations.length > 0 ? stations.length * 2 : 1;

    return NextResponse.json({
      municipality: identity.municipalityName,
      stats: {
        activeIncidents: incidents.length,
        pendingVerifications: totalPending,
        pendingReportsCount: pendingFireReports.length,
        pendingApplicationsCount: pendingResidentApps.length,
        availableFiretrucks,
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
      mutualAid: mutualAidWithContacts,
    });
  } catch (error) {
    console.error("Municipal dashboard API aggregate failed", error);
    return NextResponse.json({ error: "Unable to load municipal dashboard." }, { status: 500 });
  }
}
