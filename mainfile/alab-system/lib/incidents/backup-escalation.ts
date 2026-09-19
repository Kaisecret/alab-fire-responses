import "server-only";

import { randomUUID } from "node:crypto";

import { getDatabase } from "../db";
import { createAssistanceRequests } from "../intermunicipality/assistance";
import type { StationCandidate } from "../intermunicipality/types";
import { createAccountNotifications } from "../notifications/service";
import { buildAlarmNotificationContext } from "../municipal-bfp/alarm-alert.mjs";
import { getFireReportPhotoUrl, uploadBackupRequestPhoto } from "../supabase/server-storage";
import {
  ALARM_DOCTRINE,
  isDeclarableAlarmLevel,
  resolveAlarmSummons,
} from "./alarm-doctrine";

/**
 * Backup escalation.
 *
 * A responder on scene raises a request; the municipality that owns the
 * incident either forwards it to the province or lets the grace period forward
 * it; the province then declares an alarm level, which is what actually
 * summons further municipalities.
 */
export type BackupRequestStatus =
  | "PENDING_MUNICIPAL"
  | "FORWARDED_PROVINCIAL"
  | "RESOLVED"
  | "CANCELLED";

export interface BackupRequest {
  id: string;
  fireReportId: string;
  referenceNumber: string;
  municipalityId: string;
  municipalityName: string;
  barangay: string | null;
  requestedByUserId: string;
  requestedByName: string;
  reason: string | null;
  requestedFiretrucks: number;
  requestedPersonnel: number;
  status: BackupRequestStatus;
  acknowledgedAt: string | null;
  provincialAcknowledgedAt: string | null;
  forwardedAt: string | null;
  forwardedAutomatically: boolean;
  autoForwardAt: string;
  createdAt: string;
  alarmLevel: number | null;
  /** Signed, short-lived URLs; empty when none were attached. */
  photos: string[];
}

/** A responder may attach up to this many photographs to one request. */
export const MAX_BACKUP_PHOTOS = 3;

/** Seconds a municipality has to forward before it escalates on its own. */
export const AUTO_FORWARD_SECONDS = 60;

const SELECT_COLUMNS = `
  r.id,
  r.fire_report_id as "fireReportId",
  fr.reference_number as "referenceNumber",
  r.municipality_id as "municipalityId",
  m.name as "municipalityName",
  b.name as barangay,
  r.requested_by_user_id as "requestedByUserId",
  coalesce(p.display_name, 'Responder') as "requestedByName",
  r.reason,
  r.requested_firetrucks as "requestedFiretrucks",
  r.requested_personnel as "requestedPersonnel",
  r.status,
  r.acknowledged_at as "acknowledgedAt",
  r.provincial_acknowledged_at as "provincialAcknowledgedAt",
  r.forwarded_at as "forwardedAt",
  r.forwarded_automatically as "forwardedAutomatically",
  r.auto_forward_at as "autoForwardAt",
  r.created_at as "createdAt",
  (select max(a.alarm_level) from public.incident_alarm_levels a
    where a.fire_report_id = r.fire_report_id) as "alarmLevel"
`;

const FROM_JOINS = `
  from public.incident_backup_requests r
  join public.fire_reports fr on fr.id = r.fire_report_id
  join public.municipalities m on m.id = r.municipality_id
  left join public.barangays b on b.id = fr.barangay_id
  left join public.bfp_personnel_profiles p on p.user_id = r.requested_by_user_id
`;

/**
 * Raises a backup request for an incident the responder is assigned to. A
 * second responder on the same incident joins the open request rather than
 * opening a competing one.
 */
