import "server-only";

import { getDatabase } from "../db";
import { ALARM_DOCTRINE, type AlarmLevel } from "./alarm-doctrine";

/**
 * What the province has declared on an incident, and who it reached.
 *
 * The municipality that asked for help is the one least served by another
 * alarm: they raised the request and know it went up. What they cannot see is
 * what came of it, so this is written to be read rather than reacted to.
 */

export type AlarmSummonedMunicipality = {
  municipalityId: string;
  municipalityName: string;
  alarmLevel: number;
  distanceMeters: number | null;
  /** How the summoned municipality answered, if it has. */
  assistanceStatus:
    | "REQUESTED"
    | "ACCEPTED"
    | "PARTIALLY_ACCEPTED"
    | "REJECTED"
    | "CANCELLED"
    | "COMPLETED"
    | null;
  offeredFiretrucks: number | null;
  offeredPersonnel: number | null;
  respondedAt: string | null;
};

export type IncidentAlarmStatus = {
  /** The highest level standing, or null when only the first alarm applies. */
  level: number | null;
  levelLabel: string | null;
  reachSummary: string | null;
  declaredAt: string | null;
  summoned: AlarmSummonedMunicipality[];
};

const EMPTY: IncidentAlarmStatus = {
  level: null,
  levelLabel: null,
  reachSummary: null,
  declaredAt: null,
  summoned: [],
};

export async function getIncidentAlarmStatus(fireReportId: string): Promise<IncidentAlarmStatus> {
  const db = getDatabase();

  try {
    const level = await db.query<{ alarmLevel: number; declaredAt: string }>(
      `select alarm_level as "alarmLevel", declared_at as "declaredAt"
         from public.incident_alarm_levels
        where fire_report_id = $1
        order by alarm_level desc
        limit 1`,
      [fireReportId],
    );

    const summoned = await db.query<AlarmSummonedMunicipality>(
      `select s.summoned_municipality_id as "municipalityId",
              m.name as "municipalityName",
              s.alarm_level as "alarmLevel",
              s.distance_meters as "distanceMeters",
              r.status as "assistanceStatus",
              r.offered_firetrucks as "offeredFiretrucks",
              r.offered_personnel as "offeredPersonnel",
              r.responded_at as "respondedAt"
         from public.incident_alarm_summons s
         join public.municipalities m on m.id = s.summoned_municipality_id
         left join public.intermunicipal_assistance_requests r
           on r.id = s.assistance_request_id
        where s.fire_report_id = $1
          and s.summoned_municipality_id is not null
        order by s.distance_meters asc nulls last, m.name asc`,
      [fireReportId],
    );

    const current = level.rows[0];
    // The first alarm is the municipality's own turnout and reaches nobody, so
    // it is not reported here as though help had been called.
    const declared = current && current.alarmLevel > 1 ? current : null;
    const doctrine = declared ? ALARM_DOCTRINE[declared.alarmLevel as AlarmLevel] : null;

    return {
      level: declared?.alarmLevel ?? null,
      levelLabel: doctrine?.label ?? null,
      reachSummary: doctrine?.summary ?? null,
      declaredAt: declared?.declaredAt ?? null,
      summoned: summoned.rows,
    };
  } catch (error) {
    // A missing table or a failed read must not take the incident down with
    // it: the aid board is context, not the incident itself.
    console.error("Incident alarm status failed", error);
    return EMPTY;
  }
}
