import "server-only";

import { getDatabase } from "../db";
import { createAccountNotifications } from "../notifications/service";
import { getFireReportPhotoUrl, uploadBackupRequestPhoto } from "../supabase/server-storage";

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

  const existing = await db.query<{ id: string }>(
    `select id from public.incident_backup_requests
      where fire_report_id = $1 and status in ('PENDING_MUNICIPAL','FORWARDED_PROVINCIAL')
      limit 1`,
    [fireReportId],
  );

  /*
   * One open request per incident. A second call is refused rather than
   * silently joined: the responder is told help is already coming, instead of
   * being shown a fresh confirmation that raises nothing.
   */
  if (existing.rowCount && existing.rows[0]) {
    throw new Error("BACKUP_ALREADY_REQUESTED");
  }

  const inserted = await db.query<{ id: string }>(
    `insert into public.incident_backup_requests
       (fire_report_id, municipality_id, requested_by_user_id, dispatch_id,
        reason, requested_firetrucks, requested_personnel, auto_forward_at)
     values ($1, $2, $3, $4, $5, $6, $7, now() + ($8 || ' seconds')::interval)
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
    `update public.incident_backup_requests
        set acknowledged_by_user_id = $2,
            acknowledged_at = coalesce(acknowledged_at, now()),
            updated_at = now()
      where id = $1 and status = 'PENDING_MUNICIPAL'`,
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
}): Promise<{ alarmLevel: number; declaredAt: string }> {
  if (!Number.isInteger(input.alarmLevel) || input.alarmLevel < 1 || input.alarmLevel > 5) {
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

  await notifyAlarmDeclaration(input.fireReportId, input.alarmLevel);

  return { alarmLevel: input.alarmLevel, declaredAt: inserted.rows[0].declaredAt };
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

async function notifyAlarmDeclaration(fireReportId: string, alarmLevel: number): Promise<void> {
  try {
    const db = getDatabase();
    const report = await db.query<{ referenceNumber: string; municipalityName: string }>(
      `select fr.reference_number as "referenceNumber", m.name as "municipalityName"
         from public.fire_reports fr
         join public.municipalities m on m.id = fr.municipality_id
        where fr.id = $1`,
      [fireReportId],
    );
    if (report.rowCount === 0) return;

    // The alarm level summons help, so every municipal account hears it.
    const recipients = await db.query<{ userId: string }>(
      `select id as "userId" from public.users
        where role in ('MUNICIPAL_BFP','PROVINCIAL_BFP') and account_status = 'ACTIVE'`,
    );
    if (recipients.rowCount === 0) return;

    const { referenceNumber, municipalityName } = report.rows[0];
    await createAccountNotifications(db, {
      recipientUserIds: recipients.rows.map((row) => row.userId),
      eventType: "ALARM_DECLARED",
      category: "RESPONSE",
      title: `${ordinal(alarmLevel)} alarm declared`,
      summary: `${referenceNumber} · ${municipalityName} · respond as directed`,
      actionHref: "/municipal-bfp/active-incidents",
      entityType: "FIRE_REPORT",
      entityId: fireReportId,
      dedupeKey: `alarm-declared:${fireReportId}:${alarmLevel}`,
    });
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