export async function requestBackup(input: {
  responderUserId: string;
  /** Either identifier works; the mobile app holds the dispatch it was sent. */
  fireReportId?: string | null;
  dispatchId?: string | null;
  reason?: string | null;
  requestedFiretrucks?: number;
  requestedPersonnel?: number;
}): Promise<BackupRequest> {
  const db = getDatabase();

  if (!input.fireReportId && !input.dispatchId) {
    throw new Error("INCIDENT_NOT_FOUND");
  }

  /*
   * Resolve the incident from whichever identifier arrived, and confirm this
   * responder was actually dispatched to it: a responder may only call for
   * backup on an incident assigned to them.
   */
  const assignment = await db.query<{
    fireReportId: string;
    municipalityId: string;
    dispatchId: string | null;
  }>(
    `select fr.id as "fireReportId",
            fr.municipality_id as "municipalityId",
            d.id as "dispatchId"
       from public.incident_dispatches d
       join public.fire_reports fr on fr.id = d.fire_report_id
       join public.incident_dispatch_recipients dr
         on dr.dispatch_id = d.id and dr.recipient_user_id = $1
      where ($2::uuid is null or d.id = $2::uuid)
        and ($3::uuid is null or fr.id = $3::uuid)
      order by d.dispatched_at desc nulls last
      limit 1`,
    [input.responderUserId, input.dispatchId ?? null, input.fireReportId ?? null],
  );

  if (assignment.rowCount === 0) {
    throw new Error("INCIDENT_NOT_FOUND");
  }

  const { fireReportId, municipalityId, dispatchId } = assignment.rows[0];

  /*
   * One open request per incident. Two responders on the same fire tap the
   * button within moments of each other, so the guard cannot be a separate
   * read: both calls would pass it and the second would strike the partial
   * unique index as a raw constraint error. The insert asks the index itself,
   * and an empty result means somebody else got there first.
   */
  let inserted;
  try {
    inserted = await db.query<{ id: string }>(
      `insert into public.incident_backup_requests
         (fire_report_id, municipality_id, requested_by_user_id, dispatch_id,
          reason, requested_firetrucks, requested_personnel, auto_forward_at)
       select $1, $2, $3, $4, $5, $6, $7, now() + ($8 || ' seconds')::interval
        where not exists (
          select 1 from public.incident_backup_requests
           where fire_report_id = $1
             and status in ('PENDING_MUNICIPAL','FORWARDED_PROVINCIAL')
        )
       returning id`,
      [
        fireReportId,
        municipalityId,
        input.responderUserId,
        dispatchId,
        input.reason?.trim() || null,
        clampResource(input.requestedFiretrucks),
        clampResource(input.requestedPersonnel),
        String(AUTO_FORWARD_SECONDS),
      ],
    );
  } catch (cause) {
    // Two inserts can still cross inside the same instant, before either is
    // visible to the other. The index settles it, and the loser is told the
    // truth: help is already on its way.
    if ((cause as { code?: string })?.code === "23505") {
      throw new Error("BACKUP_ALREADY_REQUESTED");
    }
    throw cause;
  }

  if (inserted.rowCount === 0 || !inserted.rows[0]) {
    throw new Error("BACKUP_ALREADY_REQUESTED");
  }

  const created = await getBackupRequest(inserted.rows[0].id);
  if (!created) throw new Error("BACKUP_REQUEST_CREATE_FAILED");

  await notifyMunicipality(created);
  return created;
}

function clampResource(value: number | undefined): number {
  if (!Number.isInteger(value) || value === undefined || value < 0) return 0;
  return Math.min(value, 500);
}

/**
 * The open request for a dispatch this responder is on, if there is one. The
 * mobile app asks on load so its control survives the app being closed.
 */
export async function findOpenBackupRequestForDispatch(
  responderUserId: string,
  dispatchId: string,
): Promise<BackupRequest | null> {
  const result = await getDatabase().query<BackupRequest>(
    `select ${SELECT_COLUMNS} ${FROM_JOINS}
      where r.status in ('PENDING_MUNICIPAL','FORWARDED_PROVINCIAL')
        and fr.id = (select fire_report_id from public.incident_dispatches where id = $2)
        and exists (
          select 1 from public.incident_dispatch_recipients dr
           where dr.dispatch_id = $2 and dr.recipient_user_id = $1
        )
      limit 1`,
    [responderUserId, dispatchId],
  );
  return result.rows[0] ?? null;
}

/**
 * Attaches photographs to a request. Upload failures are tolerated: the call
 * for help matters more than the pictures, and losing the request because a
 * photo would not store would be the worse outcome.
 */
