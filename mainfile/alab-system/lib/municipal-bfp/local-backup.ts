import "server-only";

import { randomUUID } from "node:crypto";
import type { PoolClient } from "pg";

import { getDatabase, withTransaction } from "../db";
import { sendDispatchPush } from "../notifications/fcm";
import { createAccountNotifications, listMunicipalNotificationRecipients } from "../notifications/service";
import { buildLocalStationCards, isLocalBackupEligible, type LocalStationCard, type LocalStationInput } from "./local-backup-options";

/**
 * Local backup.
 *
 * A responder whose own town has another station free asks for it from the
 * app; an officer of that town sends it from the website, and it joins the
 * response already running. Unlike Request backup it never reaches the
 * province, raises no alarm level and calls on no other municipality, so it
 * leaves the incident's status, alarm, observers and assistance untouched.
 */

type Queryable = Pick<PoolClient, "query">;

export type LocalBackupStatus = "PENDING" | "SENT" | "DECLINED" | "CANCELLED";

export type LocalBackupRequest = {
  id: string;
  fireReportId: string;
  dispatchId: string;
  referenceNumber: string;
  barangay: string | null;
  municipalityId: string;
  requestedByName: string;
  reason: string | null;
  status: LocalBackupStatus;
  requestedStationIds: string[];
  sentStationNames: string[];
  createdAt: string;
  handledAt: string | null;
};

export type LocalBackupOptions = {
  eligible: boolean;
  municipalityName: string;
  stations: LocalStationCard[];
  /** The latest request this town made for this response, if any. */
  request: LocalBackupRequest | null;
};

const MAX_STATIONS = 10;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const REQUEST_COLUMNS = `
  r.id,
  r.fire_report_id as "fireReportId",
  r.dispatch_id as "dispatchId",
  fr.reference_number as "referenceNumber",
  b.name as barangay,
  r.municipality_id as "municipalityId",
  coalesce(p.display_name, 'Responder') as "requestedByName",
  r.reason,
  r.status,
  r.requested_station_ids::text[] as "requestedStationIds",
  coalesce((select array_agg(split_part(s.station_name, ' · ', 1) order by s.station_name)
              from municipal_bfp_stations s where s.id = any(r.sent_station_ids)), '{}') as "sentStationNames",
  r.created_at as "createdAt",
  r.handled_at as "handledAt"
`;
const REQUEST_FROM = `
  from incident_local_backup_requests r
  join fire_reports fr on fr.id = r.fire_report_id
  left join barangays b on b.id = fr.barangay_id
  left join bfp_personnel_profiles p on p.user_id = r.requested_by_user_id
`;

type RequestRow = Omit<LocalBackupRequest, "createdAt" | "handledAt"> & { createdAt: Date | string; handledAt: Date | string | null };

function toRequest(row: RequestRow): LocalBackupRequest {
  return {
    ...row,
    createdAt: new Date(row.createdAt).toISOString(),
    handledAt: row.handledAt ? new Date(row.handledAt).toISOString() : null,
  };
}

function uniqueStationIds(value: unknown) {
  const ids = Array.isArray(value) ? value.filter((id): id is string => typeof id === "string" && UUID.test(id)) : [];
  const unique = [...new Set(ids.map((id) => id.toLowerCase()))];
  if (!unique.length || unique.length > MAX_STATIONS) throw new Error("INVALID_STATION_SELECTION");
  return unique;
}