export async function attachBackupRequestPhotos(
  backupRequestId: string,
  files: File[],
): Promise<number> {
  const db = getDatabase();
  let stored = 0;

  for (const file of files.slice(0, MAX_BACKUP_PHOTOS)) {
    try {
      const uploaded = await uploadBackupRequestPhoto(backupRequestId, file);
      await db.query(
        `insert into public.incident_backup_request_photos
           (backup_request_id, storage_key, original_file_name, mime_type, file_size_bytes)
         values ($1, $2, $3, $4, $5)`,
        [
          backupRequestId,
          uploaded.storageKey,
          uploaded.originalFileName,
          uploaded.mimeType,
          uploaded.fileSizeBytes,
        ],
      );
      stored += 1;
    } catch (error) {
      console.error("Backup request photo upload failed", error);
    }
  }
  return stored;
}

/** Signs the photographs on each request so they can be viewed briefly. */
async function withPhotos(requests: BackupRequest[]): Promise<BackupRequest[]> {
  if (requests.length === 0) return requests;

  const keys = await getDatabase().query<{ backupRequestId: string; storageKey: string }>(
    `select backup_request_id as "backupRequestId", storage_key as "storageKey"
       from public.incident_backup_request_photos
      where backup_request_id = any($1::uuid[])
      order by uploaded_at`,
    [requests.map((request) => request.id)],
  );

  const signed = new Map<string, string[]>();
  for (const row of keys.rows) {
    const url = await getFireReportPhotoUrl(row.storageKey);
    if (!url) continue;
    signed.set(row.backupRequestId, [...(signed.get(row.backupRequestId) ?? []), url]);
  }

  return requests.map((request) => ({ ...request, photos: signed.get(request.id) ?? [] }));
}

export async function getBackupRequest(id: string): Promise<BackupRequest | null> {
  const result = await getDatabase().query<BackupRequest>(
    `select ${SELECT_COLUMNS} ${FROM_JOINS} where r.id = $1`,
    [id],
  );
  if (!result.rows[0]) return null;
  const [withUrls] = await withPhotos([result.rows[0]]);
  return withUrls;
}

/** Open requests a municipality still has to act on or is waiting on. */
export async function listMunicipalBackupRequests(municipalityId: string): Promise<BackupRequest[]> {
  const result = await getDatabase().query<BackupRequest>(
    `select ${SELECT_COLUMNS} ${FROM_JOINS}
      where r.municipality_id = $1
        and r.status in ('PENDING_MUNICIPAL','FORWARDED_PROVINCIAL')
      order by r.created_at desc`,
    [municipalityId],
  );
  return withPhotos(result.rows);
}

/** Everything the province has been asked to weigh in on. */
export async function listProvincialBackupRequests(): Promise<BackupRequest[]> {
  const result = await getDatabase().query<BackupRequest>(
    `select ${SELECT_COLUMNS} ${FROM_JOINS}
      where r.status = 'FORWARDED_PROVINCIAL'
      order by r.forwarded_at desc nulls last, r.created_at desc`,
  );
  return withPhotos(result.rows);
}

/**
 * Records that the municipality has seen the request. This stops the popup and
 * the siren, but deliberately does not stop the grace period: acknowledging is
 * not the same as deciding, and an unforwarded request still escalates.
 */
export async function acknowledgeBackupRequest(id: string, userId: string): Promise<BackupRequest | null> {
  await getDatabase().query(
    // A request that has already escalated can still be acknowledged: the
    // municipality whose responder called for help is not done with it just
    // because the province has been brought in. Scoping this to
    // PENDING_MUNICIPAL left the municipal alarm with no way to be silenced.
    `update public.incident_backup_requests
        set acknowledged_by_user_id = $2,
            acknowledged_at = coalesce(acknowledged_at, now()),
            updated_at = now()
      where id = $1 and status in ('PENDING_MUNICIPAL','FORWARDED_PROVINCIAL')`,
    [id, userId],
  );
  return getBackupRequest(id);
}