/** The responder's place on an active response, and the town they belong to. */
async function responderContext(q: Queryable, userId: string, dispatchId: string) {
  const result = await q.query<{
    dispatchId: string; fireReportId: string; referenceNumber: string; barangay: string | null;
    latitude: number; longitude: number; municipalityId: string; municipalityName: string; requesterName: string;
  }>(
    `select d.id as "dispatchId", d.fire_report_id as "fireReportId", fr.reference_number as "referenceNumber",
            b.name as barangay, fr.latitude::float as latitude, fr.longitude::float as longitude,
            ma.municipality_id as "municipalityId", m.name as "municipalityName",
            coalesce(p.display_name, 'Responder') as "requesterName"
       from incident_dispatches d
       join fire_reports fr on fr.id = d.fire_report_id
       left join barangays b on b.id = fr.barangay_id
       join incident_dispatch_recipients recipient on recipient.dispatch_id = d.id and recipient.recipient_user_id = $1
       join bfp_personnel_profiles p on p.user_id = $1
       join bfp_municipality_assignments ma on ma.personnel_profile_id = p.id and ma.status = 'ACTIVE'
       join municipalities m on m.id = ma.municipality_id
      where d.id = $2 and d.status = 'ACTIVE'
      limit 1`,
    [userId, dispatchId],
  );
  const context = result.rows[0];
  if (!context) throw new Error("DISPATCH_NOT_FOUND");
  return context;
}

/** Every active station of a town, as it stands against one response. */
async function localStationCards(q: Queryable, municipalityId: string, dispatchId: string, fire: { latitude: number; longitude: number }) {
  const stations = await q.query<LocalStationInput>(
    `select s.id, s.station_name as "stationName", s.latitude::float as latitude, s.longitude::float as longitude,
            (select count(*)::int
               from bfp_station_assignments sa
               join bfp_personnel_profiles p on p.id = sa.personnel_profile_id
               join bfp_municipality_assignments ma
                 on ma.personnel_profile_id = p.id and ma.status = 'ACTIVE' and ma.municipality_id = s.municipality_id
               join users u on u.id = p.user_id
              where sa.station_id = s.id and sa.status = 'ACTIVE'
                and u.role = 'MUNICIPAL_BFP' and u.account_status = 'ACTIVE') as "activePersonnelCount",
            exists(select 1 from incident_dispatch_stations ds
                    where ds.dispatch_id = $2 and ds.station_id = s.id) as "onThisFire",
            exists(select 1 from incident_dispatch_stations ds
                     join incident_dispatches d on d.id = ds.dispatch_id
                    where ds.station_id = s.id and d.status = 'ACTIVE' and d.id <> $2) as "busyElsewhere"
       from municipal_bfp_stations s
      where s.municipality_id = $1 and s.status = 'ACTIVE'`,
    [municipalityId, dispatchId],
  );
  return buildLocalStationCards(stations.rows, fire);
}

/** What the app shows behind the Local backup button. */
export async function getLocalBackupOptions(userId: string, dispatchId: string): Promise<LocalBackupOptions> {
  const db = getDatabase();
  const context = await responderContext(db, userId, dispatchId);
  const stations = await localStationCards(db, context.municipalityId, dispatchId, context);
  const latest = await db.query<RequestRow>(
    `select ${REQUEST_COLUMNS} ${REQUEST_FROM}
      where r.dispatch_id = $1 and r.municipality_id = $2
      order by r.created_at desc limit 1`,
    [dispatchId, context.municipalityId],
  );
  return {
    eligible: isLocalBackupEligible(stations),
    municipalityName: context.municipalityName,
    stations,
    request: latest.rows[0] ? toRequest(latest.rows[0]) : null,
  };
}