/**
 * Records that the province has seen a forwarded request. This silences the
 * provincial alarm; it is kept apart from the municipal acknowledgement because
 * a municipality that acknowledged before forwarding would otherwise arrive at
 * the province already marked as seen, and the alarm would never sound.
 */
export async function acknowledgeProvincialBackupRequest(
  id: string,
  userId: string,
): Promise<BackupRequest | null> {
  await getDatabase().query(
    `update public.incident_backup_requests
        set provincial_acknowledged_by_user_id = $2,
            provincial_acknowledged_at = coalesce(provincial_acknowledged_at, now()),
            updated_at = now()
      where id = $1 and status = 'FORWARDED_PROVINCIAL'`,
    [id, userId],
  );
  return getBackupRequest(id);
}

/** Forwards to the province, by hand or because the grace period expired. */
export async function forwardBackupRequest(
  id: string,
  options: { userId?: string | null; automatic?: boolean } = {},
): Promise<BackupRequest | null> {
  const result = await getDatabase().query<{ id: string }>(
    `update public.incident_backup_requests
        set status = 'FORWARDED_PROVINCIAL',
            forwarded_at = now(),
            forwarded_by_user_id = $2,
            forwarded_automatically = $3,
            updated_at = now()
      where id = $1 and status = 'PENDING_MUNICIPAL'
      returning id`,
    [id, options.userId ?? null, options.automatic === true],
  );

  if (result.rowCount === 0) return getBackupRequest(id);

  const forwarded = await getBackupRequest(id);
  if (forwarded) await notifyProvince(forwarded);
  return forwarded;
}

/**
 * Forwards every request whose grace period has passed. Runs server side so an
 * escalation does not depend on a municipal browser staying open.
 */
export async function forwardExpiredBackupRequests(): Promise<BackupRequest[]> {
  const due = await getDatabase().query<{ id: string }>(
    `select id from public.incident_backup_requests
      where status = 'PENDING_MUNICIPAL' and auto_forward_at <= now()
      order by auto_forward_at
      limit 50`,
  );

  const forwarded: BackupRequest[] = [];
  for (const row of due.rows) {
    const result = await forwardBackupRequest(row.id, { automatic: true });
    if (result?.status === "FORWARDED_PROVINCIAL") forwarded.push(result);
  }
  return forwarded;
}

/**
 * Declares an alarm level. The level is what summons further municipalities, so
 * every municipal account is notified rather than only the one that asked.
 */
export async function declareAlarmLevel(input: {
  fireReportId: string;
  alarmLevel: number;
  declaredByUserId: string;
  backupRequestId?: string | null;
  note?: string | null;
}): Promise<{ alarmLevel: number; declaredAt: string; summoned: AlarmSummonSummary[] }> {
  // The first alarm is raised by the report itself and the fifth belongs to
  // Region VI, so neither is a level the province declares here.
  if (!isDeclarableAlarmLevel(input.alarmLevel)) {
    throw new Error("INVALID_ALARM_LEVEL");
  }

  const db = getDatabase();

  const highest = await db.query<{ max: number | null }>(
    `select max(alarm_level) as max from public.incident_alarm_levels where fire_report_id = $1`,
    [input.fireReportId],
  );
  const current = highest.rows[0]?.max ?? 0;
  if (input.alarmLevel <= current) {
    throw new Error("ALARM_LEVEL_NOT_HIGHER");
  }

  const inserted = await db.query<{ declaredAt: string }>(
    `insert into public.incident_alarm_levels
       (fire_report_id, backup_request_id, alarm_level, declared_by_user_id, note)
     values ($1, $2, $3, $4, $5)
     returning declared_at as "declaredAt"`,
    [
      input.fireReportId,
      input.backupRequestId ?? null,
      input.alarmLevel,
      input.declaredByUserId,
      input.note?.trim() || null,
    ],
  );

  /*
   * A level that recorded itself but summoned nobody is worse than one that
   * was refused: it cannot be declared again, so the province would be left
   * holding an alarm that never called for help and no way to retry it. If the
   * call fails, the level goes back and the declaration can be made again.
   */
  let summoned: AlarmSummonSummary[];
  try {
    summoned = await summonForAlarmLevel({
      fireReportId: input.fireReportId,
      alarmLevel: input.alarmLevel,
      declaredByUserId: input.declaredByUserId,
    });
  } catch (error) {
    await db.query(
      `delete from public.incident_alarm_levels
        where fire_report_id = $1 and alarm_level = $2`,
      [input.fireReportId, input.alarmLevel],
    ).catch(() => undefined);
    throw error;
  }

  await notifyAlarmDeclaration(input.fireReportId, input.alarmLevel, summoned);

  return {
    alarmLevel: input.alarmLevel,
    declaredAt: inserted.rows[0].declaredAt,
    summoned,
  };
}

export type AlarmSummonSummary = {
  municipalityId: string;
  municipalityName: string;
  distanceMeters: number;
  assistanceRequestId: string;
  requestedFiretrucks: number;
  requestedPersonnel: number;
};

/**
 * Calls the municipalities a level reaches, and records who was called.
 *
 * Declaring an alarm used to write a number and stop there, so a second alarm
 * summoned nobody: the level said help was needed and no help was asked for.
 * The doctrine decides the reach from where the fire actually is, and each
 * municipality it names is asked through the ordinary assistance request, which
 * they may still accept or decline. Nobody is asked twice for the same fire.
 */
async function summonForAlarmLevel(input: {
  fireReportId: string;
  alarmLevel: number;
  declaredByUserId: string;
}): Promise<AlarmSummonSummary[]> {
  const db = getDatabase();

  const incident = await db.query<{
    municipalityId: string;
    latitude: number | null;
    longitude: number | null;
  }>(
    `select municipality_id as "municipalityId",
            latitude::float as latitude,
            longitude::float as longitude
       from public.fire_reports
      where id = $1`,
    [input.fireReportId],
  );

  const origin = incident.rows[0];
  if (!origin || origin.latitude === null || origin.longitude === null) return [];
  if (!isDeclarableAlarmLevel(input.alarmLevel)) return [];

  /*
   * Every municipality but the origin, positioned by its nearest active
   * station where it has one and by its seat where it does not.
   *
   * Requiring a registered station and assigned personnel meant most of the
   * province could not be reached at all: a second alarm in Hamtic skipped San
   * Jose, and a third skipped Dao, not because they were far but because
   * nobody had entered a station for them. An alarm is a call to a
   * municipality, and a municipality that has not finished filling in its
   * stations is still there to answer it.
   */
  const stations = await db.query<StationCandidate>(
    `select coalesce(nearest.station_id, municipality.id) as "stationId",
            coalesce(nearest.station_name, municipality.name) as "stationName",
            municipality.id as "municipalityId",
            municipality.name as "municipalityName",
            coalesce(nearest.latitude, municipality.latitude)::float as latitude,
            coalesce(nearest.longitude, municipality.longitude)::float as longitude
       from public.municipalities municipality
       left join lateral (
         select station.id as station_id,
                station.station_name,
                station.latitude,
                station.longitude
           from public.municipal_bfp_stations station
          where station.municipality_id = municipality.id
            and station.status = 'ACTIVE'
            and station.latitude is not null
            and station.longitude is not null
          order by station.created_at asc
          limit 1
       ) nearest on true
      where municipality.id <> $1
        and coalesce(nearest.latitude, municipality.latitude) is not null
        and coalesce(nearest.longitude, municipality.longitude) is not null`,
    [origin.municipalityId],
  );

  const alreadySummoned = await db.query<{ municipalityId: string }>(
    `select summoned_municipality_id as "municipalityId"
       from public.incident_alarm_summons
      where fire_report_id = $1 and summoned_municipality_id is not null`,
    [input.fireReportId],
  );

  let candidates;
  try {
    candidates = resolveAlarmSummons({
      level: input.alarmLevel,
      latitude: origin.latitude,
      longitude: origin.longitude,
      originMunicipalityId: origin.municipalityId,
      stations: stations.rows,
      alreadySummonedMunicipalityIds: alreadySummoned.rows.map((row) => row.municipalityId),
    });
  } catch {
    // A fire without usable coordinates still records its level; it simply
    // cannot have neighbours chosen for it by distance.
    return [];
  }

  if (candidates.length === 0) return [];

  /*
   * An assistance request hangs off an observer row, and only the two nearest
   * municipalities are made observers when the incident is first dispatched. A
   * third or fourth alarm reaches further than that, so the municipalities it
   * names are enrolled as observers here before they can be asked. Without
   * this the wider alarms were refused outright as unselected recipients.
   */
  const dispatch = await db.query<{ dispatchId: string }>(
    `select id as "dispatchId"
       from public.incident_dispatches
      where fire_report_id = $1 and status = 'ACTIVE'
      order by dispatched_at desc
      limit 1`,
    [input.fireReportId],
  );
  const dispatchId = dispatch.rows[0]?.dispatchId;
  if (!dispatchId) return [];

  for (const candidate of candidates) {
    await db.query(
      // The primary key carries no default on this table, so the id is supplied
      // here rather than left to the database.
      `insert into public.incident_municipal_observers (
         id, fire_report_id, dispatch_id, origin_municipality_id, observer_municipality_id,
         nearest_station_id, station_latitude_snapshot, station_longitude_snapshot,
         distance_meters, status, selected_at
       ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,'ACTIVE',now())
       on conflict (dispatch_id, observer_municipality_id) do nothing`,
      [
        randomUUID(),
        input.fireReportId,
        dispatchId,
        origin.municipalityId,
        candidate.municipalityId,
        // A municipality positioned by its seat rather than a station has no
        // station to name, and the column says so rather than pointing at one
        // that does not exist.
        candidate.stationId === candidate.municipalityId ? null : candidate.stationId,
        candidate.latitude,
        candidate.longitude,
        candidate.distanceMeters,
      ],
    );
  }

  let requests: Awaited<ReturnType<typeof createAssistanceRequests>> = [];
  try {
    requests = await createAssistanceRequests({
      fireReportId: input.fireReportId,
      requesterMunicipalityId: origin.municipalityId,
      actorUserId: input.declaredByUserId,
      recipientMunicipalityIds: candidates.map((candidate) => candidate.municipalityId),
      /*
       * An alarm names a reach, not a shopping list: it asks each municipality
       * for whatever it can spare. A request for nothing at all is refused, so
       * one truck stands for that, and the receiving station answers with what
       * it actually sends.
       */
      requestedFiretrucks: 1,
      requestedPersonnel: 0,
      requestNote: `${ALARM_DOCTRINE[input.alarmLevel].label} declared by the province. Send what you can spare.`,
      allowProvincialReach: true,
      isProvincialCommand: true,
    });
  } catch (error) {
    /*
     * The alarm level stands even if the call for aid could not be raised, so
     * the province has to be told which it was. An incident nobody has
     * dispatched to has no mutual aid to offer yet, and that is worth saying
     * plainly rather than reporting as a fault.
     */
    const reason = error instanceof Error ? error.message : "";
    console.error("Alarm summons failed", error);
    if (reason === "INCIDENT_NOT_FOUND") throw new Error("ALARM_NEEDS_DISPATCH");
    if (reason === "INCIDENT_NOT_ACTIVE") throw new Error("ALARM_INCIDENT_CLOSED");
    throw new Error("ALARM_SUMMONS_FAILED");
  }

  const requestByMunicipality = new Map(
    requests.map((request) => [request.recipientMunicipalityId, request]),
  );

  for (const candidate of candidates) {
    await db.query(
      `insert into public.incident_alarm_summons
         (fire_report_id, alarm_level, summoned_municipality_id, assistance_request_id, distance_meters)
       values ($1, $2, $3, $4, $5)
       on conflict (fire_report_id, summoned_municipality_id) do nothing`,
      [
        input.fireReportId,
        input.alarmLevel,
        candidate.municipalityId,
        requestByMunicipality.get(candidate.municipalityId)?.id ?? null,
        Math.round(candidate.distanceMeters),
      ],
    );
  }

  return candidates.flatMap((candidate) => {
    const request = requestByMunicipality.get(candidate.municipalityId);
    if (!request) return [];
    return [{
      municipalityId: candidate.municipalityId,
      municipalityName: candidate.municipalityName,
      distanceMeters: Math.round(candidate.distanceMeters),
      assistanceRequestId: request.id,
      requestedFiretrucks: request.requestedFiretrucks,
      requestedPersonnel: request.requestedPersonnel,
    }];
  });
}