/** A responder asks their own town for the stations they picked. */
export async function requestLocalBackup(input: {
  userId: string;
  dispatchId: string;
  stationIds: unknown;
  reason?: string | null;
}): Promise<LocalBackupRequest> {
  const stationIds = uniqueStationIds(input.stationIds);
  const reason = input.reason?.trim().slice(0, 500) || null;

  const created = await withTransaction(async (client) => {
    const context = await responderContext(client, input.userId, input.dispatchId);
    const cards = await localStationCards(client, context.municipalityId, input.dispatchId, context);
    if (!isLocalBackupEligible(cards)) throw new Error("LOCAL_BACKUP_NOT_AVAILABLE");
    const picked = stationIds.map((id) => cards.find((card) => card.id === id));
    if (picked.some((card) => !card?.selectable)) throw new Error("INVALID_STATION_SELECTION");

    let id: string;
    try {
      const inserted = await client.query<{ id: string }>(
        `insert into incident_local_backup_requests
           (fire_report_id, dispatch_id, municipality_id, requested_by_user_id, requested_station_ids, reason)
         select $1, $2, $3, $4, $5::uuid[], $6
          where not exists (
            select 1 from incident_local_backup_requests
             where dispatch_id = $2 and municipality_id = $3 and status = 'PENDING')
         returning id`,
        [context.fireReportId, input.dispatchId, context.municipalityId, input.userId, stationIds, reason],
      );
      if (!inserted.rows[0]) throw new Error("LOCAL_BACKUP_ALREADY_REQUESTED");
      id = inserted.rows[0].id;
    } catch (cause) {
      // Two responders tapping at once meet at the one-pending index.
      if ((cause as { code?: string })?.code === "23505") throw new Error("LOCAL_BACKUP_ALREADY_REQUESTED");
      throw cause;
    }

    const names = picked.map((card) => card!.name).join(", ");
    const recipients = (await listMunicipalNotificationRecipients(client, context.municipalityId))
      .filter((userId) => userId !== input.userId);
    await createAccountNotifications(client, {
      recipientUserIds: recipients,
      actorUserId: input.userId,
      eventType: "LOCAL_BACKUP_REQUESTED",
      category: "INCIDENT",
      title: "Local backup requested",
      summary: `${context.referenceNumber} · ${context.requesterName} asks for ${names}`,
      actionHref: `/municipal-bfp/active-incidents?incident=${context.fireReportId}`,
      entityType: "fire_report",
      entityId: context.fireReportId,
      context: { localBackupRequestId: id, dispatchId: input.dispatchId, stationIds },
      dedupeKey: `local-backup:${id}:requested`,
    });

    const row = await client.query<RequestRow>(`select ${REQUEST_COLUMNS} ${REQUEST_FROM} where r.id = $1`, [id]);
    return toRequest(row.rows[0]);
  });
  return created;
}

export type MunicipalLocalBackupRequest = LocalBackupRequest & { stations: LocalStationCard[] };

/** Open requests for a town, each with its stations as they stand now. */
export async function listMunicipalLocalBackupRequests(municipalityId: string): Promise<MunicipalLocalBackupRequest[]> {
  const db = getDatabase();
  const open = await db.query<RequestRow & { latitude: number; longitude: number }>(
    `select ${REQUEST_COLUMNS}, fr.latitude::float as latitude, fr.longitude::float as longitude
       ${REQUEST_FROM}
       join incident_dispatches d on d.id = r.dispatch_id and d.status = 'ACTIVE'
      where r.municipality_id = $1 and r.status = 'PENDING'
      order by r.created_at asc`,
    [municipalityId],
  );
  return Promise.all(open.rows.map(async ({ latitude, longitude, ...row }) => ({
    ...toRequest(row),
    stations: await localStationCards(db, municipalityId, row.dispatchId, { latitude, longitude }),
  })));
}

/**
 * Sends stations into the response a request was made for. Each joins the
 * running dispatch with its active crew, who get the ordinary dispatch alert.
 */