async function notifyMunicipality(request: BackupRequest): Promise<void> {
  try {
    const recipients = await getDatabase().query<{ userId: string }>(
      `select u.id as "userId"
         from public.users u
         join public.bfp_personnel_profiles p on p.user_id = u.id
         join public.bfp_municipality_assignments a
           on a.personnel_profile_id = p.id and a.status = 'ACTIVE'
        where a.municipality_id = $1
          and u.role = 'MUNICIPAL_BFP'
          and u.account_status = 'ACTIVE'`,
      [request.municipalityId],
    );
    if (recipients.rowCount === 0) return;

    await createAccountNotifications(getDatabase(), {
      recipientUserIds: recipients.rows.map((row) => row.userId),
      eventType: "BACKUP_REQUESTED",
      category: "RESPONSE",
      title: "Responder requested backup",
      summary: `${request.referenceNumber} · ${request.barangay ?? request.municipalityName} · requested by ${request.requestedByName}`,
      actionHref: "/municipal-bfp/active-incidents",
      entityType: "INCIDENT_BACKUP_REQUEST",
      entityId: request.id,
      dedupeKey: `backup-requested:${request.id}`,
    });
  } catch (error) {
    // A failed notification must never lose the escalation itself.
    console.error("Backup request notification failed", error);
  }
}

async function notifyProvince(request: BackupRequest): Promise<void> {
  try {
    const recipients = await getDatabase().query<{ userId: string }>(
      `select id as "userId" from public.users
        where role = 'PROVINCIAL_BFP' and account_status = 'ACTIVE'`,
    );
    if (recipients.rowCount === 0) return;

    await createAccountNotifications(getDatabase(), {
      recipientUserIds: recipients.rows.map((row) => row.userId),
      eventType: "BACKUP_FORWARDED",
      category: "RESPONSE",
      title: request.forwardedAutomatically
        ? "Backup request escalated automatically"
        : "Municipality forwarded a backup request",
      summary: `${request.referenceNumber} · ${request.municipalityName} · awaiting alarm declaration`,
      actionHref: "/provincial-bfp/assistance-requests",
      entityType: "INCIDENT_BACKUP_REQUEST",
      entityId: request.id,
      dedupeKey: `backup-forwarded:${request.id}`,
    });
  } catch (error) {
    console.error("Backup forward notification failed", error);
  }
}

/**
 * Tells each side what the declaration means for them.
 *
 * One notice to every municipal account saying "respond as directed" left the
 * summoned municipalities to work out that it meant them, and the municipality
 * that asked for help with nothing to show for the request they raised. The
 * message now differs by who is reading it.
 */