export async function sendLocalBackup(input: {
  actorUserId: string;
  municipalityId: string;
  requestId: string;
  stationIds: unknown;
}) {
  const stationIds = uniqueStationIds(input.stationIds);
  const sent = await withTransaction(async (client) => {
    const request = await client.query<{
      dispatchId: string; fireReportId: string; requestedBy: string; referenceNumber: string;
      barangay: string | null; latitude: number; longitude: number; reportStatus: string; municipalityName: string;
    }>(
      `select r.dispatch_id as "dispatchId", r.fire_report_id as "fireReportId", r.requested_by_user_id as "requestedBy",
              fr.reference_number as "referenceNumber", b.name as barangay, fr.status as "reportStatus",
              fr.latitude::float as latitude, fr.longitude::float as longitude, m.name as "municipalityName"
         from incident_local_backup_requests r
         join fire_reports fr on fr.id = r.fire_report_id
         left join barangays b on b.id = fr.barangay_id
         join municipalities m on m.id = r.municipality_id
        where r.id = $1 and r.municipality_id = $2 and r.status = 'PENDING'
        for update of r`,
      [input.requestId, input.municipalityId],
    );
    const row = request.rows[0];
    if (!row) throw new Error("LOCAL_BACKUP_NOT_FOUND");
    const dispatch = await client.query<{ status: string }>(
      "select status from incident_dispatches where id = $1 for update",
      [row.dispatchId],
    );
    if (dispatch.rows[0]?.status !== "ACTIVE") throw new Error("DISPATCH_ENDED");

    const cards = await localStationCards(client, input.municipalityId, row.dispatchId, row);
    const picked = stationIds.map((id) => cards.find((card) => card.id === id));
    if (picked.some((card) => !card?.selectable)) throw new Error("INVALID_STATION_SELECTION");

    const now = new Date();
    const stations = await client.query<{ id: string; station_name: string; latitude: number; longitude: number }>(
      `select id, station_name, latitude, longitude from municipal_bfp_stations
        where id = any($1::uuid[]) and municipality_id = $2 and status = 'ACTIVE' for update`,
      [stationIds, input.municipalityId],
    );
    const dispatchStationIds = new Map<string, string>();
    for (const station of stations.rows) {
      const dispatchStationId = randomUUID();
      dispatchStationIds.set(station.id, dispatchStationId);
      await client.query(
        `insert into incident_dispatch_stations (
           id, dispatch_id, station_id, station_name_snapshot, station_latitude_snapshot, station_longitude_snapshot, created_at
         ) values ($1,$2,$3,$4,$5,$6,$7)`,
        [dispatchStationId, row.dispatchId, station.id, station.station_name, station.latitude, station.longitude, now],
      );
    }

    const crew = await client.query<{ station_id: string; user_id: string; display_name: string }>(
      `select sa.station_id, u.id as user_id, p.display_name
         from bfp_station_assignments sa
         join bfp_personnel_profiles p on p.id = sa.personnel_profile_id
         join bfp_municipality_assignments ma
           on ma.personnel_profile_id = p.id and ma.status = 'ACTIVE' and ma.municipality_id = $2
         join users u on u.id = p.user_id
        where sa.station_id = any($1::uuid[]) and sa.status = 'ACTIVE'
          and u.role = 'MUNICIPAL_BFP' and u.account_status = 'ACTIVE'
        order by sa.station_id, p.display_name`,
      [stationIds, input.municipalityId],
    );
    const newCrew: string[] = [];
    for (const member of crew.rows) {
      const inserted = await client.query<{ recipient_user_id: string }>(
        `insert into incident_dispatch_recipients (
           id, dispatch_id, dispatch_station_id, recipient_user_id, recipient_name_snapshot, status, assigned_at, created_at, updated_at
         ) values ($1,$2,$3,$4,$5,'ASSIGNED',$6,$6,$6)
         on conflict (dispatch_id, recipient_user_id) do nothing
         returning recipient_user_id`,
        [randomUUID(), row.dispatchId, dispatchStationIds.get(member.station_id), member.user_id, member.display_name, now],
      );
      if (inserted.rows[0]) newCrew.push(member.user_id);
    }

    const names = stations.rows.map((station) => station.station_name.split(" · ")[0]);
    const label = names.join(", ");
    await client.query("update fire_reports set updated_at = $1 where id = $2", [now, row.fireReportId]);
    await client.query(
      `insert into fire_report_status_history (fire_report_id, previous_status, next_status, actor_user_id, resident_message, created_at)
       values ($1,$2,$2,$3,$4,$5)`,
      [row.fireReportId, row.reportStatus, input.actorUserId, `Local backup: ${row.municipalityName} has assigned ${label}.`, now],
    );
    await client.query(
      `update incident_local_backup_requests
          set status = 'SENT', sent_station_ids = $2::uuid[], handled_by_user_id = $3, handled_at = $4, updated_at = $4
        where id = $1`,
      [input.requestId, stationIds, input.actorUserId, now],
    );

    await createAccountNotifications(client, {
      recipientUserIds: newCrew,
      actorUserId: input.actorUserId,
      eventType: "INCIDENT_DISPATCH_ASSIGNED",
      category: "INCIDENT",
      title: "Emergency dispatch assigned",
      summary: `${row.referenceNumber} · Local backup: ${label}`,
      actionHref: `/municipal-bfp/incidents/${row.fireReportId}`,
      entityType: "fire_report",
      entityId: row.fireReportId,
      context: { dispatchId: row.dispatchId, reference: row.referenceNumber, stationIds, barangay: row.barangay, municipality: row.municipalityName },
      dedupeKey: `incident-dispatch:${row.dispatchId}:assigned`,
      createdAt: now,
    });
    await createAccountNotifications(client, {
      recipientUserIds: [row.requestedBy],
      actorUserId: input.actorUserId,
      eventType: "LOCAL_BACKUP_SENT",
      category: "RESPONSE",
      title: "Local backup is coming",
      summary: `${row.referenceNumber} · ${label}`,
      entityType: "fire_report",
      entityId: row.fireReportId,
      context: { localBackupRequestId: input.requestId, dispatchId: row.dispatchId, stationIds },
      dedupeKey: `local-backup:${input.requestId}:sent`,
      createdAt: now,
    });

    return {
      dispatchId: row.dispatchId,
      fireReportId: row.fireReportId,
      referenceNumber: row.referenceNumber,
      barangay: row.barangay,
      municipalityName: row.municipalityName,
      recipientUserIds: newCrew,
      stationNames: names,
    };
  });
  try {
    await sendDispatchPush(sent);
  } catch (error) {
    console.error("Local backup push failed", error);
  }
  return sent;
}