async function notifyAlarmDeclaration(
  fireReportId: string,
  alarmLevel: number,
  summoned: AlarmSummonSummary[],
): Promise<void> {
  try {
    const db = getDatabase();
    const report = await db.query<{
      referenceNumber: string;
      municipalityId: string;
      municipalityName: string;
      barangay: string | null;
    }>(
      `select fr.reference_number as "referenceNumber",
              fr.municipality_id as "municipalityId",
              m.name as "municipalityName",
              b.name as barangay
         from public.fire_reports fr
         join public.municipalities m on m.id = fr.municipality_id
         left join public.barangays b on b.id = fr.barangay_id
        where fr.id = $1`,
      [fireReportId],
    );
    if (report.rowCount === 0) return;

    const { referenceNumber, municipalityId, municipalityName, barangay } = report.rows[0];
    const where = barangay ? `${barangay}, ${municipalityName}` : municipalityName;
    const label = `${ordinal(alarmLevel)} alarm`;

    const recipientsFor = async (targetMunicipalityId: string) => {
      const result = await db.query<{ userId: string }>(
        `select u.id as "userId"
           from public.users u
           join public.bfp_personnel_profiles p on p.user_id = u.id
           join public.bfp_municipality_assignments a
             on a.personnel_profile_id = p.id and a.status = 'ACTIVE'
          where a.municipality_id = $1
            and u.role = 'MUNICIPAL_BFP'
            and u.account_status = 'ACTIVE'`,
        [targetMunicipalityId],
      );
      return result.rows.map((row) => row.userId);
    };

    // The municipalities being called. They are told they are wanted, and where.
    for (const municipality of summoned) {
      const recipients = await recipientsFor(municipality.municipalityId);
      if (recipients.length === 0) continue;
      await createAccountNotifications(db, {
        recipientUserIds: recipients,
        eventType: "ALARM_DECLARED",
        category: "RESPONSE",
        title: `${label}: your municipality is called`,
        summary: `${referenceNumber} · ${where} · open the incident for the location and the route`,
        actionHref: `/municipal-bfp/active-incidents?incident=${fireReportId}`,
        entityType: "FIRE_REPORT",
        entityId: fireReportId,
        context: buildAlarmNotificationContext({
          audience: "SUMMONED",
          alarmLevel,
          fireReportId,
          referenceNumber,
          location: where,
          assistanceRequestId: municipality.assistanceRequestId,
          requestedFiretrucks: municipality.requestedFiretrucks,
          requestedPersonnel: municipality.requestedPersonnel,
        }),
        dedupeKey: `alarm-summoned:${fireReportId}:${alarmLevel}:${municipality.municipalityId}`,
      });
    }

    // The municipality that asked. They know they asked; what they need is who
    // is coming, so the notice names them rather than repeating the alarm.
    const originRecipients = await recipientsFor(municipalityId);
    if (originRecipients.length > 0) {
      const names = summoned.map((entry) => entry.municipalityName);
      const who = names.length === 0
        ? "No municipality was within reach"
        : names.length <= 3
          ? names.join(", ")
          : `${names.slice(0, 2).join(", ")} and ${names.length - 2} more`;
      await createAccountNotifications(db, {
        recipientUserIds: originRecipients,
        eventType: "ALARM_DECLARED",
        category: "RESPONSE",
        title: `${label} declared on your incident`,
        summary: `${referenceNumber} · called: ${who}`,
        actionHref: `/municipal-bfp/active-incidents?incident=${fireReportId}`,
        entityType: "FIRE_REPORT",
        entityId: fireReportId,
        context: buildAlarmNotificationContext({
          audience: "ORIGIN",
          alarmLevel,
          fireReportId,
          referenceNumber,
          location: where,
          summonedMunicipalities: names,
        }),
        dedupeKey: `alarm-origin:${fireReportId}:${alarmLevel}`,
      });
    }

    // The province keeps its own record of what it declared.
    const provincial = await db.query<{ userId: string }>(
      `select id as "userId" from public.users
        where role = 'PROVINCIAL_BFP' and account_status = 'ACTIVE'`,
    );
    if (provincial.rows.length > 0) {
      await createAccountNotifications(db, {
        recipientUserIds: provincial.rows.map((row) => row.userId),
        eventType: "ALARM_DECLARED",
        category: "RESPONSE",
        title: `${label} declared`,
        summary: `${referenceNumber} · ${where} · ${summoned.length} municipalit${summoned.length === 1 ? "y" : "ies"} called`,
        actionHref: "/provincial-bfp/assistance-requests",
        entityType: "FIRE_REPORT",
        entityId: fireReportId,
        dedupeKey: `alarm-declared:${fireReportId}:${alarmLevel}`,
      });
    }
  } catch (error) {
    console.error("Alarm declaration notification failed", error);
  }
}

function ordinal(value: number): string {
  switch (value) {
    case 1: return "First";
    case 2: return "Second";
    case 3: return "Third";
    case 4: return "Fourth";
    default: return "Fifth";
  }
}