/** The town says no; the responder can still call the province. */
export async function declineLocalBackup(input: { actorUserId: string; municipalityId: string; requestId: string }) {
  return withTransaction(async (client) => {
    const declined = await client.query<{ requestedBy: string; fireReportId: string; referenceNumber: string; dispatchId: string }>(
      `update incident_local_backup_requests r
          set status = 'DECLINED', handled_by_user_id = $3, handled_at = now(), updated_at = now()
         from fire_reports fr
        where r.id = $1 and r.municipality_id = $2 and r.status = 'PENDING' and fr.id = r.fire_report_id
        returning r.requested_by_user_id as "requestedBy", r.fire_report_id as "fireReportId",
                  fr.reference_number as "referenceNumber", r.dispatch_id as "dispatchId"`,
      [input.requestId, input.municipalityId, input.actorUserId],
    );
    const row = declined.rows[0];
    if (!row) throw new Error("LOCAL_BACKUP_NOT_FOUND");
    await createAccountNotifications(client, {
      recipientUserIds: [row.requestedBy],
      actorUserId: input.actorUserId,
      eventType: "LOCAL_BACKUP_DECLINED",
      category: "RESPONSE",
      title: "Local backup declined",
      summary: `${row.referenceNumber} · Use Request backup to ask the province.`,
      entityType: "fire_report",
      entityId: row.fireReportId,
      context: { localBackupRequestId: input.requestId, dispatchId: row.dispatchId },
      dedupeKey: `local-backup:${input.requestId}:declined`,
    });
    return { declined: true };
  });
}
